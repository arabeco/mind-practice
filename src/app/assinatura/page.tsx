'use client';

/**
 * /assinatura — paywall page com 3 tier cards (Free / Pro / Founder).
 *
 * Quando user clica "Assinar Pro" ou "Virar Founder":
 *   - POST /api/billing/checkout com Bearer token
 *   - Recebe Stripe Checkout URL → redirect
 *   - Após pagamento → /assinatura/sucesso (que faz polling até webhook persistir)
 *
 * Pro user logado ja com sub ativa: mostra "Gerenciar assinatura" → portal.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/lib/supabase/subscription';
import { useToast } from '@/components/Toast';
import { Button, Card, Badge } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { useEffect } from 'react';
// useState already imported above

interface TierCard {
  id: 'free' | 'pro' | 'founder';
  name: string;
  price: string;
  priceSuffix: string;
  trial?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const TIERS: TierCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    priceSuffix: '/sempre',
    features: [
      '3 runs grátis por dia',
      'Season 0 (Fundação) completa',
      'Perfil bayesiano e arquétipo',
      'Cerimônias rituais',
    ],
    cta: 'Plano atual',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 14,90',
    priceSuffix: '/mês',
    trial: '7 dias grátis',
    features: [
      'Runs ilimitadas',
      'Todas as seasons (incluindo futuras)',
      'Share cards premium',
      'Histórico completo de evolução',
      'Cancele quando quiser',
    ],
    cta: 'Começar 7 dias grátis',
    highlight: true,
  },
  {
    id: 'founder',
    name: 'Founder',
    price: 'R$ 89',
    priceSuffix: 'vitalício',
    features: [
      'Tudo do Pro pra sempre',
      'Badge Founder no perfil',
      'Early access a decks novos',
      'Voto em decks futuros',
      'Limitado a 500 founders',
    ],
    cta: 'Virar Founder',
  },
];

export default function AssinaturaPage() {
  const { user, enabled, loading: authLoading } = useAuth();
  const { subscription, isPro, loading: subLoading, refresh } = useSubscription(user?.id ?? null);
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const canceled = search.get('canceled') === '1';

  // Analytics: paywall_viewed quando a página carrega (uma vez por mount)
  useEffect(() => {
    trackEvent('paywall_viewed', { source: 'assinatura_page' });
  }, []);

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <div className="mt-20 text-center text-sm text-text-tertiary">Carregando...</div>
      </main>
    );
  }

  if (!enabled || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <h1 className="text-3xl font-bold">Assinatura</h1>
        <Card variant="glass" padding="lg" className="mt-6">
          <p className="text-sm text-text-secondary">
            Entre com uma conta pra assinar Pro ou Founder.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push('/perfil')}
          >
            Ir pro perfil
          </Button>
        </Card>
      </main>
    );
  }

  async function handleCheckout(tier: 'pro' | 'founder') {
    setSubmitting(tier);
    trackEvent('checkout_started', { tier });
    try {
      const sb = getSupabase();
      const { data: { session } } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const token = session?.access_token;
      if (!token) {
        toast.error('Sessão expirada — faça login novamente');
        setSubmitting(null);
        return;
      }
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        toast.error(data.error ?? 'Erro ao iniciar checkout');
        setSubmitting(null);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error('Erro de rede');
      setSubmitting(null);
    }
  }

  async function handlePortal() {
    setSubmitting('portal');
    try {
      const sb = getSupabase();
      const { data: { session } } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const token = session?.access_token;
      if (!token) {
        toast.error('Sessão expirada');
        setSubmitting(null);
        return;
      }
      const resp = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        toast.error(data.error ?? 'Erro ao abrir portal');
        setSubmitting(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Erro de rede');
      setSubmitting(null);
    }
  }

  const currentTier = subscription?.tier ?? 'free';

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-tertiary">
          Planos
        </p>
        <h1 className="mt-2 text-3xl font-bold">Escolha seu nível</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Mindpractice é grátis. Pro e Founder destravam o catálogo completo.
        </p>
      </header>

      {canceled && (
        <Card variant="solid" padding="md" className="mt-4 border-state-warning-border bg-state-warning-bg">
          <p className="text-sm text-state-warning">
            Checkout cancelado. Você ainda está no plano {currentTier}.
          </p>
        </Card>
      )}

      {isPro && (
        <Card variant="elevated" padding="md" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Badge variant={currentTier === 'founder' ? 'gold' : 'purple'}>
                {currentTier === 'founder' ? 'Founder' : 'Pro'}
              </Badge>
              <p className="mt-2 text-sm text-text-primary">Sua assinatura está ativa.</p>
              {subscription?.current_period_end && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {subscription.cancel_at_period_end ? 'Cancela em' : 'Renova em'}{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={submitting === 'portal'}
              onClick={handlePortal}
            >
              Gerenciar
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TIERS.map(tier => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: TIERS.indexOf(tier) * 0.08 }}
          >
            <Card
              variant={tier.highlight ? 'elevated' : 'glass'}
              padding="lg"
              glow={tier.highlight}
              className="relative h-full flex flex-col"
            >
              {tier.highlight && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge variant="gold">Recomendado</Badge>
                </div>
              )}
              <h2 className="text-xl font-bold text-text-primary">{tier.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-text-primary">{tier.price}</span>
                <span className="text-sm text-text-tertiary">{tier.priceSuffix}</span>
              </div>
              {tier.trial && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-gold">
                  {tier.trial}
                </p>
              )}
              <ul className="mt-5 flex flex-1 flex-col gap-2">
                {tier.features.map(f => (
                  <li key={f} className="flex gap-2 text-sm text-text-secondary">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-gold" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {tier.id === 'free' ? (
                  <Button variant="ghost" fullWidth disabled>
                    {currentTier === 'free' ? 'Plano atual' : tier.cta}
                  </Button>
                ) : currentTier === tier.id ? (
                  <Button variant="ghost" fullWidth disabled>
                    Plano atual
                  </Button>
                ) : (
                  <Button
                    variant={tier.highlight ? 'primary' : 'secondary'}
                    fullWidth
                    loading={submitting === tier.id}
                    onClick={() => handleCheckout(tier.id as 'pro' | 'founder')}
                  >
                    {tier.cta}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-text-tertiary">
        Pagamento seguro via Stripe. Cartão de crédito ou PIX.
      </p>
    </main>
  );
}
