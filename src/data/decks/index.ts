import basic01 from './basic_01.json';
import altaTensao from './alta_tensao.json';
import holofote from './holofote.json';
import livroAmaldicoado from './livro_amaldicoado.json';
import profissional from './profissional.json';
import social from './social.json';
import type { Deck, DeckCategory } from '@/types/game';

export const ALL_DECKS: Deck[] = [
  basic01 as unknown as Deck,
  holofote as unknown as Deck,
  altaTensao as unknown as Deck,
  profissional as unknown as Deck,
  social as unknown as Deck,
  livroAmaldicoado as unknown as Deck,
];

export const getDeckById = (id: string): Deck | undefined =>
  ALL_DECKS.find(d => d.deckId === id);

export const getDecksByCategory = (cat: DeckCategory): Deck[] =>
  ALL_DECKS.filter(d => d.category === cat);

export const DECK_UNLOCK_ORDER = [
  'basic_01',
  'holofote',
  'alta_tensao',
  'profissional',
  'social',
  'livro_amaldicoado',
];

/**
 * Weekly free rotation: returns 2 deck IDs (1 eixo + 1 cenario)
 * that are free this week. Deterministic based on week number.
 */
export function getWeeklyFreeDeckIds(): string[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  const eixoDecks = ALL_DECKS.filter(d => d.category === 'eixo');
  const cenarioDecks = ALL_DECKS.filter(
    d => d.category === 'cenario' && d.deckId !== 'basic_01' && d.tier < 5,
  );

  const freeDeckIds: string[] = [];
  if (eixoDecks.length > 0) {
    freeDeckIds.push(eixoDecks[weekNumber % eixoDecks.length].deckId);
  }
  if (cenarioDecks.length > 0) {
    freeDeckIds.push(cenarioDecks[weekNumber % cenarioDecks.length].deckId);
  }
  return freeDeckIds;
}
