import { STAT_KEYS, type StatKey } from '@/types/game';
import { BIN_COUNT, type AxisBelief, type PlayerBeliefs } from './types';

/** Crença inicial: uniforme, 0 observações, timestamp agora. */
export function createUniformBelief(now: Date = new Date()): AxisBelief {
  return {
    bins: new Array(BIN_COUNT).fill(1 / BIN_COUNT),
    observations: 0,
    lastUpdated: now.toISOString(),
  };
}

/** Perfil inicial com todos os eixos uniformes. */
export function createPriorProfile(now: Date = new Date()): PlayerBeliefs {
  const out = {} as PlayerBeliefs;
  for (const k of STAT_KEYS) out[k] = createUniformBelief(now);
  return out;
}

/** Centro de cada bin: bin i → (i + 0.5) / BIN_COUNT. */
export function binCenter(i: number): number {
  return (i + 0.5) / BIN_COUNT;
}

/** Expectativa E[θ] = Σ p_i · binCenter(i). */
export function playerMean(belief: AxisBelief): number {
  let sum = 0;
  for (let i = 0; i < belief.bins.length; i++) {
    sum += belief.bins[i] * binCenter(i);
  }
  return sum;
}

/** Confiança ∈ [0,1] = 1 - entropy/log(BIN_COUNT). Uniforme=0, pico=1. */
export function axisConfidence(belief: AxisBelief): number {
  let H = 0;
  for (const p of belief.bins) {
    if (p > 0) H -= p * Math.log(p);
  }
  const Hmax = Math.log(BIN_COUNT);
  return 1 - H / Hmax;
}

/** Confiança média dos 5 eixos. */
export function globalConfidence(profile: PlayerBeliefs): number {
  let sum = 0;
  for (const k of STAT_KEYS) sum += axisConfidence(profile[k]);
  return sum / STAT_KEYS.length;
}

/** Normaliza in-place: divide pela soma. No-op se já soma 1. */
export function normalizeBelief(bins: number[]): number[] {
  const sum = bins.reduce((a, b) => a + b, 0);
  if (sum <= 0) return new Array(bins.length).fill(1 / bins.length);
  return bins.map(x => x / sum);
}
