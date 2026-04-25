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

test('axisConfidence é monotonico: prior < parcialmente concentrado < pico', () => {
  const uniform = createUniformBelief();
  const partial = { ...uniform, bins: [0, 0, 0.1, 0.2, 0.4, 0.2, 0.1, 0, 0, 0] };
  const peaked = { ...uniform, bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] };
  const cU = axisConfidence(uniform);
  const cP = axisConfidence(partial);
  const cK = axisConfidence(peaked);
  assert.ok(cU < cP, `uniform ${cU} should be < partial ${cP}`);
  assert.ok(cP < cK, `partial ${cP} should be < peaked ${cK}`);
});

test('playerMean é simetrico em distribuicoes espelhadas', () => {
  const u = createUniformBelief();
  const left = { ...u, bins: [0.3, 0.3, 0.2, 0.1, 0.05, 0.05, 0, 0, 0, 0] };
  const right = { ...u, bins: [0, 0, 0, 0, 0.05, 0.05, 0.1, 0.2, 0.3, 0.3] };
  const ml = playerMean(left);
  const mr = playerMean(right);
  // Espelhados em torno de 0.5: ml + mr ≈ 1.
  assert.ok(Math.abs(ml + mr - 1) < 1e-9, `ml + mr = ${ml + mr}, esperado ≈ 1`);
});

test('createPriorProfile produz beliefs independentes (mutacao isolada)', () => {
  const p = createPriorProfile();
  p.vigor.bins[0] = 999;
  // Outros eixos não devem ter sido afetados.
  for (const k of STAT_KEYS) {
    if (k === 'vigor') continue;
    assert.ok(Math.abs(p[k].bins[0] - 0.1) < 1e-9, `${k} compartilhou referência com vigor`);
  }
});
