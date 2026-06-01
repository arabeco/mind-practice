/**
 * Catalogo de achievements (conquistas) do MindPractice.
 *
 * Filosofia:
 * - Suaves, nao predatorios. 3 marcos honestos pra reconhecer marcos reais
 *   do jogador (primeira partida, fechar calibragem, perseverar).
 * - Cada um da uma quantia escassa de fichas (10 / 50 / 30 = 90 total),
 *   suficiente pra dar um cheirinho de progresso, longe de quebrar a
 *   economia das compras.
 *
 * Triggers ficam em `src/lib/achievementChecks.ts` (lazy/idempotent).
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Reward em fichas concedido quando destrancado. */
  rewardFichas: number;
  /** Icone emoji ou simbolo curto exibido no card. */
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeiro_despertar',
    title: 'Primeiro Despertar',
    description: 'Termine sua primeira partida.',
    rewardFichas: 10,
    icon: '◐',
  },
  {
    id: 'auto_conhecimento',
    title: 'Auto-conhecimento',
    description: 'Conclua os 7 decks de calibragem.',
    rewardFichas: 50,
    icon: '◆',
  },
  {
    id: 'maratona_mental',
    title: 'Maratona Mental',
    description: '50 perguntas respondidas no total.',
    rewardFichas: 30,
    icon: '☉',
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = ACHIEVEMENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, Achievement>,
);

/** Total possivel de fichas via achievements. Pra display em UI. */
export const ACHIEVEMENTS_MAX_REWARD = ACHIEVEMENTS.reduce(
  (sum, a) => sum + a.rewardFichas,
  0,
);

// Constantes da economia diaria ficam em types/game.ts pra evitar
// dependencia circular com gameReducer.
