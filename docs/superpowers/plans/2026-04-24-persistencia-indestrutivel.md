# Persistência Indestrutível — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a persistência append-only do MindPractice por um pipeline validado Zod + registry de migrations versionada + sync cloud com prompt de conflito, e splittar o `GameContext.tsx` de 928 LOC em módulos coesos.

**Architecture:** `src/lib/gameState/` vira o boundary único de persistência (schema, defaults, normalize, migrations, persistence local, sync cloud). `gameReducer` sai como função pura testável. Helpers de gameplay vão pra `src/lib/gameStats.ts`. `GameContext` só orquestra (hydrate → provide → subscribe → persist).

**Tech Stack:** TypeScript 5, Zod ^3, Next 16 client components, node:test + tsx (via `scripts/run-tests.mjs`), Supabase SSR, React 19 + framer-motion (modal).

**Spec:** `docs/superpowers/specs/2026-04-24-persistencia-indestrutivel-design.md`

---

## File Structure

```
Criados:
  src/lib/gameState/schema.ts
  src/lib/gameState/defaults.ts
  src/lib/gameState/normalize.ts
  src/lib/gameState/persistence.ts
  src/lib/gameState/sync.ts
  src/lib/gameState/migrations/index.ts
  src/lib/gameState/migrations/v1-to-v2.ts
  src/lib/gameState/migrations/v2-to-v3.ts
  src/lib/gameState/__fixtures__/state-v1.json
  src/lib/gameState/__fixtures__/state-v2.json
  src/lib/gameState/__fixtures__/state-v3.json
  src/lib/gameState/__tests__/schema.test.ts
  src/lib/gameState/__tests__/migrations.test.ts
  src/lib/gameState/__tests__/normalize.test.ts
  src/lib/gameState/__tests__/sync.test.ts
  src/lib/gameStats.ts
  src/context/gameReducer.ts
  src/context/__tests__/gameReducer.test.ts
  src/components/SyncConflictModal.tsx

Modificados:
  package.json                     (dep zod)
  src/context/GameContext.tsx      (928 → ~150 LOC)
  src/lib/runScoring.ts            (remove normalizeGameState)
  src/app/perfil/page.tsx          (import de getPrecisionLabel muda)
  src/lib/smokeTest.ts             (imports movidos se preciso)
  src/lib/supabase/sync.ts         (refactor minor pra expor mais info)
```

---

## Task 1: Adicionar dependência Zod

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar zod**

Run: `npm install zod@^3.23`
Expected: `added 1 package`. Sem erros de peer dep.

- [ ] **Step 2: Verificar import e tipo funcionam**

Criar teste smoke temporário em `src/lib/gameState/__tests__/smoke.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

test('zod importa e parse basico funciona', () => {
  const schema = z.object({ n: z.number() });
  const r = schema.parse({ n: 42 });
  assert.equal(r.n, 42);
});
```

Run: `npm test`
Expected: todos os testes passam (incluindo o novo).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/gameState/__tests__/smoke.test.ts
git commit -m "chore(deps): zod + smoke import test"
```

---

## Task 2: Defaults (`INITIAL_STATE`)

**Files:**
- Create: `src/lib/gameState/defaults.ts`

- [ ] **Step 1: Criar arquivo com INITIAL_STATE extraído de GameContext**

```ts
// src/lib/gameState/defaults.ts
import type { GameState } from '@/types/game';
import {
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
} from '@/types/game';

/** Calibração zerada — contrato: todos os eixos em 0, sem histórico. */
const INITIAL_CALIBRATION: GameState['calibration'] = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
};

/**
 * Estado inicial do jogo — única fonte de verdade.
 * Qualquer novo campo obrigatório em GameState precisa ser adicionado aqui.
 */
export const INITIAL_STATE: GameState = {
  calibration: INITIAL_CALIBRATION,
  wallet: { ...INITIAL_WALLET },
  activeDeck: null,
  activeRun: null,
  currentQuestion: 0,
  unlockedDecks: [],
  completedDecks: {},
  lastTrainingDate: null,
  streak: 0,
  lastPlayDate: null,
  campaigns: {},
  ownedDeckIds: [],
  plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
};
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gameState/defaults.ts
git commit -m "feat(gameState): INITIAL_STATE como fonte unica de verdade"
```

---

## Task 3: Schema Zod + CURRENT_SCHEMA_VERSION

**Files:**
- Create: `src/lib/gameState/schema.ts`
- Create: `src/lib/gameState/__tests__/schema.test.ts`

- [ ] **Step 1: Escrever testes do schema (failing)**

```ts
// src/lib/gameState/__tests__/schema.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameStateSchema, CURRENT_SCHEMA_VERSION } from '../schema';
import { INITIAL_STATE } from '../defaults';

test('CURRENT_SCHEMA_VERSION é 3', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 3);
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
  const minimal = { schemaVersion: 3 };
  const r = GameStateSchema.safeParse(minimal);
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.deepEqual(r.data.wallet.fichas, 20);
  assert.deepEqual(r.data.completedDecks, {});
  assert.equal(r.data.streak, 0);
  assert.equal(r.data.devicePersistedAt, null);
});

test('campos desconhecidos são stripados', () => {
  const r = GameStateSchema.safeParse({ schemaVersion: 3, xyz_lixo: 'oi' });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.ok(!('xyz_lixo' in r.data));
});

test('runsPaidToday tipagem numerica respeitada', () => {
  const r = GameStateSchema.safeParse({
    schemaVersion: 3,
    wallet: { fichas: 100, lastDailyClaim: null, totalEarned: 100, totalSpent: 0, runsPaidToday: 3, runsPaidDate: '2026-04-24' },
  });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.wallet.runsPaidToday, 3);
  assert.equal(r.data.wallet.runsPaidDate, '2026-04-24');
});

test('plusSubscription default é inactive', () => {
  const r = GameStateSchema.safeParse({ schemaVersion: 3 });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.plusSubscription.active, false);
  assert.equal(r.data.plusSubscription.expiresAt, null);
});
```

Run: `npm test`
Expected: FAIL (`Cannot find module '../schema'`).

- [ ] **Step 2: Implementar schema mínimo**

```ts
// src/lib/gameState/schema.ts
import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 3;

