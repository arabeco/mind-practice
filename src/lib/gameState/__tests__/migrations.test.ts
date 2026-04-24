import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../migrations';
import { v1ToV2 } from '../migrations/v1-to-v2';
import { v2ToV3 } from '../migrations/v2-to-v3';
import { CURRENT_SCHEMA_VERSION } from '../schema';

test('v1 → v2: userStats vira calibration', () => {
  const v1 = {
    userStats: { vigor: 1.2, harmonia: 0.5, filtro: 0, presenca: 0.3, desapego: 0 },
    completedDecks: { basic_01: '2026-01-01T00:00:00Z' },
    lastTrainingDate: '2026-01-01',
  };
  const v2 = v1ToV2(v1) as any;
  assert.ok(v2.calibration, 'calibration criado');
  assert.deepEqual(v2.calibration.axes, v1.userStats);
  assert.equal(v2.calibration.totalResponses, 10); // 1 deck * 10
  assert.ok(!('userStats' in v2));
  assert.equal(v2.completedDecks.basic_01, '2026-01-01T00:00:00Z');
});

test('v1 → v2: sem userStats retorna input inalterado', () => {
  const already = { calibration: { axes: {}, totalResponses: 0, recentWeights: {}, toneHistory: [], snapshots: [] } };
  assert.deepEqual(v1ToV2(already), already);
});

test('v2 → v3: adiciona schemaVersion=3, updatedAt, devicePersistedAt', () => {
  const v2 = { calibration: { axes: {}, totalResponses: 5 }, wallet: { fichas: 100 } };
  const v3 = v2ToV3(v2) as any;
  assert.equal(v3.schemaVersion, 3);
  assert.ok(typeof v3.updatedAt === 'string');
  assert.equal(v3.devicePersistedAt, null);
  assert.equal(v3.wallet.fichas, 100); // preservado
});

test('runMigrations encadeia v1 → v3', () => {
  const v1 = { userStats: { vigor: 1, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 }, completedDecks: {} };
  const result = runMigrations(v1, 1) as any;
  assert.equal(result.schemaVersion, 3);
  assert.ok(result.calibration);
  assert.deepEqual(result.calibration.axes, v1.userStats);
});

test('runMigrations throw quando versão > atual', () => {
  assert.throws(
    () => runMigrations({}, CURRENT_SCHEMA_VERSION + 1),
    /VersionTooNewError|newer than client/,
  );
});

test('runMigrations no-op quando já na versão atual', () => {
  const v3 = { schemaVersion: 3, wallet: { fichas: 50 } };
  const result = runMigrations(v3, 3) as any;
  assert.deepEqual(result, v3);
});
