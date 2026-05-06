'use client';

/**
 * RevenueCat — abstração de IAP para Apple StoreKit + Google Play Billing
 * via Capacitor plugin.
 *
 * Idle até envs setadas:
 *   NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_...
 *   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
 *
 * Sem essas keys, todas as funções viram no-op (retornam null/false).
 * Permite buildar e rodar o app sem cobrança ativa.
 *
 * Setup quando ativar (no painel RevenueCat):
 *   1. Criar projeto no app.revenuecat.com
 *   2. Conectar App Store Connect + Google Play Console
 *   3. Criar produtos:
 *      - mindpractice_pro_monthly (subscription R$14,90/mês com 7d trial)
 *      - mindpractice_founder (one-time R$89, lifetime entitlement)
 *   4. Criar entitlements:
 *      - "pro" inclui mindpractice_pro_monthly
 *      - "founder" inclui mindpractice_founder
 *   5. Configurar webhook RevenueCat → Supabase Edge Function
 *      (atualiza subscriptions.tier baseado em entitlement ativo)
 *   6. Copiar API keys (iOS + Android) pro .env.local
 */
import type { Tier } from './supabase/subscription';

const PRODUCTS = {
  PRO_MONTHLY: 'mindpractice_pro_monthly',
  FOUNDER_LIFETIME: 'mindpractice_founder',
} as const;

const ENTITLEMENTS = {
  PRO: 'pro',
  FOUNDER: 'founder',
} as const;

let _initialized = false;

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor 7 expõe global Capacitor com isNativePlatform()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  // Capacitor expõe getPlatform()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platform = (window as any).Capacitor?.getPlatform?.();
  if (platform === 'ios') return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? null;
  if (platform === 'android') return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? null;
  return null;
}

/** True se RevenueCat está configurado E rodando em Capacitor nativo. */
export function isRevenueCatActive(): boolean {
  return isCapacitorNative() && getApiKey() !== null;
}

/**
 * Inicializa o SDK. Idempotente. Chamar uma vez após login.
 * Passar o user.id do Supabase pra linkar os 2 sistemas.
 */
export async function initRevenueCat(supabaseUserId: string): Promise<void> {
  if (_initialized) return;
  if (!isRevenueCatActive()) return;
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({ apiKey, appUserID: supabaseUserId });
    if (process.env.NODE_ENV !== 'production') {
      await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
    }
    _initialized = true;
  } catch (err) {
    console.warn('[revenuecat] init falhou:', err);
  }
}

/**
 * Lista produtos disponíveis (Pro mensal + Founder vitalício).
 * Retorna null se RevenueCat não ativo.
 */
export async function listOfferings(): Promise<{
  pro: { priceString: string; identifier: string } | null;
  founder: { priceString: string; identifier: string } | null;
} | null> {
  if (!isRevenueCatActive()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    const proPkg = current.availablePackages.find(p => p.product.identifier === PRODUCTS.PRO_MONTHLY);
    const founderPkg = current.availablePackages.find(p => p.product.identifier === PRODUCTS.FOUNDER_LIFETIME);
    return {
      pro: proPkg
        ? { priceString: proPkg.product.priceString, identifier: proPkg.identifier }
        : null,
      founder: founderPkg
        ? { priceString: founderPkg.product.priceString, identifier: founderPkg.identifier }
        : null,
    };
  } catch (err) {
    console.warn('[revenuecat] listOfferings falhou:', err);
    return null;
  }
}

/**
 * Compra um package por id. Após sucesso, RevenueCat dispara webhook pro
 * Supabase (configurado no painel) que atualiza `subscriptions.tier`.
 *
 * Cliente pode chamar `getActiveTier()` localmente pra refletir antes do
 * webhook chegar (entitlement vem na resposta).
 */
export async function purchasePackage(
  packageId: string,
): Promise<{ success: boolean; tier: Tier; error?: string }> {
  if (!isRevenueCatActive()) {
    return { success: false, tier: 'free', error: 'RevenueCat não ativo' };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);
    if (!pkg) return { success: false, tier: 'free', error: 'Package não encontrado' };

    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const entitlements = result.customerInfo.entitlements.active;
    const tier: Tier = entitlements[ENTITLEMENTS.FOUNDER]
      ? 'founder'
      : entitlements[ENTITLEMENTS.PRO]
      ? 'pro'
      : 'free';
    return { success: true, tier };
  } catch (err) {
    const e = err as { userCancelled?: boolean; message?: string };
    if (e.userCancelled) return { success: false, tier: 'free', error: 'Cancelado' };
    return { success: false, tier: 'free', error: e.message ?? 'Erro' };
  }
}

/**
 * Lê o tier ativo localmente do cache do RevenueCat (sem rede).
 * Use pra hidratar UI rápido enquanto webhook não chegou no Supabase.
 */
export async function getActiveTierFromRevenueCat(): Promise<Tier> {
  if (!isRevenueCatActive()) return 'free';
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const info = await Purchases.getCustomerInfo();
    const ent = info.customerInfo.entitlements.active;
    if (ent[ENTITLEMENTS.FOUNDER]) return 'founder';
    if (ent[ENTITLEMENTS.PRO]) return 'pro';
    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Restore purchases — Apple/Google exigem que apps tenham botão "Restaurar
 * Compras" pra usuários que reinstalaram o app ou trocaram de device.
 */
export async function restorePurchases(): Promise<{ success: boolean; tier: Tier }> {
  if (!isRevenueCatActive()) return { success: false, tier: 'free' };
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const result = await Purchases.restorePurchases();
    const ent = result.customerInfo.entitlements.active;
    const tier: Tier = ent[ENTITLEMENTS.FOUNDER]
      ? 'founder'
      : ent[ENTITLEMENTS.PRO]
      ? 'pro'
      : 'free';
    return { success: true, tier };
  } catch {
    return { success: false, tier: 'free' };
  }
}
