'use client';

import { motion } from 'framer-motion';
import type { ScenePresentationProfile } from '@/lib/scenePresentation';

interface SceneDelayStageProps {
  profile: ScenePresentationProfile;
  reducedMotion?: boolean;
}

export default function SceneDelayStage({
  profile,
  reducedMotion = false,
}: SceneDelayStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center px-6"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-44 w-44 rounded-full border"
          animate={reducedMotion ? undefined : { scale: [0.9, 1.08, 0.92], opacity: [0.18, 0.34, 0.18] }}
          transition={{ duration: Math.max(profile.pulseDuration, 2.4), repeat: Infinity, ease: 'easeInOut' }}
          style={{ borderColor: `${profile.palette.accent}66` }}
        />
        <motion.div
          className="absolute h-24 w-24 rounded-full border"
          animate={reducedMotion ? undefined : { scale: [1, 1.16, 1], opacity: [0.22, 0.38, 0.22] }}
          transition={{ duration: Math.max(profile.pulseDuration - 0.6, 1.8), repeat: Infinity, ease: 'easeInOut' }}
          style={{ borderColor: `${profile.palette.highlight}55` }}
        />
        <div className="rounded-full border border-white/10 bg-black/25 px-6 py-5 text-center backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/35">
            Suspense
          </p>
          <p className="mt-2 text-lg font-medium text-white/82">Respire antes de reagir.</p>
        </div>
      </div>
    </motion.div>
  );
}
