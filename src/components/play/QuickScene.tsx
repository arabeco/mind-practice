'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import HoldButton from '@/components/HoldButton';
import { STAT_COLORS, STAT_KEYS } from '@/types/game';
import type { Option, Question, StatKey } from '@/types/game';

interface QuickSceneProps {
  question: Question;
  questionIdx: number;
  totalQuestions: number;
  deckName: string;
  onAnswer: (option: Option, responseTimeMs: number) => void;
  enableHaptics: boolean;
}

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

/** Deterministic shuffle (stable per question) */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  for (let i = copy.length - 1; i > 0; i--) {
    h = ((h << 5) - h + i) | 0;
    const j = (h >>> 0) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Single-screen scene for quick calibration decks.
 * No 3-phase ritual, no 12s timer — just a prompt and hold options.
 * The player sets their own pace.
 */
export default function QuickScene({
  question,
  questionIdx,
  totalQuestions,
  deckName,
  onAnswer,
  enableHaptics,
}: QuickSceneProps) {
  const shuffled = useMemo(
    () => seededShuffle(question.options, question.id),
    [question.id, question.options],
  );

  // Prefer event slide as the prompt; fall back to context or first slide.
  const prompt = useMemo(() => {
    const event = question.slides.find(s => s.tipo === 'evento')?.texto;
    const context = question.slides.find(s => s.tipo === 'contexto')?.texto;
    return event ?? context ?? question.slides[0]?.texto ?? '';
  }, [question.slides]);
  const scenario = useMemo(() => {
    const event = question.slides.find(s => s.tipo === 'evento')?.texto;
    const context = question.slides.find(s => s.tipo === 'contexto')?.texto;
    return event && context ? context : null;
  }, [question.slides]);

  const startedAt = useMemo(() => Date.now(), [question.id]);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-6"
    >
      {/* Top meta */}
      <div className="mb-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
        <span>{deckName}</span>
        <span>
          {questionIdx + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex items-center gap-1">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < questionIdx
                ? 'bg-accent-purple/70'
                : i === questionIdx
                ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.7)]'
                : 'bg-white/12'
            }`}
          />
        ))}
      </div>

      {/* Scene hook — the "dia" / framing */}
      {question.sceneHook && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-gold/75"
        >
          {question.sceneHook}
        </motion.p>
      )}

      {/* Optional scenario line — the situation */}
      {scenario && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="mb-3 text-[12px] leading-relaxed text-white/55"
        >
          {scenario}
        </motion.p>
      )}

      {/* Main prompt */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        className="mb-6 text-[19px] font-semibold leading-snug text-white/95"
      >
        {prompt}
      </motion.h2>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {shuffled.map((option, i) => {
          const dominantAxis = getDominantAxis(option.weights);
          const holdColor = STAT_COLORS[dominantAxis];
          return (
            <motion.div
              key={`${question.id}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }}
            >
              <HoldButton
                onConfirm={() => onAnswer(option, Date.now() - startedAt)}
                holdColor={holdColor}
                enableHaptics={enableHaptics}
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-left backdrop-blur-md transition-colors hover:border-white/22 hover:bg-white/10"
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
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug text-white/92">{option.text}</p>
                    {option.subtext && (
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/42">
                        {option.subtext}
                      </p>
                    )}
                  </div>
                </div>
              </HoldButton>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-auto pt-8 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
        Segure para confirmar · sem tempo, no seu ritmo
      </p>
    </motion.div>
  );
}
