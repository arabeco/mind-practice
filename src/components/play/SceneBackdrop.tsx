'use client';

import { motion } from 'framer-motion';
import type { ScenePhase, ScenePresentationProfile } from '@/lib/scenePresentation';

interface SceneBackdropProps {
  profile: ScenePresentationProfile;
  phase: ScenePhase;
  reducedMotion?: boolean;
  coverImage?: string;
}

const BOKEH_SPOTS = [
  { top: '10%', left: '8%', size: 220 },
  { top: '18%', right: '10%', size: 180 },
  { bottom: '16%', left: '12%', size: 200 },
  { bottom: '12%', right: '8%', size: 260 },
];

export default function SceneBackdrop({
  profile,
  phase,
  reducedMotion = false,
  coverImage,
}: SceneBackdropProps) {
  const isChargedPhase = phase === 'event' || phase === 'delay';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Cover image — first layer, heavily darkened */}
      {coverImage && (
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          initial={{ scale: 1.08, opacity: 0 }}
          animate={reducedMotion ? { opacity: 0.55 } : { scale: [1.08, 1.14, 1.08], opacity: 0.55 }}
          transition={{
            scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 1.2, ease: 'easeOut' },
          }}
          style={{
            backgroundImage: `url(${coverImage})`,
            filter: 'saturate(0.85) contrast(1.05)',
          }}
        />
      )}
      {coverImage && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.72) 55%, rgba(0,0,0,0.88) 100%)`,
          }}
        />
      )}

      <motion.div
        className="absolute inset-0"
        animate={reducedMotion ? undefined : { scale: [1, 1.03, 1] }}
        transition={{
          duration: Math.max(profile.driftDuration, 6),
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle at top, ${profile.palette.accentSoft} 0%, transparent 40%), linear-gradient(180deg, ${profile.palette.bgStart}${coverImage ? '55' : ''} 0%, ${profile.palette.bgEnd}${coverImage ? '55' : ''} 100%)`,
          mixBlendMode: coverImage ? 'multiply' : 'normal',
          opacity: coverImage ? 0.7 : 1,
        }}
      />

      <motion.div
        className="absolute -left-[20%] top-[8%] h-[40vh] w-[40vh] rounded-full blur-[120px]"
        animate={reducedMotion ? undefined : { x: [0, 28, -16, 0], y: [0, -18, 12, 0] }}
        transition={{ duration: Math.max(profile.driftDuration + 4, 10), repeat: Infinity, ease: 'linear' }}
        style={{ backgroundColor: profile.palette.accentSoft, opacity: isChargedPhase ? 0.8 : 0.55 }}
      />

      <motion.div
        className="absolute -right-[22%] bottom-[4%] h-[42vh] w-[42vh] rounded-full blur-[140px]"
        animate={reducedMotion ? undefined : { x: [0, -20, 14, 0], y: [0, 12, -10, 0] }}
        transition={{ duration: Math.max(profile.driftDuration + 6, 12), repeat: Infinity, ease: 'linear' }}
        style={{ backgroundColor: profile.palette.highlight, opacity: isChargedPhase ? 0.3 : 0.18 }}
      />

      {profile.pattern === 'bokeh' && (
        <div className="absolute inset-0">
          {BOKEH_SPOTS.map((spot, index) => (
            <motion.div
              key={index}
              className="absolute rounded-full blur-[28px]"
              animate={
                reducedMotion
                  ? undefined
                  : {
                      y: [0, index % 2 === 0 ? -16 : 14, 0],
                      opacity: [0.12, 0.24, 0.12],
                    }
              }
              transition={{ duration: 8 + index * 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                ...spot,
                width: spot.size,
                height: spot.size,
                background: `radial-gradient(circle, ${profile.palette.highlight}55 0%, transparent 72%)`,
              }}
            />
          ))}
        </div>
      )}

      {profile.pattern === 'cone' && (
        <motion.div
          className="absolute inset-x-[8%] top-0 h-[72vh]"
          animate={reducedMotion ? undefined : { opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: Math.max(profile.pulseDuration, 3.4), repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: `radial-gradient(circle at 50% 12%, ${profile.palette.highlight}22 0%, transparent 48%), linear-gradient(180deg, ${profile.palette.accentSoft} 0%, transparent 82%)`,
            clipPath: 'polygon(48% 0%, 76% 0%, 100% 100%, 20% 100%)',
            filter: 'blur(18px)',
          }}
        />
      )}

      {profile.pattern === 'grid' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(${profile.palette.highlight}18 1px, transparent 1px),
              linear-gradient(90deg, ${profile.palette.highlight}18 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0.08))',
          }}
        />
      )}

      {profile.pattern === 'scan' && (
        <>
          <div
            className="absolute inset-0 opacity-24"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  180deg,
                  rgba(255,255,255,0.06) 0px,
                  rgba(255,255,255,0.06) 1px,
                  transparent 1px,
                  transparent 5px
                )
              `,
            }}
          />
          <motion.div
            className="absolute inset-x-0 h-[22vh]"
            animate={reducedMotion ? undefined : { y: ['-24vh', '100vh'] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
            style={{
              background: `linear-gradient(180deg, transparent, ${profile.palette.highlight}14, transparent)`,
              filter: 'blur(10px)',
            }}
          />
        </>
      )}

      {profile.tierAccent === 'charged' && (
        <motion.div
          className="absolute inset-y-[18%] right-[8%] w-[12rem] rounded-full blur-[72px]"
          animate={reducedMotion ? undefined : { opacity: [0.12, 0.3, 0.12] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: profile.palette.accent }}
        />
      )}

      {profile.tierAccent === 'reticle' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-44 w-44 rounded-full border border-cyan-300/12">
            <div className="absolute inset-x-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-200/10" />
            <div className="absolute inset-y-1/2 left-0 h-px w-full -translate-y-1/2 bg-cyan-200/10" />
            <div className="absolute inset-[18%] rounded-full border border-cyan-300/10" />
          </div>
        </div>
      )}

      {profile.tierAccent === 'gold' && (
        <div className="absolute inset-0">
          <motion.div
            className="absolute left-[10%] top-[14%] h-48 w-48 rounded-full border border-yellow-300/14"
            animate={reducedMotion ? undefined : { rotate: [0, 10, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[14%] right-[10%] h-60 w-60 rounded-full border border-yellow-300/10"
            animate={reducedMotion ? undefined : { rotate: [0, -12, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}

      {profile.tierAccent === 'ritual' && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-[74vh] w-[74vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[18px]"
          animate={reducedMotion ? undefined : { rotate: 360, scale: [1, 1.02, 1] }}
          transition={{
            rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
            scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            background: `conic-gradient(from 90deg, transparent, ${profile.palette.highlight}55, transparent, ${profile.palette.accent}66, transparent)`,
          }}
        />
      )}

      <motion.div
        className="absolute inset-0"
        animate={reducedMotion ? undefined : { opacity: [profile.grainOpacity, profile.grainOpacity + 0.03, profile.grainOpacity] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        style={{
          opacity: profile.grainOpacity,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.06) 0, transparent 20%),
            radial-gradient(circle at 75% 20%, rgba(255,255,255,0.04) 0, transparent 18%),
            radial-gradient(circle at 45% 80%, rgba(255,255,255,0.04) 0, transparent 16%)
          `,
          mixBlendMode: 'soft-light',
        }}
      />

      {isChargedPhase && (
        <motion.div
          key={`${profile.key}-${phase}`}
          className="absolute inset-0"
          initial={{ opacity: 0.05 }}
          animate={{ opacity: [0.08, 0.18, 0.06] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(circle at 50% 52%, ${profile.palette.highlight}18 0%, transparent 56%)`,
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, transparent 38%, rgba(0,0,0,${profile.vignetteOpacity}) 100%)`,
        }}
      />
    </div>
  );
}
