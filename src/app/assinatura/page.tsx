'use client';

/**
 * /assinatura — loja completa.
 *
 * 3 caminhos:
 *   1. Comprar packs de fichas (IAP Google Play, só Android nativo)
 *   2. Comprar Pro com fichas (1000) ou R$ 14,90/mês (IAP)
 *   3. Comprar Founder com fichas (8000, vitalício)
 *
 * Detecta plataforma:
 *   - Native Android = mostra todos os botões IAP
 *   - Web = mostra "Em breve no app" + waitlist + opção de gastar fichas
 *
 * IMPORTANTE: enquanto os secrets do Google Play não estiverem
 * configurados no Supabase, as compras IAP vão falhar com
 * GOOGLE_PLAY_AUTH_NOT_CONFIGURED. Mostro alerta visível pra você
 * lembrar.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import { useSubscription } from '@/lib/supabase/subscription';
import { useToast } from '@/components/Toast';
import { Button, Card, Badge, Dialog } from '@/components/ui';
import WaitlistForm from '@/components/landing/WaitlistForm';
import { canUseNativeStoreBilling, getNativeActivePurchases } from '@/lib/nativeBilling';
import { purchaseIap } from '@/lib/iapPurchase';
import { purchaseTierWithFichas } from '@/lib/fichasPurchase';
import { IAP_CATALOG, FICHA_SPEND_CATALOG, type TierCode } from '@/constants/billingCatalog';
import { STAT_KEYS } from '@/types/game';
import { AXIS_POLE_SLUGS } from '@/lib/axisPoles';
import PoleIcon from '@/components/PoleIcon';
import { PackIcon, TierIcon } from '@/components/StoreIcons';

// Detecta se está em ambiente de desenvolvimento — pra mostrar banner
// alertando sobre secrets não configurados.
const SECRETS_NOT_CONFIGURED_NOTE = false; // secrets Google Play setados na Supabase (2026-05-30)

export default function AssinaturaPage() {
  const { user, enabled, loading: authLoading } = useAuth();
  const { state } = useGame();
  const { subscription, isPro, loading: subLoading, refresh: refreshSub } =
    useSubscription(user?.id ?? null);
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    tier: TierCode;
    priceFichas: number;
  } | null>(null);

  const native = canUseNativeStoreBilling();
  const fichas = state.wallet?.fichas ?? 0;
  const currentTier = subscription?.tier ?? 'free';

  // ============================================================
  // Handlers
  // ============================================================
  async function handlePurchaseFichas(productCode: string) {
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmitting(productCode);
    const result = await purchaseIap(productCode);
    setSubmitting(null);

    if (result.success) {
      const added = result.fichas_added ?? 0;
      toast.success(`+${added} fichas creditadas`);
      // Aguarda o snapshot do GameState atualizar via sync próxima
    } else if (result.reason === 'cancelled') {
      // silencioso
    } else if (result.reason === 'unavailable') {
      toast.error('Compra IAP disponível só no app Android');
    } else {
      toast.error(result.error ?? 'Falha na compra');
    }
  }

  async function handlePurchaseProIap() {
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmitting('pro_iap');
    const result = await purchaseIap('pro_monthly');
    setSubmitting(null);

    if (result.success) {
      toast.success('Pro ativado');
      await refreshSub();
    } else if (result.reason === 'cancelled') {
      // silencioso
    } else if (result.reason === 'unavailable') {
      toast.error('Disponível só no app Android');
    } else {
      toast.error(result.error ?? 'Falha na compra');
    }
  }

  async function handlePurchaseTierWithFichas(tier: TierCode) {
    if (!user) {
      router.push('/login');
      setConfirmDialog(null);
      return;
    }
    setSubmitting(`fichas_${tier}`);
    setConfirmDialog(null);
    const result = await purchaseTierWithFichas(tier);
    setSubmitting(null);

    if (result.success) {
      const tierName = tier === 'founder' ? 'Founder' : 'Pro';
      toast.success(`${tierName} ativado com ${result.fichas_spent} fichas`);
      await refreshSub();
    } else if (result.reason === 'insufficient') {
      toast.error(
        `Você tem ${result.haveFichas ?? 0} fichas, precisa de ${result.needFichas ?? 0}`,
      );
    } else {
      toast.error(result.error ?? 'Falha na compra');
    }
  }

  async function handleRestorePurchases() {
    setSubmitting('restore');
    const purchases = await getNativeActivePurchases();
    setSubmitting(null);

    if (purchases.length === 0) {
      toast.toast('Nenhuma compra ativa encontrada');
      return;
    }
    toast.success(
      `${purchases.length} compra(s) ativa(s) — reconciliando…`,
    );
    // TODO: chamar verify-google-play-purchase em cada uma pra restaurar
    // estado server-side. Implementar quando configurar secrets.
  }

  // ============================================================
  // Render
  // ============================================================
  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <div className="mt-20 text-center text-sm text-text-tertiary">Carregando...</div>
      </main>
    );
  }

  const hasEnoughForPro = fichas >= FICHA_SPEND_CATALOG.pro.priceFichas;
  const hasEnoughForFounder = fichas >= FICHA_SPEND_CATALOG.founder.priceFichas;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-8">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-tertiary">
          Loja
        </p>
        <h1 className="mt-2 text-3xl font-bold text-accent-gold">Fichas e Premium</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Compre fichas pra desbloquear decks ou troque por Pro/Founder.
        </p>
      </header>

      {/* ⚠️ Alerta dev: secrets não configurados */}
      {SECRETS_NOT_CONFIGURED_NOTE && (
        <Card variant="solid" padding="md" className="mt-4 border-state-warning-border bg-state-warning-bg">
          <div className="flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div className="flex-1 text-xs text-state-warning">
              <p className="font-bold">Setup pendente</p>
              <p className="mt-1 text-text-secondary">
                Secrets <code className="font-mono">GOOGLE_PLAY_PACKAGE_NAME</code> e
                <code className="font-mono"> GOOGLE_PLAY_SERVICE_ACCOUNT_JSON</code> ainda
                não estão configurados no Supabase. Compras IAP vão falhar até você
                rodar:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-bg-base px-2 py-1 text-[10px] text-text-primary">
{`npx supabase functions deploy verify-google-play-purchase --project-ref SEU_REF
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.mindpractice.app ...`}
              </pre>
              <p className="mt-1 text-text-tertiary">
                Compras com <strong>fichas</strong> (Pro/Founder) já funcionam — não dependem do Google Play.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Saldo de fichas + status do tier */}
      {user && enabled && !subLoading && (
        <Card variant="elevated" padding="md" glow className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Seu saldo
              </p>
              <p className="mt-1 text-3xl font-black text-accent-gold">
                {fichas.toLocaleString('pt-BR')}
                <span className="ml-2 text-sm font-normal text-text-tertiary">fichas</span>
              </p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  isPro ? (currentTier === 'founder' ? 'gold' : 'purple') : 'neutral'
                }
              >
                {currentTier}
              </Badge>
              {subscription?.current_period_end && (
                <p className="mt-1 text-[10px] text-text-tertiary">
                  até {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================================
          PACKS DE FICHAS (IAP)
          ============================================================ */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Comprar fichas</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          {native
            ? 'Pagamento via Google Play.'
            : 'Disponível apenas no app Android.'}
        </p>

        {!native && (
          <Card variant="glass" padding="md" className="mt-3">
            <p className="text-sm text-text-secondary">
              Os pacotes de fichas só aparecem no aplicativo Android. Baixe pela Google Play pra comprar e jogar offline.
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              Sem o app por enquanto? Entre na lista de espera e a gente avisa:
            </p>
            <div className="mt-3">
              <WaitlistForm source="assinatura-fichas" ctaLabel="Avise-me" />
            </div>
          </Card>
        )}

        {native && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(['fichas_100', 'fichas_300', 'fichas_700'] as const).map(code => {
              const product = IAP_CATALOG[code];
              const amount =
                product.benefit.kind === 'fichas' ? product.benefit.amount : 0;
              return (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card variant="glass" padding="md" className="flex flex-col h-full items-center text-center">
                    <PackIcon code={code} size={96} className="mb-2" />
                    <div className="flex-1">
                      <p className="text-2xl font-black text-accent-gold">
                        +{amount}
                      </p>
                      <p className="text-xs text-text-tertiary">fichas</p>
                      <p className="mt-3 text-lg font-bold text-text-primary">
                        R$ {product.priceBrl.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      fullWidth
                      className="mt-4"
                      loading={submitting === code}
                      onClick={() => handlePurchaseFichas(code)}
                    >
                      Comprar
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          OS 10 POLOS — teaser do que o jogador descobre sobre si
          ============================================================ */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Os 10 polos do seu perfil</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Cinco eixos, dois polos cada. Suas escolhas revelam pra qual lado voce pesa em cada um.
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
          <div className="grid grid-cols-5 gap-x-2 gap-y-3">
            {STAT_KEYS.map(k => (
              <PoleIcon
                key={`${k}-neg`}
                axis={k}
                pole={AXIS_POLE_SLUGS[k][0]}
                size={42}
                showLabel
              />
            ))}
            {STAT_KEYS.map(k => (
              <PoleIcon
                key={`${k}-pos`}
                axis={k}
                pole={AXIS_POLE_SLUGS[k][1]}
                size={42}
                showLabel
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          TIERS — PRO E FOUNDER
          ============================================================ */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Premium</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Troque fichas por acesso completo ao catálogo de decks.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* PRO */}
          <Card variant="elevated" padding="lg" glow className="relative flex flex-col">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <Badge variant="gold">Recomendado</Badge>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <TierIcon code="pro" size={56} />
              <div>
                <h3 className="text-xl font-bold text-text-primary leading-tight">Pro</h3>
                <p className="text-xs text-text-tertiary">30 dias de acesso</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Partidas ilimitadas</li>
              <li>• Todas as temporadas</li>
              <li>• Cartões premium pra compartilhar</li>
              <li>• Histórico completo de evolução</li>
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              {/* Botão fichas */}
              <Button
                variant="primary"
                fullWidth
                loading={submitting === 'fichas_pro'}
                disabled={!hasEnoughForPro}
                onClick={() =>
                  setConfirmDialog({ tier: 'pro', priceFichas: FICHA_SPEND_CATALOG.pro.priceFichas })
                }
              >
                {hasEnoughForPro
                  ? `Pagar com ${FICHA_SPEND_CATALOG.pro.priceFichas} fichas`
                  : `Precisa de ${FICHA_SPEND_CATALOG.pro.priceFichas} fichas (tem ${fichas})`}
              </Button>

              {/* Botão IAP direto (só native) */}
              {native && (
                <Button
                  variant="secondary"
                  fullWidth
                  loading={submitting === 'pro_iap'}
                  onClick={handlePurchaseProIap}
                >
                  Ou R$ 14,90/mês via Google Play
                </Button>
              )}
            </div>
          </Card>

          {/* FOUNDER */}
          <Card
            variant="glass"
            padding="lg"
            className="relative flex flex-col border-accent-gold-border"
          >
            <div className="mb-2 flex items-center gap-3">
              <TierIcon code="founder" size={56} />
              <div>
                <h3 className="text-xl font-bold text-accent-gold leading-tight">Founder</h3>
                <p className="text-xs text-text-tertiary">Vitalício — sem expiração</p>
              </div>
            </div>
            <ul className="mt-2 space-y-2 text-sm text-text-secondary">
              <li>• Tudo do Pro pra sempre</li>
              <li>• Selo Founder fixo no seu perfil</li>
              <li>• Decks novos sempre antes de todo mundo</li>
              <li>• Voto nos decks que vêm por aí</li>
              <li>• Só dá pra ter trocando fichas (prestígio)</li>
            </ul>

            <div className="mt-6">
              <Button
                variant="primary"
                fullWidth
                loading={submitting === 'fichas_founder'}
                disabled={!hasEnoughForFounder}
                onClick={() =>
                  setConfirmDialog({
                    tier: 'founder',
                    priceFichas: FICHA_SPEND_CATALOG.founder.priceFichas,
                  })
                }
              >
                {hasEnoughForFounder
                  ? `Pagar com ${FICHA_SPEND_CATALOG.founder.priceFichas} fichas`
                  : `Precisa de ${FICHA_SPEND_CATALOG.founder.priceFichas} fichas (tem ${fichas})`}
              </Button>
              {!hasEnoughForFounder && native && (
                <p className="mt-2 text-center text-[11px] text-text-tertiary">
                  Compre packs acima pra acumular mais fichas
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Restore purchases (requisito Google/Apple) */}
      {native && (
        <section className="mt-10 text-center">
          <Button
            variant="ghost"
            size="sm"
            loading={submitting === 'restore'}
            onClick={handleRestorePurchases}
          >
            Restaurar compras
          </Button>
        </section>
      )}

      {/* Footer */}
      <p className="mt-10 text-center text-[11px] text-text-tertiary">
        {native
          ? 'Pagamentos processados pela Google Play. Cancele quando quiser.'
          : 'Compras IAP via Google Play. Disponível no app Android.'}
      </p>

      {/* ============================================================
          Modal de confirmação pra gasto de fichas
          ============================================================ */}
      <Dialog
        open={confirmDialog !== null}
        onClose={() => setConfirmDialog(null)}
      >
        {confirmDialog && (
          <div className="text-center">
            <Badge variant={confirmDialog.tier === 'founder' ? 'gold' : 'purple'}>
              Confirmar
            </Badge>
            <h3 className="mt-3 text-xl font-bold text-text-primary">
              Gastar {confirmDialog.priceFichas} fichas?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {confirmDialog.tier === 'founder'
                ? 'Founder é vitalício — sem renovação.'
                : 'Pro ativa por 30 dias. Depois você decide se renova.'}
            </p>
            <p className="mt-3 text-xs text-text-tertiary">
              Saldo após: <strong>{fichas - confirmDialog.priceFichas} fichas</strong>
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                fullWidth
                loading={submitting === `fichas_${confirmDialog.tier}`}
                onClick={() => handlePurchaseTierWithFichas(confirmDialog.tier)}
              >
                Confirmar
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmDialog(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
