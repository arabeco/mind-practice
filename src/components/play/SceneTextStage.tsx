'use client';

import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSceneSupportLine } from '@/lib/sceneContext';
import type { Question } from '@/types/game';
import type { ScenePresentationProfile } from '@/lib/scenePresentation';

interface SceneTextStageProps {
  question: Question;
  phase: 'context' | 'event';
  canTapAdvance: boolean;
  onTapAdvance: () => void;
  profile: ScenePresentationProfile;
  reducedMotion?: boolean;
}

const EYEBROWS = {
  context: 'Leitura da sala',
  event: 'O corte',
};

export default function SceneTextStage({
  question,
  phase,
  canTapAdvance,
  onTapAdvance,
  profile,
  reducedMotion = false,
}: SceneTextStageProps) {
  const slide = question.slides.find(item => item.tipo === (phase === 'context' ? 'contexto' : 'evento'));
  if (!slide) return null;

  const isEvent = phase === 'event';
  const supportLine = getSceneSupportLine(question, phase);

  // Swipe left to advance
  const startX = useRef(0);
  const handlePointerDown = (e: React.PointerEvent) => { startX.current = e.clientX; };
  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    if (dx < -50 && canTapAdvance) onTapAdvance();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={`${question.id}-${phase}`}
        type="button"
        onClick={onTapAdvance}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        disabled={!canTapAdvance}
        className={`absolute inset-x-0 z-20 px-4 pb-10 pt-28 text-left sm:px-6 ${
          isEvent ? 'bottom-0' : 'bottom-0'
        } ${canTapAdvance ? 'cursor-pointer' : 'cursor-default'}`}
        initial={{ opacity: 0, y: isEvent ? 28 : 42, filter: 'blur(14px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -14, filter: 'blur(10px)' }}
        transition={{
          duration: reducedMotion ? 0.2 : isEvent ? 0.42 : 0.56,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className={`mx-auto w-full max-w-5xl ${profile.panelAlign === 'center' ? 'flex justify-center' : ''}`}>
          <div
            className={`max-w-3xl rounded-[2rem] border px-5 py-5 backdrop-blur-2xl sm:px-7 sm:py-6 ${
              isEvent ? 'shadow-[0_0_60px_rgba(255,255,255,0.04)]' : ''
            }`}
            style={{
              background: profile.palette.panelBg,
              borderColor: profile.palette.panelBorder,
              color: profile.palette.textTint,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
              {EYEBROWS[phase]}
            </p>
            {supportLine && (
              <p className={`mt-3 text-sm leading-relaxed ${isEvent ? 'text-white/62' : 'text-white/50'}`}>
                {supportLine}
              </p>
            )}
            <p
              className={`mt-3 leading-tight text-white/92 ${
                isEvent ? 'text-2xl font-semibold sm:text-4xl' : 'text-lg sm:text-2xl'
              }`}
            >
              {slide.texto}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.24em] text-white/30">
              {canTapAdvance ? 'Toque para acelerar' : isEvent ? 'Segura o impacto...' : 'Lendo o clima...'}
            </p>
          </div>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
