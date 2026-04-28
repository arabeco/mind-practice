'use client';

/**
 * PaywallModal — modal contextual mostrado quando user atinge gate
 * (ex: tenta abrir deck Pro+, ou estoura cap diário de runs).
 *
 * Não faz checkout direto — leva pro /assinatura. Mantém UX simples:
 * 1 razão + 1 CTA pra ver planos + 1 dismiss.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Badge } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';

export type PaywallReason = 'deck_locked' | 'run_cap' | 'share_premium';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const REASON_COPY: Record<PaywallReason, { headline: string; body: string }> = {
  deck_locked: {
    headline: 'Esse deck é Pro',
    body: 'Decks de seasons além da Fundação destravam com Pro. 7 dias grátis pra testar.',
  },
  run_cap: {
    headline: 'Limite de runs do dia',
    body: 'Você usou suas 3 runs grátis. Pro destrava runs ilimitadas — 7 dias grátis pra começar.',
  },
  share_premium: {
    headline: 'Share card premium',
    body: 'Cards visuais avançados são exclusivos Pro. Continue compartilhando o básico ou desbloqueia tudo.',
  },
};

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const router = useRouter();
  const copy = REASON_COPY[reason];

  // Track view quando modal abre
  useEffect(() => {
    if (open) trackEvent('paywall_viewed', { source: 'modal', reason });
  }, [open, reason]);

  const handleDismiss = () => {
    trackEvent('paywall_dismissed', { reason });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDismiss}>
      <div className="text-center">
        <Badge variant="gold">Pro</Badge>
        <h2 className="mt-3 text-xl font-bold text-text-primary">{copy.headline}</h2>
        <p className="mt-2 text-sm text-text-secondary">{copy.body}</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          variant="primary"
          fullWidth
          onClick={() => {
            onClose();
            router.push('/assinatura');
          }}
        >
          Ver planos
        </Button>
        <Button variant="ghost" fullWidth onClick={handleDismiss}>
          Agora não
        </Button>
      </div>
    </Dialog>
  );
}
