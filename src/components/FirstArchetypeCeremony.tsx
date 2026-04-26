'use client';

/**
 * FirstArchetypeCeremony — modal cerimonial cinematográfico disparado
 * UMA VEZ na vida do save quando archetypeDisplayState atinge 'firm'.
 *
 * Estrutura:
 *   - Hero gradient + scan glow (cor do arquétipo via getArchetypeAvatarVisual)
 *   - "Esse e seu padrao" + nome do arquétipo gigante + tagline
 *   - Mini radar de eixos com confidence
 *   - Description do arquétipo (do ARCHETYPES)
 *   - Secondary trace (se houver)
 *   - CTA "Aceitar"
 *
 * Renderizado pelo GameProvider quando useFirstArchetypeCeremony retorna
 * pending. Tem precedencia sobre level-up (gerenciado no provider).
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

interface FirstArchetypeCeremonyProps {
  open: boolean;
  archetype: Archetype;
  beliefs: PlayerBeliefs;
  archetypeMatch: ArchetypeMatchResult;
  onClose: () => void;
}

export default function FirstArchetypeCeremony({
  open,
  archetype,
  beliefs,
  archetypeMatch,
  onClose,
}: FirstArchetypeCeremonyProps) {
  const visual = getArchetypeAvatarVisual(archetype);
  const tint = visual.accent;
  const glow = `0 0 32px ${visual.glow}`;
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
            {/* Hero — scan glow do arquetipo. Trocar por imagem custom: */}
            {/* <Image src={`/archetypes/${archetype.id}.png`} ... /> */}
            <div
              className="relative h-44 w-full overflow-hidden"
              style={{
                background: `${visual.background}, radial-gradient(ellipse at top, ${tint}50 0%, transparent 70%)`,
              }}
            >
              {/* Scan pulse animado */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0.25] }}
                transition={{ duration: 1.8, times: [0, 0.4, 1] }}
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${tint}55, transparent 65%)`,
                }}
              />
              {/* Linha de scan */}
              <motion.div
                className="absolute inset-x-0 h-[2px]"
                initial={{ top: '0%', opacity: 0 }}
                animate={{ top: '100%', opacity: [0, 1, 0] }}
                transition={{ duration: 2.2, ease: 'easeInOut' }}
                style={{
                  background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
                  boxShadow: `0 0 12px ${tint}`,
                }}
              />
              <p className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                Padrao identificado
              </p>
              <motion.div
                className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: tint }}
                >
                  Você é
                </span>
                <span
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: tint, textShadow: `0 0 24px ${tint}aa` }}
                >
                  {archetype.name}
                </span>
              </motion.div>
            </div>

            <div className="px-6 pb-6 pt-4">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.45 }}
                className="text-center text-sm italic leading-relaxed text-white/70"
              >
                {archetype.tagline}
              </motion.p>

              {/* Description card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.45 }}
                className="glass-surface mt-5 rounded-[1.1rem] px-4 py-3.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Como Mindpractice te le
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/82">
                  {archetype.description}
                </p>
              </motion.div>

              {/* Mini radar com confidence */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
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
                      transition={{ delay: 1.0 + i * 0.06, duration: 0.32 }}
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
                  transition={{ delay: 1.4, duration: 0.4 }}
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
                transition={{ delay: 1.55, duration: 0.4 }}
                className="mt-5 w-full rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-colors"
                style={{
                  borderColor: `${tint}55`,
                  backgroundColor: `${tint}1a`,
                  color: tint,
                }}
              >
                Aceitar quem você é
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
