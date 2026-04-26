import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonScore } from './seasonScore';
import { INITIAL_STATE } from './gameState/defaults';
import type { GameState, DeckSnapshot } from '@/types/game';

function makeSnapshot(overrides: Partial<DeckSnapshot>): DeckSnapshot {
  return {
    deckId: 'basic_01',
    completedAt: '2026-04-20T00:00:00Z',
    archetypeBeforeRun: null,
    archetypeAtCompletion: 'sentinela',
    archetypeChanged: false,
    statsAtCompletion: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
    runScore: 70,
    scoreBreakdown: null,
    answeredCount: 10,
    timeoutCount: 0,
    dominantAxis: null,
    axisDelta: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
    profileShift: 0,
    focusAlignment: null,
    answers: [],
    legacy: false,
    ...overrides,
  };
}

test('computeSeasonScore: state vazio retorna 0', () => {
  const r = computeSeasonScore(INITIAL_STATE, 'season-0');
  assert.equal(r.score, 0);
  assert.equal(r.answers, 0);
  assert.equal(r.decks, 0);
  assert.equal(r.avgRunScore, 0);
});

test('computeSeasonScore: 1 deck completo + 1 snapshot da season conta', () => {
  // basic_01 tem seasonId === 'season-0' por padrao
  const state: GameState = {
    ...INITIAL_STATE,
    completedDecks: { basic_01: '2026-04-20T00:00:00Z' },
    calibration: {
      ...INITIAL_STATE.calibration,
      snapshots: [makeSnapshot({ deckId: 'basic_01', answeredCount: 10, runScore: 70 })],
    },
  };
  const r = computeSeasonScore(state, 'season-0');
  // 10 answers * 10 + 1 deck * 100 + 70 avg * 5 = 100 + 100 + 350 = 550
  assert.equal(r.score, 550);
  assert.equal(r.answers, 10);
  assert.equal(r.decks, 1);
  assert.equal(r.avgRunScore, 70);
});

test('computeSeasonScore: ignora decks de outras seasons', () => {
  // Cria state com 1 deck completo numa season inexistente
  const state: GameState = {
    ...INITIAL_STATE,
    completedDecks: { basic_01: '2026-04-20T00:00:00Z' },
    calibration: {
      ...INITIAL_STATE.calibration,
      snapshots: [makeSnapshot({ deckId: 'basic_01', answeredCount: 10, runScore: 70 })],
    },
  };
  // Pergunta por outra season
  const r = computeSeasonScore(state, 'season-1');
  assert.equal(r.score, 0);
  assert.equal(r.decks, 0);
});

test('computeSeasonScore: snapshots sem runScore nao contam na media', () => {
  const state: GameState = {
    ...INITIAL_STATE,
    completedDecks: {},
    calibration: {
      ...INITIAL_STATE.calibration,
      snapshots: [
        makeSnapshot({ deckId: 'basic_01', answeredCount: 5, runScore: null }),
        makeSnapshot({ deckId: 'basic_01', answeredCount: 5, runScore: 80 }),
      ],
    },
  };
  const r = computeSeasonScore(state, 'season-0');
  // 10 answers * 10 + 0 decks * 100 + 80 avg * 5 = 100 + 0 + 400 = 500
  assert.equal(r.answers, 10);
  assert.equal(r.decks, 0);
  assert.equal(r.avgRunScore, 80);
  assert.equal(r.score, 500);
});

test('computeSeasonScore: deck completado mas sem snapshot ainda conta nos decks', () => {
  const state: GameState = {
    ...INITIAL_STATE,
    completedDecks: { basic_01: '2026-04-20T00:00:00Z' },
    calibration: { ...INITIAL_STATE.calibration, snapshots: [] },
  };
  const r = computeSeasonScore(state, 'season-0');
  // 0 answers * 10 + 1 deck * 100 + 0 avg * 5 = 100
  assert.equal(r.score, 100);
  assert.equal(r.decks, 1);
});

test('computeSeasonScore: score e arredondado pra baixo (Math.floor)', () => {
  const state: GameState = {
    ...INITIAL_STATE,
    completedDecks: {},
    calibration: {
      ...INITIAL_STATE.calibration,
      snapshots: [
        makeSnapshot({ deckId: 'basic_01', answeredCount: 1, runScore: 70.7 }),
      ],
    },
  };
  const r = computeSeasonScore(state, 'season-0');
  // 1 * 10 + 0 + 70.7 * 5 = 10 + 353.5 = 363.5 -> 363
  assert.equal(r.score, 363);
});
