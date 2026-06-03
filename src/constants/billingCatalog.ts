/**
 * Billing Catalog — fonte única dos produtos do MindPractice.
 *
 * 5 produtos no total, 2 tipos de pagamento:
 *
 * IAP nativo (Google Play / App Store) — 4 produtos:
 *   - fichas_100 (R$ 4,90 → 100 fichas)
 *   - fichas_300 (R$ 12,90 → 350 fichas, +17% bonus)
 *   - fichas_700 (R$ 24,90 → 800 fichas, +14% bonus)
 *   - pro_monthly (R$ 14,90/mês, subscription, 7d trial)
 *
 * Apenas fichas (gasto interno) — 2 produtos (economia v2):
 *   - pro_monthly (custa 400 fichas, expira em 30 dias, força reroll)
 *   - founder_lifetime (custa 2500 fichas, vitalício, NÃO vende por R$)
 *
 * Padrão: Edge Function `verify-google-play-purchase` valida o productId
 * recebido contra esse catálogo. Cliente nunca é autoridade.
 */

export type BillingMonetizationKind = 'consumable' | 'entitlement' | 'subscription';

export type TierCode = 'pro' | 'founder';

export interface IapProduct {
  /** Código interno usado em todo o app. */
  code: string;
  /** ID exato no Google Play Console. */
  googlePlayProductId: string;
  /** ID exato no App Store Connect (preenche quando ativar iOS). */
  appStoreProductId: string;
  /** Tipo no fluxo de Billing nativo. */
  kind: BillingMonetizationKind;
  /** Preço em BRL (display fallback — Apple/Google retornam preço local em runtime). */
  priceBrl: number;
  /** Benefício canônico — usado pelo RPC pra creditar. */
  benefit:
    | { kind: 'fichas'; amount: number }
    | { kind: 'tier'; tier: TierCode; durationDays?: number };
}

export interface FichaSpendProduct {
  /** Código interno. */
  code: TierCode;
  /** Preço em fichas (gasto interno). */
  priceFichas: number;
  /** Duração em dias após compra. `null` = vitalício. */
  durationDays: number | null;
  /** Tier que destrava. */
  tier: TierCode;
}

// ============================================================
// Produtos IAP nativos
// ============================================================
export const IAP_CATALOG: Record<string, IapProduct> = {
  fichas_100: {
    code: 'fichas_100',
    googlePlayProductId: 'fichas_100',
    appStoreProductId: 'app.mindpractice.fichas.pack100',
    kind: 'consumable',
    priceBrl: 4.9,
    benefit: { kind: 'fichas', amount: 100 },
  },
  fichas_300: {
    code: 'fichas_300',
    googlePlayProductId: 'fichas_300',
    appStoreProductId: 'app.mindpractice.fichas.pack300',
    kind: 'consumable',
    priceBrl: 12.9,
    benefit: { kind: 'fichas', amount: 350 },
  },
  fichas_700: {
    code: 'fichas_700',
    googlePlayProductId: 'fichas_700',
    appStoreProductId: 'app.mindpractice.fichas.pack700',
    kind: 'consumable',
    priceBrl: 24.9,
    benefit: { kind: 'fichas', amount: 800 },
  },
  pro_monthly: {
    code: 'pro_monthly',
    googlePlayProductId: 'pro_monthly',
    appStoreProductId: 'app.mindpractice.subscription.pro',
    kind: 'subscription',
    priceBrl: 14.9,
    benefit: { kind: 'tier', tier: 'pro', durationDays: 30 },
  },
};

// ============================================================
// Compras com fichas (gasto interno, sem rede)
// ============================================================
export const FICHA_SPEND_CATALOG: Record<TierCode, FichaSpendProduct> = {
  pro: {
    code: 'pro',
    priceFichas: 400, // v2: ~20 dias de f2p (era 1000)
    durationDays: 30, // expira em 30d, força reroll
    tier: 'pro',
  },
  founder: {
    code: 'founder',
    priceFichas: 2500, // v2: prestígio ~125 dias (era 8000)
    durationDays: null, // vitalício
    tier: 'founder',
  },
};

// ============================================================
// Helpers
// ============================================================

/**
 * Lookup IAP product by Google Play product ID (server-side validação).
 */
export function findIapByGoogleProductId(productId: string): IapProduct | null {
  for (const product of Object.values(IAP_CATALOG)) {
    if (product.googlePlayProductId === productId) return product;
  }
  return null;
}

/**
 * Lista os 4 productIds que devem ser cadastrados no Google Play Console.
 */
export const GOOGLE_PLAY_PRODUCT_IDS = Object.values(IAP_CATALOG).map(
  p => p.googlePlayProductId,
);

/**
 * Lista os 4 productIds que devem ser cadastrados no App Store Connect.
 */
export const APP_STORE_PRODUCT_IDS = Object.values(IAP_CATALOG).map(
  p => p.appStoreProductId,
);
