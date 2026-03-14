'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, type StatKey } from '@/types/game';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Home() {
  const { state, getArchetype, precision } = useGame();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const archetype = getArchetype();

  return (
    <motion.main variants={container} initial="hidden" animate="show"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[120px]" />

      <motion.div variants={fadeUp} className="relative z-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-accent-gold">Simulador</p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Mind<span className="text-accent-purple">Practice</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60">
          Treina a tua mente para situacoes reais. Descobre o teu arquetipo comportamental.
        </p>
      </motion.div>

      {hasPlayed && (
        <motion.div variants={fadeUp} className="glass-card relative z-10 mt-10 px-8 py-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Teu Arquetipo</p>
          <p className="mt-1 text-xl font-bold text-accent-gold">{archetype.name}</p>
          <p className="text-xs text-white/30 italic">{archetype.tagline}</p>
          <p className="mt-1 max-w-sm text-sm text-white/50">{archetype.description}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="h-1 rounded-full bg-accent-purple/30 w-20 overflow-hidden">
              <div className="h-full rounded-full bg-accent-purple" style={{ width: `${Math.min(precision, 100)}%` }} />
            </div>
            <span className="text-[9px] text-white/20">{Math.round(precision)}%</span>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="relative z-10 mt-10">
        <Link href="/decks"
          className="inline-block rounded-full bg-accent-purple px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-purple/25 transition-all hover:scale-105 hover:shadow-accent-purple/40">
          {hasPlayed ? 'Continuar Treino' : 'Comecar'}
        </Link>
      </motion.div>

      {hasPlayed && (
        <motion.div variants={fadeUp} className="relative z-10 mt-10 flex gap-6">
          {STAT_KEYS.map(key => {
            const value = state.calibration.axes[key];
            return (
              <div key={key} className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">{STAT_LABELS[key].slice(0, 3)}</p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: value > 0 ? STAT_COLORS[key] : value < 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}
                </p>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.main>
  );
}
