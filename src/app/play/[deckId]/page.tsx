'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SceneBackdrop from '@/components/play/SceneBackdrop';
import SceneDelayStage from '@/components/play/SceneDelayStage';
import SceneFeedbackStage from '@/components/play/SceneFeedbackStage';
import SceneHUD from '@/components/play/SceneHUD';
import SceneOptionsStage from '@/components/play/SceneOptionsStage';
import SceneTextStage from '@/components/play/SceneTextStage';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks/index';
import { usePresentationPrefs } from '@/hooks/usePresentationPrefs';
import { useSceneAudio } from '@/hooks/useSceneAudio';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { getScenePresentationProfile } from '@/lib/scenePresentation';
import type { Option } from '@/types/game';

export default function PlayPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const router = useRouter();
  const { state, dispatch } = useGame();
  const { prefs, setSoundEnabled } = usePresentationPrefs();
  const {
    unlock,
    setAmbience,
    stopAmbience,
    playEventImpact,
    playUiCue,
    vibrate,
  } = useSceneAudio({
    soundEnabled: prefs.soundEnabled,
    hapticsEnabled: prefs.hapticsEnabled,
  });

  useEffect(() => {
    if (state.activeDeck?.deckId === deckId) return;
    const deck = getDeckById(deckId);
    if (!deck) {
      router.replace('/decks');
      return;
    }
    dispatch({ type: 'START_DECK', deck });
  }, [deckId, state.activeDeck, dispatch, router]);

  const deck = state.activeDeck;
  const questionIdx = state.currentQuestion;
  const question = deck?.questions[questionIdx] ?? null;
  const totalQuestions = deck?.questions.length ?? 0;
  const isLast = questionIdx >= totalQuestions - 1;

  const handleResolvedAnswer = useCallback((option: Option, responseTimeMs: number) => {
    dispatch({ type: 'ANSWER', weights: option.weights, tone: option.tone, responseTimeMs });
    playUiCue('hold-confirm');
    vibrate(18);
  }, [dispatch, playUiCue, vibrate]);

  const {
    phase,
    selectedFeedback,
    canTapAdvance,
    handleTapAdvance,
    handleAnswer,
  } = useSceneDirector({
    question,
    reducedMotion: prefs.reducedMotion,
    onAnswerResolved: handleResolvedAnswer,
  });

  const presentation = deck && question
    ? getScenePresentationProfile(deck, question, prefs.reducedMotion)
    : null;

  useEffect(() => {
    if (!presentation) return;
    setAmbience(presentation, presentation.tensionBand);
  }, [presentation?.ambience, presentation?.key, presentation?.tensionBand, setAmbience]);

  useEffect(() => {
    if (!question || !presentation) return;

    if (phase === 'event') {
      playEventImpact(presentation.tensionBand);
      vibrate(question.metadata.tensao >= 4 ? [20, 32, 16] : 16);
      return;
    }

    if (phase === 'options' || phase === 'feedback') {
      playUiCue('phase-enter');
    }
  }, [phase, presentation?.key, presentation?.tensionBand, question?.id, question?.metadata.tensao, playEventImpact, playUiCue, vibrate]);

  const handleNext = useCallback(() => {
    if (isLast) {
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
      return;
    }

    dispatch({ type: 'NEXT_QUESTION' });
  }, [isLast, dispatch, router, deckId]);

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const confirmExit = useCallback(() => {
    stopAmbience();
    setExitConfirmOpen(false);
    router.push('/decks');
  }, [router, stopAmbience]);

  const handleToggleSound = useCallback(() => {
    const next = !prefs.soundEnabled;
    setSoundEnabled(next);

    if (next) {
      unlock().then((ok) => {
        if (ok) playUiCue('phase-enter');
      });
      return;
    }

    stopAmbience();
  }, [prefs.soundEnabled, unlock, playUiCue, setSoundEnabled, stopAmbience]);

  if (!deck || !question || !presentation) {
    return (
      <div className="-mb-20 flex min-h-[100dvh] items-center justify-center bg-black px-6">
        <p className="text-sm uppercase tracking-[0.28em] text-white/35">Carregando cena</p>
      </div>
    );
  }

  const progress = totalQuestions > 0 ? ((questionIdx + 1) / totalQuestions) * 100 : 0;

  return (
    <div
      className="-mb-20 relative min-h-[100dvh] overflow-hidden bg-black"
      onPointerDownCapture={() => {
        unlock();
      }}
    >
      <SceneBackdrop profile={presentation} phase={phase} reducedMotion={prefs.reducedMotion} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_40%)]" />

      <SceneHUD
        deckName={deck.name}
        question={question}
        questionIndex={questionIdx}
        totalQuestions={totalQuestions}
        progress={progress}
        phase={phase}
        soundEnabled={prefs.soundEnabled}
        onToggleSound={handleToggleSound}
        onExit={() => setExitConfirmOpen(true)}
        profile={presentation}
      />

      <AnimatePresence>
        {exitConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
            onClick={() => setExitConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0c0c12] p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-base font-bold text-white/92">Sair da cena?</h3>
              <p className="mt-1.5 text-xs text-white/55">Seu progresso neste deck sera perdido.</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setExitConfirmOpen(false)}
                  className="flex-1 rounded-full border border-white/20 bg-white/8 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 hover:bg-white/15"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={confirmExit}
                  className="flex-1 rounded-full border border-red-400/40 bg-red-500/18 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-200 hover:bg-red-500/28"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {(phase === 'context' || phase === 'event') && (
          <SceneTextStage
            key={`${question.id}-${phase}`}
            question={question}
            phase={phase}
            canTapAdvance={canTapAdvance}
            onTapAdvance={handleTapAdvance}
            profile={presentation}
            reducedMotion={prefs.reducedMotion}
          />
        )}

        {phase === 'delay' && (
          <SceneDelayStage
            key={`${question.id}-delay`}
            profile={presentation}
            reducedMotion={prefs.reducedMotion}
          />
        )}

        {phase === 'options' && (
          <SceneOptionsStage
            key={`${question.id}-options`}
            question={question}
            onAnswer={handleAnswer}
            profile={presentation}
            enableHaptics={prefs.hapticsEnabled}
          />
        )}

        {phase === 'feedback' && (
          <SceneFeedbackStage
            key={`${question.id}-feedback`}
            feedback={selectedFeedback}
            onNext={handleNext}
            isLast={isLast}
            profile={presentation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
