'use client';

import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import type { StatKey } from '@/types/game';

const STAT_KEYS: StatKey[] = ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function ConfigPage() {
  const { state, dispatch, getArchetype } = useGame();

  const archetype = getArchetype();
  const deckCount = Object.keys(state.completedDecks).length;

  function handleReset() {
    if (confirm('Tem certeza?')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-6 px-4 py-8 max-w-md mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.header variants={fadeUp}>
        <h2 className="text-2xl font-bold tracking-tight">Configuracoes</h2>
        <p className="text-sm text-white/50 mt-1">Seu perfil e preferencias</p>
      </motion.header>

      {/* Profile Card */}
      <motion.section className="glass-card p-5 flex flex-col gap-2" variants={fadeUp}>
        <span className="text-[11px] font-semibold tracking-widest text-white/40 uppercase">
          Perfil Atual
        </span>
        <h3 className={`text-lg font-bold ${archetype ? 'text-accent-gold' : 'text-white/40'}`}>
          {archetype ? archetype.name : 'Nenhum'}
        </h3>
        <p className="text-sm text-white/60">
          {archetype ? archetype.description : 'Complete um deck para descobrir.'}
        </p>
        <p className="text-xs text-white/30 mt-1">
          {deckCount} deck{deckCount !== 1 ? 's' : ''} completo{deckCount !== 1 ? 's' : ''}
        </p>
      </motion.section>

      {/* Stats Card */}
      <motion.section className="glass-card p-5 flex flex-col gap-3" variants={fadeUp}>
        <span className="text-[11px] font-semibold tracking-widest text-white/40 uppercase">
          Eixos Acumulados
        </span>
        <div className="grid grid-cols-5 gap-2 text-center">
          {STAT_KEYS.map((key) => {
            const value = state.userStats[key];
            const colorClass =
              value > 0 ? 'text-accent-gold' : value < 0 ? 'text-red-400' : 'text-white/20';

            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</span>
                <span className="text-[10px] text-white/40 uppercase">
                  {key.slice(0, 4)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* About Card */}
      <motion.section className="glass-card p-5 flex flex-col gap-2" variants={fadeUp}>
        <span className="text-[11px] font-semibold tracking-widest text-white/40 uppercase">
          Sobre
        </span>
        <p className="text-sm text-white/60">
          MindPractice e um treino mental baseado em cenarios sociais. Tome decisoes sob pressao e
          descubra seu perfil comportamental.
        </p>
        <p className="text-xs text-white/30 mt-1">v0.1.0</p>
      </motion.section>

      {/* Reset Button */}
      <motion.button
        variants={fadeUp}
        onClick={handleReset}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium
                   transition-colors hover:bg-red-500/10 active:bg-red-500/20"
      >
        Resetar Progresso
      </motion.button>
    </motion.div>
  );
}