const WalletSchema = z.object({
  fichas: z.number().default(20),
  lastDailyClaim: z.string().nullable().default(null),
  totalEarned: z.number().default(20),
  totalSpent: z.number().default(0),
  runsPaidToday: z.number().int().min(0).default(0),
  runsPaidDate: z.string().nullable().default(null),
}).default({
  fichas: 20,
  lastDailyClaim: null,
  totalEarned: 20,
  totalSpent: 0,
  runsPaidToday: 0,
  runsPaidDate: null,
});

const PlusSubscriptionSchema = z.object({
  active: z.boolean().default(false),
  startedAt: z.string().nullable().default(null),
  expiresAt: z.string().nullable().default(null),
  lastPlusDailyClaim: z.string().nullable().default(null),
}).default({
  active: false,
  startedAt: null,
  expiresAt: null,
  lastPlusDailyClaim: null,
});

const StatRecordSchema = z.object({
  vigor: z.number().default(0),
  harmonia: z.number().default(0),
  filtro: z.number().default(0),
  presenca: z.number().default(0),
  desapego: z.number().default(0),
}).default({ vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 });

const StatArrayRecordSchema = z.object({
  vigor: z.array(z.number()).default([]),
  harmonia: z.array(z.number()).default([]),
  filtro: z.array(z.number()).default([]),
  presenca: z.array(z.number()).default([]),
  desapego: z.array(z.number()).default([]),
}).default({ vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] });

const CalibrationSchema = z.object({
  axes: StatRecordSchema,
  totalResponses: z.number().int().min(0).default(0),
  recentWeights: StatArrayRecordSchema,
  toneHistory: z.array(z.string()).default([]),
  snapshots: z.array(z.any()).default([]),
}).default({
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
});

/**
 * Schema persistido do GameState. Campos transientes (activeDeck, activeRun)
 * são intencionalmente omitidos — vivem só em memória.
 *
 * .strip() descarta silenciosamente campos desconhecidos (protege contra
 * lixo de versões anteriores ou futuras).
 */
export const GameStateSchema = z.object({
  schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
  updatedAt: z.string().default(() => new Date().toISOString()),
  devicePersistedAt: z.string().nullable().default(null),

  calibration: CalibrationSchema,
  wallet: WalletSchema,
  currentQuestion: z.number().int().default(0),
  unlockedDecks: z.array(z.string()).default([]),
  completedDecks: z.record(z.string(), z.string()).default({}),
  lastTrainingDate: z.string().nullable().default(null),
  streak: z.number().int().min(0).default(0),
  lastPlayDate: z.string().nullable().default(null),
  campaigns: z.record(z.string(), z.any()).default({}),
  ownedDeckIds: z.array(z.string()).default([]),
  plusSubscription: PlusSubscriptionSchema,
}).strip();

/** Tipo persistido — inclui schemaVersion + updatedAt + devicePersistedAt. */
export type PersistedGameState = z.infer<typeof GameStateSchema>;

export class VersionTooNewError extends Error {
  constructor(public fromVersion: number, public currentVersion: number) {
    super(`Save version ${fromVersion} is newer than client (${currentVersion}). Update the app.`);
    this.name = 'VersionTooNewError';
  }
}
```

Run: `npm test`
Expected: 6 novos testes passando.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gameState/schema.ts src/lib/gameState/__tests__/schema.test.ts
git commit -m "feat(gameState): Zod schema + CURRENT_SCHEMA_VERSION=3 + VersionTooNewError"
```

---

## Task 4: Migrations registry + v1→v2 + v2→v3

**Files:**
- Create: `src/lib/gameState/migrations/index.ts`
- Create: `src/lib/gameState/migrations/v1-to-v2.ts`
- Create: `src/lib/gameState/migrations/v2-to-v3.ts`
- Create: `src/lib/gameState/__tests__/migrations.test.ts`

- [ ] **Step 1: Escrever testes das migrations (failing)**

```ts
// src/lib/gameState/__tests__/migrations.test.ts
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
```

Run: `npm test`
Expected: FAIL (módulos não existem).

- [ ] **Step 2: Implementar v1-to-v2**

```ts
// src/lib/gameState/migrations/v1-to-v2.ts

/**
 * v1: tinha `userStats: Record<StatKey, number>` direto no raiz.
 * v2: virou `calibration: { axes, totalResponses, recentWeights, toneHistory, snapshots }`.
 *
 * Se o raw já tem `calibration` (não é v1), retorna inalterado.
 */
export function v1ToV2(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  if ('calibration' in r || !('userStats' in r)) return raw;

  const oldStats = r.userStats as Record<string, number>;
  const completedDecks = (r.completedDecks ?? {}) as Record<string, string>;
  const totalResponses = Object.keys(completedDecks).length * 10;

  const { userStats: _removed, ...rest } = r;
  return {
    ...rest,
    calibration: {
      axes: { ...oldStats },
      totalResponses,
      recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
      toneHistory: [],
      snapshots: [],
    },
  };
}
```

- [ ] **Step 3: Implementar v2-to-v3**

```ts
// src/lib/gameState/migrations/v2-to-v3.ts

/**
 * v2 → v3: introduz schemaVersion, updatedAt e devicePersistedAt.
 * Nenhuma estrutura muda — só metadados novos ganham defaults.
 *
 * Esse bump marca o início do sync com conflict resolution.
 */
export function v2ToV3(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    schemaVersion: 3,
    updatedAt: (r.updatedAt as string) ?? new Date().toISOString(),
    devicePersistedAt: (r.devicePersistedAt as string) ?? null,
  };
}
```

- [ ] **Step 4: Implementar registry**

```ts
// src/lib/gameState/migrations/index.ts
import { CURRENT_SCHEMA_VERSION, VersionTooNewError } from '../schema';
import { v1ToV2 } from './v1-to-v2';
import { v2ToV3 } from './v2-to-v3';

export type Migration = (raw: unknown) => unknown;

/**
 * Registry de migrations. Key = versão DE ORIGEM, value = função que transforma
 * pra versão DE ORIGEM + 1. Adicione aqui quando bumpar CURRENT_SCHEMA_VERSION.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
};

/**
 * Roda migrations em cadeia de `fromVersion` até `CURRENT_SCHEMA_VERSION`.
 * No-op se fromVersion === CURRENT. Throw se fromVersion > CURRENT ou falta step.
 */
export function runMigrations(raw: unknown, fromVersion: number): unknown {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new VersionTooNewError(fromVersion, CURRENT_SCHEMA_VERSION);
  }
  let current = raw;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`Missing migration v${v} → v${v + 1}`);
    current = migrate(current);
  }
  return current;
}
```

