import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOKENS } from '../tokens';

const cssPath = join(process.cwd(), 'src', 'app', 'globals.css');
const css = readFileSync(cssPath, 'utf-8');

/** Lista de variáveis CSS esperadas, derivadas do TOKENS.semantic. */
const expectedVars = [
  '--color-bg-base',
  '--color-bg-surface',
  '--color-bg-surface-strong',
  '--color-bg-glass',
  '--color-bg-glass-strong',
  '--color-border-subtle',
  '--color-border-default',
  '--color-border-strong',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-text-disabled',
  '--color-text-on-accent',
  '--color-accent-gold',
  '--color-accent-gold-bg',
  '--color-accent-gold-border',
  '--color-accent-purple',
  '--color-accent-purple-bg',
  '--color-accent-purple-border',
  '--color-accent-cyan',
  '--color-accent-cyan-bg',
  '--color-accent-cyan-border',
  '--color-accent-pink',
  '--color-accent-pink-bg',
  '--color-accent-pink-border',
  '--color-state-success',
  '--color-state-success-bg',
  '--color-state-success-border',
  '--color-state-warning',
  '--color-state-warning-bg',
  '--color-state-warning-border',
  '--color-state-error',
  '--color-state-error-bg',
  '--color-state-error-border',
  '--color-state-info',
  '--color-state-info-bg',
  '--color-state-info-border',
];

test('tokens.ts: SEMANTIC tem todas as chaves esperadas', () => {
  assert.ok(TOKENS.semantic.bg.base, 'bg.base ausente');
  assert.ok(TOKENS.semantic.accent.gold.fg, 'accent.gold.fg ausente');
  assert.ok(TOKENS.semantic.state.error.bg, 'state.error.bg ausente');
});

test('globals.css declara todas as variáveis esperadas em @theme inline', () => {
  for (const varName of expectedVars) {
    assert.ok(
      css.includes(varName),
      `globals.css não declara ${varName} — adicione no @theme inline`,
    );
  }
});

test('globals.css valor de --color-accent-gold é #d4af37 (igual ao TOKENS)', () => {
  const match = css.match(/--color-accent-gold:\s*([^;]+);/);
  assert.ok(match, '--color-accent-gold não encontrado');
  assert.equal(match![1].trim(), TOKENS.semantic.accent.gold.fg);
});
