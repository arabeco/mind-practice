import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pillVariants } from '../Pill';

test('Pill: variant gold aplica accent-gold', () => {
  const cls = pillVariants({ variant: 'gold' });
  assert.match(cls, /text-accent-gold/);
});

test('Pill: tone pragmatico mapeia para gold', () => {
  const cls = pillVariants({ variant: 'pragmatico' });
  assert.match(cls, /text-accent-gold/);
});

test('Pill: tone provocativo mapeia para pink', () => {
  const cls = pillVariants({ variant: 'provocativo' });
  assert.match(cls, /text-accent-pink/);
});

test('Pill: tone protetor mapeia para cyan', () => {
  const cls = pillVariants({ variant: 'protetor' });
  assert.match(cls, /text-accent-cyan/);
});

test('Pill: tone evasivo mapeia para purple', () => {
  const cls = pillVariants({ variant: 'evasivo' });
  assert.match(cls, /text-accent-purple/);
});

test('Pill: tone neutro mapeia para neutral', () => {
  const cls = pillVariants({ variant: 'neutro' });
  assert.match(cls, /text-text-secondary/);
});

test('Pill: tem altura h-7 e px-3', () => {
  const cls = pillVariants({});
  assert.match(cls, /h-7/);
  assert.match(cls, /px-3/);
});
