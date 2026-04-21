import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateAxis, updateProfile } from '../update';
import { createUniformBelief, createPriorProfile, playerMean } from '../belief';
import { DEFAULT_CONFIG } from '../types';

const NOW = new Date('2026-04-20T12:00:00Z');

test('updateAxis com min=0.6 puxa média pra cima', () => {
  const prior = createUniformBelief(NOW);
  const next = updateAxis(prior, { min: 0.6, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  assert.ok(playerMean(next) > 0.5);
  const sum = next.bins.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(next.observations, 1);
  assert.equal(next.lastUpdated, NOW.toISOString());
});

test('updateAxis com max=0.3 puxa média pra baixo', () => {
  const prior = createUniformBelief(NOW);
  const next = updateAxis(prior, { max: 0.3, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  assert.ok(playerMean(next) < 0.5);
});

test('updateAxis 50 vezes consistente converge (mean próxima do threshold)', () => {
  let belief = createUniformBelief(NOW);
  for (let i = 0; i < 50; i++) {
    belief = updateAxis(belief, { min: 0.7, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  }
  assert.ok(playerMean(belief) > 0.75);
  assert.equal(belief.observations, 50);
});

test('updateAxis saturates — 100 obs não inflaciona além do limite', () => {
  let belief = createUniformBelief(NOW);
  for (let i = 0; i < 100; i++) {
    belief = updateAxis(belief, { min: 0.7, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  }
  assert.ok(playerMean(belief) < 0.96);
});

test('updateProfile ignora eixos ausentes em evidence', () => {
  const profile = createPriorProfile(NOW);
  const updated = updateProfile(
    profile,
    { vigor: { min: 0.7, confidence: 0.8 } },
    DEFAULT_CONFIG,
    NOW,
  );
  assert.ok(playerMean(updated.vigor) > 0.5);
  assert.ok(Math.abs(playerMean(updated.harmonia) - 0.5) < 1e-9);
  assert.equal(updated.vigor.observations, 1);
  assert.equal(updated.harmonia.observations, 0);
});

test('updateProfile aplica drift antes do Bayes quando tempo passou', () => {
  const past = new Date('2026-03-20T12:00:00Z');
  const profile = createPriorProfile(past);
  profile.vigor.bins = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  const updated = updateProfile(
    profile,
    { vigor: { min: 0.7, confidence: 0.8 } },
    DEFAULT_CONFIG,
    NOW,
  );
  assert.ok(updated.vigor.bins[4] < 1);
  assert.ok(playerMean(updated.vigor) > 0.45);
});
