import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerLevel } from '../playerLevel';
import { createPriorProfile } from '@/lib/bayesEngine';

test('prior uniforme + 0 respostas → nivel 1 (descobrindo, capped)', () => {
  const info = getPlayerLevel(createPriorProfile(), 0);
  assert.equal(info.level, 1);
  assert.equal(info.archetypeMode, 'discovering');
  assert.equal(info.tier, 'descobrindo');
});

test('prior + muitas respostas mas sem belief → cap por discovering (max 4)', () => {
  const info = getPlayerLevel(createPriorProfile(), 200);
  // precision 100, consistency 0 → score 55 → rawLevel 6, capped a 4.
  assert.ok(info.level <= 4, `esperado ≤4, got ${info.level}`);
  assert.equal(info.archetypeMode, 'discovering');
});

test('belief concentrado + 200 respostas → nivel alto', () => {
  // Profile peaked em todos os eixos = consistency ~1, precision 100.
  const peaked = createPriorProfile();
  for (const k of ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'] as const) {
    peaked[k].bins = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0];
    peaked[k].observations = 100;
  }
  const info = getPlayerLevel(peaked, 200);
  assert.ok(info.level >= 9, `esperado >=9 (firm + alta consistencia), got ${info.level}`);
  assert.equal(info.archetypeMode, 'firm');
});

test('score reflete media ponderada precision + consistency', () => {
  const info = getPlayerLevel(createPriorProfile(), 100);
  // precision 50, consistency 0 → score = 27.5 → 28 arredondado.
  assert.ok(info.score >= 25 && info.score <= 30, `score ${info.score} fora da faixa esperada`);
});
