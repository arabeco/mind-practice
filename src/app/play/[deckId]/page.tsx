'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks/index';
import Timer from '@/components/Timer';
import SlideTransition from '@/components/SlideTransition';
import type { QuestionType, StatKey } from '@/types/game';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'context' | 'event' | 'options' | 'feedback';

const TYPE_COLORS: Record<QuestionType, string> = {
  TENSION: 'bg-red-500/30 text-red-300',
  RANDOM: 'bg-yellow-500/30 text-yellow-300',
  SOCIAL: 'bg-blue-500/30 text-blue-300',
  NORMAL: 'bg-white/10 text-white/70',
};

const TYPE_LABELS: Record<QuestionType, string> = {
  TENSION: 'Alta Tensao',
  RANDOM: 'Aleatorio',
  SOCIAL: 'Social',
  NORMAL: 'Normal',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = use(params);
  const router = useRouter();
  const { state, dispatch } = useGame();

  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('context');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Mount: load deck -----
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
  const question = deck?.questions[questionIdx] ?? null;
  const totalQuestions = deck?.questions.length ?? 0;
  const isLastQuestion = questionIdx >= totalQuestions - 1;

  // ----- Clear auto-advance on unmount -----
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // ----- Auto-advance for context & event phases -----
  useEffect(() => {
    if (phase !== 'context' && phase !== 'event') return;

    autoAdvanceRef.current = setTimeout(() => {
      if (phase === 'context') setPhase('event');
      else if (phase === 'event') {
        setPhase('options');
        setTimerRunning(true);
      }
    }, 3000);

    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [phase, questionIdx]);

  // ----- Handlers -----

  const handleTapAdvance = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);

    if (phase === 'context') {
      setPhase('event');
    } else if (phase === 'event') {
      setPhase('options');
      setTimerRunning(true);
    }
  }, [phase]);

  const handleAnswer = useCallback(
    (weights: Partial<Record<StatKey, number>>, feedback: string) => {
      setTimerRunning(false);
      dispatch({ type: 'ANSWER', weights });
      setSelectedFeedback(feedback);
      setPhase('feedback');
    },
    [dispatch],
  );

  const handleTimeout = useCallback(() => {
    setTimerRunning(false);
    dispatch({ type: 'TIMEOUT' });
    setSelectedFeedback('Tempo esgotado! A inercia falou por voce.');
    setPhase('feedback');
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
      return;
    }
    dispatch({ type: 'NEXT_QUESTION' });
    setQuestionIdx((prev) => prev + 1);
    setPhase('context');
    setSelectedFeedback('');
    setTimerRunning(false);
  }, [isLastQuestion, dispatch, router, deckId]);

  // ----- Guard -----
  if (!deck || !question) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/50 text-lg">Carregando...</div>
      </div>
    );
  }

  // ----- Derived -----
  const contextSlide = question.slides.find((s) => s.tipo === 'contexto');
  const eventSlide = question.slides.find((s) => s.tipo === 'evento');
  const progress = ((questionIdx + 1) / totalQuestions) * 100;

  // ----- Render -----
  return (
    <div className="flex flex-col min-h-screen pb-4 px-4">
      {/* ===== Top Bar ===== */}
      <div className="pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/60 truncate max-w-[50%]">
            {deck.name}
          </h2>
          <span className="text-sm text-white/40">
            {questionIdx + 1}/{totalQuestions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-purple"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Question type badge */}
        <div className="flex justify-center pt-1">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${TYPE_COLORS[question.type]}`}
          >
            {TYPE_LABELS[question.type]}
          </span>
        </div>
      </div>

      {/* ===== Content Area ===== */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* --- Context Phase --- */}
        {phase === 'context' && contextSlide && (
          <SlideTransition
            slideKey={`ctx-${questionIdx}`}
            type="context"
          >
            <button
              type="button"
              onClick={handleTapAdvance}
              className="glass-card p-6 max-w-md w-full text-center space-y-4 cursor-pointer"
            >
              <p className="text-lg text-white/90 leading-relaxed">
                {contextSlide.texto}
              </p>
              <p className="text-xs text-white/30">Toque para avancar</p>
            </button>
          </SlideTransition>
        )}

        {/* --- Event Phase --- */}
        {phase === 'event' && eventSlide && (
          <SlideTransition
            slideKey={`evt-${questionIdx}`}
            type="event"
          >
            <button
              type="button"
              onClick={handleTapAdvance}
              className="glass-card border-accent-purple/30 p-6 max-w-md w-full text-center space-y-4 cursor-pointer"
            >
              <p className="text-xl font-semibold text-white leading-relaxed">
                {eventSlide.texto}
              </p>
              <p className="text-xs text-white/30">Toque para avancar</p>
            </button>
          </SlideTransition>
        )}

        {/* --- Options Phase --- */}
        {phase === 'options' && (
          <SlideTransition
            slideKey={`opt-${questionIdx}`}
            type="options"
          >
            <div className="w-full max-w-md space-y-6">
              <div className="flex justify-center">
                <Timer
                  running={timerRunning}
                  onTimeout={handleTimeout}
                />
              </div>

              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <motion.button
                    key={opt.text}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                    onClick={() => handleAnswer(opt.weights, opt.feedback)}
                    className="glass-card-hover w-full p-4 text-left space-y-1"
                  >
                    <p className="text-white/90 font-medium">{opt.text}</p>
                    <p className="text-xs text-accent-purple-light">
                      {opt.meta}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          </SlideTransition>
        )}

        {/* --- Feedback Phase --- */}
        {phase === 'feedback' && (
          <SlideTransition
            slideKey={`fb-${questionIdx}`}
            type="context"
          >
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="glass-card p-6">
                <p className="text-white/90 text-lg leading-relaxed">
                  {selectedFeedback}
                </p>
              </div>

              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleNext}
                className="mx-auto block px-8 py-3 rounded-xl bg-accent-purple text-white font-semibold
                           hover:bg-accent-purple-light transition-colors"
              >
                {isLastQuestion ? 'Ver Resultado' : 'Proxima'}
              </motion.button>
            </div>
          </SlideTransition>
        )}
      </div>
    </div>
  );
}
