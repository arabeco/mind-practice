'use client';

/**
 * useFirstArchetypeCeremony — detecta a primeira vez que o jogador atinge
 * `archetypeDisplayState === 'firm'` e dispara a tela cerimonial.
 *
 * Acontece UMA VEZ por save (gated por state.firstFirmArchetypeSeenAt).
 * Aguarda hydrate antes de comparar — evita disparar com prior uniforme
 * antes do save real chegar.
 *
 * Conflito com level-up: GameProvider dá precedencia pra archetype
 * ceremony — level-up modal espera o dismiss.
 */
import { useEffect, useState } from 'react';
import type { GameState } from '@/types/game';
import {
  archetypeDisplayState,
  matchArchetypes,
  createPriorProfile,
} from '@/lib/bayesEngine';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { Archetype } from '@/types/game';
import type { GameAction } from './gameReducer';

export interface FirstArchetypeCeremonyValue {
  pending: {
    archetype: Archetype;
    archetypeMatch: ArchetypeMatchResult;
  } | null;
  dismiss: () => void;
}

export function useFirstArchetypeCeremony(
  state: GameState,
  hydrated: boolean,
  dispatch: (action: GameAction) => void,
): FirstArchetypeCeremonyValue {
  const [pending, setPending] = useState<FirstArchetypeCeremonyValue['pending']>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (state.firstFirmArchetypeSeenAt) return; // ja viu

    const beliefs = state.calibration.beliefs ?? createPriorProfile();
    const display = archetypeDisplayState(beliefs);
    if (display.mode !== 'firm') return;

    const archetypeMatch = matchArchetypes(beliefs);
    const archetype = archetypeMatch.primary?.archetype ?? null;
    if (!archetype) return;

    setPending({ archetype, archetypeMatch });
  }, [
    hydrated,
    state.calibration.beliefs,
    state.firstFirmArchetypeSeenAt,
  ]);

  const dismiss = () => {
    if (!pending) return;
    dispatch({ type: 'MARK_FIRST_ARCHETYPE_SEEN' });
    setPending(null);
  };

  return { pending, dismiss };
}
