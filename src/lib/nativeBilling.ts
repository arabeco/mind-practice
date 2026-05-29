'use client';

/**
 * nativeBilling — bridge TypeScript pro plugin nativo StoreBilling (Java).
 *
 * Espelhado do padrão GOL 1.006 (em produção). Expõe 4 funções:
 *   - getNativeStoreBillingStatus()
 *   - getNativeStoreProduct(productId, kind)
 *   - purchaseNativeProduct(productId, kind)
 *   - getNativeActivePurchases()
 *
 * Idle em web — `canUseNativeStoreBilling()` retorna false fora do app
 * Capacitor nativo Android. Use `BillingCheckoutGate` (futuro Passo 7)
 * pra decidir UI native vs web fallback.
 *
 * IMPORTANTE: o resultado de `purchaseNativeProduct` SEMPRE vem com
 * `needsServerReconciliation: true`. O caller PRECISA chamar Edge
 * Function `verify-google-play-purchase` antes de creditar qualquer
 * benefit. Cliente NUNCA é autoridade.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BillingMonetizationKind } from '@/constants/billingCatalog';

// ============================================================
// Tipos do payload retornado pelo plugin Java
// ============================================================

export interface NativeStoreBillingStatus {
  platform: 'android';
  available: boolean;
  connected: boolean;
  canMakePayments: boolean;
  reason: string;
  responseCode: number;
}

export interface NativeStoreBillingProduct {
  platform: 'android';
  available: boolean;
  productId: string;
  title: string;
  description: string;
  formattedPrice: string;
  offerTokenAvailable: boolean;
  type: BillingMonetizationKind;
}

export interface NativeStoreBillingPurchaseResult {
  platform: 'android';
  purchaseState: 'pending' | 'purchased';
  orderId: string;
  purchaseToken: string;
  acknowledged: boolean;
  consumed: boolean;
  packageName: string;
  products: string[];
  /** SEMPRE true. Lembrete: chame Edge Function antes de creditar. */
  needsServerReconciliation: boolean;
  developerNote?: string;
}

// ============================================================
// Interface do plugin (deve casar com @CapacitorPlugin(name="StoreBilling"))
// ============================================================

interface StoreBillingPlugin {
  getStatus(): Promise<NativeStoreBillingStatus>;
  getProduct(options: {
    productId: string;
    kind: BillingMonetizationKind;
  }): Promise<NativeStoreBillingProduct>;
  purchaseProduct(options: {
    productId: string;
    kind: BillingMonetizationKind;
  }): Promise<NativeStoreBillingPurchaseResult>;
  getActivePurchases(): Promise<{ purchases: NativeStoreBillingPurchaseResult[] }>;
}

const StoreBilling = registerPlugin<StoreBillingPlugin>('StoreBilling');

// ============================================================
// Guard: só roda em Capacitor Android nativo
// ============================================================

/**
 * True se está rodando dentro de Capacitor Android. Em iOS (futuro),
 * o caller deve usar StoreKit/IAP iOS — esse bridge é só Android.
 */
export const canUseNativeStoreBilling = (): boolean => {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return false;
  const platform = String(cap?.getPlatform?.() || '').trim().toLowerCase();
  return platform === 'android';
};

// ============================================================
// Helpers internos
// ============================================================

const normalizePluginError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return new Error(msg);
  }
  return new Error('Native store billing indisponivel');
};

// ============================================================
// API pública
// ============================================================

/**
 * Confere status do BillingClient. Retorna estrutura com `connected`
 * e `canMakePayments`. Em web retorna available=false.
 */
export const getNativeStoreBillingStatus = async (): Promise<NativeStoreBillingStatus> => {
  if (!canUseNativeStoreBilling()) {
    return {
      platform: 'android',
      available: false,
      connected: false,
      canMakePayments: false,
      reason: 'Native billing indisponivel fora do app Android.',
      responseCode: -1,
    };
  }
  try {
    return await StoreBilling.getStatus();
  } catch (error) {
    throw normalizePluginError(error);
  }
};

/**
 * Busca info de UM produto da Google Play (preço, título, etc).
 * Use pra mostrar preço LOCAL real (Apple/Google convertem moeda).
 *
 * @throws Error se produto não cadastrado na Play Console
 */
export const getNativeStoreProduct = async (
  productId: string,
  kind: BillingMonetizationKind,
): Promise<NativeStoreBillingProduct> => {
  if (!canUseNativeStoreBilling()) {
    throw new Error('Native billing disponivel apenas no app Android');
  }
  try {
    return await StoreBilling.getProduct({ productId, kind });
  } catch (error) {
    throw normalizePluginError(error);
  }
};

/**
 * Inicia compra nativa. Abre UI do Google Play. Retorna purchase token
 * + order ID que o CALLER PRECISA passar pra Edge Function
 * `verify-google-play-purchase` antes de creditar benefit.
 *
 * @throws Error 'PURCHASE_CANCELED' se user fechou
 * @throws Error 'PURCHASE_FAILED' se Google rejeitou
 * @throws Error 'PURCHASE_LAUNCH_FAILED' se nao conseguiu abrir UI
 */
export const purchaseNativeProduct = async (
  productId: string,
  kind: BillingMonetizationKind,
): Promise<NativeStoreBillingPurchaseResult> => {
  if (!canUseNativeStoreBilling()) {
    throw new Error('Compra nativa disponivel apenas no app Android');
  }
  try {
    return await StoreBilling.purchaseProduct({ productId, kind });
  } catch (error) {
    throw normalizePluginError(error);
  }
};

/**
 * Lista compras ativas do usuário no Google Play. Usado pra
 * "Restaurar compras" (botão obrigatório na loja).
 *
 * Retorna lista vazia se não tem nada ou se está fora do app.
 */
export const getNativeActivePurchases = async (): Promise<
  NativeStoreBillingPurchaseResult[]
> => {
  if (!canUseNativeStoreBilling()) return [];
  try {
    const result = await StoreBilling.getActivePurchases();
    return result?.purchases ?? [];
  } catch (error) {
    console.warn('[nativeBilling] getActivePurchases falhou', error);
    return [];
  }
};

/**
 * True se o user cancelou a compra (fechou Google Play UI).
 * Use pra silenciar toast de erro nesse caso.
 */
export const isUserCanceledError = (error: unknown): boolean => {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return /PURCHASE_CANCELED|cancel|cancelada/i.test(msg);
};
