/**
 * FCM (Firebase Cloud Messaging) flow — usado no build Capacitor.
 *
 * STUB. A implementacao real vai usar:
 *   import { PushNotifications } from '@capacitor/push-notifications'
 *
 * Fica como no-op no build web pra nao quebrar bundling.
 * Quando o APK for montado, vamos:
 *   1. Instalar @capacitor/push-notifications
 *   2. Trocar as chamadas abaixo pela API real
 *   3. O token registrado vai no mesmo endpoint /api/push/register,
 *      so que com kind='fcm' + fcm_token + platform='android'|'ios'
 */

export async function enableFcmPush(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: 'FCM so funciona no build Capacitor' };
}

export async function disableFcmPush(): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}
