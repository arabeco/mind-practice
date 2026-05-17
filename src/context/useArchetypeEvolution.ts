'use client';

/**
 * useArchetypeEvolution — detecta quando o arquétipo primary muda apos
 * o save ja ter visto o "primeiro firme". Dispara a tela de Evolução
 * mostrando "voce era X, virou Y".
 *
 * Gating:
 *   - hydrated (evita disparar com prior uniforme antes do save real)
 *   - state.firstFirmArchetypeSeenAt !== null (sem isso eh primeiro firme,
 *     que vai pro FirstArchetypeCeremony)
 *   - state.lastFirmArchetypeId !== null
 *   - archetypeDisplayState.mode === 'firm' (so muda quando esta firme)
 *   - currentPrimary.id !== state.lastFirmArchetypeId
 */
import { useEffect, useState } from 'react';
import type { GameState, Archetype } from '@/types/game';
import {
  archetypeDisplayState,
  matchArchetypes,
  createPriorProfile,
} from '@/lib/bayesEngine';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import { ARCHETYPES } from '@/data/archetypes';
import type { GameAction } from './gameReducer';

export interface ArchetypeEvolutionValue {
  pending: {
    fromArchetype: Archetype;
    toArchetype: Archetype;
    archetypeMatch: ArchetypeMatchResult;
  } | null;
  dismiss: () => void;
}

export function useArchetypeEvolution(
  state: GameState,
  hydrated: boolean,
  dispatch: (action: GameAction) => void,
): ArchetypeEvolutionValue {
  const [pending, setPending] = useState<ArchetypeEvolutionValue['pending']>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.firstFirmArchetypeSeenAt) return; // primeiro firme vai pro outro hook
    if (!state.lastFirmArchetypeId) return;

    const beliefs = state.calibration.beliefs ?? createPriorProfile();
    const display = archetypeDisplayState(beliefs);
    if (display.mode !== 'firm') return;

    const archetypeMatch = matchArchetypes(beliefs);
    const toArchetype = archetypeMatch.primary?.archetype ?? null;
    if (!toArchetype) return;
    if (toArchetype.id === state.lastFirmArchetypeId) return; // sem mudanca

    const fromArchetype = ARCHETYPES.find(a => a.id === state.lastFirmArchetypeId) ?? null;
    if (!fromArchetype) return;

    setPending({ fromArchetype, toArchetype, archetypeMatch });
  }, [
    hydrated,
    state.calibration.beliefs,
    state.firstFirmArchetypeSeenAt,
    state.lastFirmArchetypeId,
  ]);

  const dismiss = () => {
    if (!pending) return;
    dispatch({
      type: 'MARK_ARCHETYPE_EVOLUTION_SEEN',
      archetypeId: pending.toArchetype.id,
    });
    setPending(null);
  };

  return { pending, dismiss };
}
