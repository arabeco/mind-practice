'use client';

/**
 * Subscription — read-only client-side da row do user em `subscriptions`.
 * RLS permite read own; writes são via webhook (service role).
 *
 * Hook `useSubscription` mantém estado reativo via Realtime channel
 * (atualiza ~1s após o webhook persistir mudança).
 */
import { useEffect, useState } from 'react';
import { getSupabase } from './client';

/**
 * Tier de assinatura. Source of truth: subscriptions.tier no Supabase.
 * Webhook (Stripe legado ou RevenueCat futuro) escreve aqui.
 */
export type Tier = 'free' | 'pro' | 'founder';

/**
 * Status da assinatura. Mapeado do provider (Stripe ou RevenueCat).
 */
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete';

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier: Tier;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export async function getMySubscription(): Promise<SubscriptionRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (data as SubscriptionRow) ?? null;
}

export interface UseSubscriptionValue {
  subscription: SubscriptionRow | null;
  loading: boolean;
  /** Tier ativo. 'free' default se não houver row, ou tier free explícito. */
  tier: Tier;
  /** True se tier ∈ {pro, founder} E status permite acesso. */
  isPro: boolean;
  /** Force refetch (ex: após retornar de Checkout). */
  refresh: () => Promise<void>;
}

export function useSubscription(userId: string | null): UseSubscriptionValue {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const sub = await getMySubscription();
    setSubscription(sub);
    setLoading(false);
  };

  // Initial fetch + when userId muda
  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [userId]);

  // Realtime: refetch quando a row muda (ex: webhook upgrada tier)
  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`subscription-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [userId]);

  const tier: Tier = subscription?.tier ?? 'free';
  const status = subscription?.status ?? 'active';
  const isPro =
    (tier === 'pro' || tier === 'founder') &&
    (status === 'active' || status === 'trialing');

  return { subscription, loading, tier, isPro, refresh };
}
