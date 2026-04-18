'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useGame, getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import {
  getArchetypeAvatarPaths,
  getArchetypeAvatarVisual,
  type AvatarVariant,
} from '@/lib/archetypeAvatar';
import RunReportCard from '@/components/RunReportCard';
import ShareButton from '@/components/ShareButton';
import { useToast } from '@/components/Toast';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';
import type { DeckSnapshot, StatKey } from '@/types/game';
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
  const { user, enabled: authEnabled, signOut } = useAuth();
  const toast = useToast();
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

  // --- Modals ---
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const storedNick = localStorage.getItem(NICKNAME_KEY);
    if (storedNick) setNickname(storedNick);

    const storedVariant = localStorage.getItem(VARIANT_KEY);
    if (storedVariant === 'masculino' || storedVariant === 'feminino') {
      setVariant(storedVariant);
    }
  }, []);

  // Quando user loga, empurra o profile local atual pro Supabase
  // (resolve o caso "joguei offline, depois criei conta").
  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase/sync').then(({ saveProfileToCloud }) => {
      saveProfileToCloud({ nickname, avatarVariant: variant }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
  const recentRuns = [...snapshots].reverse().slice(0, 3);

  const precisionPct = Math.min(precision, 100);
  const consistencyPct = Math.min(consistency * 100, 100);
  const precisionLabel = getPrecisionLabel(precision);
  const consistencyLabel = getConsistencyLabel(consistency);

  function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed.length > 0 && trimmed !== nickname) {
      setNickname(trimmed);
      localStorage.setItem(NICKNAME_KEY, trimmed);
      // Sync pro Supabase se logado
      if (user) {
        import('@/lib/supabase/sync').then(({ saveProfileToCloud }) => {
          saveProfileToCloud({ nickname: trimmed })
            .then(() => toast.success('Nickname salvo na nuvem'))
            .catch(() => toast.error('Falha ao sincronizar nickname'));
        });
      } else {
        toast.success('Nickname atualizado');
      }
    }
    setEditingNickname(false);
  }

  function handleStartEdit() {
    setNicknameInput(nickname);
    setEditingNickname(true);
  }

  function handleReset() {
    dispatch({ type: 'RESET_ALL' });
    localStorage.removeItem('mindpractice_state');
    setResetModalOpen(false);
    toast.success('Progresso resetado');
  }

  function requestToggleVariant() {
    setVariantModalOpen(true);
  }

  function confirmToggleVariant() {
    const next: AvatarVariant = variant === 'masculino' ? 'feminino' : 'masculino';
    setVariant(next);
    localStorage.setItem(VARIANT_KEY, next);
    setVariantModalOpen(false);
    if (user) {
      import('@/lib/supabase/sync').then(({ saveProfileToCloud }) => {
        saveProfileToCloud({ avatarVariant: next })
          .then(() => toast.success(`Avatar: ${next}`))
          .catch(() => toast.error('Falha ao sincronizar avatar'));
      });
    } else {
      toast.success(`Avatar: ${next}`);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      toast.success('Você saiu da conta');
    } catch {
      toast.error('Falha ao sair');
    }
  }

  return (
    <motion.div
      className="screen-stage relative mx-auto flex w-full max-w-md flex-col px-4 pb-20 pt-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="screen-lights" />

      {/* ================================================================ */}
      {/* Top: Centered avatar + corner action icons                       */}
      {/* ================================================================ */}
      <motion.section variants={fadeUp} className="relative">
        {/* Action icons — top right corner */}
        <div className="absolute right-0 top-0 z-10 flex flex-col gap-1.5">
          <ShareButton archetype={archetype} axes={calibration.axes} nickname={nickname} compact />
          <button type="button" onClick={handleStartEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:text-white/80" title="Editar nickname">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button type="button" onClick={requestToggleVariant} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:text-white/90" title={`Trocar para ${variant === 'masculino' ? 'feminino' : 'masculino'}`}>
            <span className="text-[13px] font-bold leading-none" aria-hidden>
              {variant === 'masculino' ? '♀' : '♂'}
            </span>
          </button>
        </div>

        {/* Centered avatar card */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="group relative overflow-hidden rounded-2xl border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/35 hover:shadow-[0_8px_40px_rgba(192,192,192,0.12)]"
            style={{ background: visual.background, width: '130px', aspectRatio: '9 / 16' }}
          >
            {!imageFailed && (
              <img
                src={imageSrc}
                alt={`${archetype.name} ${variant}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                onError={() => {
                  if (imageIndex < imageCandidates.length - 1) {
                    setImageIndex((prev) => prev + 1);
                    return;
                  }
                  setImageFailed(true);
                }}
              />
            )}
            {imageFailed && (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-3xl font-black text-white/15">{archetype.name.charAt(0)}</span>
              </div>
            )}
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.7))]" />
            {/* Tap hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
              <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>

          {/* Identity below card */}
          <div className="mt-2 text-center">
            {/* Nickname — prominent */}
            <div className="flex items-center justify-center gap-1.5">
              {!editingNickname ? (
                <>
                  <p className="text-sm font-semibold text-white/80">{nickname}</p>
                  {isIdentityValidated && (
                    <span className="rounded-full border border-accent-gold/25 bg-accent-gold/12 px-1.5 py-px text-[7px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
                      Confirmado
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                    maxLength={24}
                    autoFocus
                    className="w-28 rounded-md bg-white/10 px-2 py-1 text-xs text-white/90 outline-none ring-1 ring-white/15 placeholder:text-white/28 focus:ring-white/30"
                    placeholder="Nickname"
                  />
                  <button type="button" onClick={handleSaveNickname} className="rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-purple hover:bg-accent-purple/25">OK</button>
                  <button type="button" onClick={() => setEditingNickname(false)} className="rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 hover:bg-white/15 hover:text-white/95">Sair</button>
                </div>
              )}
            </div>
            {/* Archetype name + tagline */}
            <h2 className="mt-0.5 text-xl font-bold text-white/95">{archetype.name}</h2>
            <p className="text-[10px] italic text-white/45">{archetype.tagline}</p>
          </div>
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* Precision + Consistency                                          */}
      {/* ================================================================ */}
      <motion.section variants={fadeUp} className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Precisao</span>
            <span className="text-[11px] font-bold text-accent-purple">{Math.round(precisionPct)}%</span>
          </div>
          <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-accent-purple" initial={{ width: 0 }} animate={{ width: `${precisionPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} />
          </div>
          <p className={`mt-0.5 text-[8px] uppercase tracking-[0.14em] ${precisionLabel.color}`}>{precisionLabel.label}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Consistencia</span>
            <span className="text-[11px] font-bold text-accent-gold">{Math.round(consistencyPct)}%</span>
          </div>
          <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-accent-gold" initial={{ width: 0 }} animate={{ width: `${consistencyPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} />
          </div>
          <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-white/50">{consistencyLabel.label}</p>
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* Axis bars — always visible                                       */}
      {/* ================================================================ */}
      <motion.section variants={fadeUp} className="mt-2.5">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Eixos</p>
          <div className="space-y-2.5">
            {STAT_KEYS.map((key) => {
              const value = calibration.axes[key];
              const pct = hasData ? Math.min(Math.abs(value) / maxAbs, 1) * 50 : 0;
              const color = STAT_COLORS[key];
              const isNeg = value < 0;
              const barLeft = isNeg ? `${50 - pct}%` : '50%';
              const barWidth = `${pct}%`;
              const poles = AXIS_POLES[key];
              // Position of the number indicator: 50% + or - pct
              const indicatorPos = isNeg ? `${50 - pct}%` : `${50 + pct}%`;
              return (
                <div key={key}>
                  {/* Pole labels + floating number */}
                  <div className="relative mb-1 flex items-center justify-between">
                    <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-white/35">{poles[0]}</span>
                    <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-white/35">{poles[1]}</span>
                    {/* Floating value indicator */}
                    {(hasData && value !== 0) && (
                      <motion.span
                        className="absolute -top-0.5 text-[9px] font-mono font-bold"
                        style={{ color: isNeg ? '#ef4444' : color, left: indicatorPos, transform: 'translateX(-50%)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        {value > 0 ? '+' : ''}{value.toFixed(1)}
                      </motion.span>
                    )}
                  </div>
                  {/* Bar */}
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-px bg-white/25" />
                    <motion.div
                      className="absolute top-0 h-full"
                      style={{ backgroundColor: isNeg ? '#ef4444' : color }}
                      initial={{ left: '50%', width: 0 }}
                      animate={{ left: barLeft, width: barWidth }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* Rankings + Recent runs                                           */}
      {/* ================================================================ */}
      {bestPerDeck.length > 0 && (
        <motion.section variants={fadeUp} className="mt-3">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Ranking por deck</p>
            <div className="grid grid-cols-2 gap-1.5">
              {bestPerDeck.map(entry => {
                const rank = getRankFromScore(entry.bestScore);
                return (
                  <div key={entry.deckId} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${RANK_STYLES[rank]}`}>{rank}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-white/75">{entry.deckName}</p>
                      <p className="text-[8px] uppercase tracking-[0.12em] text-white/40">{entry.runCount} run{entry.runCount === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}

      {recentRuns.length > 0 && (
        <motion.section variants={fadeUp} className="mt-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Runs recentes</p>
          <div className="space-y-1.5">
            {recentRuns.map((snap, i) => (
              <RunReportCard key={`${snap.deckId}-${snap.completedAt}`} snapshot={snap} featured={i === 0} />
            ))}
          </div>
        </motion.section>
      )}

      {!hasData && (
        <motion.section variants={fadeUp} className="mt-3">
          <p className="text-center text-[10px] text-white/30">Jogue um deck para calibrar seus eixos.</p>
        </motion.section>
      )}

      {/* ================================================================ */}
      {/* Auth pill — sempre visivel quando Supabase configurado           */}
      {/* ================================================================ */}
      {authEnabled && (
        <motion.section variants={fadeUp} className="mt-3">
          <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
            {user ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Conta
                  </p>
                  <p className="truncate text-xs text-white/82">{user.email ?? 'Logado'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="shrink-0 rounded-full border border-white/18 bg-white/6 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75 hover:bg-white/12"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-accent-gold/25 bg-accent-gold/[0.06] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold/90 transition-colors hover:bg-accent-gold/12"
              >
                Entrar — salvar na nuvem
              </Link>
            )}
          </div>
        </motion.section>
      )}

      {/* ================================================================ */}
      {/* Reset button — only visible in edit mode                         */}
      {/* ================================================================ */}
      <AnimatePresence>
        {editingNickname && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="w-full rounded-xl border border-red-500/15 bg-red-500/[0.06] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400/70 transition-colors hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-400"
            >
              Resetar Stats
            </button>
          </motion.section>
        )}
      </AnimatePresence>
      <p className="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-white/20">MindPractice v0.2</p>

      {/* ================================================================ */}
      {/* Avatar Modal — 9:16 with silver border                           */}
      {/* ================================================================ */}
      <AnimatePresence>
        {avatarModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setAvatarModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-4 w-full max-w-[280px] overflow-hidden rounded-2xl border-2 shadow-[0_0_40px_rgba(192,192,192,0.15)]"
              style={{
                borderColor: 'rgba(192, 192, 192, 0.45)',
                background: visual.background,
                aspectRatio: '9 / 16',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Inner silver frame */}
              <div className="absolute inset-1 rounded-xl border border-white/[0.12]" />

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

              {/* Bottom gradient + name */}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.75)_50%)] px-4 pb-4 pt-16">
                <p className="text-[10px] italic text-white/50">{archetype.tagline}</p>
                <h3 className="text-xl font-bold text-white/95">{archetype.name}</h3>
                <p className="text-xs text-white/45">{nickname}</p>
              </div>

              {/* Variant toggle */}
              <button
                type="button"
                onClick={requestToggleVariant}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white/80 backdrop-blur-sm transition-colors hover:text-white"
                title={`Trocar para ${variant === 'masculino' ? 'feminino' : 'masculino'}`}
              >
                <span className="text-base font-bold leading-none" aria-hidden>
                  {variant === 'masculino' ? '♀' : '♂'}
                </span>
              </button>

              {/* Close / Sair button — prominent */}
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/75 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Sair
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Reset Confirmation Modal                                         */}
      {/* ================================================================ */}
      <AnimatePresence>
        {resetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setResetModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mx-6 w-full max-w-xs rounded-2xl border border-white/10 bg-[#0c0c14] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/12">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white/90">Resetar tudo?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                Todo seu progresso sera apagado: eixos, rankings, historico de runs e fichas. Essa acao nao pode ser desfeita.
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 rounded-xl bg-white/8 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/12"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30"
                >
                  Resetar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Variant Toggle Confirmation Modal                                */}
      {/* ================================================================ */}
      <AnimatePresence>
        {variantModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setVariantModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mx-6 w-full max-w-xs rounded-2xl border border-white/10 bg-[#0c0c14] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/15 text-xl">
                <span aria-hidden>{variant === 'masculino' ? '♀' : '♂'}</span>
              </div>
              <h3 className="text-base font-bold text-white/90">
                Trocar para {variant === 'masculino' ? 'feminino' : 'masculino'}?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                Muda só a aparência do seu avatar. Seus stats, arquétipo e runs ficam iguais.
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setVariantModalOpen(false)}
                  className="flex-1 rounded-xl bg-white/8 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/12"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmToggleVariant}
                  className="flex-1 rounded-xl bg-accent-purple/25 py-2.5 text-sm font-semibold text-accent-purple transition-colors hover:bg-accent-purple/35"
                >
                  Trocar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

const AXIS_POLES: Record<StatKey, [string, string]> = {
  vigor: ['Passivo', 'Agressivo'],
  harmonia: ['Conflito', 'Paz'],
  filtro: ['Impulsivo', 'Calculista'],
  presenca: ['Invisivel', 'Dominante'],
  desapego: ['Apegado', 'Desapegado'],
};

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
