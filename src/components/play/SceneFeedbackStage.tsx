'use client';

import { motion } from 'framer-motion';
import type { ScenePresentationProfile } from '@/lib/scenePresentation';

interface SceneFeedbackStageProps {
  feedback: string;
  onNext: () => void;
  isLast: boolean;
  profile: ScenePresentationProfile;
}

export default function SceneFeedbackStage({
  feedback,
  onNext,
  isLast,
  profile,
}: SceneFeedbackStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 bottom-0 z-20 px-4 pb-8 sm:px-6 sm:pb-10"
    >
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/28 px-5 py-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:px-7 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/35">
          Leitura da cena
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/88 sm:text-xl">
          {feedback}
        </p>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.28 }}
          onClick={onNext}
          className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
          style={{
            background: `linear-gradient(135deg, ${profile.palette.accent}, ${profile.palette.highlight})`,
          }}
        >
          {isLast ? 'Ver resultado' : 'Proxima cena'}
        </motion.button>
      </div>
    </motion.div>
  );
}
