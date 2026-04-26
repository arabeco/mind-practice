'use client';

/**
 * SeasonFinaleCeremony — modal cerimonial disparado quando o jogador
 * fecha uma campaign (chega num ending). Estilo "Wrapped" — selo da
 * season, ending alcançado, stats agregados, share.
 *
 * Renderizado pelo GameProvider quando useSeasonFinale retorna pending.
 * Precedencia: firstArch > evolution > seasonFinale > levelUp.
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { CampaignEnding } from '@/types/game';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { Season } from '@/data/seasons';

interface SeasonFinaleCeremonyProps {
  open: boolean;
  season: Season;
  ending: CampaignEnding;
  archetypeMatch: ArchetypeMatchResult;
  answerCount: number;
  decksCompletedInSeason: number;
  onClose: () => void;
}

export default function SeasonFinaleCeremony({
  open,
  season,
  ending,
  archetypeMatch,
  answerCount,
  decksCompletedInSeason,
  onClose,
}: SeasonFinaleCeremonyProps) {
  const Seal = season.Seal;
  const archetypeName = archetypeMatch.primary?.archetype.name ?? '—';
  // Tom warm/sepia pra distinguir das outras cerimonias.
  const tint = '#d4af37';
  const glow = `0 0 40px ${tint}55`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[55] flex items-center justify-center px-4 py-6 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(8, 8, 14, 0.88)' }}
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
            {/* Hero — selo + glow warm */}
            <div
              className="relative flex h-48 w-full items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at center, ${tint}40 0%, transparent 70%), linear-gradient(180deg, ${tint}18 0%, transparent 100%)`,
              }}
            >
              {/* Pulse warm */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.2] }}
                transition={{ duration: 2.0, times: [0, 0.5, 1] }}
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${tint}50, transparent 60%)`,
                }}
              />
              <p className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                Season completa
              </p>
              {/* Selo grande */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 18px ${tint}aa)` }}
              >
                <Seal size={88} />
              </motion.div>
            </div>

            <div className="px-6 pb-6 pt-4">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.45 }}
                className="text-center"
              >
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: tint, textShadow: `0 0 18px ${tint}88` }}
                >
                  {season.title}
                </h2>
                <p className="mt-1 text-xs italic text-white/60">{season.theme}</p>
              </motion.div>

              {/* Ending bloc */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.45 }}
                className="glass-surface mt-5 rounded-[1.1rem] px-4 py-3.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Ending alcançado
                </p>
                <p className="mt-1.5 text-base font-semibold text-white/92">
                  {ending.title}
                </p>
                <p className="mt-1 text-xs italic text-white/65">"{ending.tagline}"</p>
                <p className="mt-2.5 text-sm leading-relaxed text-white/78">
                  {ending.description}
                </p>
              </motion.div>

              {/* Stats agregados */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-4 grid grid-cols-3 gap-2"
              >
                <StatTile label="Respostas" value={String(answerCount)} />
                <StatTile label="Decks" value={String(decksCompletedInSeason)} />
                <StatTile label="Arquétipo" value={archetypeName} />
              </motion.div>

              {/* CTA */}
              <motion.button
                type="button"
                onClick={onClose}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15, duration: 0.4 }}
                className="mt-5 w-full rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] backdrop-blur-md transition-colors"
                style={{
                  borderColor: `${tint}55`,
                  backgroundColor: `${tint}1a`,
                  color: tint,
                }}
              >
                Continuar minha jornada
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-2 py-2.5 text-center">
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white/90">{value}</p>
    </div>
  );
}
