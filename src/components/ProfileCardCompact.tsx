'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useLocalProfile, computeLevel } from '@/hooks/useLocalProfile';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';
import { archetypeDisplayState, createPriorProfile } from '@/lib/bayesEngine';
import { Card, Badge, Ring } from '@/components/ui';

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

  const display = archetypeDisplayState(state.calibration.beliefs ?? createPriorProfile());
  const archetypeLabel =
    display.mode === 'discovering' ? 'Ainda te conhecendo…'
    : display.mode === 'tendency' ? `Tendendo a ${display.primary?.archetype.name ?? archetype.name}`
    : archetype.name;

  const { level, xpInLevel, xpForNext } = computeLevel(state.calibration.totalResponses);
  const xpPct = (xpInLevel / xpForNext) * 100;

  const symbol = variant === 'masculino' ? '♂' : '♀';

  return (
    <Link href="/perfil" className="block">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <Card
          variant="glass"
          padding="none"
          className="relative flex items-center gap-3 overflow-hidden border-border-default px-3 py-2.5 transition-colors hover:bg-bg-glass-strong"
        >
          {/* Accent glow from archetype */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(circle at 0% 50%, ${visual.glow} 0%, transparent 55%)`,
            }}
          />

          {/* Avatar circundado pelo Ring de XP (gold) — anel mostra progresso até o proximo nivel */}
          <Ring value={xpPct / 100} size={56} thickness={3} color="gold">
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
          </Ring>

          {/* Info */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-text-primary">{nickname}</span>
              <Badge variant="gold" className="shrink-0 px-1.5 py-[1px] text-[9px] uppercase tracking-[0.14em]">
                Lv {level}
              </Badge>
            </div>
            <span className="truncate text-[11px] text-text-tertiary">{archetypeLabel}</span>
            {/* compact prop preservada como flag no-op (legacy callers) — XP agora vive no Ring acima. */}
            {compact && null}
          </div>

          {/* Chevron */}
          <svg
            className="relative shrink-0 text-text-tertiary"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Card>
      </motion.div>
    </Link>
  );
}
