import { test } from 'node:test';
import assert from 'node:assert/strict';
import { likelihoodAt } from '../likelihood';

test('só min: bins acima de min têm likelihood > 0.5, abaixo < 0.5', () => {
  const ev = { min: 0.6, confidence: 0.8 };
  assert.ok(likelihoodAt(0.25, ev) < 0.3);
  assert.ok(likelihoodAt(0.85, ev) > 0.7);
  assert.ok(Math.abs(likelihoodAt(0.6, ev) - 0.5) < 0.1);
});

test('só max: bins abaixo de max têm likelihood > 0.5, acima < 0.5', () => {
  const ev = { max: 0.4, confidence: 0.8 };
  assert.ok(likelihoodAt(0.15, ev) > 0.7);
  assert.ok(likelihoodAt(0.85, ev) < 0.3);
});

test('min + max (intervalo): likelihood máxima dentro do intervalo', () => {
  const ev = { min: 0.4, max: 0.7, confidence: 0.8 };
  const inside = likelihoodAt(0.55, ev);
  const belowMin = likelihoodAt(0.15, ev);
  const aboveMax = likelihoodAt(0.85, ev);
  assert.ok(inside > belowMin);
  assert.ok(inside > aboveMax);
});

test('confidence alta → transição mais íngreme', () => {
  const weak = { min: 0.5, confidence: 0.55 };
  const strong = { min: 0.5, confidence: 0.95 };
  const gapWeak = likelihoodAt(0.7, weak) - likelihoodAt(0.3, weak);
  const gapStrong = likelihoodAt(0.7, strong) - likelihoodAt(0.3, strong);
  assert.ok(gapStrong > gapWeak);
});

test('evidência sem min/max: likelihood constante (=0.5)', () => {
  const ev = { confidence: 0.8 };
  assert.ok(Math.abs(likelihoodAt(0.1, ev) - 0.5) < 1e-9);
  assert.ok(Math.abs(likelihoodAt(0.9, ev) - 0.5) < 1e-9);
});
