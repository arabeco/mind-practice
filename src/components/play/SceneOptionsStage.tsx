'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import HoldButton from '@/components/HoldButton';
import { STAT_COLORS, STAT_KEYS } from '@/types/game';
import type { Option, StatKey, Question } from '@/types/game';
import type { ScenePresentationProfile } from '@/lib/scenePresentation';

/** Deterministic shuffle seeded by question id so order is stable per question */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = ((h << 5) - h + i) | 0;
    const j = ((h >>> 0) % (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface SceneOptionsStageProps {
  question: Question;
  onAnswer: (option: Option) => void;
  profile: ScenePresentationProfile;
  enableHaptics: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function getDominantAxis(weights: Partial<Record<StatKey, number>>): StatKey {
  let max: StatKey = 'vigor';
  let maxVal = -Infinity;
  for (const key of STAT_KEYS) {
    const value = weights[key];
    if (value !== undefined && value > maxVal) {
      maxVal = value;
      max = key;
    }
  }
  return max;
}

export default function SceneOptionsStage({
  question,
  onAnswer,
  profile,
  enableHaptics,
}: SceneOptionsStageProps) {
  const shuffledOptions = useMemo(
    () => seededShuffle(question.options, question.id),
    [question.id, question.options],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 36 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-5"
    >
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:px-4 sm:py-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
          Escolha sua reacao
        </p>

        <div className={`grid gap-1.5 ${shuffledOptions.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
          {shuffledOptions.map((option, index) => {
            const dominantAxis = getDominantAxis(option.weights);
            const holdColor = STAT_COLORS[dominantAxis];

            return (
              <motion.div
                key={`${question.id}-${index}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (profile.optionStaggerMs * index) / 1000, duration: 0.34 }}
              >
                <HoldButton
                  onConfirm={() => onAnswer(option)}
                  holdColor={holdColor}
                  enableHaptics={enableHaptics}
                  className={`w-full rounded-xl border border-white/10 bg-white/6 text-left backdrop-blur-xl transition-colors hover:bg-white/8 ${
                    shuffledOptions.length >= 4 ? 'px-2.5 py-1.5' : 'px-3 py-2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center rounded-full border font-bold flex-shrink-0 ${
                        shuffledOptions.length >= 4 ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
                      }`}
                      style={{
                        borderColor: `${holdColor}40`,
                        color: holdColor,
                        backgroundColor: `${holdColor}12`,
                      }}
                    >
                      {OPTION_LETTERS[index]}
                    </div>
                    <p className={`leading-snug text-white/90 ${
                      shuffledOptions.length >= 4 ? 'text-[12px]' : 'text-[13px]'
                    }`}>
                      {option.text}
                    </p>
                  </div>
                </HoldButton>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
