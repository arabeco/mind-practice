'use client';

/**
 * fichasPurchase — chama a RPC `purchase_tier_with_fichas` pra trocar
 * fichas acumuladas por Pro (30 dias) ou Founder (vitalício).
 *
 * Não passa por Google Play / IAP. Gasto interno atômico no Supabase.
 *
 * Pré-condição: rodar SQL `2026-05-24-ficha-spend-tier.sql` no Supabase.
 */

import { getSupabase } from '@/lib/supabase/client';
import { FICHA_SPEND_CATALOG, type TierCode } from '@/constants/billingCatalog';

export interface FichasPurchaseSuccess {
  success: true;
  tier: TierCode;
  fichas_spent: number;
  fichas_before: number;
  fichas_after: number;
  tier_expires_at: string | null;
}

export interface FichasPurchaseFailure {
  success: false;
  reason: 'auth' | 'insufficient' | 'server' | 'unknown';
  error?: string;
  /** Saldo atual + saldo necessário (se reason=insufficient). */
  haveFichas?: number;
  needFichas?: number;
}

export type FichasPurchaseResult = FichasPurchaseSuccess | FichasPurchaseFailure;

/**
 * Compra um tier com fichas. Atômico server-side.
 */
export async function purchaseTierWithFichas(tier: TierCode): Promise<FichasPurchaseResult> {
  const product = FICHA_SPEND_CATALOG[tier];
  if (!product) {
    return { success: false, reason: 'unknown', error: `Tier desconhecido: ${tier}` };
  }

  const sb = getSupabase();
  if (!sb) {
    return { success: false, reason: 'auth', error: 'Supabase não configurado' };
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return { success: false, reason: 'auth', error: 'Faça login pra comprar' };
  }

  try {
    const { data, error } = await sb.rpc('purchase_tier_with_fichas', {
      p_tier_code: tier,
    });

    if (error) {
      // Parse o errcode P0001 messages
      const msg = error.message ?? '';

      // INSUFFICIENT_FICHAS:have=500,need=1000
      const match = msg.match(/INSUFFICIENT_FICHAS:have=(\d+),need=(\d+)/);
      if (match) {
        return {
          success: false,
          reason: 'insufficient',
          haveFichas: Number(match[1]),
          needFichas: Number(match[2]),
        };
      }

      return { success: false, reason: 'server', error: msg };
    }

    if (!data || !(data as { success?: boolean }).success) {
      return { success: false, reason: 'server', error: 'RPC retornou sem success' };
    }

    const result = data as {
      tier: TierCode;
      fichas_spent: number;
      fichas_before: number;
      fichas_after: number;
      tier_expires_at: string | null;
    };

    return {
      success: true,
      tier: result.tier,
      fichas_spent: result.fichas_spent,
      fichas_before: result.fichas_before,
      fichas_after: result.fichas_after,
      tier_expires_at: result.tier_expires_at,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, reason: 'server', error: msg };
  }
}
