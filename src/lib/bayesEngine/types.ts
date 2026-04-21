import type { StatKey } from '@/types/game';

/** Número de bins que discretizam o trait latente θ em [0,1]. */
export const BIN_COUNT = 10;

/** Distribuição de crença sobre θ ∈ [0,1] em 10 bins.
 *  bins[i] = P(θ ∈ [i/10, (i+1)/10])
 *  Sum(bins) === 1.0 (invariante). */
export interface AxisBelief {
  bins: number[];        // length = BIN_COUNT, soma = 1
  observations: number;  // nº de evidências já aplicadas
  lastUpdated: string;   // ISO timestamp
}

/** Perfil bayesiano completo do jogador: 1 distribuição por eixo. */
export type PlayerBeliefs = Record<StatKey, AxisBelief>;

/** Evidência declarada numa Option sobre um eixo:
 *  "quem escolhe isso tem θ ≥ min" ou "θ ≤ max" (ou ambos). */
export interface AxisEvidence {
  min?: number;        // ∈ [0,1]; P(θ ≥ min) é alta
  max?: number;        // ∈ [0,1]; P(θ ≤ max) é alta
  confidence: number;  // ∈ [0.5, 0.99] — "discriminação" na IRT
}

/** Conjunto de evidências numa Option (1 por eixo, opcional). */
export type OptionEvidence = Partial<Record<StatKey, AxisEvidence>>;

/** Config global do engine. */
export interface BayesConfig {
  driftRatePerWeek: number;  // α crescente por semana
  driftMax: number;          // teto de α
  uniformFloor: number;      // base uniforme 1/BIN_COUNT
}

export const DEFAULT_CONFIG: BayesConfig = {
  driftRatePerWeek: 0.02,
  driftMax: 0.5,
  uniformFloor: 1 / BIN_COUNT,
};
