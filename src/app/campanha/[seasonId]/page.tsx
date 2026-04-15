'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks/index';
import { getDeckArt } from '@/lib/deckArt';
import {
  SEASONS,
  canPlayCampaignNow,
  daysRemainingInSeason,
  formatCountdown,
  isSeasonActive,
  msUntilNextUnlock,
} from '@/lib/season';
import HoldButton from '@/components/HoldButton';
import { STAT_COLORS, STAT_KEYS } from '@/types/game';
import type { CampaignEnding, CampaignProgress, Option, Question, StatKey } from '@/types/game';

function getDominantAxis(weights: Partial<Record<StatKey, number>>): StatKey {
  let max: StatKey = 'vigor';
  let maxVal = -Infinity;
  for (const key of STAT_KEYS) {
    const v = weights[key];
    if (v !== undefined && v > maxVal) {
      maxVal = v;
      max = key;
    }
  }
  return max;
}

export default function CampaignPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = use(params);
  const router = useRouter();
  const { state, dispatch } = useGame();

  const season = useMemo(() => SEASONS.find(s => s.id === seasonId), [seasonId]);
  const deck = season ? getDeckById(season.campaignDeckId) : null;
  const progress: CampaignProgress | null = state.campaigns[seasonId] ?? null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const active = season ? isSeasonActive(now) : false;
  const canPlay = canPlayCampaignNow(progress, now);
  const msLeft = msUntilNextUnlock(progress, now);
  const daysLeft = daysRemainingInSeason(now);

  // Find current scene
  const currentScene: Question | null = useMemo(() => {
    if (!deck) return null;
    const sceneId = progress?.currentSceneId ?? deck.startSceneId ?? deck.questions[0]?.id;
    return deck.questions.find(q => q.id === sceneId) ?? null;
  }, [deck, progress]);

  const startedStep = progress ? progress.path.length : 0;
  const totalSteps = 7;

  // --- Actions ---------------------------------------------------------------

  const handleStart = useCallback(() => {
    if (!deck) return;
    dispatch({ type: 'CAMPAIGN_START', seasonId, deck });
  }, [deck, dispatch, seasonId]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showNextCountdown, setShowNextCountdown] = useState(false);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentScene || !progress) return;
      const option: Option = currentScene.options[optionIndex];
      const tensao = currentScene.metadata?.tensao ?? 3;
      setSelectedIdx(optionIndex);

      dispatch({
        type: 'CAMPAIGN_ANSWER',
        seasonId,
        sceneId: currentScene.id,
        optionIndex,
        nextSceneId: option.nextSceneId ?? null,
        endingId: option.endingId ?? null,
        weights: option.weights,
        tone: option.tone,
        tensao,
      });

      // Short delay to show feedback, then reveal countdown or ending
      window.setTimeout(() => {
        setShowNextCountdown(true);
      }, 900);
    },
    [currentScene, progress, dispatch, seasonId],
  );

  const [rating, setRating] = useState<number | null>(progress?.rating ?? null);
  const handleRate = useCallback(
    (r: number) => {
      setRating(r);
      dispatch({ type: 'CAMPAIGN_RATE', seasonId, rating: r });
    },
    [dispatch, seasonId],
  );

  // Reset transient state when a new scene loads
  useEffect(() => {
    setSelectedIdx(null);
    setShowNextCountdown(false);
  }, [progress?.currentSceneId]);

  // --- Guards ----------------------------------------------------------------

  if (!season || !deck) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/40">Temporada nao encontrada</p>
          <button onClick={() => router.push('/decks')} className="mt-4 rounded-full border border-white/20 bg-white/8 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Voltar
          </button>
        </div>
      </main>
    );
  }

  const art = getDeckArt(deck);
  const ending = progress?.endingId ? deck.endings?.find(e => e.id === progress.endingId) ?? null : null;

  // --- Render ----------------------------------------------------------------

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-hidden pb-20">
      {/* Cover backdrop */}
      {art.imageSrc && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${art.imageSrc})`,
            opacity: 0.42,
            filter: 'saturate(0.9) contrast(1.05)',
          }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(10,5,15,0.85) 40%, rgba(0,0,0,0.95) 100%)' }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: art.palette.background, mixBlendMode: 'multiply', opacity: 0.55 }} />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pt-5">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/decks')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md hover:bg-black/60"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Sair
          </button>
          <span className="rounded-full border border-purple-300/30 bg-purple-500/18 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-purple-200 shadow-[0_0_16px_rgba(139,92,246,0.25)]">
            Temporada · {daysLeft}d
          </span>
        </div>

        {/* Ending state */}
        {ending ? (
          <EndingReveal
            ending={ending}
            rating={rating}
            onRate={handleRate}
            onExit={() => router.push('/')}
          />
        ) : !progress ? (
          /* Hub — campaign not started yet */
          <HubView
            deckName={deck.name}
            description={deck.description}
            tema={deck.tema}
            daysLeft={daysLeft}
            totalSteps={totalSteps}
            active={active}
            onStart={handleStart}
          />
        ) : canPlay && currentScene ? (
          /* Scene — playable now */
          <SceneView
            scene={currentScene}
            selectedIdx={selectedIdx}
            showNextCountdown={showNextCountdown}
            progress={progress}
            totalSteps={totalSteps}
            step={startedStep + 1}
            onAnswer={handleAnswer}
            msUntilNext={msLeft}
          />
        ) : (
          /* Locked — countdown to 00:00 */
          <LockedView
            deckName={deck.name}
            step={startedStep}
            totalSteps={totalSteps}
            msLeft={msLeft}
            daysLeft={daysLeft}
          />
        )}
      </div>
    </main>
  );
}

// ============================================================================
// Hub view (before campaign starts)
// ============================================================================

function HubView({
  deckName,
  description,
  tema,
  daysLeft,
  totalSteps,
  active,
  onStart,
}: {
  deckName: string;
  description: string;
  tema: string;
  daysLeft: number;
  totalSteps: number;
  active: boolean;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-1 flex-col"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-purple-300/70">Temporada 0</p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-white/95">{deckName}</h1>
      <p className="mt-2 text-xs italic text-white/55">{tema}</p>

      <div className="mt-6 rounded-2xl border border-white/12 bg-black/50 p-4 backdrop-blur-xl">
        <p className="text-[13px] leading-relaxed text-white/72">{description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Cenas" value={`${totalSteps}`} />
          <Stat label="Dias restantes" value={`${daysLeft}`} />
          <Stat label="Ritmo" value="1 por dia" />
          <Stat label="Acesso" value={active ? 'Gratuito' : 'Encerrada'} />
        </div>
      </div>

      <div className="mt-auto pt-6">
        <motion.button
          type="button"
          onClick={onStart}
          disabled={!active}
          animate={active ? { opacity: [0.88, 1, 0.88] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full rounded-2xl border border-purple-300/40 bg-gradient-to-b from-purple-500/25 to-purple-700/35 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_0_32px_rgba(139,92,246,0.3)] hover:brightness-110 disabled:opacity-40"
        >
          {active ? 'Abrir o livro' : 'Temporada encerrada'}
        </motion.button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-white/38">
          Uma cena por dia · Destravamento as 00:00
        </p>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white/88">{value}</p>
    </div>
  );
}

// ============================================================================
// Locked view (waiting for 00:00)
// ============================================================================

function LockedView({
  deckName,
  step,
  totalSteps,
  msLeft,
  daysLeft,
}: {
  deckName: string;
  step: number;
  totalSteps: number;
  msLeft: number;
  daysLeft: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div className="w-full rounded-2xl border border-white/12 bg-black/55 p-6 backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-300/70">{deckName}</p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/50">
          Dia {step}/{totalSteps} respondido
        </p>

        <div className="my-6 flex flex-col items-center">
          <svg className="h-10 w-10 text-purple-300/70" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
          </svg>
          <p className="mt-3 text-sm text-white/68">Proxima cena abre as 00:00</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white/92">{formatCountdown(msLeft)}</p>
        </div>

        <p className="text-[11px] text-white/45">
          Voce tem {daysLeft} dias ate a temporada fechar. Volte amanha pra continuar a historia.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Scene view
// ============================================================================

// ============================================================================
// Ending reveal — dramatic final scene
// ============================================================================

function EndingReveal({
  ending,
  rating,
  onRate,
  onExit,
}: {
  ending: CampaignEnding;
  rating: number | null;
  onRate: (r: number) => void;
  onExit: () => void;
}) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t0 = window.setTimeout(() => setStage(1), 900);   // kicker
    const t1 = window.setTimeout(() => setStage(2), 2200);  // title + tagline
    const t2 = window.setTimeout(() => setStage(3), 4200);  // body + rating + exit
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      {/* Full blackout for dramatic reveal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute inset-0 -mx-4 -mt-5 bg-black"
      />
      {/* Golden godray */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 1 : 0 }}
        transition={{ duration: 2 }}
        className="pointer-events-none absolute inset-0 -mx-4 -mt-5"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.22) 0%, rgba(139,92,246,0.12) 30%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full">
        <AnimatePresence>
          {stage >= 1 && (
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.32em' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-[11px] font-semibold uppercase text-accent-gold/85"
            >
              Final alcancado
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage >= 2 && (
            <>
              <motion.h1
                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-white"
                style={{ textShadow: '0 4px 32px rgba(212,175,55,0.35)' }}
              >
                {ending.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="mt-4 text-base italic text-white/75"
              >
                &ldquo;{ending.tagline}&rdquo;
              </motion.p>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-8 rounded-2xl border border-purple-300/25 bg-black/55 p-5 backdrop-blur-xl"
            >
              <p className="text-[13px] leading-relaxed text-white/75">{ending.description}</p>
              {ending.flavor && (
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-gold/70">
                  {ending.flavor}
                </p>
              )}

              <div className="mt-6 border-t border-white/12 pt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {rating ? 'Obrigado pela avaliacao' : 'Avalie a campanha'}
                </p>
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => !rating && onRate(r)}
                      disabled={!!rating}
                      className={`transition-transform ${!rating ? 'hover:scale-110' : ''}`}
                    >
                      <svg
                        className={`h-7 w-7 ${rating && r <= rating ? 'text-amber-300' : 'text-white/25'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l2.9 7h7.1l-5.8 4.2 2.2 7.1L12 16l-6.4 4.3 2.2-7.1L2 9h7.1z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onExit}
                className="mt-6 w-full rounded-full border border-white/25 bg-white/10 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white/90 hover:bg-white/18"
              >
                Voltar ao inicio
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type ScenePhase = 'ready' | 'context' | 'event' | 'options' | 'feedback';

