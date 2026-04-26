'use client';

/**
 * ArchetypeEvolutionCeremony — modal cerimonial disparado quando o
 * arquetipo "firme" do jogador muda (de A → B). Aparece após o jogador
 * já ter visto o FirstArchetypeCeremony pelo menos uma vez.
 *
 * Estrutura:
 *   - Hero com transformação A → B (ambos os tints)
 *   - "Voce era X" / arrow / "Agora voce e Y"
 *   - Tagline do novo arquetipo
 *   - Description do novo arquetipo
 *   - Mini radar com eixos firmados
 *   - Secondary trace (se houver)
 *   - CTA "Continuar minha trajetoria"
 *
 * Renderizado pelo GameProvider quando useArchetypeEvolution retorna
 * pending. Tem precedencia sobre level-up; cede pra FirstArchetypeCeremony.
 */
import { motion, AnimatePresence } from 'framer-motion';
import {
  STAT_KEYS,
  STAT_LABELS,
  STAT_COLORS,
  type Archetype,
} from '@/types/game';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';
import { playerMean, axisConfidence } from '@/lib/bayesEngine';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';

interface ArchetypeEvolutionCeremonyProps {
  open: boolean;
  fromArchetype: Archetype;
  toArchetype: Archetype;
  beliefs: PlayerBeliefs;
  archetypeMatch: ArchetypeMatchResult;
  onClose: () => void;
}

export default function ArchetypeEvolutionCeremony({
  open,
  fromArchetype,
  toArchetype,
  beliefs,
  archetypeMatch,
  onClose,
}: ArchetypeEvolutionCeremonyProps) {
  const fromVisual = getArchetypeAvatarVisual(fromArchetype);
  const toVisual = getArchetypeAvatarVisual(toArchetype);
  const fromTint = fromVisual.accent;
  const toTint = toVisual.accent;
  const glow = `0 0 32px ${toVisual.glow}`;
  const secondary = archetypeMatch.secondary?.archetype ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[55] flex items-center justify-center px-4 py-6 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(8, 8, 14, 0.85)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="glass-card relative w-full max-w-md overflow-hidden rounded-[1.8rem] p-0"
            style={{ boxShadow: glow }}
          >
            {/* Hero — transformacao A -> B */}
            <div
              className="relative h-44 w-full overflow-hidden"
              style={{
                background: `${toVisual.background}, radial-gradient(ellipse at top, ${toTint}50 0%, transparent 70%)`,
              }}
            >
              {/* Pulse do novo arquetipo */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0.25] }}
                transition={{ duration: 1.8, times: [0, 0.5, 1] }}
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${toTint}55, transparent 65%)`,
                }}
              />

              <p className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                Padrao evoluido
              </p>

              {/* Transformacao A -> B */}
              <motion.div
                className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 px-4"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                <div className="flex flex-1 flex-col items-end gap-0.5">
                  <span className="text-[8px] uppercase tracking-[0.22em] text-white/40">
                    Voce era
                  </span>
                  <span
                    className="text-base font-semibold tracking-tight opacity-70"
                    style={{ color: fromTint }}
                  >
                    {fromArchetype.name}
                  </span>
                </div>

                {/* Arrow animada */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${toTint}22`, border: `1px solid ${toTint}66` }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                    style={{ color: toTint }}
                  >
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>

                <div className="flex flex-1 flex-col items-start gap-0.5">
                  <span className="text-[8px] uppercase tracking-[0.22em] text-white/40">
                    Agora voce e
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85, duration: 0.4 }}
                    className="text-xl font-bold tracking-tight"
                    style={{ color: toTint, textShadow: `0 0 24px ${toTint}aa` }}
                  >
                    {toArchetype.name}
                  </motion.span>
                </div>
              </motion.div>
            </div>

            <div className="px-6 pb-6 pt-4">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.45 }}
                className="text-center text-sm italic leading-relaxed text-white/70"
              >
                {toArchetype.tagline}
              </motion.p>

              {/* Description do novo arquetipo */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.45 }}
                className="glass-surface mt-5 rounded-[1.1rem] px-4 py-3.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  O que mudou
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/82">
                  {toArchetype.description}
                </p>
              </motion.div>

              {/* Mini radar com confidence */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="mt-4 space-y-1.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Eixos firmados
                </p>
                {STAT_KEYS.map((axis, i) => {
                  const mean = playerMean(beliefs[axis]);
                  const conf = axisConfidence(beliefs[axis]);
                  const widthPct = Math.round(mean * 100);
                  const opacity = 0.35 + conf * 0.65;
                  return (
                    <motion.div
                      key={axis}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + i * 0.06, duration: 0.32 }}
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

              {/* Secondary trace */}
              {secondary && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.4 }}
                  className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-white/45"
                >
                  com traco de <span className="font-semibold text-white/70">{secondary.name}</span>
                </motion.div>
              )}

              {/* CTA */}
              <motion.button
                type="button"
                onClick={onClose}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.65, duration: 0.4 }}
                className="mt-5 w-full rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-colors"
                style={{
                  borderColor: `${toTint}55`,
                  backgroundColor: `${toTint}1a`,
                  color: toTint,
                }}
              >
                Continuar minha trajetoria
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
