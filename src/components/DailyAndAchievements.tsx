'use client';

/**
 * Card combinado: claim de fichas diarias + 3 achievements.
 * Mostrado no /perfil entre o LevelBadge e o bloco de eixos.
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  DAILY_FICHAS,
  DAILY_STREAK_BONUS_FICHAS,
  DAILY_STREAK_LENGTH,
  type GameState,
} from '@/types/game';
import { ACHIEVEMENTS } from '@/data/achievements';
import { feedback } from '@/lib/uiFeedback';

interface Props {
  state: GameState;
  onClaim: () => void;
}

export default function DailyAndAchievements({ state, onClaim }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const alreadyClaimed = state.dailyLoginClaimedAt === today;
  const streak = state.loginStreak;
  // Proxima recompensa de streak: quantos dias faltam pra fechar o ciclo.
  const stepsToBonus =
    streak > 0 ? DAILY_STREAK_LENGTH - (streak % DAILY_STREAK_LENGTH) : DAILY_STREAK_LENGTH;
  const nextIsBonusDay = stepsToBonus === DAILY_STREAK_LENGTH && streak > 0;
  // Progresso (0..1) dentro do ciclo de streak atual, pra barra/anel.
  const cycleProgress = streak > 0 ? ((streak % DAILY_STREAK_LENGTH) || DAILY_STREAK_LENGTH) / DAILY_STREAK_LENGTH : 0;

  const [popping, setPopping] = useState(false);
  const handleClaim = () => {
    if (alreadyClaimed) return;
    // suco: som de moeda + haptic de milestone, e pop visual
    feedback(nextIsBonusDay ? 'success' : 'claim', 'milestone');
    setPopping(true);
    window.setTimeout(() => setPopping(false), 650);
    onClaim();
  };

  return (
    <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/[0.035] p-3.5">
      {/* Daily claim */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent-gold/70">
            Ritual diario
          </p>
          {/* Streak chamativo: chama + número + barra de ciclo */}
          <div className="mt-1 flex items-center gap-2">
            <motion.span
              aria-hidden
              className="text-base"
              animate={streak > 0 ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: streak > 0 ? 'drop-shadow(0 0 6px rgba(251,146,60,0.7))' : 'grayscale(1) opacity(0.4)' }}
            >
              🔥
            </motion.span>
            <span className="text-sm font-bold text-white/90">
              {streak}<span className="text-white/45 font-normal"> dia{streak === 1 ? '' : 's'}</span>
            </span>
            {!alreadyClaimed && (
              <span className="text-[11px] font-semibold text-accent-gold/85">· +{DAILY_FICHAS}{nextIsBonusDay ? `+${DAILY_STREAK_BONUS_FICHAS}` : ''} hoje</span>
            )}
          </div>
          {/* Barra de progresso até o bônus */}
          <div className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${cycleProgress * 100}%`, background: 'linear-gradient(90deg,#fb923c,#fbbf24)' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/45">
            {alreadyClaimed
              ? 'Resgatado hoje · volte amanhã'
              : nextIsBonusDay
              ? `🎁 Hoje fecha o ciclo: +${DAILY_STREAK_BONUS_FICHAS} bônus!`
              : `Faltam ${stepsToBonus} dia${stepsToBonus > 1 ? 's' : ''} pro bônus de ${DAILY_STREAK_BONUS_FICHAS}`}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={handleClaim}
          disabled={alreadyClaimed}
          whileTap={alreadyClaimed ? undefined : { scale: 0.9 }}
          animate={popping ? { scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 0.5 }}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            alreadyClaimed
              ? 'cursor-default border border-white/8 bg-white/4 text-white/30'
              : 'border border-accent-gold/55 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25'
          }`}
          style={!alreadyClaimed ? { boxShadow: '0 0 18px rgba(212,175,55,0.25)' } : undefined}
        >
          {alreadyClaimed ? 'Pego' : 'Resgatar'}
        </motion.button>
      </div>

      {/* Achievements */}
      <div className="mt-3 border-t border-accent-gold/10 pt-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-accent-gold/70">
          Conquistas
        </p>
        <div className="space-y-1.5">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = !!state.achievements[a.id];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${
                  unlocked
                    ? 'border-accent-gold/35 bg-accent-gold/8'
                    : 'border-white/8 bg-white/[0.025]'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base ${
                    unlocked
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'bg-white/6 text-white/30'
                  }`}
                  aria-hidden
                >
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11.5px] font-semibold leading-tight ${
                      unlocked ? 'text-accent-gold' : 'text-white/72'
                    }`}
                  >
                    {a.title}
                  </p>
                  <p className="text-[10px] leading-tight text-white/45">
                    {a.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                    unlocked
                      ? 'bg-accent-gold/22 text-accent-gold'
                      : 'bg-white/4 text-white/35'
                  }`}
                >
                  +{a.rewardFichas}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
