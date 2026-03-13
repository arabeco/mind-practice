'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import type { StatKey } from '@/types/game';

const STAT_LABELS: Record<StatKey, string> = {
  vigor: 'VIG',
  harmonia: 'HAR',
  filtro: 'FIL',
  presenca: 'PRE',
  desapego: 'DES',
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function Home() {
  const { state, getArchetype } = useGame();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const archetype = getArchetype();

  return (
    <motion.main
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[120px]" />

      {/* Title block */}
      <motion.div variants={fadeUp} className="relative z-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-accent-gold">
          Simulador
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Mind
          <span className="text-accent-purple">Practice</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60">
          Treina a tua mente para situacoes reais. Descobre o teu arquetipo
          comportamental.
        </p>
      </motion.div>

      {/* Archetype badge */}
      {hasPlayed && archetype && (
        <motion.div
          variants={fadeUp}
          className="glass-card relative z-10 mt-10 px-8 py-5 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-accent-gold">
            Teu Arquetipo
          </p>
          <p className="mt-1 text-xl font-bold text-white">{archetype.name}</p>
          <p className="mt-1 max-w-sm text-sm text-white/50">
            {archetype.description}
          </p>
        </motion.div>
      )}

      {/* CTA button */}
      <motion.div variants={fadeUp} className="relative z-10 mt-10">
        <Link
          href="/decks"
          className="inline-block rounded-full bg-accent-purple px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-purple/25 transition-all hover:scale-105 hover:shadow-accent-purple/40"
        >
          {hasPlayed ? 'Continuar Treino' : 'Comecar'}
        </Link>
      </motion.div>

      {/* Stats mini preview */}
      {hasPlayed && (
        <motion.div
          variants={fadeUp}
          className="relative z-10 mt-10 flex gap-6"
        >
          {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => {
            const value = state.userStats[key];
            return (
              <div key={key} className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                  {STAT_LABELS[key]}
                </p>
                <p
                  className={`mt-0.5 text-lg font-bold ${
                    value > 0
                      ? 'text-accent-gold'
                      : value < 0
                        ? 'text-red-400'
                        : 'text-white/60'
                  }`}
                >
                  {value > 0 ? `+${value}` : value}
                </p>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.main>
  );
}