Run: `npm test`
Expected: 6 novos testes de migrations passando.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameState/migrations/ src/lib/gameState/__tests__/migrations.test.ts
git commit -m "feat(gameState): migrations registry + v1-to-v2 + v2-to-v3"
```

---

## Task 5: Fixtures de snapshots reais

**Files:**
- Create: `src/lib/gameState/__fixtures__/state-v1.json`
- Create: `src/lib/gameState/__fixtures__/state-v2.json`
- Create: `src/lib/gameState/__fixtures__/state-v3.json`

- [ ] **Step 1: Criar state-v1.json (legacy userStats, sem calibration nem schemaVersion)**

```json
{
  "userStats": {
    "vigor": 1.8,
    "harmonia": 0.4,
    "filtro": -0.3,
    "presenca": 1.2,
    "desapego": 0.1
  },
  "completedDecks": {
    "basic_01": "2026-01-05T10:00:00.000Z",
    "alta_tensao": "2026-01-08T18:30:00.000Z"
  },
  "lastTrainingDate": "2026-01-08",
  "wallet": {
    "fichas": 85,
    "lastDailyClaim": "2026-01-08",
    "totalEarned": 120,
    "totalSpent": 35
  }
}
```

- [ ] **Step 2: Criar state-v2.json (calibration presente, sem schemaVersion)**

```json
{
  "calibration": {
    "axes": {
      "vigor": 2.1,
      "harmonia": 0.6,
      "filtro": -0.2,
      "presenca": 1.4,
      "desapego": 0.3
    },
    "totalResponses": 42,
    "recentWeights": {
      "vigor": [3, 2, 1],
      "harmonia": [0, -1, 0],
      "filtro": [0, 0, 0],
      "presenca": [1, 2, 1],
      "desapego": [0, 0, 0]
    },
    "toneHistory": ["pragmatico", "provocativo", "neutro"],
    "snapshots": []
  },
  "wallet": {
    "fichas": 150,
    "lastDailyClaim": "2026-02-01",
    "totalEarned": 220,
    "totalSpent": 70,
    "runsPaidToday": 2,
    "runsPaidDate": "2026-02-01"
  },
  "currentQuestion": 0,
  "unlockedDecks": ["basic_01", "alta_tensao", "profissional"],
  "completedDecks": {
    "basic_01": "2026-01-05T10:00:00.000Z",
    "alta_tensao": "2026-01-08T18:30:00.000Z"
  },
  "lastTrainingDate": "2026-02-01",
  "streak": 3,
  "lastPlayDate": "2026-02-01",
  "campaigns": {},
  "ownedDeckIds": [],
  "plusSubscription": {
    "active": false,
    "startedAt": null,
    "expiresAt": null,
    "lastPlusDailyClaim": null
  }
}
```

- [ ] **Step 3: Criar state-v3.json (versão atual com metadados)**

```json
{
  "schemaVersion": 3,
  "updatedAt": "2026-04-24T12:00:00.000Z",
  "devicePersistedAt": "2026-04-24T11:59:58.000Z",
  "calibration": {
    "axes": {
      "vigor": 2.1,
      "harmonia": 0.6,
      "filtro": -0.2,
      "presenca": 1.4,
      "desapego": 0.3
    },
    "totalResponses": 42,
    "recentWeights": {
      "vigor": [3, 2, 1],
      "harmonia": [0, -1, 0],
      "filtro": [0, 0, 0],
      "presenca": [1, 2, 1],
      "desapego": [0, 0, 0]
    },
    "toneHistory": ["pragmatico", "provocativo", "neutro"],
    "snapshots": []
  },
  "wallet": {
    "fichas": 150,
    "lastDailyClaim": "2026-04-24",
    "totalEarned": 220,
    "totalSpent": 70,
    "runsPaidToday": 2,
    "runsPaidDate": "2026-04-24"
  },
  "currentQuestion": 0,
  "unlockedDecks": ["basic_01", "alta_tensao", "profissional"],
  "completedDecks": {
    "basic_01": "2026-01-05T10:00:00.000Z",
    "alta_tensao": "2026-01-08T18:30:00.000Z"
  },
  "lastTrainingDate": "2026-04-24",
  "streak": 3,
  "lastPlayDate": "2026-04-24",
  "campaigns": {},
  "ownedDeckIds": [],
  "plusSubscription": {
    "active": false,
    "startedAt": null,
    "expiresAt": null,
    "lastPlusDailyClaim": null
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/gameState/__fixtures__/
git commit -m "test(gameState): fixtures v1/v2/v3 com dados realistas"
```

---

## Task 6: normalize.ts (migrations + Zod + fallback)

**Files:**
- Create: `src/lib/gameState/normalize.ts`
- Create: `src/lib/gameState/__tests__/normalize.test.ts`

- [ ] **Step 1: Escrever testes (failing)**

```ts
// src/lib/gameState/__tests__/normalize.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeGameState } from '../normalize';
import { VersionTooNewError } from '../schema';

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
  // userStats vira calibration.axes
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
```

Run: `npm test`
Expected: FAIL (`Cannot find module '../normalize'`).

- [ ] **Step 2: Implementar normalize.ts**

```ts
// src/lib/gameState/normalize.ts
import { GameStateSchema, VersionTooNewError, type PersistedGameState } from './schema';
import { runMigrations } from './migrations';
import { INITIAL_STATE } from './defaults';

const CORRUPTED_KEY = 'mindpractice_state_corrupted';

function snapshotCorrupted(raw: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CORRUPTED_KEY,
      JSON.stringify({ at: new Date().toISOString(), raw }),
    );
  } catch {
    /* ignore — storage pode estar cheio ou bloqueado */
  }
}

/**
 * Boundary único de entrada de dados no sistema.
 *
 * 1. Raw não-objeto → INITIAL_STATE.
 * 2. Descobre versão (schemaVersion ?? 1).
 * 3. Roda migrations encadeadas até CURRENT_SCHEMA_VERSION.
 *    - VersionTooNewError → propaga (chamador mostra UI "atualize o app").
 * 4. Zod safeParse. Falhou → snapshot corrupted + INITIAL_STATE.
 *
 * Nunca crash. O único erro que sobe é VersionTooNewError.
 */
