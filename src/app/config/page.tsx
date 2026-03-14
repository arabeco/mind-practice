'use client';

import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import BipolarSliders from '@/components/BipolarSliders';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function ConfigPage() {
  const { state, dispatch, getArchetype, precision, consistency, isIdentityValidated } = useGame();
  const archetype = getArchetype();
  const deckCount = Object.keys(state.completedDecks).length;
  const precLabel = getPrecisionLabel(precision);
  const consLabel = getConsistencyLabel(consistency);

  function handleReset() {
    if (confirm('Tem certeza? Todo progresso sera apagado.')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-5 px-4 py-8 max-w-md mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={fadeUp}>
        <h2 className="text-2xl font-bold">Configuracoes</h2>
        <p className="text-sm text-white/40 mt-1">Seu perfil e preferencias</p>
      </motion.header>

      {/* Profile Card */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">Perfil</span>
        <div className="flex items-center gap-3 mt-2">
          <h3 className="text-xl font-bold text-accent-gold">{archetype.name}</h3>
          {isIdentityValidated && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">
              Identidade Confirmada
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 italic">{archetype.tagline}</p>
        <p className="text-sm text-white/50 mt-2">{archetype.description}</p>
        <p className="text-[10px] text-white/20 mt-2">{deckCount} deck(s) completo(s)</p>
      </motion.section>

      {/* Metrics */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-3 block">Metricas</span>
        <div className="grid grid-cols-2 gap-4">
          {/* Precision */}
          <div>
            <p className="text-[10px] text-white/30 uppercase mb-1">Calibragem</p>
            <p className={`text-lg font-bold ${precLabel.color}`}>{Math.round(precision)}%</p>
            <p className={`text-[10px] ${precLabel.color}`}>{precLabel.label}</p>
          </div>
          {/* Consistency */}
          <div>
            <p className="text-[10px] text-white/30 uppercase mb-1">Consistencia</p>
            <p className={`text-lg font-bold ${
              consLabel.icon === 'full' ? 'text-accent-gold' :
              consLabel.icon === 'half' ? 'text-accent-purple' : 'text-red-400'
            }`}>
              {(consistency * 100).toFixed(0)}%
            </p>
            <p className={`text-[10px] ${
              consLabel.icon === 'full' ? 'text-accent-gold' :
              consLabel.icon === 'half' ? 'text-accent-purple' : 'text-red-400'
            }`}>
              {consLabel.label}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Axes */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-4 block">Eixos</span>
        <BipolarSliders axes={state.calibration.axes} animate={false} />
      </motion.section>

      {/* About */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">Sobre</span>
        <p className="text-sm text-white/50 mt-2">
          MindPractice e um simulador de reatividade social. Treine seu comportamento
          atraves de micro-conflitos sob pressao e descubra seu arquetipo.
        </p>
        <p className="text-[10px] text-white/20 mt-2">v0.2.0</p>
      </motion.section>

      {/* Reset */}
      <motion.button
        variants={fadeUp}
        onClick={handleReset}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
      >
        Resetar Progresso
      </motion.button>
    </motion.div>
  );
}
