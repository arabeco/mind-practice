import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dialogVariants, dialogBackdropClasses } from '../Dialog';

test('Dialog: variant center centraliza com max-width', () => {
  const cls = dialogVariants({ variant: 'center' });
  assert.match(cls, /max-w-md/);
  assert.match(cls, /rounded-2xl/);
});

test('Dialog: variant sheet é bottom + full width', () => {
  const cls = dialogVariants({ variant: 'sheet' });
  assert.match(cls, /rounded-t-2xl/);
  assert.match(cls, /w-full/);
});

test('Dialog: backdrop é fixed inset-0 com bg escuro', () => {
  assert.match(dialogBackdropClasses, /fixed/);
  assert.match(dialogBackdropClasses, /inset-0/);
  assert.match(dialogBackdropClasses, /bg-black/);
});
