import basic01 from './basic_01.json';
import altaTensao from './alta_tensao.json';
import profissional from './profissional.json';
import social from './social.json';
import type { Deck } from '@/types/game';

export const ALL_DECKS: Deck[] = [
  basic01 as Deck,
  altaTensao as Deck,
  profissional as Deck,
  social as Deck,
];

export const getDeckById = (id: string): Deck | undefined =>
  ALL_DECKS.find(d => d.deckId === id);

export const DECK_UNLOCK_ORDER = ['basic_01', 'alta_tensao', 'profissional', 'social'];
