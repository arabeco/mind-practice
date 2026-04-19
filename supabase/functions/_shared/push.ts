// ============================================================================
// Shared push helpers for Edge Functions.
// Resolve todos os canais registrados de um user e envia.
// ============================================================================

import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@mindpractice.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

export interface Registration {
  id: string;
  kind: 'web' | 'fcm';
  endpoint: string | null;
  p256dh: string | null;
  auth_key: string | null;
  fcm_token: string | null;
}

export interface SendResult {
  id: string;
  ok: boolean;
  transport: 'web' | 'fcm';
  error?: string;
  expired?: boolean;
}

/**
 * Envia via Web Push (VAPID). Retorna expired=true se endpoint morreu
 * (410 / 404) pra caller saber que pode deletar do DB.
 */
export async function sendWebPush(reg: Registration, payload: PushPayload): Promise<SendResult> {
  if (!reg.endpoint || !reg.p256dh || !reg.auth_key) {
    return { id: reg.id, ok: false, transport: 'web', error: 'Campos web incompletos' };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: reg.endpoint,
        keys: { p256dh: reg.p256dh, auth: reg.auth_key },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12 },
    );
    return { id: reg.id, ok: true, transport: 'web' };
  } catch (err: any) {
    const status = err?.statusCode;
    const expired = status === 404 || status === 410;
    return { id: reg.id, ok: false, transport: 'web', error: err?.message ?? String(err), expired };
  }
}

/**
 * Placeholder FCM. Implementar quando o APK Capacitor existir.
 * Payload minimo documentado em https://firebase.google.com/docs/cloud-messaging/send-message.
 */
export async function sendFcmPush(reg: Registration, _payload: PushPayload): Promise<SendResult> {
  // TODO: FCM HTTP v1 requer OAuth2 com service account.
  // 1. Guardar GOOGLE_SERVICE_ACCOUNT_JSON em secret
  // 2. Gerar access_token via google-auth-library (ou JWT manual)
  // 3. POST https://fcm.googleapis.com/v1/projects/<project>/messages:send
  return { id: reg.id, ok: false, transport: 'fcm', error: 'FCM ainda nao implementado (aguardando APK)' };
}

export async function sendToRegistration(reg: Registration, payload: PushPayload): Promise<SendResult> {
  if (reg.kind === 'web') return sendWebPush(reg, payload);
  return sendFcmPush(reg, payload);
}