function SceneView({
  scene,
  selectedIdx,
  showNextCountdown,
  progress,
  totalSteps,
  step,
  onAnswer,
  msUntilNext,
}: {
  scene: Question;
  selectedIdx: number | null;
  showNextCountdown: boolean;
  progress: CampaignProgress;
  totalSteps: number;
  step: number;
  onAnswer: (idx: number) => void;
  msUntilNext: number;
}) {
  const contextText = scene.slides.find(s => s.tipo === 'contexto')?.texto;
  const eventText = scene.slides.find(s => s.tipo === 'evento')?.texto;

  const selected = selectedIdx != null ? scene.options[selectedIdx] : null;
  const isFinalChapter = step >= totalSteps;
  const willTriggerEnding = selected?.endingId != null;

  // Phase machine — brings back the "preparo" beat so campaign feels like decks
  const [phase, setPhase] = useState<ScenePhase>('ready');
  useEffect(() => {
    setPhase('ready');
  }, [scene.id]);

  useEffect(() => {
    if (phase !== 'ready' && selectedIdx == null) return;
  }, [phase, selectedIdx]);

  const beginScene = useCallback(() => {
    setPhase('context');
    // Ramp: context (stays) → event after ~2.4s → options after +3.2s
    const t1 = window.setTimeout(() => setPhase('event'), contextText ? 2400 : 0);
    const t2 = window.setTimeout(
      () => setPhase('options'),
      (contextText ? 2400 : 0) + (eventText ? 3200 : 500),
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [contextText, eventText]);

  useEffect(() => {
    if (selectedIdx != null) setPhase('feedback');
  }, [selectedIdx]);

  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="flex flex-1 flex-col"
    >
      {/* Ending transition — fade-to-black when final choice is made */}
      <AnimatePresence>
        {willTriggerEnding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.2 }}
            className="pointer-events-none fixed inset-0 z-40 bg-black"
          />
        )}
      </AnimatePresence>

      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-purple-300/70">
        {scene.sceneHook ?? `Cena ${step}`}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/38">
        {isFinalChapter ? 'CAPITULO FINAL' : `Dia ${step} de ${totalSteps}`}
      </p>

      {/* ============== READY PHASE — preparation gate ================== */}
      <AnimatePresence mode="wait">
        {phase === 'ready' && (
          <motion.button
            key="ready"
            type="button"
            onClick={beginScene}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
            className="mt-auto mb-auto flex flex-col items-center justify-center gap-4 py-10"
          >
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.55, 1, 0.55],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-20 w-20 items-center justify-center rounded-full border border-purple-300/35"
              style={{
                boxShadow: isFinalChapter
                  ? '0 0 48px rgba(212,175,55,0.5), inset 0 0 24px rgba(139,92,246,0.3)'
                  : '0 0 36px rgba(139,92,246,0.35)',
                background: isFinalChapter
                  ? 'radial-gradient(circle, rgba(212,175,55,0.25), rgba(139,92,246,0.15))'
                  : 'radial-gradient(circle, rgba(139,92,246,0.2), transparent)',
              }}
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={isFinalChapter ? '#d4af37' : '#c084fc'} strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-6-8h12" />
              </svg>
            </motion.div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
              {isFinalChapter ? 'O desfecho aguarda' : 'Respire antes de entrar'}
            </p>
            <p className="text-base font-bold uppercase tracking-[0.18em] text-white/90">
              Tocar para abrir a cena
            </p>
          </motion.button>
        )}

        {/* ============== SCENE TEXT PHASES ================== */}
        {(phase === 'context' || phase === 'event' || phase === 'options' || phase === 'feedback') && (
          <motion.div
            key="scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-1 flex-col"
          >
            <div className="mt-4 space-y-3">
              {contextText && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[13px] leading-relaxed text-white/72"
                >
                  {contextText}
                </motion.p>
              )}
              {eventText && (phase === 'event' || phase === 'options' || phase === 'feedback') && (
                <motion.p
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border border-amber-300/20 bg-gradient-to-b from-amber-500/10 to-black/55 px-4 py-3 text-[14px] font-semibold leading-relaxed text-white/95 shadow-[0_0_24px_rgba(212,175,55,0.1)]"
                >
                  {eventText}
                </motion.p>
              )}
            </div>

            {/* Options with Hold — only after event ramp completes */}
            {(phase === 'options' || phase === 'feedback') && (
              <div className="mt-5 space-y-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                  Segure para confirmar
                </p>
                {scene.options.map((opt, i) => {
                  const isSelected = selectedIdx === i;
                  const isHidden = selectedIdx != null && !isSelected;
                  const holdColor = STAT_COLORS[getDominantAxis(opt.weights)];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{
                        opacity: isHidden ? 0 : 1,
                        y: 0,
                        scale: isHidden ? 0.96 : 1,
                      }}
                      transition={{ delay: phase === 'options' ? 0.15 + i * 0.08 : 0, duration: 0.35 }}
                      className={isHidden ? 'pointer-events-none' : ''}
                    >
                      <HoldButton
                        onConfirm={() => onAnswer(i)}
                        holdColor={holdColor}
                        disabled={selectedIdx != null}
                        className={`w-full rounded-xl border px-4 py-3 text-left backdrop-blur-md transition-colors ${
                          isSelected
                            ? 'border-purple-300/50 bg-purple-500/20 shadow-[0_0_28px_rgba(139,92,246,0.35)]'
                            : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                            style={{
                              borderColor: `${holdColor}55`,
                              color: holdColor,
                              backgroundColor: `${holdColor}18`,
                            }}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <div>
                            <p className="text-[13px] leading-snug text-white/90">{opt.text}</p>
                            {opt.subtext && (
                              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
                                {opt.subtext}
                              </p>
                            )}
                          </div>
                        </div>
                      </HoldButton>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Feedback of chosen option */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="mt-4 rounded-xl border border-purple-300/25 bg-gradient-to-b from-purple-500/15 to-black/60 px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-purple-300/80">
                    Consequencia
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed italic text-white/82">{selected.feedback}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next scene countdown — appears after answer (if not ending) */}
            <AnimatePresence>
              {showNextCountdown && !progress.endingId && !willTriggerEnding && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-auto pt-6"
                >
                  <div className="rounded-2xl border border-white/12 bg-black/55 px-4 py-4 text-center backdrop-blur-xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                      Proxima cena abre as 00:00
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-white/90">{formatCountdown(msUntilNext)}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
