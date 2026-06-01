/**
 * Checks de achievements — decide quais devem ser destrancados
 * com base no estado atual do jogo.
 *
 * Idempotente: chamar repetidamente nao causa problema. O reducer
 * UNLOCK_ACHIEVEMENT ja ignora destranques duplicados.
 */

import type { GameState } from '@/types/game';
import { ACHIEVEMENTS } from '@/data/achievements';
import { CALIBRAGEM_IDS } from '@/lib/gameStats';

export interface AchievementUnlock {
  id: string;
  rewardFichas: number;
}

/**
 * Avalia o GameState e retorna a lista de achievements que devem ser
 * destrancados AGORA (excluindo os ja destrancados).
 */
export function checkAchievements(state: GameState): AchievementUnlock[] {
  const unlocked: AchievementUnlock[] = [];

  const totalRuns = state.calibration.snapshots.length;
  const totalResponses = state.calibration.totalResponses;
  const calibragemIds = Array.from(CALIBRAGEM_IDS) as string[];
  const completedCalibragem = calibragemIds.filter(
    id => id in state.completedDecks,
  ).length;

  // 1. Primeiro Despertar — primeira partida terminada
  if (!state.achievements.primeiro_despertar && totalRuns >= 1) {
    const a = ACHIEVEMENTS.find(x => x.id === 'primeiro_despertar');
    if (a) unlocked.push({ id: a.id, rewardFichas: a.rewardFichas });
  }

  // 2. Auto-conhecimento — fechou os 7 decks de calibragem
  if (
    !state.achievements.auto_conhecimento &&
    completedCalibragem >= calibragemIds.length
  ) {
    const a = ACHIEVEMENTS.find(x => x.id === 'auto_conhecimento');
    if (a) unlocked.push({ id: a.id, rewardFichas: a.rewardFichas });
  }

  // 3. Maratona Mental — 50 perguntas respondidas
  if (!state.achievements.maratona_mental && totalResponses >= 50) {
    const a = ACHIEVEMENTS.find(x => x.id === 'maratona_mental');
    if (a) unlocked.push({ id: a.id, rewardFichas: a.rewardFichas });
  }

  return unlocked;
}
