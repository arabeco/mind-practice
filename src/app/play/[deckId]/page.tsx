'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks/index';
import Timer from '@/components/Timer';
import HoldButton from '@/components/HoldButton';
import SlideTransition from '@/components/SlideTransition';
import { STAT_COLORS, STAT_KEYS, getSceneDelay } from '@/types/game';
import type { QuestionType, StatKey, Option } from '@/types/game';

type Phase = 'context' | 'event' | 'delay' | 'options' | 'feedback';

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

function getDominantAxis(weights: Partial<Record<StatKey, number>>): StatKey {
  let max: StatKey = 'vigor';
  let maxVal = -Infinity;
  for (const key of STAT_KEYS) {
    const v = weights[key];
    if (v !== undefined && v > maxVal) { maxVal = v; max = key; }
  }
  return max;
}

function getAxisTags(weights: Partial<Record<StatKey, number>>): { key: StatKey; value: number }[] {
  return STAT_KEYS
    .filter(k => weights[k] !== undefined && weights[k] !== 0)
    .map(k => ({ key: k, value: weights[k]! }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);
}

export default function PlayPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const router = useRouter();
  const { state, dispatch } = useGame();

  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('context');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.activeDeck?.deckId === deckId) return;
    const deck = getDeckById(deckId);
    if (!deck) { router.replace('/decks'); return; }
    dispatch({ type: 'START_DECK', deck });
  }, [deckId, state.activeDeck, dispatch, router]);

  const deck = state.activeDeck;
  const question = deck?.questions[questionIdx] ?? null;
  const totalQuestions = deck?.questions.length ?? 0;
  const isLast = questionIdx >= totalQuestions - 1;

  useEffect(() => () => { if (autoRef.current) clearTimeout(autoRef.current); }, []);

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'context') {
      autoRef.current = setTimeout(() => setPhase('event'), 3000);
    } else if (phase === 'event') {
      autoRef.current = setTimeout(() => setPhase('delay'), 3000);
    } else if (phase === 'delay') {
      const delayMs = question ? getSceneDelay(question.metadata.tensao) : 1000;
      autoRef.current = setTimeout(() => {
        setPhase('options');
        setTimerRunning(true);
      }, delayMs);
    }
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [phase, questionIdx, question]);

  const handleTapAdvance = useCallback(() => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (phase === 'context') setPhase('event');
    else if (phase === 'event') {
      setPhase('delay');
    }
  }, [phase]);

  const handleAnswer = useCallback((opt: Option) => {
    setTimerRunning(false);
    dispatch({ type: 'ANSWER', weights: opt.weights, tone: opt.tone });
    setSelectedFeedback(opt.feedback);
    setPhase('feedback');
  }, [dispatch]);

  const handleTimeout = useCallback(() => {
    setTimerRunning(false);
    dispatch({ type: 'TIMEOUT' });
    setSelectedFeedback('Tempo esgotado! A inercia falou por voce.');
    setPhase('feedback');
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (isLast) {
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
      return;
    }
    dispatch({ type: 'NEXT_QUESTION' });
    setQuestionIdx(prev => prev + 1);
    setPhase('context');
    setSelectedFeedback('');
    setTimerRunning(false);
  }, [isLast, dispatch, router, deckId]);

  if (!deck || !question) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-white/50">Carregando...</p></div>;
  }

  const contextSlide = question.slides.find(s => s.tipo === 'contexto');
  const eventSlide = question.slides.find(s => s.tipo === 'evento');
  const progress = ((questionIdx + 1) / totalQuestions) * 100;

  return (
    <div className="flex flex-col min-h-screen pb-4 px-4">
      {/* Top bar */}
      <div className="pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/60 truncate max-w-[50%]">{deck.name}</h2>
          <span className="text-sm text-white/40">{questionIdx + 1}/{totalQuestions}</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-accent-purple" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex justify-center pt-1">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${TYPE_COLORS[question.type]}`}>{TYPE_LABELS[question.type]}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Context */}
        {phase === 'context' && contextSlide && (
          <SlideTransition slideKey={`ctx-${questionIdx}`} type="context">
            <button type="button" onClick={handleTapAdvance} className="glass-card p-6 max-w-md w-full text-center space-y-4 cursor-pointer">
              <p className="text-lg text-white/90 leading-relaxed">{contextSlide.texto}</p>
              <p className="text-xs text-white/30">Toque para avancar</p>
            </button>
          </SlideTransition>
        )}

        {/* Event */}
        {phase === 'event' && eventSlide && (
          <SlideTransition slideKey={`evt-${questionIdx}`} type="event">
            <button type="button" onClick={handleTapAdvance} className="glass-card border-accent-purple/30 p-6 max-w-md w-full text-center space-y-4 cursor-pointer">
              <p className="text-xl font-semibold text-white leading-relaxed">{eventSlide.texto}</p>
              <p className="text-xs text-white/30">Toque para responder</p>
            </button>
          </SlideTransition>
        )}

        {/* Delay (forced pause) */}
        {phase === 'delay' && (
          <SlideTransition slideKey={`delay-${questionIdx}`} type="context">
            <div className="flex items-center justify-center py-12">
              <div className="w-3 h-3 rounded-full bg-accent-purple animate-pulse" />
            </div>
          </SlideTransition>
        )}

        {/* Options with Hold */}
        {phase === 'options' && (
          <SlideTransition slideKey={`opt-${questionIdx}`} type="options">
            <div className="w-full max-w-md space-y-6">
              <div className="flex justify-center">
                <Timer running={timerRunning} onTimeout={handleTimeout} />
              </div>
              <div className="space-y-3">
                {question.options.map((opt, idx) => {
                  const dominant = getDominantAxis(opt.weights);
                  const holdColor = STAT_COLORS[dominant];
                  const tags = getAxisTags(opt.weights);

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <HoldButton
                        onConfirm={() => handleAnswer(opt)}
                        holdColor={holdColor}
                        className="glass-card-hover w-full p-4 text-left rounded-2xl"
                      >
                        <p className="text-white/90 font-medium leading-snug">{opt.text}</p>
                        <p className="text-xs text-white/30 mt-1">{opt.subtext}</p>
                        <div className="flex gap-1.5 mt-2">
                          {tags.map(t => (
                            <span
                              key={t.key}
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                color: STAT_COLORS[t.key],
                                backgroundColor: `${STAT_COLORS[t.key]}15`,
                              }}
                            >
                              {t.key.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </HoldButton>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </SlideTransition>
        )}

        {/* Feedback */}
        {phase === 'feedback' && (
          <SlideTransition slideKey={`fb-${questionIdx}`} type="context">
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="glass-card p-6">
                <p className="text-white/90 text-lg leading-relaxed">{selectedFeedback}</p>
              </div>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleNext}
                className="mx-auto block px-8 py-3 rounded-xl bg-accent-purple text-white font-semibold hover:bg-accent-purple-light transition-colors"
              >
                {isLast ? 'Ver Resultado' : 'Proxima'}
              </motion.button>
            </div>
          </SlideTransition>
        )}
      </div>
    </div>
  );
}
