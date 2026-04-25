import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardVariants } from '../Card';

test('Card: variant glass aplica backdrop-blur', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'md' });
  assert.match(cls, /backdrop-blur/);
  assert.match(cls, /bg-bg-glass/);
});

test('Card: variant solid usa bg-surface-strong', () => {
  const cls = cardVariants({ variant: 'solid', padding: 'md' });
  assert.match(cls, /bg-bg-surface-strong/);
});

test('Card: variant elevated tem shadow', () => {
  const cls = cardVariants({ variant: 'elevated', padding: 'md' });
  assert.match(cls, /shadow/);
});

test('Card: padding none não aplica padding', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'none' });
  assert.doesNotMatch(cls, /\bp-\d/);
});

test('Card: glow=true aplica shadow purple', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'md', glow: true });
  assert.match(cls, /shadow-\[/);
});

test('Card: defaults são glass + md', () => {
  const cls = cardVariants({});
  assert.match(cls, /backdrop-blur/);
  assert.match(cls, /p-4/);
});
