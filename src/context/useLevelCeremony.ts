'use client';

/**
 * useLevelCeremony — detecta level-up e gerencia abertura da cerimonia.
 *
 * Fluxo de fases:
 *   nivel sobe → phase = 'video' → onVideoEnd → phase = 'modal'
 *   → modal dismiss → phase = null + MARK_LEVEL_SEEN
 *
 * Aguarda hydrate antes de comparar — evita disparar com level=1 do
 * INITIAL_STATE quando o save real ainda nao chegou.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/types/game';
import { getPlayerLevel, getLevelReward, type PlayerLevelInfo } from '@/lib/playerLevel';
import { matchArchetypes, createPriorProfile } from '@/lib/bayesEngine';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { GameAction } from './gameReducer';

export type CeremonyPhase = 'video' | 'modal';

export interface LevelCeremonyHookValue {
  pending: {
    phase: CeremonyPhase;
    info: PlayerLevelInfo;
    archetypeMatch: ArchetypeMatchResult;
    /** Total de fichas a creditar pelo level-up (soma se pulou multiplos niveis). */
    reward: number;
  } | null;
  advanceFromVideo: () => void;
  dismiss: () => void;
}

export function useLevelCeremony(
  state: GameState,
  hydrated: boolean,
  dispatch: (action: GameAction) => void,
): LevelCeremonyHookValue {
  const [pending, setPending] = useState<LevelCeremonyHookValue['pending']>(null);
  const lastFiredRef = useRef<number>(0);

  useEffect(() => {
    if (!hydrated) return;
    const beliefs = state.calibration.beliefs ?? createPriorProfile();
    const info = getPlayerLevel(beliefs, state.calibration.totalResponses);

    if (info.level <= state.lastSeenLevel) return;
    if (info.level === lastFiredRef.current) return;
    lastFiredRef.current = info.level;

    const archetypeMatch = matchArchetypes(beliefs);
    let reward = 0;
    for (let lvl = state.lastSeenLevel + 1; lvl <= info.level; lvl++) {
      reward += getLevelReward(lvl);
    }
    setPending({ phase: 'video', info, archetypeMatch, reward });
  }, [
    hydrated,
    state.calibration.beliefs,
    state.calibration.totalResponses,
    state.lastSeenLevel,
  ]);

  const advanceFromVideo = () => {
    setPending(prev => (prev && prev.phase === 'video' ? { ...prev, phase: 'modal' } : prev));
  };

  const dismiss = () => {
    if (!pending) return;
    void import('@/lib/analytics').then(({ trackEvent }) =>
      trackEvent('level_up', { level: pending.info.level, tier: pending.info.tier }),
    );
    dispatch({ type: 'MARK_LEVEL_SEEN', level: pending.info.level });
    setPending(null);
  };

  return { pending, advanceFromVideo, dismiss };
}
