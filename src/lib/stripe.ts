/**
 * Stripe — server-only client. NÃO importar de componentes 'use client'.
 *
 * Env vars necessárias (rodar em modo teste primeiro):
 *   STRIPE_SECRET_KEY=sk_test_...           (server)
 *   STRIPE_WEBHOOK_SECRET=whsec_...          (server)
 *   STRIPE_PRO_PRICE_ID=price_...            (server)
 *   STRIPE_FOUNDER_PRICE_ID=price_...        (server)
 *
 * O cliente public usa NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (não usado aqui;
 * se algum dia precisarmos do Stripe.js no cliente, separa noutro arquivo).
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Lazy singleton. Throw cedo se SECRET_KEY ausente — rotas que dependem
 * disso devem retornar 503/erro claro pro caller.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY ausente — configure .env.local');
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  return _stripe;
}

/**
 * Helper pra checar se Stripe está configurado (sem throw).
 * Usado em rotas pra retornar 503 amigável quando env vars faltam.
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRO_PRICE_ID &&
    process.env.STRIPE_FOUNDER_PRICE_ID
  );
}

export const STRIPE_PRICE_IDS = {
  pro: () => process.env.STRIPE_PRO_PRICE_ID ?? '',
  founder: () => process.env.STRIPE_FOUNDER_PRICE_ID ?? '',
};

export type Tier = 'free' | 'pro' | 'founder';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
