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
import type { CampaignProgress, Option, Question } from '@/types/game';

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
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full rounded-2xl border border-purple-300/25 bg-black/60 p-6 backdrop-blur-xl shadow-[0_0_48px_rgba(139,92,246,0.18)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-300/80">Final alcancado</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-white/95">{ending.title}</h1>
              <p className="mt-2 text-sm italic text-white/70">&ldquo;{ending.tagline}&rdquo;</p>
              <p className="mt-4 text-[13px] leading-relaxed text-white/70">{ending.description}</p>
              {ending.flavor && (
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">{ending.flavor}</p>
              )}

              {/* Rating */}
              <div className="mt-6 border-t border-white/12 pt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {rating ? 'Obrigado pela avaliacao' : 'Avalie a campanha'}
                </p>
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => !rating && handleRate(r)}
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
                onClick={() => router.push('/')}
                className="mt-6 w-full rounded-full border border-white/25 bg-white/10 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white/90 hover:bg-white/18"
              >
                Voltar ao inicio
              </button>
            </motion.div>
          </div>
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

  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-1 flex-col"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-purple-300/70">
        {scene.sceneHook ?? `Cena ${step}`}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/38">Dia {step} de {totalSteps}</p>

      <div className="mt-4 space-y-3">
        {contextText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[13px] leading-relaxed text-white/72"
          >
            {contextText}
          </motion.p>
        )}
        {eventText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="rounded-xl border border-amber-300/18 bg-gradient-to-b from-amber-500/8 to-black/50 px-4 py-3 text-[14px] font-semibold leading-relaxed text-white/92"
          >
            {eventText}
          </motion.p>
        )}
      </div>

      {/* Options — unchosen fade out after answer */}
      <div className="mt-5 space-y-2">
        {scene.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isHidden = selectedIdx != null && !isSelected;
          return (
            <motion.button
              key={i}
              type="button"
              disabled={selectedIdx != null}
              onClick={() => onAnswer(i)}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: isHidden ? 0 : 1,
                y: 0,
                scale: isHidden ? 0.96 : 1,
              }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
              className={`w-full rounded-xl border px-4 py-3 text-left backdrop-blur-md transition-all ${
                isSelected
                  ? 'border-purple-300/50 bg-purple-500/20 shadow-[0_0_24px_rgba(139,92,246,0.3)]'
                  : 'border-white/12 bg-white/6 hover:border-white/25 hover:bg-white/10'
              } ${isHidden ? 'pointer-events-none' : ''}`}
            >
              <p className="text-[13px] leading-snug text-white/90">{opt.text}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{opt.subtext}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback of chosen option */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-4 rounded-xl border border-purple-300/25 bg-gradient-to-b from-purple-500/15 to-black/60 px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-purple-300/80">Consequencia</p>
            <p className="mt-1 text-[13px] leading-relaxed italic text-white/82">{selected.feedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next scene countdown — appears after answer (if not ending) */}
      <AnimatePresence>
        {showNextCountdown && !progress.endingId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-auto pt-6"
          >
            <div className="rounded-2xl border border-white/12 bg-black/55 px-4 py-4 text-center backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">Proxima cena abre as 00:00</p>
              <p className="mt-1 font-mono text-xl font-bold text-white/90">{formatCountdown(msUntilNext)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
