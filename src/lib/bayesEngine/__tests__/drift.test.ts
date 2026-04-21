import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageBelief, weeksSince } from '../drift';
import { DEFAULT_CONFIG } from '../types';

test('weeksSince: 0 para mesmo instante', () => {
  const now = new Date('2026-04-20T12:00:00Z');
  assert.equal(weeksSince(now.toISOString(), now), 0);
});

test('weeksSince: ~1 após 7 dias', () => {
  const now = new Date('2026-04-27T12:00:00Z');
  const past = '2026-04-20T12:00:00Z';
  assert.ok(Math.abs(weeksSince(past, now) - 1) < 1e-6);
});

test('ageBelief: sem tempo passado → sem mudança', () => {
  const now = new Date('2026-04-20T12:00:00Z');
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 5,
    lastUpdated: now.toISOString(),
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  for (let i = 0; i < 10; i++) {
    assert.ok(Math.abs(aged.bins[i] - belief.bins[i]) < 1e-9);
  }
});

test('ageBelief: 4 semanas → crença um pouco mais uniforme', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  const past = '2026-04-20T12:00:00Z';
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 5,
    lastUpdated: past,
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  assert.ok(aged.bins[4] < 1);
  assert.ok(aged.bins[4] > 0.5);
  assert.ok(aged.bins[0] > 0);
  const sum = aged.bins.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('ageBelief: tempo enorme saturates no driftMax', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const past = '2026-01-01T00:00:00Z';
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 50,
    lastUpdated: past,
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  assert.ok(Math.abs(aged.bins[4] - 0.55) < 1e-6);
  assert.ok(Math.abs(aged.bins[0] - 0.05) < 1e-6);
});
