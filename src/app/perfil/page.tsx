'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame, getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import {
  getArchetypeAvatarPaths,
  getArchetypeAvatarVisual,
  type AvatarVariant,
} from '@/lib/archetypeAvatar';
import RunReportCard from '@/components/RunReportCard';
import ShareButton from '@/components/ShareButton';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';
import type { DeckSnapshot } from '@/types/game';
import { getDeckById } from '@/data/decks';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

const NICKNAME_KEY = 'mindpractice_nickname';
const VARIANT_KEY = 'mindpractice_avatar_variant';

export default function PerfilPage() {
  const { state, dispatch, getArchetype, precision, consistency, isIdentityValidated } = useGame();
  const archetype = getArchetype();
  const visual = useMemo(() => getArchetypeAvatarVisual(archetype), [archetype]);

  // --- Nickname ---
  const [nickname, setNickname] = useState('Jogador');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  // --- Avatar variant ---
  const [variant, setVariant] = useState<AvatarVariant>('masculino');

  // --- Image loading ---
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const storedNick = localStorage.getItem(NICKNAME_KEY);
    if (storedNick) setNickname(storedNick);

    const storedVariant = localStorage.getItem(VARIANT_KEY);
    if (storedVariant === 'masculino' || storedVariant === 'feminino') {
      setVariant(storedVariant);
    }
  }, []);

  // Reset image state when archetype/variant changes
  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
  }, [archetype.id, variant]);

  const imageCandidates = getArchetypeAvatarPaths(archetype.id, variant);
  const imageSrc = imageCandidates[imageIndex];

  const { calibration } = state;
  const { snapshots } = calibration;
  const hasData = snapshots.length > 0;
  const maxAbs = Math.max(1, ...STAT_KEYS.map(key => Math.abs(calibration.axes[key])));
  const bestPerDeck = getBestPerDeck(snapshots);
  const recentRuns = [...snapshots].reverse().slice(0, 4);

  const precisionPct = Math.min(precision, 100);
  const consistencyPct = Math.min(consistency * 100, 100);
  const precisionLabel = getPrecisionLabel(precision);
  const consistencyLabel = getConsistencyLabel(consistency);

  function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed.length > 0) {
      setNickname(trimmed);
      localStorage.setItem(NICKNAME_KEY, trimmed);
    }
    setEditingNickname(false);
  }

  function handleStartEdit() {
    setNicknameInput(nickname);
    setEditingNickname(true);
  }

  function handleReset() {
    if (confirm('Tem certeza? Todo progresso sera apagado.')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  }

  function toggleVariant() {
    const next: AvatarVariant = variant === 'masculino' ? 'feminino' : 'masculino';
    setVariant(next);
    localStorage.setItem(VARIANT_KEY, next);
  }

  return (
    <motion.div
      className="screen-stage relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="screen-lights" />
      <div className="screen-arena-floor" />

      {/* ================================================================== */}
      {/* Full-bleed portrait card — fills available space                    */}
      {/* ================================================================== */}
      <motion.section
        variants={fadeUp}
        className="relative min-h-[70dvh] flex-1 overflow-hidden"
        style={{ background: visual.background }}
      >
        {/* Glow blob */}
        <div
          className="pointer-events-none absolute inset-x-[10%] top-[5%] h-32 rounded-full blur-[70px]"
          style={{ backgroundColor: visual.glow }}
        />

        {/* Image */}
        {!imageFailed && (
          <img
            src={imageSrc}
            alt={`${archetype.name} ${variant}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              if (imageIndex < imageCandidates.length - 1) {
                setImageIndex((prev) => prev + 1);
                return;
              }
              setImageFailed(true);
            }}
          />
        )}

        {/* Fallback placeholder */}
        {imageFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="h-20 w-20 rounded-full border-2"
              style={{ borderColor: visual.line, backgroundColor: 'rgba(255,255,255,0.03)' }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/36">
              Arte em breve
            </p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,8,0.5)_0%,transparent_20%,transparent_50%,rgba(3,3,7,0.85)_80%)]" />

        {/* ---- Top toolbar: mini icon buttons ---- */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-3">
          {/* Left: variant toggle */}
          <button
            type="button"
            onClick={toggleVariant}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-sm transition-colors hover:text-white/90"
            title={variant === 'masculino' ? 'Mudar para feminino' : 'Mudar para masculino'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          {/* Right: share + edit + delete */}
          <div className="flex items-center gap-1.5">
            <ShareButton
              archetype={archetype}
              axes={calibration.axes}
              nickname={nickname}
              compact
            />

            <button
              type="button"
              onClick={handleStartEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-sm transition-colors hover:text-white/90"
              title="Editar nickname"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-red-400/70 backdrop-blur-sm transition-colors hover:text-red-300"
              title="Apagar progresso"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* ---- Nickname edit overlay ---- */}
        <AnimatePresence>
          {editingNickname && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-3 top-14 z-30 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 backdrop-blur-md"
            >
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                maxLength={24}
                autoFocus
                className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/90 outline-none ring-1 ring-white/15 placeholder:text-white/28 focus:ring-white/30"
                placeholder="Seu nickname"
              />
              <button
                type="button"
                onClick={handleSaveNickname}
                className="rounded-lg bg-accent-purple/25 px-3 py-1.5 text-[11px] font-semibold text-accent-purple transition-colors hover:bg-accent-purple/35"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setEditingNickname(false)}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/50 transition-colors hover:bg-white/15"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Bottom overlay: identity + metrics ---- */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {/* Archetype info */}
          <p className="text-[10px] italic text-white/52">
            {archetype.tagline}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold text-white/95">
            {archetype.name}
          </h2>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-xs text-white/50">{nickname}</p>
            {isIdentityValidated && (
              <span className="rounded-full border border-accent-gold/25 bg-accent-gold/12 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
                Confirmado
              </span>
            )}
          </div>

          {/* Precision + Consistency — inline bars */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-black/30 px-2.5 py-2 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/56">Precisao</span>
                <span className="text-[11px] font-bold text-accent-purple">{Math.round(precisionPct)}%</span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-accent-purple"
                  initial={{ width: 0 }}
                  animate={{ width: `${precisionPct}%` }}
                  transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className={`mt-0.5 text-[8px] uppercase tracking-[0.14em] ${precisionLabel.color}`}>
                {precisionLabel.label}
              </p>
            </div>

            <div className="rounded-lg bg-black/30 px-2.5 py-2 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/56">Consistencia</span>
                <span className="text-[11px] font-bold text-accent-gold">{Math.round(consistencyPct)}%</span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-accent-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${consistencyPct}%` }}
                  transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-white/50">
                {consistencyLabel.label}
              </p>
            </div>
          </div>

          {/* Version */}
          <p className="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-white/20">
            MindPractice v0.2
          </p>
        </div>
      </motion.section>

      {/* Stats section — scrollable below portrait */}
      <motion.section variants={fadeUp} className="px-4 pb-24 pt-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
          Historico
        </p>

        {/* Axis bars */}
        {hasData && (
          <div className="glass-card mb-3 rounded-xl p-3">
            <div className="space-y-1.5">
              {STAT_KEYS.map((key) => {
                const value = calibration.axes[key];
                const width = `${(Math.abs(value) / maxAbs) * 100}%`;
                const color = value >= 0 ? STAT_COLORS[key] : '#ef4444';
                return (
                  <div key={key} className="glass-surface rounded-lg px-2.5 py-1.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56">
                        {STAT_LABELS[key]}
                      </span>
                      <span className="text-[10px] font-mono font-bold" style={{ color }}>
                        {value > 0 ? '+' : ''}{value.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/8">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width }} transition={{ duration: 0.4 }} style={{ backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rankings per deck */}
        {bestPerDeck.length > 0 && (
          <div className="glass-card mb-3 rounded-xl p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">Ranking por deck</p>
            <div className="grid grid-cols-2 gap-2">
              {bestPerDeck.map(entry => {
                const rank = getRankFromScore(entry.bestScore);
                return (
                  <div key={entry.deckId} className="glass-surface flex items-center gap-2 rounded-lg px-2.5 py-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${RANK_STYLES[rank]}`}>{rank}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/82">{entry.deckName}</p>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-white/50">{entry.runCount} run{entry.runCount === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">Runs recentes</p>
            <div className="space-y-2">
              {recentRuns.map((snap, i) => (
                <RunReportCard key={`${snap.deckId}-${snap.completedAt}`} snapshot={snap} featured={i === 0} />
              ))}
            </div>
          </div>
        )}

        {!hasData && (
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-xs text-white/40">Completa o teu primeiro deck para ver estatisticas.</p>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

type RankLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

function getRankFromScore(score: number | null): RankLetter {
  if (score === null) return 'E';
  if (score >= 95) return 'S';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'E';
}

const RANK_STYLES: Record<RankLetter, string> = {
  S: 'border-yellow-300/40 bg-yellow-300/14 text-yellow-200',
  A: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-200',
  B: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  C: 'border-purple-300/28 bg-purple-300/10 text-purple-200',
  D: 'border-white/18 bg-white/8 text-white/60',
  E: 'border-white/12 bg-white/5 text-white/40',
};

interface DeckRankEntry { deckId: string; deckName: string; bestScore: number | null; runCount: number; }

function getBestPerDeck(snapshots: DeckSnapshot[]): DeckRankEntry[] {
  const map = new Map<string, { bestScore: number | null; runCount: number }>();
  for (const snap of snapshots) {
    const existing = map.get(snap.deckId);
    if (!existing) { map.set(snap.deckId, { bestScore: snap.runScore, runCount: 1 }); }
    else {
      existing.runCount += 1;
      if (snap.runScore !== null && (existing.bestScore === null || snap.runScore > existing.bestScore)) existing.bestScore = snap.runScore;
    }
  }
  return Array.from(map.entries()).map(([deckId, data]) => {
    const deck = getDeckById(deckId);
    return { deckId, deckName: deck?.name ?? deckId, bestScore: data.bestScore, runCount: data.runCount };
  });
}
