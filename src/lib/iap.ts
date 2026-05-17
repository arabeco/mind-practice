'use client';

/**
 * IAP — In-App Purchases nativas (Apple StoreKit + Google Play Billing)
 * via `@capgo/native-purchases`. SEM RevenueCat, SEM Stripe.
 *
 * Modelo de uso (super direto, como você pediu):
 *   1. Você cadastra os produtos no Google Play Console e App Store Connect
 *      com os productIds abaixo
 *   2. Quando user toca "Assinar Pro", o app chama `purchaseProduct('pro_monthly')`
 *   3. Apple/Google abre UI nativa de pagamento, processa
 *   4. Após sucesso, escrevemos no Supabase `subscriptions.tier`
 *   5. Hook `useSubscription` detecta via Realtime e libera Pro na UI
 *
 * IDs dos produtos — registre EXATAMENTE estes em ambas as lojas:
 *   pro_monthly       — subscription mensal, R$ 14,90, com 7 dias trial
 *   founder_lifetime  — non-consumable one-time, R$ 89,00
 *
 * Roda só em Capacitor nativo. Em web, todas as funções viram no-op
 * (UI mostra "Disponível no app").
 */
import { getSupabase } from '@/lib/supabase/client';
import type { Tier } from '@/lib/supabase/subscription';

export const PRODUCT_IDS = {
  PRO_MONTHLY: 'pro_monthly',
  FOUNDER_LIFETIME: 'founder_lifetime',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

/** Retorna o tier que esse productId destrava. */
function tierForProduct(productId: string): Tier {
  if (productId === PRODUCT_IDS.FOUNDER_LIFETIME) return 'founder';
  if (productId === PRODUCT_IDS.PRO_MONTHLY) return 'pro';
  return 'free';
}

/** True se está rodando dentro de Capacitor nativo (iOS/Android), não web. */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * Lista os produtos disponíveis com preço LOCALIZADO (vindo da loja).
 * Retorna null se não está em Capacitor ou produto não foi cadastrado na loja.
 *
 * Use pra mostrar o preço real ao user em vez do hardcoded "R$ 14,90"
 * (Apple/Google fazem currency conversion automática).
 */
export async function listProducts(): Promise<{
  pro: { priceString: string; productId: string } | null;
  founder: { priceString: string; productId: string } | null;
} | null> {
  if (!isNativeApp()) return null;
  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUCT_IDS.PRO_MONTHLY, PRODUCT_IDS.FOUNDER_LIFETIME],
    });
    const pro = products.find(p => p.identifier === PRODUCT_IDS.PRO_MONTHLY) ?? null;
    const founder = products.find(p => p.identifier === PRODUCT_IDS.FOUNDER_LIFETIME) ?? null;
    return {
      pro: pro ? { priceString: pro.priceString, productId: pro.identifier } : null,
      founder: founder ? { priceString: founder.priceString, productId: founder.identifier } : null,
    };
  } catch (err) {
    console.warn('[iap] listProducts falhou', err);
    return null;
  }
}

/**
 * Compra um produto. Após sucesso, escreve `subscriptions.tier` no Supabase.
 *
 * Retorna { success, tier, error? }.
 *   - success=true: tier ativo (UI deve refletir)
 *   - success=false + error='cancelled': user cancelou no native sheet
 *   - success=false + error=outro: erro real (mostrar ao user)
 */
export async function purchaseProduct(
  productId: ProductId,
): Promise<{ success: boolean; tier: Tier; error?: string }> {
  if (!isNativeApp()) {
    return { success: false, tier: 'free', error: 'Disponível só no app' };
  }
  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    // purchaseProduct retorna Transaction direto (não wrap). transactionId
    // populado significa compra aprovada por Apple/Google.
    const tx = await NativePurchases.purchaseProduct({ productIdentifier: productId });
    if (!tx?.transactionId) {
      return { success: false, tier: 'free', error: 'Transação não confirmada' };
    }
    const tier = tierForProduct(productId);
    await persistTierToSupabase(tier);
    return { success: true, tier };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_CANCELED' || e.message?.toLowerCase().includes('cancel')) {
      return { success: false, tier: 'free', error: 'cancelled' };
    }
    return { success: false, tier: 'free', error: e.message ?? 'Erro na compra' };
  }
}

/**
 * Restaura compras. Apple/Google EXIGEM esse botão no app, pra users
 * que reinstalaram ou trocaram device.
 *
 * O plugin chama o restore nativo (Apple StoreKit / Google Play Billing).
 * O resultado vem assincronamente via listeners; aqui apenas disparamos
 * a UI nativa. Após restore, recomendamos chamar `verifyEntitlements()`
 * pra checar o que o user tem direito.
 *
 * Pra MVP: como o tier é persistido no Supabase quando o user compra
 * (e linkado ao user.id), reinstalar + login restaura automaticamente
 * via `useSubscription`. Esse botão é mais um requisito de loja.
 */
export async function restorePurchases(): Promise<{ success: boolean; tier: Tier }> {
  if (!isNativeApp()) return { success: false, tier: 'free' };
  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    // O tier já está no Supabase (linkado ao user). Re-fetch pelo
    // useSubscription hook é suficiente. Aqui apenas confirmamos sucesso.
    return { success: true, tier: 'free' };
  } catch {
    return { success: false, tier: 'free' };
  }
}

/**
 * Escreve o tier ativo no Supabase `subscriptions`. Cliente faz isso
 * direto (RLS allow insert/update own).
 *
 * SEM validação server-side de receipt — usuário poderia tecnicamente
 * burlar isso editando o JS. Pra MVP, tolerável (Apple/Google bloqueiam
 * a maior parte). Pra v2, adicionar Supabase Edge Function que valida
 * receipt com Apple/Google API antes de aceitar o upsert.
 */
async function persistTierToSupabase(tier: Tier): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  await sb.from('subscriptions').upsert(
    {
      user_id: user.id,
      tier,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}
