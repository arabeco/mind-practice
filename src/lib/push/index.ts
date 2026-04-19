/**
 * Entry point unificado. O cliente chama `enablePush()` e a gente
 * decide entre web (VAPID) ou native (FCM) baseado em ambiente.
 *
 * Quando for Capacitor nativo → FCM.
 * Caso contrario → Web Push.
 */

import { enableWebPush, disableWebPush, checkWebPushSupport } from './web';
import { enableFcmPush, disableFcmPush, isCapacitorNative } from './fcm';

export type PushResult = { ok: boolean; error?: string; transport?: 'web' | 'fcm' };

export async function enablePush(): Promise<PushResult> {
  if (isCapacitorNative()) {
    const r = await enableFcmPush();
    return { ...r, transport: 'fcm' };
  }
  const r = await enableWebPush();
  return { ...r, transport: 'web' };
}

export async function disablePush(): Promise<PushResult> {
  if (isCapacitorNative()) {
    const r = await disableFcmPush();
    return { ...r, transport: 'fcm' };
  }
  const r = await disableWebPush();
  return { ...r, transport: 'web' };
}

export function getPushSupport(): { supported: boolean; reason?: string; transport: 'web' | 'fcm' } {
  if (isCapacitorNative()) {
    return { supported: true, transport: 'fcm' };
  }
  const sup = checkWebPushSupport();
  return {
    supported: sup.supported,
    reason: sup.supported ? undefined : sup.reason,
    transport: 'web',
  };
}
