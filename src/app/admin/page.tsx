'use client';

/**
 * /admin — dashboard interno. Acesso restrito ao ADMIN_USER_ID.
 *
 * Renderiza counts agregados (profiles, waitlist, subs por tier,
 * referrals, decks completed). Sem cache — refetch a cada mount.
 *
 * Não está no BottomNav. Acesso via URL direta.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import { Card, Badge, Button } from '@/components/ui';

interface Stats {
  profiles_total: number;
  waitlist_total: number;
  subs_active: number;
  subs_pro: number;
  subs_founder: number;
  referrals_signed_up: number;
  referrals_converted: number;
  feed_events_total: number;
  decks_completed: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data: { session } } = (await sb?.auth.getSession()) ?? { data: { session: null } };
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) {
            setError('Não autenticado');
            setLoading(false);
          }
          return;
        }
        const resp = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!cancelled) {
          if (!resp.ok) {
            setError(data.error ?? 'Erro');
          } else {
            setStats(data);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Erro de rede');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <p className="mt-20 text-center text-sm text-text-tertiary">Carregando...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Card variant="glass" padding="lg" className="mt-6">
          <p className="text-sm text-text-secondary">Faça login pra acessar.</p>
          <Link href="/login" className="mt-4 inline-block">
            <Button variant="primary">Login</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-8">
      <header>
        <Badge variant="purple">Admin</Badge>
        <h1 className="mt-3 text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Métricas agregadas — atualiza a cada mount.</p>
      </header>

      {loading && (
        <p className="mt-12 text-center text-sm text-text-tertiary">Carregando stats...</p>
      )}

      {error && (
        <Card variant="glass" padding="md" className="mt-8 border-state-error-border bg-state-error-bg">
          <p className="text-sm text-state-error">{error}</p>
        </Card>
      )}

      {stats && (
        <>
          <Section title="Usuários">
            <Tile label="Profiles" value={stats.profiles_total} />
            <Tile label="Waitlist" value={stats.waitlist_total} />
            <Tile label="Subscriptions ativas" value={stats.subs_active} />
          </Section>

          <Section title="Receita (vanity)">
            <Tile label="Pro" value={stats.subs_pro} accent="gold" />
            <Tile label="Founder" value={stats.subs_founder} accent="gold" />
            <Tile
              label="MRR estimado"
              value={`R$ ${(stats.subs_pro * 14.9).toFixed(2)}`}
              accent="gold"
            />
          </Section>

          <Section title="Engajamento">
            <Tile label="Decks completos" value={stats.decks_completed} />
            <Tile label="Feed events" value={stats.feed_events_total} />
          </Section>

          <Section title="Viral">
            <Tile label="Referrals signed-up" value={stats.referrals_signed_up} />
            <Tile label="Referrals convertidos" value={stats.referrals_converted} accent="purple" />
          </Section>
        </>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Tile({
  label,
  value,
  accent = 'neutral',
}: {
  label: string;
  value: number | string;
  accent?: 'neutral' | 'gold' | 'purple';
}) {
  const accentColor =
    accent === 'gold'
      ? 'text-accent-gold'
      : accent === 'purple'
      ? 'text-accent-purple'
      : 'text-text-primary';
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-glass px-4 py-3 backdrop-blur-md">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${accentColor}`}>{value}</p>
    </div>
  );
}
