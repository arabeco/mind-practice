import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPES } from '@/data/archetypes';
import { createPriorProfile } from '../belief';
import {
  matchArchetypes,
  archetypeDisplayState,
} from '../archetype';

const NOW = new Date('2026-04-20T12:00:00Z');

function beliefAt(mean: number) {
  const i = Math.min(9, Math.max(0, Math.floor(mean * 10)));
  const bins = new Array(10).fill(0);
  bins[i] = 1;
  return { bins, observations: 20, lastUpdated: NOW.toISOString() };
}

test('matchArchetypes: retorna primary + candidatos ordenados', () => {
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const { primary, secondary, all } = matchArchetypes(profile);
  assert.equal(primary.archetype.id, 'tubarao');
  assert.ok(all.length === ARCHETYPES.length);
  for (let i = 1; i < all.length; i++) {
    assert.ok(all[i].distance >= all[i - 1].distance);
  }
  if (secondary) {
    assert.ok(secondary.distance / primary.distance <= 1.3);
  }
});

test('matchArchetypes: secondary null quando distância do 2º > 1.3× do 1º', () => {
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const { primary, secondary, all } = matchArchetypes(profile);
  if (secondary === null) {
    assert.ok(all[1].distance / primary.distance > 1.3);
  }
});

test('archetypeDisplayState: confiança < 0.3 → "discovering"', () => {
  const profile = createPriorProfile(NOW);
  const state = archetypeDisplayState(profile);
  assert.equal(state.mode, 'discovering');
});

test('archetypeDisplayState: confiança 0.3-0.6 → "tendency" com hint', () => {
  const softPeak = (bin: number) => {
    const bins = new Array(10).fill(0.04);
    bins[bin] = 0.64;
    return { bins, observations: 10, lastUpdated: NOW.toISOString() };
  };
  const profile = {
    vigor:    softPeak(8),
    harmonia: softPeak(1),
    filtro:   softPeak(3),
    presenca: softPeak(8),
    desapego: softPeak(3),
  };
  const state = archetypeDisplayState(profile);
  assert.equal(state.mode, 'tendency');
  assert.ok(state.primary !== null);
});

test('archetypeDisplayState: confiança ≥ 0.6 → "firm" com primary e talvez secondary', () => {
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const state = archetypeDisplayState(profile);
  assert.equal(state.mode, 'firm');
  assert.ok(state.primary !== null);
});
