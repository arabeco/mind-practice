import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeFactor } from '../timeFactor';

test('undefined → 1.0 (neutro)', () => {
  assert.equal(timeFactor(undefined), 1.0);
});

test('0ms → 1.0', () => {
  assert.equal(timeFactor(0), 1.0);
});

test('6000ms (borda baixa) → 1.0', () => {
  assert.equal(timeFactor(6000), 1.0);
});

test('9000ms (meio da rampa) → 0.65', () => {
  assert.equal(Math.round(timeFactor(9000) * 100) / 100, 0.65);
});

test('12000ms (borda alta) → 0.3', () => {
  assert.equal(Math.round(timeFactor(12000) * 10) / 10, 0.3);
});

test('15000ms (além do limite) → 0.3 (clamp)', () => {
  assert.equal(Math.round(timeFactor(15000) * 10) / 10, 0.3);
});
