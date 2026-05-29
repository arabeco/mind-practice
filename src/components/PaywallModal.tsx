'use client';

/**
 * PaywallModal — modal contextual mostrado quando user atinge gate
 * (ex: tenta abrir deck Pro+, ou estoura cap diário de runs).
 *
 * Comportamento adaptado pra economia de fichas (Passo 8):
 *   - Mostra saldo atual de fichas
 *   - Se user tem 1000+ fichas → botão "Pagar com fichas" funciona NO MODAL
 *     (atómico via RPC, sem precisar navegar)
 *   - Se não tem → mostra quanto falta + leva pro /assinatura pra comprar
 *     pack de fichas ou Pro direto via IAP
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useSubscription } from '@/lib/supabase/subscription';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Button, Dialog, Badge } from '@/components/ui';
import { FICHA_SPEND_CATALOG } from '@/constants/billingCatalog';
import { purchaseTierWithFichas } from '@/lib/fichasPurchase';

export type PaywallReason = 'deck_locked' | 'run_cap' | 'share_premium';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const REASON_COPY: Record<PaywallReason, { headline: string; body: string }> = {
  deck_locked: {
    headline: 'Esse deck é Pro',
    body: 'Decks além da Fundação destravam com Pro — pague com 1000 fichas ou R$ 14,90/mês.',
  },
  run_cap: {
    headline: 'Limite de runs do dia',
    body: 'Você usou suas 3 runs grátis. Pro destrava runs ilimitadas por 30 dias.',
  },
  share_premium: {
    headline: 'Share card premium',
    body: 'Cards visuais avançados são exclusivos Pro. Destrave com 1000 fichas ou R$ 14,90.',
  },
};

const PRO_PRICE_FICHAS = FICHA_SPEND_CATALOG.pro.priceFichas;

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const router = useRouter();
  const { state } = useGame();
  const { user } = useAuth();
  const { refresh: refreshSub } = useSubscription(user?.id ?? null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const copy = REASON_COPY[reason];
  const fichas = state.wallet?.fichas ?? 0;
  const hasEnough = fichas >= PRO_PRICE_FICHAS;
  const fichasFaltando = PRO_PRICE_FICHAS - fichas;

  async function handlePayWithFichas() {
    if (!user) {
      onClose();
      router.push('/login');
      return;
    }
    setSubmitting(true);
    const result = await purchaseTierWithFichas('pro');
    setSubmitting(false);

    if (result.success) {
      toast.success(`Pro ativado com ${result.fichas_spent} fichas`);
      await refreshSub();
      onClose();
    } else if (result.reason === 'insufficient') {
      toast.error(
        `Saldo insuficiente: tem ${result.haveFichas ?? 0}, precisa de ${result.needFichas ?? 0}`,
      );
    } else {
      toast.error(result.error ?? 'Falha na compra');
    }
  }

  function handleGoToAssinatura() {
    onClose();
    router.push('/assinatura');
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="text-center">
        <Badge variant="gold">Pro</Badge>
        <h2 className="mt-3 text-xl font-bold text-text-primary">{copy.headline}</h2>
        <p className="mt-2 text-sm text-text-secondary">{copy.body}</p>
      </div>

      {/* Saldo de fichas */}
      {user && (
        <div className="mt-5 rounded-xl border border-border-default bg-bg-glass px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
            Seu saldo
          </p>
          <p className="mt-0.5 text-xl font-black text-accent-gold">
            {fichas.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-text-tertiary">fichas</span>
          </p>
          {!hasEnough && (
            <p className="mt-1 text-[11px] text-text-tertiary">
              Faltam <strong>{fichasFaltando}</strong> pra Pro
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {/* Caminho A: tem fichas suficiente → compra direto no modal */}
        {hasEnough && (
          <Button
            variant="primary"
            fullWidth
            loading={submitting}
            onClick={handlePayWithFichas}
          >
            Ativar Pro com {PRO_PRICE_FICHAS} fichas
          </Button>
        )}

        {/* Caminho B: não tem → leva pro /assinatura pra ver opções */}
        {!hasEnough && (
          <Button variant="primary" fullWidth onClick={handleGoToAssinatura}>
            Ver opções de compra
          </Button>
        )}

        <Button variant="ghost" fullWidth onClick={onClose} disabled={submitting}>
          Agora não
        </Button>
      </div>
    </Dialog>
  );
}
