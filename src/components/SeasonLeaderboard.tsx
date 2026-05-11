'use client';

/**
 * SeasonLeaderboard — top N de uma season + sua posicao.
 * Atualiza em real-time via subscribe ao publication supabase_realtime.
 */
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  listSeasonRanking,
  getMyRank,
  type RankedEntry,
  type SeasonScoreRow,
} from '@/lib/supabase/leaderboard';
import { getSupabase } from '@/lib/supabase/client';
import { SEASONS, type Season } from '@/data/seasons';

interface SeasonLeaderboardProps {
  /** ID da season; se não passado, usa a mais recente. */
  seasonId?: string;
  topLimit?: number;
}

export default function SeasonLeaderboard({
  seasonId,
  topLimit = 50,
}: SeasonLeaderboardProps) {
  const [activeSeasonId, setActiveSeasonId] = useState<string>(
    seasonId ?? SEASONS[SEASONS.length - 1]?.id ?? 'season-0',
  );
  const [ranking, setRanking] = useState<RankedEntry[] | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number; total: number; entry: SeasonScoreRow } | null>(null);

  const refresh = useCallback(async (sid: string) => {
    const [r, mine] = await Promise.all([
      listSeasonRanking(sid, topLimit),
      getMyRank(sid),
    ]);
    setRanking(r);
    setMyRank(mine);
  }, [topLimit]);

  useEffect(() => {
    setRanking(null);
    setMyRank(null);
    refresh(activeSeasonId);
  }, [activeSeasonId, refresh]);

  // Realtime: refetch quando alguem da season faz upsert.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`season-scores-${activeSeasonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'season_scores',
          filter: `season_id=eq.${activeSeasonId}`,
        },
        () => {
          // Debounce simples: aguarda 500ms apos ultima mudanca
          // (evita refetch espasmodico quando muitos updates chegam juntos).
          refresh(activeSeasonId);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [activeSeasonId, refresh]);

  const inTop =
    myRank && ranking?.some(r => r.user_id === myRank.entry.user_id);

  return (
    <div className="flex flex-col gap-4">
      <SeasonSelector
        active={activeSeasonId}
        onChange={setActiveSeasonId}
      />

      {ranking === null && (
        <div className="text-center text-sm text-white/50">Carregando ranking...</div>
      )}

      {ranking !== null && ranking.length === 0 && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-sm text-white/75">Ninguem ranqueado ainda nessa season.</p>
          <p className="mt-2 text-[11px] text-white/45">
            Complete decks da season pra aparecer aqui.
          </p>
        </div>
      )}

      {ranking !== null && ranking.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {ranking.map(entry => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              isMine={entry.user_id === myRank?.entry.user_id}
            />
          ))}
        </div>
      )}

      {/* Sua posicao se fora do top */}
      {ranking !== null && myRank && !inTop && (
        <div className="glass-card mt-2 rounded-xl px-3 py-2.5">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
            Sua posicao
          </p>
          <RankRow
            entry={{
              ...myRank.entry,
              rank: myRank.rank,
              profile: undefined, // sem profile lookup pra proprio user
            }}
            isMine
          />
          <p className="mt-1.5 text-[10px] text-white/40">
            {myRank.rank} de {myRank.total}
          </p>
        </div>
      )}
    </div>
  );
}

function SeasonSelector({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-border-default bg-bg-glass-strong p-1">
      {SEASONS.map((s: Season) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className="relative flex-1 rounded-full py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          >
            {isActive && (
              <motion.div
                layoutId="leaderboard-season-pill"
                className="absolute inset-0 rounded-full border border-accent-gold-border bg-accent-gold-bg"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className={`relative ${isActive ? 'text-accent-gold' : 'text-text-tertiary'}`}>
              {s.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RankRow({ entry, isMine }: { entry: RankedEntry; isMine: boolean }) {
  const symbol = entry.profile?.avatar_variant === 'feminino' ? '♀' : '♂';
  const rankBadgeClass =
    entry.rank === 1
      ? 'border-accent-gold-border bg-accent-gold-bg text-accent-gold'
      : entry.rank === 2
      ? 'border-border-strong bg-bg-surface-strong text-text-primary'
      : entry.rank === 3
      ? 'border-accent-pink-border bg-accent-pink-bg text-accent-pink'
      : 'border-border-subtle bg-bg-surface text-text-tertiary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
        isMine
          ? 'border-accent-gold-border bg-accent-gold-bg'
          : 'border-border-subtle bg-bg-glass'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${rankBadgeClass}`}
      >
        {entry.rank}
      </span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-sm">
        {symbol}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {entry.profile?.nickname ?? 'Anonimo'}
        </p>
        {entry.archetype_id && (
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {entry.archetype_id}
          </p>
        )}
      </div>
      <p className="font-mono text-sm font-bold text-accent-gold">
        {entry.score.toLocaleString('pt-BR')}
      </p>
    </motion.div>
  );
}
