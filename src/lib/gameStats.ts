/**
 * gameStats — helpers puros extraídos de GameContext.tsx.
 *
 * Nada aqui depende de React. Tudo é função pura sobre tipos do @/types/game.
 * GameContext re-exporta estes símbolos pra manter compat com callers existentes.
 */
import type {
  CalibrationState,
  Deck,
  GameState,
  Tone,
} from '@/types/game';
import {
  STAT_KEYS,
  CALIBRATION_WINDOW,
  CONSISTENCY_WINDOW,
} from '@/types/game';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';
import { axisConfidence as bayesAxisConfidence } from '@/lib/bayesEngine';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';

export const UNLOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Deck IDs that belong to the "calibragem" category — fast unlock + reward. */
export const CALIBRAGEM_IDS = new Set([
  'basic_01',
  'espelho',
  'mascara',
  'roda',
  'teste',
  'limite',
  'escolha',
]);
export const CALIBRAGEM_COMPLETION_FICHAS = 5;

/**
 * Deck IDs que liberam o próximo imediatamente (sem cooldown).
 * Inclui todas as calibragens + os primeiros decks de eixo narrativo.
 * O cooldown só começa a partir dos cenários "pesados" (tier alto).
 */
export const INSTANT_UNLOCK_IDS = new Set<string>([
  ...CALIBRAGEM_IDS,
  'holofote',
  'alta_tensao',
]);

/**
 * Bump totalResponses + push tone history. Beliefs são atualizados
 * separadamente pelo motor bayesiano dentro do reducer.
 *
 * (Antes: aplicava também o somatório de `weights` em `axes`/`recentWeights`,
 * removido na Fase 4 — Task 21.)
 */
export function recordAnswer(cal: CalibrationState, tone: Tone): CalibrationState {
  const newToneHistory = [...cal.toneHistory, tone];
  if (newToneHistory.length > CONSISTENCY_WINDOW) newToneHistory.shift();
  return {
    ...cal,
    totalResponses: cal.totalResponses + 1,
    toneHistory: newToneHistory,
  };
}

/**
 * Decks are unlocked sequentially. Cooldown policy:
 *   - Calibragem + eixo (primeiros 7 decks) → desbloqueio imediato ao completar o anterior
 *   - Cenário (tier ≥ 3) → cooldown de 24h (rituais raros, espaçados)
 */
export function getUnlockedDecks(completedDecks: Record<string, string>): string[] {
  const unlocked: string[] = [];
  for (let i = 0; i < DECK_UNLOCK_ORDER.length; i++) {
    const deckId = DECK_UNLOCK_ORDER[i];
    if (i === 0) { unlocked.push(deckId); continue; }
    const prevId = DECK_UNLOCK_ORDER[i - 1];
    const prevAt = completedDecks[prevId];
    if (!prevAt) break;

    // Instant unlock for the warm-up tier (calibragem + eixos).
    if (INSTANT_UNLOCK_IDS.has(prevId)) {
      unlocked.push(deckId);
      continue;
    }

    // Cenário decks still honor the 24h cooldown to preserve ritual weight.
    const elapsed = Date.now() - new Date(prevAt).getTime();
    if (elapsed >= UNLOCK_COOLDOWN_MS) unlocked.push(deckId);
    else break;
  }
  return unlocked;
}

/**
 * Determina se um deck pode ser jogado pelo usuário agora.
 *
 * Regras:
 *  - Se priceFichas === null → só depende de unlockedDecks (flow sequencial antigo).
 *  - Se priceFichas > 0 e seasonId === 'season-0' → só depende de unlockedDecks.
 *  - Se priceFichas > 0 e seasonId !== 'season-0' → precisa estar em ownedDeckIds
 *    OU plusSubscription.active (+ não `plusOnly` com active=false).
 */
export function isDeckPlayable(deck: Deck, state: GameState): boolean {
  // Gating sequencial antigo ainda aplica para Season 0.
  const sequentialOk = state.unlockedDecks.includes(deck.deckId);

  // Grátis (calibragem ou promocional) → só flow sequencial
  if (deck.priceFichas === null) return sequentialOk;

  // Season 0 paga → legado: ignora ownership
  if (deck.seasonId === 'season-0') return sequentialOk;

  // Season 1+ paywall
  const owned = state.ownedDeckIds.includes(deck.deckId);
  const plusActive = state.plusSubscription.active;
  if (deck.plusOnly) return plusActive;
  return owned || plusActive;
}

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

export function getPrecision(totalResponses: number): number {
  return Math.min(totalResponses / CALIBRATION_WINDOW, 1.0) * 100;
}

export function getPrecisionLabel(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: 'Blindado', color: 'text-accent-gold' };
  if (pct > 70) return { label: 'Perfil Solido', color: 'text-accent-gold' };
  if (pct > 30) return { label: 'Calibrando', color: 'text-accent-purple' };
  return { label: 'Fase de Descoberta', color: 'text-orange-400' };
}

/**
 * Consistência derivada de PlayerBeliefs: média da `axisConfidence` (0-1) dos 5 eixos.
 * Distribuição uniforme (jogador novo) → 0. Distribuição concentrada → 1.
 */
export function getConsistency(beliefs: PlayerBeliefs | undefined): number {
  if (!beliefs) return 0;
  let sum = 0;
  for (const key of STAT_KEYS) {
    sum += bayesAxisConfidence(beliefs[key]);
  }
  return sum / STAT_KEYS.length;
}

export function getConsistencyLabel(
  c: number,
): { label: string; icon: 'full' | 'half' | 'cracked' } {
  if (c >= 0.6) return { label: 'Estavel', icon: 'full' };
  if (c >= 0.3) return { label: 'Em formacao', icon: 'half' };
  return { label: 'Instavel', icon: 'cracked' };
}
