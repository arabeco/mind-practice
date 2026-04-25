import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonVariants } from '../Button';

test('Button: variant primary aplica accent-gold', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'md' });
  assert.match(cls, /bg-accent-gold/);
  assert.match(cls, /text-text-on-accent/);
});

test('Button: variant secondary usa glass', () => {
  const cls = buttonVariants({ variant: 'secondary', size: 'md' });
  assert.match(cls, /bg-bg-glass/);
});

test('Button: variant ghost é transparente', () => {
  const cls = buttonVariants({ variant: 'ghost', size: 'md' });
  assert.match(cls, /bg-transparent/);
});

test('Button: size sm aplica h-8 px-3', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'sm' });
  assert.match(cls, /h-8/);
  assert.match(cls, /px-3/);
});

test('Button: size lg aplica h-12 px-6', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'lg' });
  assert.match(cls, /h-12/);
  assert.match(cls, /px-6/);
});

test('Button: defaults sao primary + md', () => {
  const cls = buttonVariants({});
  assert.match(cls, /bg-accent-gold/);
  assert.match(cls, /h-10/);
});
