import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, type GameAction } from '../gameReducer';
import { INITIAL_STATE } from '@/lib/gameState/defaults';
import type { GameState } from '@/types/game';

const freshState = (): GameState => ({
  ...INITIAL_STATE,
  calibration: {
    ...INITIAL_STATE.calibration,
    toneHistory: [...INITIAL_STATE.calibration.toneHistory],
    snapshots: [...INITIAL_STATE.calibration.snapshots],
  },
  wallet: { ...INITIAL_STATE.wallet },
  plusSubscription: { ...INITIAL_STATE.plusSubscription },
});

test('HYDRATE substitui state inteiro', () => {
  const s = freshState();
  const incoming: GameState = { ...s, streak: 42, wallet: { ...s.wallet, fichas: 999 } };
  const next = gameReducer(s, { type: 'HYDRATE', state: incoming });
  assert.equal(next.streak, 42);
  assert.equal(next.wallet.fichas, 999);
});

test('CLAIM_DAILY primeiro claim adiciona fichas', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'CLAIM_DAILY' });
  assert.ok(next.wallet.fichas > s.wallet.fichas);
  assert.ok(next.wallet.lastDailyClaim !== null);
});

test('CLAIM_DAILY mesmo dia é no-op', () => {
  const s = freshState();
  const today = new Date().toISOString().split('T')[0];
  // O guard do reducer usa dailyLoginClaimedAt (v5), não wallet.lastDailyClaim.
  const already: GameState = {
    ...s,
    dailyLoginClaimedAt: today,
    wallet: { ...s.wallet, lastDailyClaim: today },
  };
  const next = gameReducer(already, { type: 'CLAIM_DAILY' });
  assert.equal(next.wallet.fichas, already.wallet.fichas);
  assert.equal(next.wallet.lastDailyClaim, today);
});

test('SPEND_FICHAS com saldo insuficiente é no-op', () => {
  const s = freshState();
  const poor: GameState = { ...s, wallet: { ...s.wallet, fichas: 5 } };
  const next = gameReducer(poor, { type: 'SPEND_FICHAS', amount: 100, itemId: 'deck_x' });
  assert.equal(next.wallet.fichas, 5);
});

test('SPEND_FICHAS com saldo suficiente subtrai e atualiza totalSpent', () => {
  const s = freshState();
  const rich: GameState = { ...s, wallet: { ...s.wallet, fichas: 500 } };
  const next = gameReducer(rich, { type: 'SPEND_FICHAS', amount: 100, itemId: 'deck_premium' });
  assert.equal(next.wallet.fichas, 400);
  assert.equal(next.wallet.totalSpent, s.wallet.totalSpent + 100);
});

test('EARN_FICHAS adiciona ao saldo e totalEarned', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'EARN_FICHAS', amount: 30, reason: 'test' });
  assert.equal(next.wallet.fichas, s.wallet.fichas + 30);
  assert.equal(next.wallet.totalEarned, s.wallet.totalEarned + 30);
});

test('RESET_ALL volta pro initialState', () => {
  const s: GameState = {
    ...freshState(),
    streak: 10,
    wallet: { ...INITIAL_STATE.wallet, fichas: 500, totalSpent: 200 },
    completedDecks: { basic_01: '2026-01-01' },
  };
  const next = gameReducer(s, { type: 'RESET_ALL' });
  assert.equal(next.streak, 0);
  assert.equal(next.wallet.fichas, INITIAL_STATE.wallet.fichas);
  assert.deepEqual(next.completedDecks, {});
});

test('acao desconhecida retorna state inalterado', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'XYZ_NAO_EXISTE' } as unknown as GameAction);
  assert.equal(next, s);
});
