'use client';

/**
 * iapPurchase — orquestra o fluxo completo de compra IAP:
 *
 *   1. Plugin nativo (StoreBilling) abre Google Play UI
 *   2. Após confirmação, envia purchaseToken pra Edge Function
 *   3. Edge Function valida com Google API + chama grant_mobile_purchase
 *   4. Retorna resultado normalizado pra UI mostrar feedback
 *
 * Use esse helper na UI em vez de chamar nativeBilling direto —
 * ele cuida da validação server-side OBRIGATÓRIA.
 */

import { getSupabase } from '@/lib/supabase/client';
import {
  purchaseNativeProduct,
  canUseNativeStoreBilling,
  isUserCanceledError,
  type NativeStoreBillingPurchaseResult,
} from '@/lib/nativeBilling';
import { IAP_CATALOG, type IapProduct } from '@/constants/billingCatalog';

export interface IapPurchaseSuccess {
  success: true;
  duplicate: boolean;
  benefit_kind: 'fichas' | 'tier';
  /** Quantidade de fichas creditadas (se kind=fichas). */
  fichas_added?: number;
  fichas_after?: number;
  /** Tier ativado (se kind=tier). */
  tier?: 'pro' | 'founder';
  tier_expires_at?: string | null;
  /** Status do consume/acknowledge no Google (consumed, acknowledged, failed, etc). */
  consume_status?: string;
  ack_status?: string;
}

export interface IapPurchaseFailure {
  success: false;
  /** 'cancelled' = user fechou a UI. Outros = erro real. */
  reason: 'cancelled' | 'pending' | 'unavailable' | 'auth' | 'server' | 'native' | 'unknown';
  error?: string;
  /** Se a compra foi feita no Google mas falhou no server, vem aqui pra retry. */
  unverifiedPurchase?: NativeStoreBillingPurchaseResult;
}

export type IapPurchaseResult = IapPurchaseSuccess | IapPurchaseFailure;

/**
 * Compra um produto IAP do catálogo. Faz fluxo nativo + server validate.
 *
 * @param productCode código do catálogo (ex: 'fichas_100', 'pro_monthly')
 * @returns resultado normalizado (success ou failure detalhada)
 */
export async function purchaseIap(productCode: string): Promise<IapPurchaseResult> {
  const product = IAP_CATALOG[productCode] as IapProduct | undefined;
  if (!product) {
    return { success: false, reason: 'unknown', error: `Produto desconhecido: ${productCode}` };
  }

  if (!canUseNativeStoreBilling()) {
    return {
      success: false,
      reason: 'unavailable',
      error: 'Compra IAP disponível só no app Android',
    };
  }

  // 1. Chama plugin nativo
  let native: NativeStoreBillingPurchaseResult;
  try {
    const kind = product.kind === 'subscription' ? 'subscription' : 'consumable';
    native = await purchaseNativeProduct(product.googlePlayProductId, kind);
  } catch (err) {
    if (isUserCanceledError(err)) {
      return { success: false, reason: 'cancelled' };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, reason: 'native', error: msg };
  }

  // Pending (ex: PIX, slow card) — não dá pra validar agora
  if (native.purchaseState === 'pending') {
    return {
      success: false,
      reason: 'pending',
      error: 'Compra pendente. Confirme o pagamento na Google Play e tente restaurar depois.',
      unverifiedPurchase: native,
    };
  }

  // 2. Server validation OBRIGATÓRIO
  const sb = getSupabase();
  if (!sb) {
    return {
      success: false,
      reason: 'auth',
      error: 'Supabase não configurado',
      unverifiedPurchase: native,
    };
  }

  const { data: { session } } = await sb.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    return {
      success: false,
      reason: 'auth',
      error: 'Sessão expirada — faça login novamente',
      unverifiedPurchase: native,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      success: false,
      reason: 'auth',
      error: 'NEXT_PUBLIC_SUPABASE_URL ausente',
      unverifiedPurchase: native,
    };
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/verify-google-play-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        productCode,
        productId: native.products[0] ?? product.googlePlayProductId,
        purchaseToken: native.purchaseToken,
        orderId: native.orderId,
        packageName: native.packageName,
        platform: 'android',
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.success) {
      return {
        success: false,
        reason: 'server',
        error: data.error ?? `HTTP ${resp.status}`,
        unverifiedPurchase: native,
      };
    }

    return {
      success: true,
      duplicate: Boolean(data.duplicate),
      benefit_kind: data.benefit_kind,
      fichas_added: data.fichas_added,
      fichas_after: data.fichas_after,
      tier: data.tier,
      tier_expires_at: data.tier_expires_at,
      consume_status: data.consume_status,
      ack_status: data.ack_status,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      reason: 'server',
      error: `Rede falhou: ${msg}`,
      unverifiedPurchase: native,
    };
  }
}
