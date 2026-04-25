'use client';

/**
 * LevelUpCeremony — modal cerimonial disparado quando o jogador sobe de
 * nivel do perfil. Full-screen takeover com:
 *   - hero gradient (placeholder; trocar por imagem custom depois)
 *   - level number gigante + nome
 *   - tagline
 *   - arquetipo atual (primary) + secondary (se firm)
 *   - radar mini de stats (precision/consistency)
 *   - CTA "Continuar" + share opcional
 *
 * Renderizado pelo GameProvider quando getPlayerLevel() > state.lastSeenLevel.
 * Auto-fechamento dispara MARK_LEVEL_SEEN no reducer.
 */
import { motion, AnimatePresence } from 'framer-motion';
import {
  LEVEL_TIER_COLOR,
  LEVEL_TIER_GLOW,
  type PlayerLevelInfo,
} from '@/lib/playerLevel';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';
import { playerMean, axisConfidence } from '@/lib/bayesEngine';

interface LevelUpCeremonyProps {
  open: boolean;
  info: PlayerLevelInfo;
  beliefs: PlayerBeliefs;
  archetypeMatch: ArchetypeMatchResult | null;
  /** Fichas creditadas pelo level-up (≥0). Se 0, tile fica oculto. */
  reward?: number;
  onClose: () => void;
}

export default function LevelUpCeremony({
  open,
  info,
  beliefs,
  archetypeMatch,
  reward = 0,
  onClose,
}: LevelUpCeremonyProps) {
  const tint = LEVEL_TIER_COLOR[info.tier];
  const glow = LEVEL_TIER_GLOW[info.tier];

  const primary = archetypeMatch?.primary?.archetype ?? null;
  const secondary = archetypeMatch?.secondary?.archetype ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(8, 8, 14, 0.78)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="glass-card relative w-full max-w-md overflow-hidden rounded-[1.8rem] p-0"
            style={{ boxShadow: glow }}
          >
            {/* Hero — placeholder gradient. Trocar por imagem custom: */}
            {/* <Image src={`/levels/${info.tier}.png`} ... /> */}
            <div
              className="relative h-40 w-full overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at top, ${tint}55, transparent 75%), linear-gradient(180deg, ${tint}25 0%, transparent 100%)`,
              }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.3] }}
                transition={{ duration: 1.6, times: [0, 0.4, 1] }}
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${tint}40, transparent 60%)`,
                }}
              />
              <p className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                Subiu de nivel
              </p>
              <motion.div
                className="absolute inset-x-0 bottom-3 flex items-center justify-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                <span
                  className="font-mono text-[80px] font-bold leading-none tracking-tight"
                  style={{ color: tint, textShadow: `0 0 28px ${tint}80` }}
                >
                  {info.level}
                </span>
              </motion.div>
            </div>

            <div className="px-6 pb-6 pt-4">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-center text-2xl font-bold tracking-tight text-white/95"
              >
                {info.name}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.45 }}
                className="mt-1.5 text-center text-sm leading-relaxed text-white/62"
              >
                {info.tagline}
              </motion.p>

              {/* Arquetipo atual */}
              {primary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="glass-surface mt-5 rounded-[1.1rem] px-4 py-3.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Arquetipo atual
                  </p>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-base font-semibold text-white/92">
                      {primary.name}
                    </span>
                    {secondary && (
                      <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                        traco de {secondary.name}
                      </span>
                    )}
                  </div>
                  {primary.tagline && (
                    <p className="mt-1 text-xs leading-relaxed text-white/55">
                      {primary.tagline}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Mini radar — barras horizontais por eixo */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.4 }}
                className="mt-4 space-y-1.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Stats atualizados
                </p>
                {STAT_KEYS.map((axis, i) => {
                  const mean = playerMean(beliefs[axis]);
                  const conf = axisConfidence(beliefs[axis]);
                  const widthPct = Math.round(mean * 100);
                  const opacity = 0.35 + conf * 0.65; // mais opaco = mais confiante
                  return (
                    <motion.div
                      key={axis}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.95 + i * 0.05, duration: 0.3 }}
                    >
                      <div className="mb-0.5 flex items-center justify-between text-[10px]">
                        <span className="uppercase tracking-[0.14em] text-white/45">
                          {STAT_LABELS[axis]}
                        </span>
                        <span className="font-mono text-white/45">
                          {widthPct}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: STAT_COLORS[axis],
                            opacity,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Stats agregadas */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="mt-4 grid grid-cols-2 gap-2"
              >
                <StatTile label="Precisao" value={`${info.precisionPct}%`} tint={tint} />
                <StatTile
                  label="Consistencia"
                  value={`${info.consistencyPct}%`}
                  tint={tint}
                />
              </motion.div>

              {/* Reward — pulse de fichas, drama maior */}
              {reward > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mt-4 overflow-hidden rounded-[1.1rem] border px-4 py-3.5"
                  style={{
                    borderColor: `${tint}50`,
                    background: `linear-gradient(135deg, ${tint}1a, ${tint}08 80%)`,
                    boxShadow: glow,
                  }}
                >
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0.18] }}
                    transition={{ delay: 1.45, duration: 1.2, times: [0, 0.5, 1] }}
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${tint}55, transparent 65%)`,
                    }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                        Recompensa
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/65">
                        Sua identidade ficou mais clara — voce ganhou fichas.
                      </p>
                    </div>
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [0.6, 1.18, 1], opacity: 1 }}
                      transition={{ delay: 1.5, duration: 0.6, times: [0, 0.6, 1] }}
                      className="flex items-baseline gap-1"
                    >
                      <span
                        className="font-mono text-3xl font-bold tracking-tight"
                        style={{ color: tint, textShadow: `0 0 18px ${tint}80` }}
                      >
                        +{reward}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        fichas
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.button
                type="button"
                onClick={onClose}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reward > 0 ? 1.95 : 1.35, duration: 0.35 }}
                className="mt-5 w-full rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-colors"
                style={{
                  borderColor: `${tint}55`,
                  backgroundColor: `${tint}1a`,
                  color: tint,
                }}
              >
                Continuar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatTile({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="glass-surface rounded-[0.9rem] px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
      <p className="mt-1 font-mono text-base font-semibold" style={{ color: tint }}>
        {value}
      </p>
    </div>
  );
}
