import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRingDash } from '../Ring';

test('Ring: value=0 → offset = circunferência (vazio)', () => {
  const { circumference, dashOffset } = computeRingDash(0, 48, 4);
  assert.equal(dashOffset, circumference);
});

test('Ring: value=1 → offset = 0 (cheio)', () => {
  const { dashOffset } = computeRingDash(1, 48, 4);
  assert.equal(dashOffset, 0);
});

test('Ring: value=0.5 → offset = circunferência/2', () => {
  const { circumference, dashOffset } = computeRingDash(0.5, 48, 4);
  assert.equal(Math.round(dashOffset * 100), Math.round((circumference / 2) * 100));
});

test('Ring: value clamp em [0,1]', () => {
  const high = computeRingDash(2, 48, 4);
  assert.equal(high.dashOffset, 0, 'value>1 vira 1');
  const low = computeRingDash(-1, 48, 4);
  assert.equal(low.dashOffset, low.circumference, 'value<0 vira 0');
});

test('Ring: radius respeita size + thickness', () => {
  const { radius } = computeRingDash(0.5, 48, 4);
  assert.equal(radius, (48 - 4) / 2);
});
