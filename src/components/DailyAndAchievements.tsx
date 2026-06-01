'use client';

/**
 * Card combinado: claim de fichas diarias + 3 achievements.
 * Mostrado no /perfil entre o LevelBadge e o bloco de eixos.
 */

import { motion } from 'framer-motion';
import {
  DAILY_FICHAS,
  DAILY_STREAK_BONUS_FICHAS,
  DAILY_STREAK_LENGTH,
  type GameState,
} from '@/types/game';
import { ACHIEVEMENTS } from '@/data/achievements';

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

  return (
    <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/[0.035] p-3.5">
      {/* Daily claim */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent-gold/70">
            Ritual diario
          </p>
          <p className="mt-1 text-sm text-white/85">
            {alreadyClaimed
              ? `Voce ja resgatou hoje · streak ${streak}d`
              : `+${DAILY_FICHAS} fichas hoje · streak ${streak}d`}
          </p>
          {streak > 0 && !alreadyClaimed && (
            <p className="mt-0.5 text-[10px] text-white/45">
              {nextIsBonusDay
                ? `Hoje fecha o ciclo: +${DAILY_STREAK_BONUS_FICHAS} bonus extra`
                : `Faltam ${stepsToBonus} dia${stepsToBonus > 1 ? 's' : ''} pro bonus de ${DAILY_STREAK_BONUS_FICHAS}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClaim}
          disabled={alreadyClaimed}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            alreadyClaimed
              ? 'cursor-default border border-white/8 bg-white/4 text-white/30'
              : 'border border-accent-gold/55 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25'
          }`}
        >
          {alreadyClaimed ? 'Pego' : 'Resgatar'}
        </button>
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
