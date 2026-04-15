'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoldButton from '@/components/HoldButton';
import { INTENSITY_LABELS, STAT_COLORS, STAT_KEYS } from '@/types/game';
import type { AnswerIntensity, Option, Question, StatKey } from '@/types/game';

interface QuickSceneProps {
  question: Question;
  questionIdx: number;
  totalQuestions: number;
  deckName: string;
  onAnswer: (option: Option, responseTimeMs: number, intensity: AnswerIntensity) => void;
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

// Order left → right: crescente (hesitante → convicto)
const INTENSITY_ORDER: AnswerIntensity[] = ['baixa', 'media', 'alta'];

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

  // null = picking option; number = option index whose hold finished → pick intensity
  const [picking, setPicking] = useState<number | null>(null);
  // track which option is currently being held so siblings can fade
  const [holdingIdx, setHoldingIdx] = useState<number | null>(null);

  const commit = (idx: number, intensity: AnswerIntensity) => {
    const option = shuffled[idx];
    onAnswer(option, Date.now() - startedAt, intensity);
  };

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
        <span>{questionIdx + 1} / {totalQuestions}</span>
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

      {question.sceneHook && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: picking !== null ? 0.3 : 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-gold/75"
        >
          {question.sceneHook}
        </motion.p>
      )}

      {scenario && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: picking !== null ? 0.3 : 1 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="mb-3 text-[12px] leading-relaxed text-white/55"
        >
          {scenario}
        </motion.p>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: picking !== null ? 0.5 : 1, y: 0 }}
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
          const isFocused = picking === i;
          const isHidden = picking !== null && picking !== i;
          const isDimmed = holdingIdx !== null && holdingIdx !== i;

          return (
            <motion.div
              key={`${question.id}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: isHidden ? 0 : isDimmed ? 0.12 : 1,
                y: 0,
                scale: isDimmed ? 0.97 : 1,
                height: isHidden ? 0 : 'auto',
                marginTop: isHidden ? -8 : 0,
              }}
              transition={{
                delay: picking === null && holdingIdx === null ? 0.35 + i * 0.07 : 0,
                duration: 0.3,
              }}
              style={{ pointerEvents: isHidden ? 'none' : 'auto', overflow: 'hidden' }}
            >
              {picking === null ? (
                <HoldButton
                  onConfirm={() => {
                    setHoldingIdx(null);
                    setPicking(i);
                  }}
                  onHoldStart={() => setHoldingIdx(i)}
                  onHoldCancel={() => setHoldingIdx(null)}
                  holdColor={holdColor}
                  enableHaptics={enableHaptics}
                  className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-left backdrop-blur-md transition-colors hover:border-white/22 hover:bg-white/10"
                >
                  <OptionRow option={option} index={i} holdColor={holdColor} />
                </HoldButton>
              ) : (
                <div
                  className="w-full rounded-2xl border px-4 py-3.5 text-left"
                  style={{
                    borderColor: isFocused ? `${holdColor}66` : 'rgba(255,255,255,0.08)',
                    backgroundColor: isFocused ? `${holdColor}14` : 'rgba(255,255,255,0.04)',
                    boxShadow: isFocused ? `0 0 22px ${holdColor}33` : undefined,
                  }}
                >
                  <OptionRow option={option} index={i} holdColor={holdColor} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Intensity dots — inline, below the focused option */}
      <AnimatePresence>
        {picking !== null && (
          <motion.div
            key="intensity-dots"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="mt-8 flex flex-col items-center"
          >
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
              Quanto isso é você?
            </p>
            <div className="flex items-end justify-center gap-6">
              {INTENSITY_ORDER.map((lvl) => {
                const sizes: Record<AnswerIntensity, number> = { baixa: 14, media: 18, alta: 24 };
                const borderOpacity: Record<AnswerIntensity, number> = { baixa: 0.28, media: 0.45, alta: 0.7 };
                const fillOpacity: Record<AnswerIntensity, number> = { baixa: 0.04, media: 0.08, alta: 0.16 };
                const size = sizes[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => commit(picking, lvl)}
                    className="group flex flex-col items-center gap-2.5 transition-transform active:scale-90"
                    aria-label={INTENSITY_LABELS[lvl]}
                  >
                    <span
                      className="rounded-full border transition-all group-hover:scale-110"
                      style={{
                        width: size,
                        height: size,
                        borderColor: `rgba(255,255,255,${borderOpacity[lvl]})`,
                        backgroundColor: `rgba(255,255,255,${fillOpacity[lvl]})`,
                        boxShadow: lvl === 'alta' ? '0 0 14px rgba(255,255,255,0.08)' : undefined,
                      }}
                    />
                    <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/45 group-hover:text-white/80">
                      {INTENSITY_LABELS[lvl]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPicking(null)}
              className="mt-6 text-[10px] uppercase tracking-[0.22em] text-white/25 hover:text-white/55"
            >
              voltar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {picking === null && (
        <p className="mt-auto pt-8 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
          Segure para confirmar · sem tempo, no seu ritmo
        </p>
      )}
    </motion.div>
  );
}

function OptionRow({
  option,
  index,
  holdColor,
}: {
  option: Option;
  index: number;
  holdColor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
        style={{
          borderColor: `${holdColor}55`,
          color: holdColor,
          backgroundColor: `${holdColor}18`,
        }}
      >
        {String.fromCharCode(65 + index)}
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
  );
}
