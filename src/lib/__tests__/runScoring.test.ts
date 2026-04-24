import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendRunAnswer, createRunSession } from '../runScoring';
import type { Deck } from '@/types/game';

const fakeDeck = {
  deckId: 'x',
  name: 'x', description: 'x', tema: 'x', category: 'cenario',
  tier: 1, difficulty: 1, rarity: 'comum', seasonId: 'season-0',
  priceFichas: null, questions: [{ id: 'q1', type: 'NORMAL', metadata: {
    tensao: 1, ambiente: 'Publico', relacao: 'Par', aposta: 'Tempo', pilar: 'ego',
  }, slides: [], options: [] }],
} as unknown as Deck;

test('appendRunAnswer persiste evidence quando presente', () => {
  const session = createRunSession(fakeDeck,
    { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 }, 'x');
  const updated = appendRunAnswer(
    session, 'q1', 'neutro',
    { vigor: 2 },
    { vigor: { min: 0.6, confidence: 0.75 } },
    1000,
  );
  assert.equal(updated.answers.length, 1);
  assert.deepEqual(updated.answers[0].evidence, { vigor: { min: 0.6, confidence: 0.75 } });
});
