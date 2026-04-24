import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeGameState } from '../normalize';
import { VersionTooNewError } from '../schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', '__fixtures__');
const loadFixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf-8'));

test('v1 → v3: preserva wallet.fichas, completedDecks, lastTrainingDate', () => {
  const v1 = loadFixture('state-v1.json');
  const s = normalizeGameState(v1);
  assert.equal(s.schemaVersion, 3);
  assert.equal(s.wallet.fichas, 85);
  assert.equal(s.wallet.totalEarned, 120);
  assert.equal(Object.keys(s.completedDecks).length, 2);
  assert.equal(s.lastTrainingDate, '2026-01-08');
  assert.equal(s.calibration.axes.vigor, 1.8);
  assert.equal(s.calibration.axes.presenca, 1.2);
});

test('v2 → v3: preserva calibration integral + wallet.runsPaidToday', () => {
  const v2 = loadFixture('state-v2.json');
  const s = normalizeGameState(v2);
  assert.equal(s.schemaVersion, 3);
  assert.equal(s.calibration.totalResponses, 42);
  assert.equal(s.wallet.runsPaidToday, 2);
  assert.equal(s.wallet.runsPaidDate, '2026-02-01');
  assert.equal(s.streak, 3);
});

test('v3 → v3: passthrough, preserva updatedAt', () => {
  const v3 = loadFixture('state-v3.json');
  const s = normalizeGameState(v3);
  assert.equal(s.updatedAt, '2026-04-24T12:00:00.000Z');
  assert.equal(s.devicePersistedAt, '2026-04-24T11:59:58.000Z');
});

test('raw nulo retorna INITIAL_STATE', () => {
  const s = normalizeGameState(null);
  assert.equal(s.schemaVersion, 3);
  assert.equal(s.wallet.fichas, 20);
});

test('raw corrompido retorna INITIAL_STATE sem throw', () => {
  const s = normalizeGameState({ schemaVersion: 3, calibration: 'NOT_AN_OBJECT' });
  assert.equal(s.wallet.fichas, 20);
});

test('VersionTooNewError propaga (chamador decide)', () => {
  assert.throws(
    () => normalizeGameState({ schemaVersion: 99 }),
    (err: unknown) => err instanceof VersionTooNewError,
  );
});

test('campo desconhecido é stripado sem erro', () => {
  const s = normalizeGameState({ schemaVersion: 3, loot_de_alien: 42 }) as any;
  assert.ok(!('loot_de_alien' in s));
});