export function normalizeGameState(raw: unknown): PersistedGameState {
  if (!raw || typeof raw !== 'object') {
    return buildInitial();
  }
  const version = typeof (raw as any).schemaVersion === 'number'
    ? (raw as any).schemaVersion
    : 1;

  let migrated: unknown;
  try {
    migrated = runMigrations(raw, version);
  } catch (err) {
    if (err instanceof VersionTooNewError) throw err;
    console.error('[gameState] migration failed', err);
    snapshotCorrupted(raw);
    return buildInitial();
  }

  const parsed = GameStateSchema.safeParse(migrated);
  if (!parsed.success) {
    console.error('[gameState] schema parse failed', parsed.error);
    snapshotCorrupted(raw);
    return buildInitial();
  }
  return parsed.data;
}

function buildInitial(): PersistedGameState {
  // INITIAL_STATE é GameState (sem schemaVersion/updatedAt). Parse injeta defaults.
  const r = GameStateSchema.safeParse(INITIAL_STATE);
  if (!r.success) throw new Error('INITIAL_STATE invalido — bug de schema');
  return r.data;
}
```

Run: `npm test`
Expected: 7 testes de normalize passando.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gameState/normalize.ts src/lib/gameState/__tests__/normalize.test.ts
git commit -m "feat(gameState): normalize — migrations + Zod + snapshot corrupted"
```

---

## Task 7: persistence.ts (localStorage)

**Files:**
- Create: `src/lib/gameState/persistence.ts`

- [ ] **Step 1: Implementar persistence**

```ts
// src/lib/gameState/persistence.ts
import type { PersistedGameState } from './schema';

export const STORAGE_KEY = 'mindpractice_state';

/**
 * Lê o blob do localStorage. SSR-safe (retorna null no servidor).
 * Nunca throw — JSON inválido ou absence vira null.
 */
export function loadLocal(): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Escreve o state. SSR-safe. Swallow de erros de quota.
 * O chamador deve ter validado com GameStateSchema antes.
 */
export function saveLocal(state: PersistedGameState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota cheia ou storage bloqueado — silencia */
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gameState/persistence.ts
git commit -m "feat(gameState): persistence.ts — localStorage SSR-safe"
```

---

## Task 8: sync.ts com decideHydrate + conflict matrix

**Files:**
- Create: `src/lib/gameState/sync.ts`
- Create: `src/lib/gameState/__tests__/sync.test.ts`

- [ ] **Step 1: Escrever testes da conflict matrix (failing)**

```ts
// src/lib/gameState/__tests__/sync.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHydrate } from '../sync';
import type { PersistedGameState } from '../schema';

const stateAt = (updatedAt: string, devicePersistedAt: string | null = null): PersistedGameState => ({
  schemaVersion: 3,
  updatedAt,
  devicePersistedAt,
  calibration: { axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 }, totalResponses: 0, recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] }, toneHistory: [], snapshots: [] },
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
```

Run: `npm test`
Expected: FAIL.

- [ ] **Step 2: Implementar sync.ts**

```ts
// src/lib/gameState/sync.ts
import { getSupabase } from '@/lib/supabase/client';
import type { PersistedGameState } from './schema';

export type HydrateDecision =
  | { kind: 'initial' }
  | { kind: 'use-local'; local: PersistedGameState }
  | { kind: 'use-cloud'; cloud: PersistedGameState }
  | { kind: 'conflict'; local: PersistedGameState; cloud: PersistedGameState };

/**
 * Decide qual snapshot usar no hydrate.
 *
 * Regras (ordem):
 *   a) nenhum    → initial
 *   b) só local  → use-local
 *   c) só cloud  → use-cloud
 *   d) ambos:
 *      .1 updatedAt iguais                → use-local
 *      .2 cloud newer, local "limpo"      → use-cloud
 *          ("limpo" = updatedAt ≤ devicePersistedAt, ou seja, o último estado
 *           persistido no cloud já inclui todas as mudanças locais)
 *      .3 cloud newer, local "sujo"       → conflict
 *          (inclui devicePersistedAt=null por segurança)
 *      .4 local newer que cloud           → use-local
 */
export function decideHydrate(
  local: PersistedGameState | null,
  cloud: PersistedGameState | null,
): HydrateDecision {
  if (!local && !cloud) return { kind: 'initial' };
  if (!cloud) return { kind: 'use-local', local: local! };
  if (!local) return { kind: 'use-cloud', cloud };

  if (local.updatedAt === cloud.updatedAt) {
    return { kind: 'use-local', local };
  }

  const cloudIsNewer = cloud.updatedAt > local.updatedAt;
  if (!cloudIsNewer) return { kind: 'use-local', local };

  // cloud newer — checa se local está limpo
  const localIsClean =
    local.devicePersistedAt !== null &&
    local.updatedAt <= local.devicePersistedAt;
  if (localIsClean) return { kind: 'use-cloud', cloud };
  return { kind: 'conflict', local, cloud };
}

/**
 * Carrega o state do cloud. Retorna unknown (não validado ainda — normalize cuida).
 * null se Supabase não configurado, não logado, ou sem row.
 */
export async function loadCloud(): Promise<unknown | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('game_state')
    .select('state_json')
    .eq('user_id', user.id)
    .single();
  if (error || !data) return null;

  const raw = (data as { state_json: unknown }).state_json;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

/**
 * Salva state no cloud. state.devicePersistedAt deve ser atualizado no caller
 * APÓS resolução da promise (no sucesso). Silent se não logado/configurado.
 *
 * Retorna true se subiu, false se skip/falha.
 */
export async function saveCloud(state: PersistedGameState): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { error } = await sb.from('game_state').upsert({
    user_id: user.id,
    state_json: state as unknown as Record<string, unknown>,
  });
  return !error;
}
```

Run: `npm test`
Expected: 8 testes de sync passando.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gameState/sync.ts src/lib/gameState/__tests__/sync.test.ts
git commit -m "feat(gameState): sync.ts — decideHydrate + 8 casos da conflict matrix"
```

---

## Task 9: gameStats.ts (extrair helpers de GameContext)

**Files:**
- Create: `src/lib/gameStats.ts`
- Modify: `src/context/GameContext.tsx` (remove as funções extraídas, re-exporta)
- Modify: `src/app/perfil/page.tsx` (se precisar ajustar import — usar Grep pra confirmar)

- [ ] **Step 1: Criar gameStats.ts com todos os helpers extraídos**

```ts
// src/lib/gameStats.ts
import type {
  CalibrationState,
  Deck,
  GameState,
  StatKey,
  Tone,
  AnswerIntensity,
} from '@/types/game';
import { STAT_KEYS, INTENSITY_MULTIPLIERS } from '@/types/game';
import { timeFactor } from '@/lib/narrativeEngine';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';

const UNLOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CALIBRATION_WINDOW = 50;
const CONSISTENCY_WINDOW = 10;

const CALIBRAGEM_IDS = new Set([
  'basic_01',
  'alta_tensao',
  'profissional',
  'social',
  'espelho',
  'roda',
  'escolha',
]);
const CALIBRAGEM_COMPLETION_FICHAS = 5;

const INSTANT_UNLOCK_IDS = new Set<string>([
  'basic_01',
  'alta_tensao',
  'profissional',
  'social',
  'espelho',
  'roda',
  'escolha',
]);

/**
 * Aplica pesos à calibração com dampening por tensão, intensidade e tempo.
 */
export function applyDampenedWeights(
  cal: CalibrationState,
  weights: Partial<Record<StatKey, number>>,
  tone: Tone,
  tensao: number = 2,
  responseTimeMs?: number,
  intensity?: AnswerIntensity,
): CalibrationState {
  const divisor = Math.min(cal.totalResponses + 1, CALIBRATION_WINDOW);
  const tensionMultiplier = 0.5 + (tensao * 0.5);
  const intensityMult = intensity ? INTENSITY_MULTIPLIERS[intensity] : 1.0;
  const timeMult = timeFactor(responseTimeMs);
  const newAxes = { ...cal.axes };
  const newRecent = { ...cal.recentWeights };

  for (const key of STAT_KEYS) {
    const w = weights[key];
    if (w !== undefined) {
      const adjustedW = w * tensionMultiplier * intensityMult * timeMult;
      newAxes[key] = newAxes[key] + adjustedW / divisor;
      const arr = [...(newRecent[key] || []), w];
      if (arr.length > CONSISTENCY_WINDOW) arr.shift();
      newRecent[key] = arr;
    }
  }

  const newToneHistory = [...cal.toneHistory, tone];
  if (newToneHistory.length > CONSISTENCY_WINDOW) newToneHistory.shift();

  return {
    ...cal,
    axes: newAxes,
    totalResponses: cal.totalResponses + 1,
    recentWeights: newRecent,
    toneHistory: newToneHistory,
  };
}

/** Lista decks desbloqueados baseado nos completados, com cooldown de cenário. */
export function getUnlockedDecks(completedDecks: Record<string, string>): string[] {
  const unlocked: string[] = [];
  for (let i = 0; i < DECK_UNLOCK_ORDER.length; i++) {
    const deckId = DECK_UNLOCK_ORDER[i];
    if (i === 0) { unlocked.push(deckId); continue; }
    const prevId = DECK_UNLOCK_ORDER[i - 1];
    const prevAt = completedDecks[prevId];
    if (!prevAt) break;
    if (INSTANT_UNLOCK_IDS.has(deckId)) { unlocked.push(deckId); continue; }
    const elapsed = Date.now() - new Date(prevAt).getTime();
    if (elapsed >= UNLOCK_COOLDOWN_MS) unlocked.push(deckId);
  }
  return unlocked;
}

/** Regra de elegibilidade pra jogar um deck (posse, unlock, calibragem). */
export function isDeckPlayable(deck: Deck, state: GameState): boolean {
  if (state.ownedDeckIds.includes(deck.id)) return true;
  return state.unlockedDecks.includes(deck.id);
}

/** Precisão derivada do número total de respostas (0-100). */
export function getPrecision(totalResponses: number): number {
  return Math.min(100, Math.round((totalResponses / 50) * 100));
}

export function getPrecisionLabel(pct: number): { label: string; color: string } {
  if (pct < 30) return { label: 'Incipiente', color: '#9ca3af' };
  if (pct < 60) return { label: 'Moderada', color: '#fbbf24' };
  if (pct < 90) return { label: 'Alta', color: '#10b981' };
  return { label: 'Cristalina', color: '#d4af37' };
}

/** Consistência ∈ [0,1] da variabilidade recente dos pesos. */
export function getConsistency(recentWeights: Record<StatKey, number[]>): number {
  const vals: number[] = [];
  for (const k of STAT_KEYS) vals.push(...(recentWeights[k] ?? []));
  if (vals.length < 4) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return Math.max(0, 1 - variance / 4);
}

export function getConsistencyLabel(
  c: number,
): { label: string; icon: 'full' | 'half' | 'cracked' } {
  if (c >= 0.7) return { label: 'Coerente', icon: 'full' };
  if (c >= 0.4) return { label: 'Oscilante', icon: 'half' };
  return { label: 'Fragmentada', icon: 'cracked' };
}

export { CALIBRAGEM_IDS, CALIBRAGEM_COMPLETION_FICHAS, INSTANT_UNLOCK_IDS, UNLOCK_COOLDOWN_MS };
```

- [ ] **Step 2: Atualizar GameContext.tsx pra re-exportar do novo lugar**

Em `src/context/GameContext.tsx`, substituir as definições locais por re-exports. Adicionar no topo (depois dos imports):

```ts
export {
  applyDampenedWeights,
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getPrecisionLabel,
  getConsistency,
  getConsistencyLabel,
} from '@/lib/gameStats';
```

Remover da `GameContext.tsx`:
- `function applyDampenedWeights(...)` (linhas ~98-137)
- `export function getUnlockedDecks(...)` (linhas ~148-?)
- `export function isDeckPlayable(...)` (linha ~184)
- `const CALIBRAGEM_IDS`, `CALIBRAGEM_COMPLETION_FICHAS`, `INSTANT_UNLOCK_IDS`, `UNLOCK_COOLDOWN_MS` (mover pra gameStats — já feito)
- `export function getPrecision(...)`, `getPrecisionLabel(...)`, `getConsistency(...)`, `getConsistencyLabel(...)` (linhas ~655-693)

Manter no GameContext (ainda vão ser usados): imports de `applyDampenedWeights`, `isDeckPlayable`, `UNLOCK_COOLDOWN_MS`, `CALIBRAGEM_IDS`, `CALIBRAGEM_COMPLETION_FICHAS` do `gameStats`.

Adicionar import:
```ts
import {
  applyDampenedWeights,
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getConsistency,
  UNLOCK_COOLDOWN_MS,
  CALIBRAGEM_IDS,
  CALIBRAGEM_COMPLETION_FICHAS,
} from '@/lib/gameStats';
```

- [ ] **Step 3: Rodar tsc pra pegar callsites quebrados**

Run: `npx tsc --noEmit`
Expected: 0 errors. Se algum arquivo externo (ex: `src/app/perfil/page.tsx`) importa `getPrecisionLabel` de `@/context/GameContext`, o re-export do Step 2 cobre — manter.

- [ ] **Step 4: Rodar suite**

Run: `npm test && npm run deck:validate`
Expected: 22+ testes passando, validator 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameStats.ts src/context/GameContext.tsx
git commit -m "refactor(context): extrai helpers pra gameStats (re-export mantido)"
```

