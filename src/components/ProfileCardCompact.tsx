'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useLocalProfile, computeLevel } from '@/hooks/useLocalProfile';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';

/**
 * Card horizontal compacto de perfil — usado no topo da Home e reaproveitável
 * em listas de amigos. Mostra avatar, nickname, nível e arquétipo dominante.
 * Clicar leva ao /perfil.
 */
export default function ProfileCardCompact({ compact = false }: { compact?: boolean }) {
  const { state, getArchetype } = useGame();
  const { nickname, variant } = useLocalProfile();
  const archetype = getArchetype();
  const visual = getArchetypeAvatarVisual(archetype);

  const { level, xpInLevel, xpForNext } = computeLevel(state.calibration.totalResponses);
  const xpPct = (xpInLevel / xpForNext) * 100;

  const symbol = variant === 'masculino' ? '\u2642' : '\u2640';

  return (
    <Link href="/perfil" className="block">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="glass-card relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/12 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
      >
        {/* Accent glow from archetype */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(circle at 0% 50%, ${visual.glow} 0%, transparent 55%)`,
          }}
        />

        {/* Avatar */}
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
          style={{
            background: visual.background,
            borderColor: visual.line,
            boxShadow: `0 0 14px ${visual.glow}`,
          }}
        >
          <span className="text-xl font-bold" style={{ color: visual.accent }}>
            {symbol}
          </span>
        </div>

        {/* Info */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-white/92">{nickname}</span>
            <span
              className="shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{
                borderColor: visual.line,
                color: visual.accent,
                background: 'rgba(0,0,0,0.25)',
              }}
            >
              Lv {level}
            </span>
          </div>
          <span className="truncate text-[11px] text-white/55">{archetype.name}</span>

          {!compact && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${xpPct}%`,
                  background: `linear-gradient(90deg, ${visual.accent}AA, ${visual.accent})`,
                  boxShadow: `0 0 8px ${visual.glow}`,
                }}
              />
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg
          className="relative shrink-0 text-white/35"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </Link>
  );
}
