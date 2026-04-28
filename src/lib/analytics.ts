'use client';

/**
 * Analytics — PostHog wrapper. Idle até envs serem setadas:
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_...
 *   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com  (ou self-hosted)
 *
 * Sem essas keys, todas as funções viram no-op (zero crashes, zero
 * network calls). Permite buildar e demonstrar sem analytics ativo.
 *
 * Eventos catalogados (canonical event names):
 *   signup                        — primeiro auth bem-sucedido
 *   onboarding_complete           — terminou primeiro deck
 *   deck_started                  — START_DECK
 *   deck_completed                — FINISH_DECK
 *   archetype_unlocked            — primeira vez 'firm'
 *   archetype_evolved             — A → B firm
 *   share_tapped                  — clicou em algum share button
 *   paywall_viewed                — abriu /assinatura ou PaywallModal
 *   paywall_dismissed             — fechou modal sem ir pro checkout
 *   checkout_started              — clicou "Assinar" → Stripe URL
 *   checkout_completed            — voltou no /sucesso com tier ativo
 *   subscription_canceled         — webhook customer.subscription.deleted
 *   waitlist_joined               — submitiu form na landing
 *   level_up                      — getPlayerLevel sobe
 *   season_finale_seen            — completou campaign
 */
import type { PostHog } from 'posthog-js';

let _client: PostHog | null = null;
let _initPromise: Promise<PostHog | null> | null = null;

function isConfigured(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY
  );
}

/**
 * Lazy init no browser. Idempotente. Retorna null se não configurado.
 */
async function ensurePostHog(): Promise<PostHog | null> {
  if (_client) return _client;
  if (!isConfigured()) return null;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const mod = await import('posthog-js');
      const posthog = mod.default;
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        // Disable auto-capture de cliques pra controlar manualmente
        autocapture: false,
        person_profiles: 'identified_only',
      });
      _client = posthog;
      return posthog;
    } catch (err) {
      console.warn('[analytics] init falhou:', err);
      return null;
    }
  })();
  return _initPromise;
}

export type EventName =
  | 'signup'
  | 'onboarding_complete'
  | 'deck_started'
  | 'deck_completed'
  | 'archetype_unlocked'
  | 'archetype_evolved'
  | 'share_tapped'
  | 'paywall_viewed'
  | 'paywall_dismissed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'subscription_canceled'
  | 'waitlist_joined'
  | 'level_up'
  | 'season_finale_seen';

/**
 * Track event. No-op se PostHog não configurado.
 */
export async function trackEvent(
  name: EventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = await ensurePostHog();
  if (!ph) return;
  ph.capture(name, properties);
}

/**
 * Identifica o user. Chamar após login confirmado.
 * `traits` opcional vai pra `$set` (atualiza propriedades do person).
 */
export async function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): Promise<void> {
  const ph = await ensurePostHog();
  if (!ph) return;
  ph.identify(userId, traits);
}

/**
 * Reset session (call no logout). Limpa identity local.
 */
export async function resetAnalytics(): Promise<void> {
  const ph = await ensurePostHog();
  if (!ph) return;
  ph.reset();
}

/**
 * Feature flag / experiment lookup. Retorna `null` se PostHog não
 * configurado OR flag não decidida ainda. Caller deve ter fallback.
 *
 * Uso:
 *   const variant = useExperiment('paywall_copy_v2');
 *   if (variant === 'urgent') return <UrgentCopy />;
 *   if (variant === 'soft') return <SoftCopy />;
 *   return <DefaultCopy />;
 */
export async function getFeatureFlag(
  flagKey: string,
): Promise<string | boolean | null> {
  const ph = await ensurePostHog();
  if (!ph) return null;
  const value = ph.getFeatureFlag(flagKey);
  return value ?? null;
}
