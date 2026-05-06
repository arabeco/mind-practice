'use client';

/**
 * /assinatura — comunicação dos planos. Pagamento real fica nos apps
 * (Apple IAP / Google Play Billing via RevenueCat). Web = vitrine +
 * captura de waitlist pra avisar quando o app sair.
 *
 * Pessoas chegam aqui via:
 *   - PaywallModal "Ver planos"
 *   - Link no /perfil quando free
 *   - Link na footer da landing
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/lib/supabase/subscription';
import { Button, Card, Badge } from '@/components/ui';
import WaitlistForm from '@/components/landing/WaitlistForm';
import { trackEvent } from '@/lib/analytics';

interface TierCard {
  id: 'free' | 'pro' | 'founder';
  name: string;
  price: string;
  priceSuffix: string;
  trial?: string;
  features: string[];
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
  },
];

export default function AssinaturaPage() {
  const { user, enabled, loading: authLoading } = useAuth();
  const { subscription, isPro, loading: subLoading } = useSubscription(user?.id ?? null);
  const router = useRouter();

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

  const currentTier = subscription?.tier ?? 'free';

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-tertiary">
          Planos
        </p>
        <h1 className="mt-2 text-3xl font-bold">Escolha seu nível</h1>
        <p className="mt-2 text-sm text-text-secondary">
          MindPractice é grátis. Pro e Founder destravam o catálogo completo —
          disponíveis quando o app for lançado nas lojas.
        </p>
      </header>

      {/* Aviso pre-launch */}
      <Card variant="elevated" padding="md" glow className="mt-6">
        <div className="flex items-start gap-3">
          <Badge variant="gold">Em breve</Badge>
          <div className="flex-1">
            <p className="text-sm text-text-primary">
              Pagamento Pro e Founder via App Store e Google Play.
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Entre na waitlist pra ser avisado quando o app lançar.
            </p>
            <div className="mt-3">
              <WaitlistForm source="assinatura" ctaLabel="Avise-me" />
            </div>
          </div>
        </div>
      </Card>

      {/* Status atual (se logado) */}
      {user && enabled && !subLoading && (
        <Card variant="glass" padding="md" className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Badge variant={isPro ? (currentTier === 'founder' ? 'gold' : 'purple') : 'neutral'}>
                Plano: {currentTier}
              </Badge>
              <p className="mt-2 text-xs text-text-tertiary">
                {isPro
                  ? 'Sua assinatura está ativa.'
                  : 'Você está no plano Free. Pro/Founder libera quando o app sair.'}
              </p>
            </div>
            {!user && (
              <Button variant="secondary" size="sm" onClick={() => router.push('/login')}>
                Login
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Cards informativos dos tiers */}
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
                    {currentTier === 'free' ? 'Plano atual' : 'Plano grátis'}
                  </Button>
                ) : (
                  <Button variant="ghost" fullWidth disabled>
                    Disponível no app
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-text-tertiary">
        Pagamento via Apple App Store e Google Play. Sem cobrança fora dos apps.
      </p>
    </main>
  );
}
