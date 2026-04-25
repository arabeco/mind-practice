'use client';

/**
 * useLevelCeremony — detecta level-up e gerencia abertura do modal cerimonial.
 *
 * Toda vez que `getPlayerLevel(beliefs, totalResponses).level` ultrapassa
 * `state.lastSeenLevel`, dispara `MARK_LEVEL_SEEN` (idempotente) e expoe
 * `pending` pro provider renderizar `<LevelUpCeremony>`.
 *
 * Aguarda hydrate antes de comparar — evita modal disparar com level=1 do
 * INITIAL_STATE quando o save real ainda nao chegou.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/types/game';
import { getPlayerLevel, type PlayerLevelInfo } from '@/lib/playerLevel';
import { matchArchetypes, createPriorProfile } from '@/lib/bayesEngine';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { GameAction } from './gameReducer';

export interface LevelCeremonyHookValue {
  pending: {
    info: PlayerLevelInfo;
    archetypeMatch: ArchetypeMatchResult;
  } | null;
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
    // Evita dispatch duplicado se o effect re-rodar antes do reducer atualizar.
    if (info.level === lastFiredRef.current) return;
    lastFiredRef.current = info.level;

    const archetypeMatch = matchArchetypes(beliefs);
    setPending({ info, archetypeMatch });
  }, [
    hydrated,
    state.calibration.beliefs,
    state.calibration.totalResponses,
    state.lastSeenLevel,
  ]);

  const dismiss = () => {
    if (!pending) return;
    dispatch({ type: 'MARK_LEVEL_SEEN', level: pending.info.level });
    setPending(null);
  };

  return { pending, dismiss };
}
