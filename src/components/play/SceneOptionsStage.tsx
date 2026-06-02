'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoldButton from '@/components/HoldButton';
import type { Option, Question } from '@/types/game';
import {
  OPTIONS_TIME_LIMIT_MS,
  OPTION_REVEAL_STAGGER_MS,
  OPTION_REVEAL_ANIM_MS,
  type ScenePresentationProfile,
} from '@/lib/scenePresentation';

// Cor neutra (dourada) pras opcoes — sem dica do eixo dominante.
const NEUTRAL_HOLD_COLOR = '#d4af37';

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
  deadlineTs: number | null;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function SceneOptionsStage({
  question,
  onAnswer,
  profile,
  enableHaptics,
  deadlineTs,
}: SceneOptionsStageProps) {
  const shuffledOptions = useMemo(
    () => seededShuffle(question.options, question.id),
    [question.id, question.options],
  );

  const [msLeft, setMsLeft] = useState(() =>
    deadlineTs ? Math.max(0, deadlineTs - Date.now()) : OPTIONS_TIME_LIMIT_MS,
  );

  useEffect(() => {
    if (!deadlineTs) return;
    setMsLeft(Math.max(0, deadlineTs - Date.now()));
    const id = window.setInterval(() => {
      setMsLeft(Math.max(0, deadlineTs - Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [deadlineTs]);

  const secondsLeft = Math.ceil(msLeft / 1000);
  const urgent = secondsLeft <= 3;
  const pct = Math.max(0, Math.min(100, (msLeft / OPTIONS_TIME_LIMIT_MS) * 100));
  // O cronometro so existe depois que a ultima opcao apareceu (deadlineTs setado
  // pelo director apos a revelacao). Antes disso, a barra nem aparece.
  const timerArmed = deadlineTs != null;

  // Prefer event slide text, fallback to any slide
  const questionText = useMemo(() => {
    const eventSlide = question.slides.find(s => s.tipo === 'evento');
    return eventSlide?.texto ?? question.slides[0]?.texto ?? '';
  }, [question.slides]);

  const isCompact = shuffledOptions.length >= 4;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 flex flex-col px-4 pb-10 pt-[11vh] sm:px-6"
    >
      {/* === PERGUNTA — fixa no topo === */}
      {questionText && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto w-full max-w-2xl shrink-0"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold/55">
            {question.sceneHook}
          </p>
          <p className="mt-2 text-[17px] font-semibold leading-snug text-white/95 sm:text-xl">
            {questionText}
          </p>
        </motion.div>
      )}

      {/* === OPCOES — centralizadas no meio da tela === */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-2.5">
        {/* Barra de tempo — so aparece quando o cronometro arma */}
        <div className="h-5">
          <AnimatePresence>
            {timerArmed && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-100 ease-linear"
                    style={{
                      width: `${pct}%`,
                      background: urgent
                        ? 'linear-gradient(90deg,#ef4444,#f87171)'
                        : 'linear-gradient(90deg,#d4af37,#f5d36a)',
                    }}
                  />
                </div>
                <span
                  className={`min-w-[1.8rem] text-right font-mono text-[12px] font-bold ${urgent ? 'text-red-300' : 'text-accent-gold/80'}`}
                >
                  {secondsLeft}s
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
          Escolha sua reacao
        </p>

        <div className="flex flex-col gap-2">
          {shuffledOptions.map((option, index) => {
            const holdColor = NEUTRAL_HOLD_COLOR;
            const revealDelay = (OPTION_REVEAL_STAGGER_MS * index) / 1000;

            return (
              <motion.div
                key={`${question.id}-${index}`}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: revealDelay,
                  duration: OPTION_REVEAL_ANIM_MS / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <HoldButton
                  onConfirm={() => onAnswer(option)}
                  holdColor={holdColor}
                  enableHaptics={enableHaptics}
                  className={`group/opt w-full overflow-hidden rounded-xl border border-accent-gold/15 bg-gradient-to-b from-white/[0.07] to-white/[0.025] text-left backdrop-blur-xl transition-all hover:border-accent-gold/40 hover:from-white/[0.10] hover:to-white/[0.04] ${
                    isCompact ? 'px-3 py-2.5' : 'px-3.5 py-3'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-[12px] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      style={{
                        borderColor: `${holdColor}55`,
                        color: holdColor,
                        background: `linear-gradient(180deg, ${holdColor}26, ${holdColor}10)`,
                      }}
                    >
                      {OPTION_LETTERS[index]}
                    </div>
                    <p className="flex-1 text-[14px] font-medium leading-snug text-white/92">
                      {option.text}
                    </p>
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-white/20 transition-colors group-hover/opt:text-accent-gold/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
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
