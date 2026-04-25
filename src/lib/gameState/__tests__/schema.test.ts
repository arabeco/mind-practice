import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameStateSchema, CURRENT_SCHEMA_VERSION } from '../schema';
import { INITIAL_STATE } from '../defaults';

test('CURRENT_SCHEMA_VERSION é 4', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 4);
});

test('INITIAL_STATE passa no schema', () => {
  const result = GameStateSchema.safeParse({
    ...INITIAL_STATE,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  });
  assert.equal(result.success, true);
});

test('campos ausentes ganham defaults', () => {
  const minimal = { schemaVersion: 4 };
  const r = GameStateSchema.safeParse(minimal);
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.deepEqual(r.data.wallet.fichas, 20);
  assert.deepEqual(r.data.completedDecks, {});
  assert.equal(r.data.streak, 0);
  assert.equal(r.data.devicePersistedAt, null);
});

test('campos desconhecidos são stripados', () => {
  const r = GameStateSchema.safeParse({ schemaVersion: 4, xyz_lixo: 'oi' });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.ok(!('xyz_lixo' in r.data));
});

test('runsPaidToday tipagem numerica respeitada', () => {
  const r = GameStateSchema.safeParse({
    schemaVersion: 4,
    wallet: { fichas: 100, lastDailyClaim: null, totalEarned: 100, totalSpent: 0, runsPaidToday: 3, runsPaidDate: '2026-04-24' },
  });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.wallet.runsPaidToday, 3);
  assert.equal(r.data.wallet.runsPaidDate, '2026-04-24');
});

test('plusSubscription default é inactive', () => {
  const r = GameStateSchema.safeParse({ schemaVersion: 4 });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.plusSubscription.active, false);
  assert.equal(r.data.plusSubscription.expiresAt, null);
});
