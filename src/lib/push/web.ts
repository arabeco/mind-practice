/**
 * Web Push (VAPID) flow.
 *
 * 1. Pede permissao
 * 2. Assina no browser com NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * 3. Faz upsert na tabela push_registrations (kind='web')
 *
 * A chave privada fica SÓ no servidor (Edge Function).
 */

import { getSupabase } from '@/lib/supabase/client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

export function checkWebPushSupport(): PushSupport {
  if (typeof window === 'undefined') return { supported: false, reason: 'SSR' };
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'No Service Worker' };
  if (!('PushManager' in window)) return { supported: false, reason: 'No Push API' };
  if (!('Notification' in window)) return { supported: false, reason: 'No Notification API' };
  if (!VAPID_PUBLIC_KEY) return { supported: false, reason: 'VAPID key not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY)' };
  return { supported: true };
}

export async function enableWebPush(): Promise<{ ok: boolean; error?: string }> {
  const sup = checkWebPushSupport();
  if (!sup.supported) return { ok: false, error: sup.reason };

  // 1. Permissao
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, error: `Permissao: ${perm}` };

  // 2. Subscribe
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
  }

  const endpoint = sub.endpoint;
  const p256dh = bufToBase64Url(sub.getKey('p256dh'));
  const authKey = bufToBase64Url(sub.getKey('auth'));

  // 3. Upsert no Supabase
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase nao configurado' };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Precisa estar logado' };

  const { error } = await sb.from('push_registrations').upsert(
    {
      user_id: user.id,
      kind: 'web',
      endpoint,
      p256dh,
      auth_key: authKey,
      user_agent: navigator.userAgent,
      platform: 'web',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function disableWebPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'SSR' };
  if (!('serviceWorker' in navigator)) return { ok: false, error: 'No SW' };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const sb = getSupabase();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('push_registrations').delete()
        .eq('user_id', user.id).eq('endpoint', endpoint);
    }
  }
  return { ok: true };
}

export async function getCurrentWebSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
