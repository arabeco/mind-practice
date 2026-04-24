import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Option, SceneMetadata } from '@/types/game';
import { resolveWeights } from '../resolveWeights';

const META: SceneMetadata = {
  tensao: 4,
  ambiente: 'Profissional',
  relacao: 'Autoridade',
  aposta: 'Status',
  pilar: 'ego',
};

test('legacy option (só weights) → finalWeights = weights, applied vazio', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'neutro',
    weights: { vigor: 3, harmonia: -1 },
    feedback: 'f',
  };
  const { finalWeights, breakdown } = resolveWeights(option, META);
  assert.deepEqual(finalWeights, { vigor: 3, harmonia: -1 });
  assert.deepEqual(breakdown.applied, []);
});

test('intent + baseWeights aplica modifiers que casam', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'pragmatico',
    intent: 'confronto_publico',
    baseWeights: { vigor: 2 },
    feedback: 'f',
  };
  const { finalWeights, breakdown } = resolveWeights(option, META);
  assert.deepEqual(finalWeights, { vigor: 4, filtro: -1 });
  assert.equal(breakdown.applied.length, 2);
});

test('multiplas rules mesmo eixo somam', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'evasivo',
    intent: 'retirada',
    baseWeights: { desapego: 1 },
    feedback: 'f',
  };
  const { finalWeights } = resolveWeights(option, META);
  assert.deepEqual(finalWeights, { desapego: 2, vigor: -1, presenca: -1 });
});

test('intent sem rule que casa → retorna baseWeights sem delta', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'provocativo',
    intent: 'provocacao',
    baseWeights: { vigor: 2, filtro: -1 },
    feedback: 'f',
  };
  const peerMeta: SceneMetadata = { ...META, relacao: 'Par' };
  const { finalWeights, breakdown } = resolveWeights(option, peerMeta);
  assert.deepEqual(finalWeights, { vigor: 2, filtro: -1 });
  assert.deepEqual(breakdown.applied, []);
});

test('intent presente sem baseWeights → finalWeights vazio (defensive)', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'pragmatico',
    intent: 'confronto_publico',
    feedback: 'f',
  };
  const { finalWeights } = resolveWeights(option, META);
  assert.deepEqual(finalWeights, {});
});

test('timeFactor reportado no breakdown, sem afetar finalWeights', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'neutro',
    weights: { vigor: 2 },
    feedback: 'f',
  };
  const { finalWeights, breakdown } = resolveWeights(option, META, 9000);
  assert.deepEqual(finalWeights, { vigor: 2 });
  assert.equal(Math.round(breakdown.timeFactor * 100) / 100, 0.65);
});
