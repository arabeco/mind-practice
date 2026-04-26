import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHydrate } from '../sync';
import type { PersistedGameState } from '../schema';

const stateAt = (updatedAt: string, devicePersistedAt: string | null = null): PersistedGameState => ({
  schemaVersion: 3,
  updatedAt,
  devicePersistedAt,
  calibration: { totalResponses: 0, toneHistory: [], snapshots: [] },
  wallet: { fichas: 20, lastDailyClaim: null, totalEarned: 20, totalSpent: 0, runsPaidToday: 0, runsPaidDate: null },
  currentQuestion: 0,
  unlockedDecks: [],
  completedDecks: {},
  lastTrainingDate: null,
  streak: 0,
  lastPlayDate: null,
  campaigns: {},
  ownedDeckIds: [],
  plusSubscription: { active: false, startedAt: null, expiresAt: null, lastPlusDailyClaim: null },
  lastSeenLevel: 1,
  firstFirmArchetypeSeenAt: null,
});

test('a) sem local sem cloud → initial', () => {
  assert.equal(decideHydrate(null, null).kind, 'initial');
});

test('b) só local → use-local', () => {
  const local = stateAt('2026-04-24T12:00:00.000Z');
  const r = decideHydrate(local, null);
  assert.equal(r.kind, 'use-local');
  if (r.kind === 'use-local') assert.equal(r.local.updatedAt, local.updatedAt);
});

test('c) só cloud → use-cloud', () => {
  const cloud = stateAt('2026-04-24T12:00:00.000Z');
  const r = decideHydrate(null, cloud);
  assert.equal(r.kind, 'use-cloud');
});

test('d.1) local.updatedAt === cloud.updatedAt → use-local', () => {
  const ts = '2026-04-24T12:00:00.000Z';
  const r = decideHydrate(stateAt(ts, ts), stateAt(ts));
  assert.equal(r.kind, 'use-local');
});

test('d.2) cloud newer, local limpo (updatedAt <= devicePersistedAt) → use-cloud', () => {
  const local = stateAt('2026-04-24T12:00:00.000Z', '2026-04-24T12:00:00.000Z');
  const cloud = stateAt('2026-04-24T13:00:00.000Z');
  assert.equal(decideHydrate(local, cloud).kind, 'use-cloud');
});

test('d.3) cloud newer, local dirty (updatedAt > devicePersistedAt) → conflict', () => {
  const local = stateAt('2026-04-24T12:30:00.000Z', '2026-04-24T12:00:00.000Z');
  const cloud = stateAt('2026-04-24T13:00:00.000Z');
  const r = decideHydrate(local, cloud);
  assert.equal(r.kind, 'conflict');
});

test('d.4) local newer que cloud → use-local', () => {
  const local = stateAt('2026-04-24T14:00:00.000Z');
  const cloud = stateAt('2026-04-24T13:00:00.000Z');
  assert.equal(decideHydrate(local, cloud).kind, 'use-local');
});

test('local sem devicePersistedAt + cloud newer → conflict (safe default)', () => {
  const local = stateAt('2026-04-24T12:00:00.000Z', null);
  const cloud = stateAt('2026-04-24T13:00:00.000Z');
  assert.equal(decideHydrate(local, cloud).kind, 'conflict');
});
