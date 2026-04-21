import type { AxisEvidence } from './types';

function steepnessFromConfidence(confidence: number): number {
  const c = Math.max(0.5, Math.min(0.99, confidence));
  return 2 + ((c - 0.5) / 0.49) * 38;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * P(escolheu opção | θ=theta, evidência=ev).
 *
 * - Só `min`: sigmoid(k * (theta - min)). Abaixo de min → baixa, acima → alta.
 * - Só `max`: sigmoid(k * (max - theta)).
 * - Ambos: produto (janela). θ dentro de [min, max] → alta; fora → baixa.
 * - Nenhum: likelihood neutra 0.5 (evidência vazia = não informa).
 */
export function likelihoodAt(theta: number, ev: AxisEvidence): number {
  const k = steepnessFromConfidence(ev.confidence);
  const hasMin = typeof ev.min === 'number';
  const hasMax = typeof ev.max === 'number';
  if (!hasMin && !hasMax) return 0.5;
  let L = 1;
  if (hasMin) L *= sigmoid(k * (theta - ev.min!));
  if (hasMax) L *= sigmoid(k * (ev.max! - theta));
  return L;
}
