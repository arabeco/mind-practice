import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SceneMetadata } from '@/types/game';
import { metadataMatches } from '../metadataMatches';

const BASE: SceneMetadata = {
  tensao: 3,
  ambiente: 'Profissional',
  relacao: 'Par',
  aposta: 'Status',
  pilar: 'ego',
};

test('when vazio casa qualquer metadata', () => {
  assert.equal(metadataMatches({}, BASE), true);
});

test('relacao exata casa', () => {
  assert.equal(metadataMatches({ relacao: 'Par' }, BASE), true);
});

test('relacao diferente nao casa', () => {
  assert.equal(metadataMatches({ relacao: 'Autoridade' }, BASE), false);
});

test('tensaoMin 3 casa tensao 3', () => {
  assert.equal(metadataMatches({ tensaoMin: 3 }, BASE), true);
});

test('tensaoMin 4 nao casa tensao 3', () => {
  assert.equal(metadataMatches({ tensaoMin: 4 }, BASE), false);
});

test('tensaoMax 3 casa tensao 3', () => {
  assert.equal(metadataMatches({ tensaoMax: 3 }, BASE), true);
});

test('tensaoMax 2 nao casa tensao 3', () => {
  assert.equal(metadataMatches({ tensaoMax: 2 }, BASE), false);
});

test('tensaoMin 3 + tensaoMax 4 casa tensao 3 e 4, nao 5', () => {
  assert.equal(metadataMatches({ tensaoMin: 3, tensaoMax: 4 }, { ...BASE, tensao: 4 }), true);
  assert.equal(metadataMatches({ tensaoMin: 3, tensaoMax: 4 }, { ...BASE, tensao: 5 }), false);
});

test('multiplas chaves sao AND: todas precisam casar', () => {
  assert.equal(
    metadataMatches({ relacao: 'Par', aposta: 'Status' }, BASE),
    true,
  );
  assert.equal(
    metadataMatches({ relacao: 'Par', aposta: 'Dinheiro' }, BASE),
    false,
  );
});