---

## Task 10: gameReducer.ts (reducer puro)

**Files:**
- Create: `src/context/gameReducer.ts`
- Modify: `src/context/GameContext.tsx` (importa reducer de fora)

- [ ] **Step 1: Criar gameReducer.ts**

Em `src/context/gameReducer.ts`, mover:
- Tipo `GameAction` (atual GameContext linhas 55-81)
- Função `gameReducer` (atual linhas 284-654 — é grande, mover íntegra)
- Imports necessários do `@/types/game`, `@/lib/narrativeEngine`, `@/lib/gameStats`, `@/data/archetypes`, `@/lib/runScoring`, `@/lib/sceneContext`, `@/data/decks/index`, `@/data/seasons`, `@/lib/season` — copiar exatamente os imports que o reducer usa hoje.

Exportar:
```ts
export type { GameAction };
export { gameReducer };
```

Exemplo de assinatura (mantém 100% do comportamento atual):
```ts
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_DECK': { /* ... corpo exato do atual ... */ }
    case 'ANSWER': { /* ... */ }
    // ... todos os 20+ cases ...
    default:
      return state;
  }
}
```

**Regra:** zero IO. Nenhum `fetch`, `localStorage`, `import('@/lib/supabase/...')`, `dispatch`, `useState`, etc. Só cálculo puro recebendo `state + action` e retornando `state'`.

- [ ] **Step 2: Atualizar GameContext.tsx**

Em `src/context/GameContext.tsx`:
- Remover `type GameAction = ...` (linhas 55-81).
- Remover `function gameReducer(...)` (linhas 284-654).
- Adicionar import:
  ```ts
  import { gameReducer, type GameAction } from './gameReducer';
  ```
- `useReducer(gameReducer, initialState)` continua igual.

- [ ] **Step 3: tsc + test**

Run: `npx tsc --noEmit && npm test`
Expected: 0 errors, 22+ testes passam.

- [ ] **Step 4: Build smoke**

Run: `npm run build`
Expected: sucesso, 10 rotas geradas.

- [ ] **Step 5: Commit**

```bash
git add src/context/gameReducer.ts src/context/GameContext.tsx
git commit -m "refactor(context): gameReducer extraido como funcao pura"
```

---

## Task 11: Testes do reducer puro

**Files:**
- Create: `src/context/__tests__/gameReducer.test.ts`

- [ ] **Step 1: Escrever suite de testes cobrindo actions críticas**

```ts
// src/context/__tests__/gameReducer.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, type GameAction } from '../gameReducer';
import { INITIAL_STATE } from '@/lib/gameState/defaults';
import type { GameState } from '@/types/game';

const freshState = (): GameState => ({
  ...INITIAL_STATE,
  calibration: { ...INITIAL_STATE.calibration },
  wallet: { ...INITIAL_STATE.wallet },
});

test('HYDRATE substitui state inteiro', () => {
  const s = freshState();
  const incoming: GameState = { ...s, streak: 42, wallet: { ...s.wallet, fichas: 999 } };
  const next = gameReducer(s, { type: 'HYDRATE', state: incoming });
  assert.equal(next.streak, 42);
  assert.equal(next.wallet.fichas, 999);
});

test('CLAIM_DAILY primeiro claim adiciona DAILY_FICHAS', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'CLAIM_DAILY' });
  assert.ok(next.wallet.fichas > s.wallet.fichas);
  assert.ok(next.wallet.lastDailyClaim !== null);
});

test('CLAIM_DAILY mesmo dia é no-op', () => {
  const s = freshState();
  const today = new Date().toISOString().split('T')[0];
  const already: GameState = {
    ...s,
    wallet: { ...s.wallet, lastDailyClaim: today },
  };
  const next = gameReducer(already, { type: 'CLAIM_DAILY' });
  assert.equal(next.wallet.fichas, already.wallet.fichas);
  assert.equal(next.wallet.lastDailyClaim, today);
});

test('SPEND_FICHAS com saldo insuficiente é no-op', () => {
  const s = freshState();
  const poor: GameState = { ...s, wallet: { ...s.wallet, fichas: 5 } };
  const next = gameReducer(poor, { type: 'SPEND_FICHAS', amount: 100, itemId: 'deck_x' });
  assert.equal(next.wallet.fichas, 5);
});

test('SPEND_FICHAS com saldo suficiente subtrai e adiciona em ownedDeckIds se for deck', () => {
  const s = freshState();
  const rich: GameState = { ...s, wallet: { ...s.wallet, fichas: 500 } };
  const next = gameReducer(rich, { type: 'SPEND_FICHAS', amount: 100, itemId: 'deck_premium' });
  assert.equal(next.wallet.fichas, 400);
  assert.equal(next.wallet.totalSpent, s.wallet.totalSpent + 100);
});

test('EARN_FICHAS adiciona ao saldo e totalEarned', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'EARN_FICHAS', amount: 30, reason: 'test' });
  assert.equal(next.wallet.fichas, s.wallet.fichas + 30);
  assert.equal(next.wallet.totalEarned, s.wallet.totalEarned + 30);
});

test('RESET_ALL volta pro initialState (preserva nada)', () => {
  const s: GameState = {
    ...freshState(),
    streak: 10,
    wallet: { ...INITIAL_STATE.wallet, fichas: 500, totalSpent: 200 },
    completedDecks: { basic_01: '2026-01-01' },
  };
  const next = gameReducer(s, { type: 'RESET_ALL' });
  assert.equal(next.streak, 0);
  assert.equal(next.wallet.fichas, INITIAL_STATE.wallet.fichas);
  assert.deepEqual(next.completedDecks, {});
});

test('acao desconhecida retorna state inalterado', () => {
  const s = freshState();
  const next = gameReducer(s, { type: 'XYZ_NAO_EXISTE' } as unknown as GameAction);
  assert.equal(next, s);
});
```

