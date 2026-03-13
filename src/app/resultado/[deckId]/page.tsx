'use client';

import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { motion } from 'framer-motion';
import type { StatKey } from '@/types/game';

const STAT_META: { key: StatKey; label: string; color: string }[] = [
  { key: 'vigor', label: 'Vigor', color: 'bg-red-500' },
  { key: 'harmonia', label: 'Harmonia', color: 'bg-green-500' },
  { key: 'filtro', label: 'Filtro', color: 'bg-blue-500' },
  { key: 'presenca', label: 'Presenca', color: 'bg-yellow-500' },
  { key: 'desapego', label: 'Desapego', color: 'bg-purple-500' },
];

export default function ResultadoPage() {
  const { state, getArchetype } = useGame();
  const archetype = getArchetype();
  const { userStats } = state;

  // Normalize bars to max absolute value
  const maxAbs = Math.max(
    1,
    ...STAT_META.map((s) => Math.abs(userStats[s.key])),
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-accent-gold/5 blur-[100px]" />
      </div>

      {/* Header */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-white/50"
      >
        Resultado
      </motion.p>

      {/* Archetype Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card glow-gold mb-10 w-full max-w-md p-8 text-center"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Seu Arquetipo Provisorio
        </p>
        <h2 className="mb-3 text-3xl font-bold text-accent-gold">
          {archetype?.name ?? '???'}
        </h2>
        <p className="text-sm leading-relaxed text-white/60">
          {archetype?.description ?? 'Continue respondendo para revelar seu arquetipo.'}
        </p>
      </motion.div>

      {/* Stats Bars */}
      <div className="mb-10 w-full max-w-md space-y-4">
        {STAT_META.map((s, i) => {
          const value = userStats[s.key];
          const widthPct = Math.round((Math.abs(value) / maxAbs) * 100);

          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-white/70">{s.label}</span>
                <span
                  className={
                    value >= 0 ? 'font-semibold text-accent-gold' : 'font-semibold text-red-400'
                  }
                >
                  {value > 0 ? `+${value}` : value}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className={`h-full rounded-full ${s.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.0 }}
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <Link
          href="/decks"
          className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-accent-gold transition-colors hover:bg-white/10"
        >
          Voltar aos Decks
        </Link>
        <Link
          href="/"
          className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10"
        >
          Ir para Home
        </Link>
      </motion.div>
    </div>
  );
}
