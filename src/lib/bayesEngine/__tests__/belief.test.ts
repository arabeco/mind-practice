import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniformBelief,
  playerMean,
  axisConfidence,
  createPriorProfile,
} from '../belief';
import { BIN_COUNT } from '../types';
import { STAT_KEYS } from '@/types/game';

test('createUniformBelief: bins uniformes somam 1 e observations=0', () => {
  const b = createUniformBelief();
  assert.equal(b.bins.length, BIN_COUNT);
  const sum = b.bins.reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(b.observations, 0);
  for (const p of b.bins) assert.ok(Math.abs(p - 0.1) < 1e-9);
});

test('playerMean de crença uniforme = 0.5', () => {
  const b = createUniformBelief();
  assert.ok(Math.abs(playerMean(b) - 0.5) < 1e-9);
});

test('playerMean de crença colada no bin 0 ≈ 0.05', () => {
  const b = createUniformBelief();
  b.bins = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.ok(Math.abs(playerMean(b) - 0.05) < 1e-9);
});

test('playerMean de crença colada no bin 9 ≈ 0.95', () => {
  const b = createUniformBelief();
  b.bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  assert.ok(Math.abs(playerMean(b) - 0.95) < 1e-9);
});

test('axisConfidence: uniforme → 0, pico → ~1', () => {
  const uniform = createUniformBelief();
  assert.ok(axisConfidence(uniform) < 0.01);
  const peaked = { ...uniform, bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] };
  assert.ok(axisConfidence(peaked) > 0.99);
});

test('createPriorProfile retorna 5 eixos uniformes', () => {
  const p = createPriorProfile();
  for (const k of STAT_KEYS) {
    assert.equal(p[k].bins.length, BIN_COUNT);
    assert.equal(p[k].observations, 0);
  }
});
