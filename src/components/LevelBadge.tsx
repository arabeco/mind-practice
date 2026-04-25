'use client';

/**
 * LevelBadge — pill compacto pro nivel do perfil. Aparece no /perfil
 * (header) e em qualquer card que queira surfacear progressao.
 *
 * Uso:
 *   const info = getPlayerLevel(state.calibration.beliefs ?? prior, state.calibration.totalResponses);
 *   <LevelBadge info={info} />
 */
import { motion } from 'framer-motion';
import {
  LEVEL_TIER_COLOR,
  LEVEL_TIER_GLOW,
  type PlayerLevelInfo,
} from '@/lib/playerLevel';

interface LevelBadgeProps {
  info: PlayerLevelInfo;
  /** Variante compacta sem barra/tagline (so o pill com numero + nome). */
  compact?: boolean;
  className?: string;
}

export default function LevelBadge({ info, compact, className = '' }: LevelBadgeProps) {
  const tint = LEVEL_TIER_COLOR[info.tier];
  const glow = LEVEL_TIER_GLOW[info.tier];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}
        style={{
          borderColor: `${tint}45`,
          backgroundColor: `${tint}14`,
          color: tint,
          boxShadow: glow,
        }}
      >
        <span className="font-mono text-[12px] font-bold">Lv {info.level}</span>
        <span className="text-white/70">·</span>
        <span className="text-white/85">{info.name}</span>
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card relative overflow-hidden rounded-[1.4rem] px-5 py-4 ${className}`}
      style={{ boxShadow: glow }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-12 h-32 opacity-60 blur-3xl"
        style={{ background: `radial-gradient(circle at top, ${tint}40, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">
            Nivel do perfil
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-mono text-3xl font-bold tracking-tight"
              style={{ color: tint }}
            >
              {info.level}
            </span>
            <span className="text-lg font-semibold text-white/92">
              {info.name}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/55">{info.tagline}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
            score
          </span>
          <span
            className="font-mono text-lg font-semibold"
            style={{ color: tint }}
          >
            {info.score}
          </span>
        </div>
      </div>

      <div className="relative mt-3.5 space-y-2">
        <MiniBar
          label="Precisao"
          value={info.precisionPct}
          tint={tint}
          hint={`${info.precisionPct}%`}
        />
        <MiniBar
          label="Consistencia"
          value={info.consistencyPct}
          tint={tint}
          hint={`${info.consistencyPct}%`}
        />
      </div>
    </motion.div>
  );
}

function MiniBar({
  label,
  value,
  tint,
  hint,
}: {
  label: string;
  value: number;
  tint: string;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
          {label}
        </span>
        <span className="text-[10px] font-mono text-white/55">{hint}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ backgroundColor: tint }}
        />
      </div>
    </div>
  );
}