Run: `npm test`
Expected: 8 testes de reducer passando.

- [ ] **Step 2: Commit**

```bash
git add src/context/__tests__/gameReducer.test.ts
git commit -m "test(reducer): cobre HYDRATE, CLAIM_DAILY, SPEND, EARN, RESET"
```

---

## Task 12: SyncConflictModal component

**Files:**
- Create: `src/components/SyncConflictModal.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/SyncConflictModal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PersistedGameState } from '@/lib/gameState/schema';

export type ConflictChoice = 'use-cloud' | 'use-local' | 'cancel';

interface Props {
  open: boolean;
  local: PersistedGameState | null;
  cloud: PersistedGameState | null;
  onResolve: (choice: ConflictChoice) => void;
}

function summarize(s: PersistedGameState) {
  const dominant = (() => {
    const axes = s.calibration.axes;
    let maxKey = 'vigor';
    let maxVal = axes.vigor;
    for (const k of Object.keys(axes) as (keyof typeof axes)[]) {
      if (axes[k] > maxVal) { maxVal = axes[k]; maxKey = k; }
    }
    return maxKey;
  })();
  return {
    runs: s.calibration.totalResponses,
    decks: Object.keys(s.completedDecks).length,
    fichas: s.wallet.fichas,
    streak: s.streak,
    dominant,
    updatedAt: new Date(s.updatedAt).toLocaleString('pt-BR'),
  };
}

export default function SyncConflictModal({ open, local, cloud, onResolve }: Props) {
  if (!local || !cloud) return null;
  const L = summarize(local);
  const C = summarize(cloud);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-2">Conflito de save</h2>
            <p className="text-sm text-white/60 mb-4">
              Detectamos mudanças em dois dispositivos. Escolha qual manter:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">Este dispositivo</div>
                <div className="text-white text-sm space-y-0.5">
                  <div>{L.runs} runs · {L.decks} decks</div>
                  <div>{L.fichas} fichas · streak {L.streak}</div>
                  <div className="text-white/50 text-xs">Eixo: {L.dominant}</div>
                  <div className="text-white/50 text-xs">{L.updatedAt}</div>
                </div>
              </div>
              <div className="border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">Cloud</div>
                <div className="text-white text-sm space-y-0.5">
                  <div>{C.runs} runs · {C.decks} decks</div>
                  <div>{C.fichas} fichas · streak {C.streak}</div>
                  <div className="text-white/50 text-xs">Eixo: {C.dominant}</div>
                  <div className="text-white/50 text-xs">{C.updatedAt}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onResolve('use-cloud')}
                className="w-full py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm"
              >
                Usar cloud
              </button>
              <button
                onClick={() => onResolve('use-local')}
                className="w-full py-2 rounded-lg border border-white/20 text-white text-sm"
              >
                Usar este dispositivo (sobrescreve cloud)
              </button>
              <button
                onClick={() => onResolve('cancel')}
                className="w-full py-2 text-white/40 text-xs"
              >
                Decidir depois
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SyncConflictModal.tsx
git commit -m "feat(ui): SyncConflictModal — 3 botoes, diff resumido"
```

---

## Task 13: Reescrever GameContext.tsx usando novos módulos

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Substituir o bloco de hydrate + persist + sync**

No arquivo atual (linhas ~711-774, onde ficam o `GameProvider`, `useEffect` de hydrate, persist local, persist cloud), substituir por:

```tsx
// dentro de GameProvider
const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
const hydratedRef = useRef(false);
const [conflict, setConflict] = useState<{ local: PersistedGameState; cloud: PersistedGameState } | null>(null);

// Hydrate: local + cloud → decideHydrate → dispatch
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const rawLocal = loadLocal();
      const localParsed = rawLocal ? normalizeGameState(rawLocal) : null;

      let cloudParsed: PersistedGameState | null = null;
      try {
        const rawCloud = await loadCloud();
        if (rawCloud) cloudParsed = normalizeGameState(rawCloud);
      } catch (err) {
        if (err instanceof VersionTooNewError) {
          console.error('[gameState] cloud save newer than client — update app');
          // TODO(next phase): mostrar toast/modal dedicado. Por ora, ignora cloud.
        }
        cloudParsed = null;
      }

      if (cancelled) return;
      const decision = decideHydrate(localParsed, cloudParsed);

      switch (decision.kind) {
        case 'initial':
          dispatch({ type: 'HYDRATE', state: INITIAL_STATE });
          break;
        case 'use-local':
          dispatch({ type: 'HYDRATE', state: decision.local });
          break;
        case 'use-cloud':
          dispatch({ type: 'HYDRATE', state: decision.cloud });
          saveLocal(decision.cloud);
          break;
        case 'conflict':
          setConflict({ local: decision.local, cloud: decision.cloud });
          // Fallback imediato: usa local; modal pode sobrescrever depois.
          dispatch({ type: 'HYDRATE', state: decision.local });
          break;
      }
    } finally {
      hydratedRef.current = true;
    }
  })();
  return () => { cancelled = true; };
}, []);

// Touch updatedAt + persist local (debounce 500ms)
useEffect(() => {
  if (!hydratedRef.current) return;
  const timer = setTimeout(() => {
    const stamped: PersistedGameState = {
      ...(state as unknown as PersistedGameState),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      devicePersistedAt: (state as any).devicePersistedAt ?? null,
    };
    saveLocal(stamped);
  }, 500);
  return () => clearTimeout(timer);
}, [state]);

// Push cloud (debounce 2s, atualiza devicePersistedAt no sucesso)
useEffect(() => {
  if (!hydratedRef.current) return;
  const timer = setTimeout(async () => {
    const stamped: PersistedGameState = {
      ...(state as unknown as PersistedGameState),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: (state as any).updatedAt ?? new Date().toISOString(),
      devicePersistedAt: (state as any).devicePersistedAt ?? null,
    };
    const ok = await saveCloud(stamped);
    if (ok) {
      // atualiza devicePersistedAt no storage local (marca como "limpo")
      saveLocal({ ...stamped, devicePersistedAt: stamped.updatedAt });
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [state]);

const handleConflictResolve = useCallback((choice: ConflictChoice) => {
  if (!conflict) return;
  if (choice === 'use-cloud') {
    dispatch({ type: 'HYDRATE', state: conflict.cloud });
    saveLocal(conflict.cloud);
  } else if (choice === 'use-local') {
    // state local já está aplicado; próximo push cloud sobrescreve
  }
  setConflict(null);
}, [conflict]);
```

