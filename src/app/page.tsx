'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getWeeklyFreeDeckIds, ALL_DECKS, getDeckById } from '@/data/decks/index';
import type { Deck } from '@/types/game';
import DeckTarotCard from '@/components/DeckTarotCard';
import DeckDetailModal from '@/components/DeckDetailModal';
import MiniRadar from '@/components/MiniRadar';
import {
  CURRENT_SEASON_ID,
  getCurrentSeason,
  isSeasonActive,
  daysRemainingInSeason,
  canPlayCampaignNow,
  msUntilNextUnlock,
  formatCountdown,
} from '@/lib/season';
import { getDeckArt } from '@/lib/deckArt';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const LAST_SEEN_ARCHETYPE_KEY = 'mindpractice_last_seen_archetype';

export default function Home() {
  const { state, dispatch, isDeckLocked, canClaimDaily, claimDaily, streak, getArchetype } = useGame();
  const router = useRouter();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const weeklyFree = getWeeklyFreeDeckIds();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [archetypeChanged, setArchetypeChanged] = useState(false);

  const archetype = getArchetype();

  // Campaign hero
  const season = getCurrentSeason();
  const seasonActive = isSeasonActive();
  const campaignDeck = getDeckById(season.campaignDeckId);
  const campaignProgress = state.campaigns?.[season.id] ?? null;
  const campaignArt = campaignDeck ? getDeckArt(campaignDeck) : null;
  const campaignUnlocked = canPlayCampaignNow(campaignProgress);
  const campaignFinished = !!campaignProgress?.endingId;
  const campaignDayNumber = (campaignProgress?.path.length ?? 0) + (campaignUnlocked && !campaignFinished ? 1 : 0);
  const campaignTotalDays = 7;
  const daysLeftInSeason = daysRemainingInSeason();
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (campaignUnlocked || campaignFinished) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [campaignUnlocked, campaignFinished]);
  const unlockIn = msUntilNextUnlock(campaignProgress, new Date(nowTick));

  // Check if archetype changed since last visit
  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem(LAST_SEEN_ARCHETYPE_KEY);
      if (lastSeen && lastSeen !== archetype.id && hasPlayed) {
        setArchetypeChanged(true);
      } else {
        // First visit or same archetype — update silently
        localStorage.setItem(LAST_SEEN_ARCHETYPE_KEY, archetype.id);
      }
    } catch {}
  }, [archetype.id, hasPlayed]);

  const dismissArchetypeBanner = () => {
    setArchetypeChanged(false);
    try {
      localStorage.setItem(LAST_SEEN_ARCHETYPE_KEY, archetype.id);
    } catch {}
  };

  // Suggestions: uncompleted unlocked decks first, then weekly free
  const suggestions = ALL_DECKS
    .filter(d => d.category !== 'campanha' && !(d.deckId in state.completedDecks) && (!isDeckLocked(d.deckId) || weeklyFree.includes(d.deckId)))
    .slice(0, 3);

  // Premium teaser: locked decks
  const premiumDecks = ALL_DECKS
    .filter(d => d.category !== 'campanha' && isDeckLocked(d.deckId) && !weeklyFree.includes(d.deckId))
    .slice(0, 3);

  const handlePlay = () => {
    if (!selectedDeck) return;
    dispatch({ type: 'START_DECK', deck: selectedDeck });
    setSelectedDeck(null);
    router.push(`/play/${selectedDeck.deckId}`);
  };

  return (
    <motion.main variants={container} initial="hidden" animate="show"
      className="screen-stage mx-auto flex max-w-md flex-col gap-3 px-4 pb-24 pt-5">
      <div className="screen-lights" />
      <div className="screen-arena-floor" />

      {/* Header row — title left, fichas right */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          Mind<span className="text-accent-purple">Practice</span>
        </h1>
        <div className="glass-pill inline-flex items-center gap-2 px-3 py-1.5">
          <span className="text-[11px] text-accent-gold">&#9670;</span>
          <span className="text-sm font-bold text-white/80">{state.wallet.fichas}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/50">fichas</span>
        </div>
      </motion.div>

      {/* Streak + Radar row */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="glass-pill inline-flex items-center gap-2 px-3 py-2">
            <span className="text-lg">{streak > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white/90">
                {streak > 0 ? `${streak} dia${streak !== 1 ? 's' : ''}` : 'Sem streak'}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/50">
                {streak > 0 ? 'streak ativo' : 'jogue hoje'}
              </span>
            </div>
          </div>
        </div>
        <MiniRadar axes={state.calibration.axes} size={120} />
      </motion.div>

      {/* Campaign hero — centered, highlighted */}
      {seasonActive && campaignDeck && campaignArt && (
        <motion.button
          variants={fadeUp}
          onClick={() => router.push(`/campanha/${CURRENT_SEASON_ID}`)}
          className="relative w-full overflow-hidden rounded-2xl border border-accent-purple/30 text-left"
          style={{
            boxShadow: '0 0 36px rgba(139,92,246,0.22), inset 0 0 40px rgba(212,175,55,0.06)',
          }}
        >
          {/* Cover backdrop */}
          {campaignArt.imageSrc ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${campaignArt.imageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: campaignArt.palette.background }} />
          )}
          {/* Darken overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(8,4,14,0.35) 0%, rgba(8,4,14,0.78) 60%, rgba(8,4,14,0.94) 100%)',
            }}
          />
          {/* Purple/gold sheen */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 110%, rgba(139,92,246,0.35) 0%, transparent 60%), radial-gradient(circle at 50% 0%, rgba(212,175,55,0.16) 0%, transparent 55%)',
            }}
          />

          <div className="relative flex flex-col items-center gap-3 px-5 py-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-gold/30 bg-black/30 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-accent-gold/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.9)]" />
              Temporada ativa
            </span>

            <div className="flex flex-col items-center gap-1">
              <h2 className="text-lg font-bold leading-tight text-white/95" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
                {campaignDeck.name}
              </h2>
              <p className="text-[11px] text-white/60 max-w-[16rem]">{campaignArt.caption}</p>
            </div>

            {/* Day progress */}
            <div className="mt-1 flex items-center gap-2">
              {Array.from({ length: campaignTotalDays }).map((_, i) => {
                const done = i < (campaignProgress?.path.length ?? 0);
                const current = i === (campaignProgress?.path.length ?? 0) && campaignUnlocked && !campaignFinished;
                return (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      done
                        ? 'w-5 bg-accent-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                        : current
                        ? 'w-5 bg-accent-purple shadow-[0_0_10px_rgba(139,92,246,0.9)]'
                        : 'w-3 bg-white/15'
                    }`}
                  />
                );
              })}
            </div>

            {/* Status line */}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-white/70">
              {campaignFinished ? (
                <span className="font-semibold text-accent-gold">Jornada concluida</span>
              ) : campaignUnlocked ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)] animate-pulse" />
                  <span className="font-semibold text-white/90">
                    Dia {Math.max(1, campaignDayNumber)} / {campaignTotalDays} disponivel
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white/50">Proxima cena em</span>
                  <span className="font-mono font-semibold text-white/90">{formatCountdown(unlockIn)}</span>
                </>
              )}
            </div>

            {/* CTA */}
            <span
              className={`mt-2 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold tracking-[0.14em] uppercase ${
                campaignUnlocked
                  ? 'border-accent-purple/50 bg-accent-purple/20 text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]'
                  : 'border-white/20 bg-white/5 text-white/70'
              }`}
            >
              {campaignFinished ? 'Ver desfecho' : campaignUnlocked ? 'Entrar na cena' : 'Abrir livro'}
            </span>

            <span className="text-[9px] uppercase tracking-[0.24em] text-white/35">
              {daysLeftInSeason} dia{daysLeftInSeason !== 1 ? 's' : ''} de temporada
            </span>
          </div>
        </motion.button>
      )}

      {/* Archetype change banner */}
      <AnimatePresence>
        {archetypeChanged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="glass-card relative overflow-hidden rounded-xl border border-accent-purple/30 px-4 py-3"
            style={{ boxShadow: '0 0 24px rgba(139,92,246,0.15)' }}
          >
            {/* Shimmer overlay */}
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-accent-purple/5 to-transparent" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-purple/60">
                  Novo arquetipo
                </span>
                <span className="text-sm font-bold text-white/90">
                  Voce agora e {archetype.name}
                </span>
                <span className="text-[11px] text-white/55">{archetype.tagline}</span>
              </div>
              <button
                onClick={dismissArchetypeBanner}
                className="shrink-0 rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily claim — full width */}
      {canClaimDaily && (
        <motion.div variants={fadeUp}>
          <button
            onClick={claimDaily}
            className="glass-card flex w-full items-center justify-center gap-2.5 rounded-xl border border-accent-gold/20 px-4 py-3 text-sm font-semibold text-accent-gold transition-colors hover:bg-accent-gold/10"
          >
            <span className="text-[13px]">&#9670;</span>
            +10 fichas diarias
          </button>
        </motion.div>
      )}

      {/* Suggested decks — tarot cards */}
      {suggestions.length > 0 && (
        <motion.div variants={fadeUp}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
            {hasPlayed ? 'Continue treinando' : 'Comece por aqui'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {suggestions.map((deck, i) => (
              <DeckTarotCard
                key={deck.deckId}
                deck={deck}
                index={i}
                completed={deck.deckId in state.completedDecks}
                free={weeklyFree.includes(deck.deckId)}
                onClick={() => setSelectedDeck(deck)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Premium decks teaser — locked tarot cards */}
      {premiumDecks.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
              Decks premium
            </p>
            <Link href="/decks" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-gold/60 transition-colors hover:text-accent-gold">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {premiumDecks.map((deck, i) => (
              <DeckTarotCard
                key={deck.deckId}
                deck={deck}
                index={i}
                locked={true}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div variants={fadeUp} className="text-center">
        <Link href="/decks"
          className="glass-button inline-flex items-center gap-2.5 rounded-full border border-white/18 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.16)]">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
          {hasPlayed ? 'Todos os Decks' : 'Comecar'}
        </Link>
      </motion.div>

      {/* Detail modal — play action */}
      <DeckDetailModal
        deck={selectedDeck}
        open={!!selectedDeck}
        onClose={() => setSelectedDeck(null)}
        owned={true}
        onPlay={handlePlay}
      />
    </motion.main>
  );
}
