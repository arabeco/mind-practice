'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ArchetypeDriftFlash from '@/components/play/ArchetypeDriftFlash';
import QuickScene from '@/components/play/QuickScene';
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
import { getDeckArt } from '@/lib/deckArt';
import { HAPTIC_GRAMMAR } from '@/lib/hapticGrammar';
import type { AnswerIntensity, Option } from '@/types/game';

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
    playDeckTriumph,
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

  const handleTimeout = useCallback(() => {
    dispatch({ type: 'TIMEOUT' });
    vibrate([20, 40, 20]);
  }, [dispatch, vibrate]);

  const {
    phase,
    selectedFeedback,
    canTapAdvance,
    optionsDeadline,
    handleTapAdvance,
    handleAnswer,
    startScene,
  } = useSceneDirector({
    question,
    reducedMotion: prefs.reducedMotion,
    onAnswerResolved: handleResolvedAnswer,
    onTimeout: handleTimeout,
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
      vibrate(question.metadata.tensao >= 4 ? HAPTIC_GRAMMAR.sceneImpactHigh : HAPTIC_GRAMMAR.sceneTap);
      return;
    }

    if (phase === 'options' || phase === 'feedback') {
      playUiCue('phase-enter');
    }
  }, [phase, presentation?.key, presentation?.tensionBand, question?.id, question?.metadata.tensao, playEventImpact, playUiCue, vibrate]);

  const handleNext = useCallback(() => {
    if (isLast) {
      playDeckTriumph();
      vibrate(HAPTIC_GRAMMAR.triumph);
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
      return;
    }

    dispatch({ type: 'NEXT_QUESTION' });
  }, [isLast, dispatch, router, deckId, playDeckTriumph, vibrate]);

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

  // Quick calibration format — bypass the 3-phase ritual and timer.
  if (deck.format === 'quick') {
    const handleQuickAnswer = (option: Option, responseTimeMs: number, intensity: AnswerIntensity) => {
      dispatch({ type: 'ANSWER', weights: option.weights, tone: option.tone, responseTimeMs, intensity });
      const hapticKey = intensity === 'alta' ? HAPTIC_GRAMMAR.confirm
        : intensity === 'baixa' ? HAPTIC_GRAMMAR.qualify
        : HAPTIC_GRAMMAR.tap;
      vibrate(hapticKey);
      // Auto-advance to next or finish after a short beat to let the feedback register.
      window.setTimeout(() => {
        if (isLast) {
          playDeckTriumph();
          vibrate(HAPTIC_GRAMMAR.triumph);
          dispatch({ type: 'FINISH_DECK' });
          router.push(`/resultado/${deckId}`);
        } else {
          dispatch({ type: 'NEXT_QUESTION' });
        }
      }, 420);
    };

    return (
      <div className="-mb-20 relative min-h-[100dvh] overflow-hidden bg-black">
        <SceneBackdrop
          profile={presentation}
          phase="options"
          reducedMotion={prefs.reducedMotion}
          coverImage={getDeckArt(deck).imageSrc}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.45),rgba(0,0,0,0.75))]" />
        <div className="relative z-10">
          {/* Exit pill */}
          <button
            type="button"
            onClick={() => setExitConfirmOpen(true)}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md hover:bg-black/65"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Sair
          </button>
          <QuickScene
            question={question}
            questionIdx={questionIdx}
            totalQuestions={totalQuestions}
            deckName={deck.name}
            onAnswer={handleQuickAnswer}
            enableHaptics={prefs.hapticsEnabled}
          />
          <ArchetypeDriftFlash />
        </div>

        {/* Exit confirm modal (same as main flow) */}
        <AnimatePresence>
          {exitConfirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setExitConfirmOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="mx-5 w-full max-w-xs rounded-2xl border border-white/15 bg-[#0b0a14] p-5 text-center"
              >
                <p className="text-sm font-semibold text-white/90">Sair da calibragem?</p>
                <p className="mt-1 text-[11px] text-white/55">Suas respostas ate aqui ficam salvas.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExitConfirmOpen(false)}
                    className="flex-1 rounded-full border border-white/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10"
                  >
                    Continuar
                  </button>
                  <button
                    type="button"
                    onClick={confirmExit}
                    className="flex-1 rounded-full border border-red-400/50 bg-red-500/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200 hover:bg-red-500/30"
                  >
                    Sair
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
      <SceneBackdrop
        profile={presentation}
        phase={phase}
        reducedMotion={prefs.reducedMotion}
        coverImage={getDeckArt(deck).imageSrc}
      />

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
            deadlineTs={optionsDeadline}
          />
        )}

        {phase === 'ready' && (
          <motion.div
            key={`${question.id}-ready`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex items-center justify-center px-5"
            onClick={startScene}
          >
            <div className="mx-auto max-w-sm text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
                {deck.name}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white/92 leading-tight">
                {question.sceneHook ?? 'Preparado?'}
              </h2>
              <p className="mt-2 text-xs text-white/55">
                Cena {questionIdx + 1} de {totalQuestions} · 12s para responder com conviccao
              </p>
              <motion.button
                type="button"
                onClick={startScene}
                className="mt-6 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md transition-colors hover:bg-white/18"
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                Tocar para comecar
              </motion.button>
            </div>
          </motion.div>
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

      <ArchetypeDriftFlash />
    </div>
  );
}