Adicionar imports necessários no topo:
```ts
import { useReducer, useEffect, useRef, useCallback, useState, useContext, createContext } from 'react';
import { gameReducer, type GameAction } from './gameReducer';
import { INITIAL_STATE } from '@/lib/gameState/defaults';
import { normalizeGameState } from '@/lib/gameState/normalize';
import { loadLocal, saveLocal } from '@/lib/gameState/persistence';
import { loadCloud, saveCloud, decideHydrate } from '@/lib/gameState/sync';
import { VersionTooNewError, CURRENT_SCHEMA_VERSION, type PersistedGameState } from '@/lib/gameState/schema';
import SyncConflictModal, { type ConflictChoice } from '@/components/SyncConflictModal';
```

Renderizar modal dentro do Provider:
```tsx
return (
  <GameContext.Provider value={{ /* ... mesmo value ... */ }}>
    {children}
    <SyncConflictModal
      open={conflict !== null}
      local={conflict?.local ?? null}
      cloud={conflict?.cloud ?? null}
      onResolve={handleConflictResolve}
    />
  </GameContext.Provider>
);
```

Remover:
- `const STORAGE_KEY` (já está em persistence.ts).
- `const initialState: GameState = { ... }` (substituir por import de `INITIAL_STATE`).
- `function migrateV1(...)` (substituído por migrations/).
- Bloco de social feed `useEffect` que detecta snapshots/arquétipo — **manter** (é ortogonal, não é persistência).

- [ ] **Step 2: tsc pega erros de type**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Build smoke**

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 4: Test suite**

Run: `npm test`
Expected: todos passam.

- [ ] **Step 5: Medir LOC — GameContext deve ter caído drasticamente**

Run: `wc -l src/context/GameContext.tsx`
Expected: ≤ 250 linhas (meta ≤ 150, aceitável até 250 por causa dos callbacks de value).

- [ ] **Step 6: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "refactor(context): GameContext usa gameState/ + modal de conflito"
```

---

## Task 14: Remover `normalizeGameState` duplicado de `runScoring.ts`

**Files:**
- Modify: `src/lib/runScoring.ts`

- [ ] **Step 1: Substituir função por re-export do novo lugar**

Em `src/lib/runScoring.ts`, trocar o bloco `export function normalizeGameState(...)` (linhas ~121-161) por:

```ts
// Re-export do boundary único de persistência. Mantido aqui por compatibilidade
// com chamadores externos (ex: smokeTest.ts) que importam deste caminho.
export { normalizeGameState } from '@/lib/gameState/normalize';
```

Remover também o import de `INITIAL_PLUS_SUBSCRIPTION` se ficar unused (tsc avisa).

- [ ] **Step 2: Confirmar que todos os chamadores continuam funcionando**

Run: `grep -rn "normalizeGameState" src/ --include="*.ts" --include="*.tsx"`
Expected: ver imports apontando pra `@/lib/runScoring` ou `@/lib/gameState/normalize` — ambos funcionam.

- [ ] **Step 3: tsc + test + build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tudo verde.

- [ ] **Step 4: Commit**

```bash
git add src/lib/runScoring.ts
git commit -m "refactor(runScoring): normalizeGameState vira re-export de gameState/"
```

---

## Task 15: Sanity final — smoke manual e métricas

**Files:**
- (nenhum; só validação)

- [ ] **Step 1: Sanity automatizado**

Run em paralelo mental: `npx tsc --noEmit && npm test && npm run deck:validate && npm run build`
Expected:
- tsc: 0 errors
- test: todos passando (orçamento: 30+ no total)
- deck:validate: 0 errors
- build: 10 rotas geradas

- [ ] **Step 2: Medir redução de LOC do GameContext**

Run: `wc -l src/context/GameContext.tsx src/context/gameReducer.ts src/lib/gameState/*.ts src/lib/gameStats.ts`
Expected: GameContext.tsx ≤ 250 LOC; reducer ≤ 450 LOC; arquivos de gameState cada um ≤ 200 LOC.

- [ ] **Step 3: Smoke manual no browser (dev server)**

Run: `npm run dev`
Abrir localhost:3000 e verificar:
1. App carrega sem erros no console.
2. Novo usuário (limpar `localStorage['mindpractice_state']`) → INITIAL_STATE aplicado.
3. Joga 1 deck até o fim → completedDecks persiste (refresh mantém).
4. Login Supabase → state sincroniza pra cloud em ~2s (inspect Network).
5. Em outra aba, logar com mesmo user, fazer ação diferente, refresh aba original → se dirty, modal de conflito aparece com diff.

Documentar falhas em um comentário no commit final; se crítico, abrir task de fix.

- [ ] **Step 4: Atualizar roadmap marcando Fase 3 fechada**

Em `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md`, na tabela mestre, marcar Fase 3 como ✅. Adicionar no fim do arquivo uma seção "Status" com commit SHA final.

- [ ] **Step 5: Commit final da fase**

```bash
git add docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md
git commit -m "docs: Fase 3 persistencia indestrutivel fechada"
```

---

## Checklist do GATE da Fase 3

Antes de declarar "Nível 6 batido", confirmar:

- [ ] `src/context/GameContext.tsx` ≤ 250 LOC (meta 150).
- [ ] Nenhum `as GameState` cast direto fora do schema Zod.
- [ ] Fixtures v1/v2/v3 carregam corretamente em `npm test`.
- [ ] Matrix de 8 casos de sync testada (a, b, c, d.1, d.2, d.3, d.4, local-sem-devicePersistedAt).
- [ ] Reducer testado isolado (≥ 8 testes).
- [ ] `npm test`, `npm run build`, `npx tsc --noEmit`, `npm run deck:validate` — todos verdes.
- [ ] Smoke manual em 2 abas passou (conflict modal aparece quando esperado).
- [ ] Roadmap atualizado, commit de fechamento no main.
