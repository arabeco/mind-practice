// ============================================================================
// Seasons catalog
// Cada season tem id, título, tema, data de lançamento e referência ao selo SVG.
// Usado pelo SeasonTeaserCard (home) e pra agrupar decks na tela /decks.
// ============================================================================

import type { ComponentType } from 'react';
import { Season0Seal } from '@/components/seals/Season0Seal';
import { Season1Seal } from '@/components/seals/Season1Seal';

export interface Season {
  id: string;
  title: string;
  /** Tema curto, aparece no teaser e em /decks. */
  theme: string;
  /** ISO date yyyy-mm-dd em que a season é lançada publicamente. */
  launchDate: string;
  /** Componente SVG 24×24 do selo. Recebe `className` opcional. */
  Seal: ComponentType<{ className?: string; size?: number }>;
}

export const SEASONS: Season[] = [
  {
    id: 'season-0',
    title: 'Fundação',
    theme: 'Os primeiros decks. Calibra quem você é.',
    launchDate: '2026-01-01',
    Seal: Season0Seal,
  },
  {
    id: 'season-1',
    title: 'Ocupando Espaço',
    theme: 'Trabalho, autoridade, pertencimento. Quando você vira figura na sala.',
    launchDate: '2026-05-23',
    Seal: Season1Seal,
  },
];

export function getSeason(id: string): Season | undefined {
  return SEASONS.find(s => s.id === id);
}

/** Retorna a season "ativa no momento" para o teaser:
 *  - se alguma season ainda não lançou mas está em até 7 dias → retorna essa (pré-lançamento)
 *  - senão, a mais recente que já lançou.
 */
export function getCurrentTeaserSeason(now: Date = new Date()): {
  season: Season;
  state: 'pre-launch' | 'fresh' | 'ongoing';
} | null {
  const nowMs = now.getTime();
  const sorted = [...SEASONS].sort(
    (a, b) => Date.parse(a.launchDate) - Date.parse(b.launchDate),
  );

  // Pré-lançamento: próxima season lança em até 7 dias
  for (const s of sorted) {
    const launchMs = Date.parse(s.launchDate);
    const daysUntil = (launchMs - nowMs) / (1000 * 60 * 60 * 24);
    if (daysUntil > 0 && daysUntil <= 7) {
      return { season: s, state: 'pre-launch' };
    }
  }

  // Mais recente já lançada
  const released = sorted.filter(s => Date.parse(s.launchDate) <= nowMs);
  if (released.length === 0) return null;
  const latest = released[released.length - 1];
  const daysSinceLaunch = (nowMs - Date.parse(latest.launchDate)) / (1000 * 60 * 60 * 24);

  if (daysSinceLaunch <= 14) return { season: latest, state: 'fresh' };
  if (daysSinceLaunch <= 60) return { season: latest, state: 'ongoing' };
  return null; // entre seasons — não mostra teaser
}
