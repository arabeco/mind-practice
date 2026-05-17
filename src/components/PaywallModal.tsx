'use client';

/**
 * PaywallModal — modal contextual mostrado quando user atinge gate
 * (ex: tenta abrir deck Pro+, ou estoura cap diário de runs).
 *
 * Não faz checkout direto — leva pro /assinatura. Mantém UX simples:
 * 1 razão + 1 CTA pra ver planos + 1 dismiss.
 */
import { useRouter } from 'next/navigation';
import { Button, Dialog, Badge } from '@/components/ui';

export type PaywallReason = 'deck_locked' | 'run_cap' | 'share_premium';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const REASON_COPY: Record<PaywallReason, { headline: string; body: string }> = {
  deck_locked: {
    headline: 'Esse deck é Pro',
    body: 'Decks além da Fundação destravam com Pro — disponível no app quando lançar nas lojas.',
  },
  run_cap: {
    headline: 'Limite de runs do dia',
    body: 'Você usou suas 3 runs grátis. Pro destrava runs ilimitadas — disponível no app.',
  },
  share_premium: {
    headline: 'Share card premium',
    body: 'Cards visuais avançados são exclusivos Pro. Continue com o básico ou destrave tudo no app.',
  },
};

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const router = useRouter();
  const copy = REASON_COPY[reason];

  return (
    <Dialog open={open} onClose={onClose}>
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
        <Button variant="ghost" fullWidth onClick={onClose}>
          Agora não
        </Button>
      </div>
    </Dialog>
  );
}
