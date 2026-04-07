'use client';

import { motion } from 'framer-motion';
import {
  QUESTION_TYPE_META,
  type ScenePhase,
  type ScenePresentationProfile,
} from '@/lib/scenePresentation';
import { getSceneContextChips } from '@/lib/sceneContext';
import type { Question } from '@/types/game';

interface SceneHUDProps {
  deckName: string;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  progress: number;
  phase: ScenePhase;
  soundEnabled: boolean;
  onToggleSound: () => void;
  profile: ScenePresentationProfile;
}

const PHASE_LABELS: Record<ScenePhase, string> = {
  context: 'Leitura da sala',
  event: 'O corte',
  delay: 'Seu corpo processa',
  options: 'Resposta',
  feedback: 'Consequencia',
};

export default function SceneHUD({
  deckName,
  question,
  questionIndex,
  totalQuestions,
  progress,
  phase,
  soundEnabled,
  onToggleSound,
  profile,
}: SceneHUDProps) {
  const typeMeta = QUESTION_TYPE_META[question.type];
  const contextChips = getSceneContextChips(question);

  return (
    <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
            {PHASE_LABELS[phase]}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-white/78 sm:text-base">
              {deckName}
            </h2>
            <span className="hidden text-xs text-white/35 sm:inline">
              {questionIndex + 1}/{totalQuestions}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white/75 backdrop-blur-md transition-colors hover:bg-black/35"
          aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            {soundEnabled ? (
              <>
                <path d="M15.5 9.5a4 4 0 010 5" />
                <path d="M18.5 7a7 7 0 010 10" />
              </>
            ) : (
              <path d="M15 9l6 6M21 9l-6 6" />
            )}
          </svg>
        </button>
      </div>

      <div className="mx-auto mt-3 w-full max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${typeMeta.className}`}
          >
            {typeMeta.label}
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/30">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${profile.palette.accent}, ${profile.palette.highlight})`,
            }}
          />
        </div>

        {contextChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {contextChips.map(chip => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 backdrop-blur-md"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
