/**
 * Polos dos 5 eixos — fonte unica usada por PoleIcon, perfil, share, ending.
 *
 * Convencao: derivedAxes[key] ∈ [-1, +1]
 *   value < 0  → polo [0]  (Passivo, Conflito, Impulsivo, Invisivel, Apegado)
 *   value >= 0 → polo [1]  (Agressivo, Paz, Calculista, Dominante, Desapegado)
 *
 * Slugs (sem acento) batem com /public/icons/<slug>.png.
 */

import type { StatKey } from '@/types/game';

/** Labels visiveis dos 2 polos de cada eixo. */
export const AXIS_POLES: Record<StatKey, [string, string]> = {
  vigor:    ['Passivo',   'Agressivo'],
  harmonia: ['Conflito',  'Paz'],
  filtro:   ['Impulsivo', 'Calculista'],
  presenca: ['Invisivel', 'Dominante'],
  desapego: ['Apegado',   'Desapegado'],
};

/** Slugs em minusculas pros nomes de arquivo. Mesma ordem de AXIS_POLES. */
export const AXIS_POLE_SLUGS: Record<StatKey, [string, string]> = {
  vigor:    ['passivo',   'agressivo'],
  harmonia: ['conflito',  'paz'],
  filtro:   ['impulsivo', 'calculista'],
  presenca: ['invisivel', 'dominante'],
  desapego: ['apegado',   'desapegado'],
};

/** Resolve qual polo (slug + label + indice) representar dado o score do eixo. */
export function pickPoleSlug(axis: StatKey, value: number): { slug: string; label: string; index: 0 | 1 } {
  const index: 0 | 1 = value < 0 ? 0 : 1;
  return {
    slug: AXIS_POLE_SLUGS[axis][index],
    label: AXIS_POLES[axis][index],
    index,
  };
}
