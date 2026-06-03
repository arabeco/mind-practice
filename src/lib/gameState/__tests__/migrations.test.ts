import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../migrations';
import { v1ToV2 } from '../migrations/v1-to-v2';
import { v2ToV3 } from '../migrations/v2-to-v3';
import { v3ToV4 } from '../migrations/v3-to-v4';
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
  const out = v2ToV3(v2) as any;
  assert.equal(out.schemaVersion, 3);
  assert.ok(typeof out.updatedAt === 'string');
  assert.equal(out.devicePersistedAt, null);
  assert.equal(out.wallet.fichas, 100); // preservado
});

test('runMigrations encadeia v1 → v5 (calibration descartada na bayes step)', () => {
  const v1 = { userStats: { vigor: 1, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 }, completedDecks: {} };
  const result = runMigrations(v1, 1) as any;
  assert.equal(result.schemaVersion, 5);
  // v3→v4 wipes calibration — defaults reapply on normalize.
  assert.equal(result.calibration, undefined);
  // v4→v5 adiciona os campos de daily login + achievements.
  assert.equal(result.dailyLoginClaimedAt, null);
  assert.equal(result.loginStreak, 0);
  assert.deepEqual(result.achievements, {});
});

test('v3 → v4: wipe calibration, preserva wallet/streak/decks', () => {
  const v3 = {
    schemaVersion: 3,
    calibration: { axes: { vigor: 5, harmonia: -3, filtro: 0, presenca: 1, desapego: 0 }, totalResponses: 50 },
    wallet: { fichas: 200 },
    streak: 7,
    completedDecks: { basic_01: '2026-01-01T00:00:00Z' },
  };
  const v4 = v3ToV4(v3) as any;
  assert.equal(v4.schemaVersion, 4);
  assert.equal(v4.calibration, undefined);
  assert.equal(v4.wallet.fichas, 200);
  assert.equal(v4.streak, 7);
  assert.equal(v4.completedDecks.basic_01, '2026-01-01T00:00:00Z');
});

test('runMigrations throw quando versão > atual', () => {
  assert.throws(
    () => runMigrations({}, CURRENT_SCHEMA_VERSION + 1),
    /VersionTooNewError|newer than client/,
  );
});

test('runMigrations no-op quando já na versão atual', () => {
  const v5 = { schemaVersion: CURRENT_SCHEMA_VERSION, wallet: { fichas: 50 } };
  const result = runMigrations(v5, CURRENT_SCHEMA_VERSION) as any;
  assert.deepEqual(result, v5);
});
