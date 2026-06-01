'use client';

/**
 * nativeAuth — login OAuth que funciona no WEB e no APP (Capacitor).
 *
 * Padrão espelhado do GOL 1.006 (em produção). O problema que resolve:
 * dentro do APK, o WebView NÃO pode fazer OAuth do Google (o Google
 * recusa com "browser não seguro"). A solução é:
 *   1. No app, usar um DEEP LINK como redirect (com.mindpractice.app://auth/callback)
 *   2. Abrir o login no navegador REAL (Chrome Custom Tab via @capacitor/browser)
 *   3. Capturar o retorno via listener `appUrlOpen` e trocar o code por sessão
 *
 * No web nada disso é necessário — redireciona pro próprio site.
 *
 * Para replicar em outro app: trocar NATIVE_AUTH_SCHEME pelo appId do
 * capacitor.config.ts daquele app, e cadastrar o deep link no Supabase
 * Auth → URL Configuration → Redirect URLs.
 */

import { Capacitor } from '@capacitor/core';

// scheme = appId do capacitor.config.ts
const NATIVE_AUTH_SCHEME = 'com.mindpractice.app';
const NATIVE_AUTH_HOST = 'auth';
const NATIVE_AUTH_PATH = '/callback';

/** Deep link que o Supabase usa pra devolver o usuário ao app nativo. */
export const NATIVE_AUTH_REDIRECT_URL = `${NATIVE_AUTH_SCHEME}://${NATIVE_AUTH_HOST}${NATIVE_AUTH_PATH}`;

/** True se está rodando dentro de Capacitor (iOS/Android), não web. */
export const isCapacitorNativeRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
    if (typeof Capacitor?.getPlatform === 'function') {
      const platform = String(Capacitor.getPlatform() || '').toLowerCase();
      return platform === 'ios' || platform === 'android';
    }
  } catch {
    return false;
  }
  return false;
};

/**
 * Redirect a passar pro signInWithOAuth.
 *   - app  → deep link (com.mindpractice.app://auth/callback)
 *   - web  → a própria origem do site
 */
export const getOAuthRedirectUrl = (webOrigin: string): string =>
  isCapacitorNativeRuntime()
    ? NATIVE_AUTH_REDIRECT_URL
    : `${webOrigin.replace(/\/+$/, '')}/`;

/** True se a URL recebida no appUrlOpen é o nosso callback de auth. */
export const isNativeAuthCallbackUrl = (value: string): boolean => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === `${NATIVE_AUTH_SCHEME}:` &&
      parsed.hostname === NATIVE_AUTH_HOST &&
      parsed.pathname === NATIVE_AUTH_PATH
    );
  } catch {
    return false;
  }
};

/** Extrai code/error do deep link de retorno. */
export const parseNativeAuthCallback = (value: string): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
} => {
  try {
    const parsed = new URL(value);
    return {
      code: parsed.searchParams.get('code'),
      error: parsed.searchParams.get('error'),
      errorDescription: parsed.searchParams.get('error_description'),
    };
  } catch {
    return { code: null, error: 'invalid_callback_url', errorDescription: null };
  }
};
