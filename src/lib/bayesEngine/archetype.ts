import { ARCHETYPES } from '@/data/archetypes';
import { STAT_KEYS, type Archetype } from '@/types/game';
import { globalConfidence, playerMean } from './belief';
import type { PlayerBeliefs } from './types';

export interface ArchetypeCandidate {
  archetype: Archetype;
  distance: number;
}

export interface ArchetypeMatchResult {
  primary: ArchetypeCandidate;
  secondary: ArchetypeCandidate | null;
  all: ArchetypeCandidate[];
}

export type ArchetypeDisplayMode = 'discovering' | 'tendency' | 'firm';

export interface ArchetypeDisplayState {
  mode: ArchetypeDisplayMode;
  confidence: number;
  primary: ArchetypeCandidate | null;
  secondary: ArchetypeCandidate | null;
}

function euclidean(profile: PlayerBeliefs, archetype: Archetype): number {
  let sum = 0;
  for (const k of STAT_KEYS) {
    const diff = playerMean(profile[k]) - archetype.idealProfile[k];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function matchArchetypes(profile: PlayerBeliefs): ArchetypeMatchResult {
  const scored: ArchetypeCandidate[] = ARCHETYPES.map(a => ({
    archetype: a,
    distance: euclidean(profile, a),
  })).sort((a, b) => a.distance - b.distance);

  const primary = scored[0];
  const candidate = scored[1];
  const secondary =
    candidate && candidate.distance <= primary.distance * 1.3
      ? candidate
      : null;
  return { primary, secondary, all: scored };
}

export function archetypeDisplayState(
  profile: PlayerBeliefs,
): ArchetypeDisplayState {
  const confidence = globalConfidence(profile);
  const { primary, secondary } = matchArchetypes(profile);

  if (confidence < 0.3) {
    return { mode: 'discovering', confidence, primary: null, secondary: null };
  }
  if (confidence < 0.6) {
    return { mode: 'tendency', confidence, primary, secondary: null };
  }
  return { mode: 'firm', confidence, primary, secondary };
}
