'use client';

/**
 * ReferralPanel — mostra ao user logado o seu link de convite + stats
 * (quantos amigos signed_up, quantos converteram).
 *
 * Renderizado em /perfil.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Button, Card, Badge } from '@/components/ui';
import {
  getOrCreateMyReferralCode,
  listMyReferralsAsReferrer,
  type ReferralRow,
} from '@/lib/supabase/referrals';

export default function ReferralPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([getOrCreateMyReferralCode(), listMyReferralsAsReferrer()]).then(
      ([anchor, list]) => {
        if (cancelled) return;
        setCode(anchor?.code ?? null);
        setReferrals(list);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || loading) {
    return null;
  }

  if (!code) return null;

  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://mindpractice.app';
  const link = `${siteUrl}/r/${code}`;

  // Stats: o user pode ter MUITAS rows como referrer (cada signup vira uma nova).
  // Filtra: signed_up = signups via link, converted = convertidos pra Pro.
  const signedUpCount = referrals.filter(r => r.status !== 'pending' && r.referred_id).length;
  const convertedCount = referrals.filter(r => r.status === 'converted').length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado');
    } catch {
      toast.error('Falha ao copiar');
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'MindPractice',
          text: 'Descubra seu arquétipo no MindPractice. Entra com o meu link:',
          url: link,
        });
      } catch {
        /* user cancelou */
      }
    } else {
      handleCopy();
    }
  }

  return (
    <Card variant="glass" padding="md">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="purple">Convide</Badge>
        <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          Ganhe 7 dias Pro por amigo que assinar
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          Seu link
        </p>
        <p className="mt-1 break-all font-mono text-xs text-text-primary">{link}</p>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="primary" fullWidth onClick={handleShare}>
          Compartilhar
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          Copiar
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile label="Inscritos" value={String(signedUpCount)} />
        <StatTile label="Convertidos" value={String(convertedCount)} />
      </div>
    </Card>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-surface px-3 py-2 text-center">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black text-text-primary">{value}</p>
    </div>
  );
}
