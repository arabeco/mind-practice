/**
 * seasonScore — calculo puro do score de leaderboard pra uma season.
 *
 * Algoritmo hibrido (ver brainstorm F6.2):
 *   score = answers * 10 + decks * 100 + avgRunScore * 5
 *
 * Onde:
 *   - answers = total de respostas no historico de runs cujos decks
 *     pertencem a essa season (snapshot.answeredCount somado)
 *   - decks = quantos decks unicos da season foram completados
 *   - avgRunScore = media de snapshot.runScore (somente runs com score
 *     nao-nulo) cujos decks pertencem a essa season
 *
 * Pesos calibrados pra:
 *   - jogador casual completa 1 deck: ~10 respostas + 1 deck + ~70 score
 *     = 100 + 100 + 350 = 550
 *   - jogador grinder com 1 deck e 50 respostas avulsas: 500 + 100 + 350
 *     = 950 (ainda compete, mas decks contam mais por unidade)
 *   - jogador completionist com 5 decks: 50 resp + 5 decks + ~70 score
 *     = 500 + 500 + 350 = 1350 (dominante)
 *
 * Funcao pura: nao toca rede nem state.
 */
import type { GameState, DeckSnapshot } from '@/types/game';
import { getDeckById } from '@/data/decks/index';

export interface SeasonScoreBreakdown {
  /** Score total (inteiro, arredondado pra baixo). */
  score: number;
  answers: number;
  decks: number;
  avgRunScore: number;
}

const WEIGHT_ANSWERS = 10;
const WEIGHT_DECKS = 100;
const WEIGHT_AVG_RUN_SCORE = 5;

export function computeSeasonScore(
  state: GameState,
  seasonId: string,
): SeasonScoreBreakdown {
  // Filter snapshots de runs cujo deck pertence a essa season.
  const snapshots: DeckSnapshot[] = (state.calibration.snapshots ?? []).filter(s => {
    const deck = getDeckById(s.deckId);
    return deck?.seasonId === seasonId;
  });

  const answers = snapshots.reduce((sum, s) => sum + (s.answeredCount ?? 0), 0);

  // Decks unicos completados nessa season (de completedDecks, fonte
  // canonica de "completou" — snapshots podem ter runs incompletas).
  const completedDeckIds = Object.keys(state.completedDecks ?? {});
  const decks = completedDeckIds.filter(id => getDeckById(id)?.seasonId === seasonId).length;

  const runScores = snapshots
    .map(s => s.runScore)
    .filter((rs): rs is number => typeof rs === 'number');
  const avgRunScore =
    runScores.length > 0
      ? runScores.reduce((a, b) => a + b, 0) / runScores.length
      : 0;

  const score = Math.floor(
    answers * WEIGHT_ANSWERS +
      decks * WEIGHT_DECKS +
      avgRunScore * WEIGHT_AVG_RUN_SCORE,
  );

  return { score, answers, decks, avgRunScore };
}
