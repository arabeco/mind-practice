'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import BipolarSliders from '@/components/BipolarSliders';

export default function ResultadoPage() {
  const { state, getArchetype, precision } = useGame();
  const archetype = getArchetype();
  const { snapshots } = state.calibration;

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-12">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-accent-gold/5 blur-[100px]" />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-white/50"
      >
        Resultado
      </motion.p>

      {/* Archetype Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-card glow-gold mb-8 w-full max-w-md p-8 text-center"
      >
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
          Seu Arquetipo Provisorio
        </p>
        <h2 className="mb-1 text-3xl font-bold text-accent-gold">{archetype.name}</h2>
        <p className="text-xs text-white/30 italic mb-3">{archetype.tagline}</p>
        <p className="text-sm leading-relaxed text-white/60">{archetype.description}</p>
      </motion.div>

      {/* Precision bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md mb-8"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Calibragem</span>
          <span className="text-[10px] text-white/40">{Math.round(precision)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-purple"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(precision, 100)}%` }}
            transition={{ delay: 0.4, duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Bipolar Sliders */}
      <div className="w-full max-w-md mb-8">
        <BipolarSliders axes={state.calibration.axes} delay={0.5} />
      </div>

      {/* Evolution Timeline (if snapshots exist) */}
      {snapshots.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="w-full max-w-md mb-8"
        >
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Evolucao</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {snapshots.slice(-5).map((snap, i) => (
              <div key={i} className="glass-card px-3 py-2 min-w-[100px] text-center flex-shrink-0">
                <p className="text-[9px] text-white/30 truncate">{snap.deckId}</p>
                <p className="text-xs font-semibold text-accent-gold truncate">{snap.archetypeAtCompletion}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <Link href="/decks" className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-accent-gold hover:bg-white/10 transition-colors">
          Voltar aos Decks
        </Link>
        <Link href="/" className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-colors">
          Ir para Home
        </Link>
      </motion.div>
    </div>
  );
}
