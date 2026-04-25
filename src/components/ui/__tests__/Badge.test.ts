import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeVariants } from '../Badge';

test('Badge: variant gold aplica accent-gold', () => {
  const cls = badgeVariants({ variant: 'gold' });
  assert.match(cls, /text-accent-gold/);
  assert.match(cls, /border-accent-gold-border/);
});

test('Badge: variant purple aplica accent-purple', () => {
  const cls = badgeVariants({ variant: 'purple' });
  assert.match(cls, /text-accent-purple/);
});

test('Badge: variant neutral é cor padrão', () => {
  const cls = badgeVariants({ variant: 'neutral' });
  assert.match(cls, /text-text-secondary/);
  assert.match(cls, /border-border-subtle/);
});

test('Badge: classes base têm uppercase + tracking', () => {
  const cls = badgeVariants({});
  assert.match(cls, /uppercase/);
  assert.match(cls, /tracking-/);
});
