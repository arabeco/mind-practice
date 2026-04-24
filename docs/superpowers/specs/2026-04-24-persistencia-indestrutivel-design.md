# Fase 3 — Persistência Indestrutível (Design)

**Data:** 2026-04-24
**Status:** Design aprovado, aguardando plan
**Nível:** 5 → 6 (Persistência)
**Pré-requisito de:** F4 (Bayes em produção), F6 (Social realtime), F7 (Paywall) — sem esse gate, cobrar dinheiro = perder usuário.

---

## Problema

`src/context/GameContext.tsx` tem 928 linhas misturando reducer, hydrate, persistência local, sync cloud, helpers de precisão e constantes de gameplay. Consequências observadas em produção:

- Bug `runsPaidToday/runsPaidDate` perdidos em `normalizeGameState` (commit 62cb14d) — normalização é append-only por heurística, sem contrato.
- Zero validação no boundary: JSON corrompido do localStorage passa como `GameState` válido, quebra downstream.
- Sync cloud é last-write-wins silencioso: quem loga em 2 devices perde dado sem aviso.
- Só existe `migrateV1`; não há registry versionada; bumps futuros serão cirurgia.
- Reducer impossível de testar isolado (depende do provider inteiro).

## Decisões de escopo (fechadas em brainstorm)

1. **Schema versioning:** híbrido Zod + registry de migrations. Zod resolve defaulting de campo novo; registry cobre transformações estruturais.
2. **Sync:** last-write-wins **com prompt de recuperação** quando local tem mudanças não-sincronizadas e cloud é mais novo.
3. **Split:** pleno — extrai `gameReducer.ts` (puro), `gameStats.ts` (helpers), `gameState/` (persistência completa). `GameContext.tsx` fica ~130 linhas de orquestração.

## Não-escopo

- Realtime Supabase subscription (Fase 6).
- Merge por campo / CRDTs (over-engineering pra single-user-per-account).
- Remoção do fallback de `weights` legacy (Fase 4, cleanup do bayesiano).
- Refactor do reducer em slices por domínio (prematuro em 370 LOC).
- Mudanças de UX no app — só sync prompt é nova UI.

---

## Arquitetura

```
src/lib/gameState/
├── schema.ts                          # Zod GameStateSchema, CURRENT_SCHEMA_VERSION
├── defaults.ts                        # INITIAL_STATE
├── normalize.ts                       # parse + migrations + fallback
├── persistence.ts                     # localStorage read/write
├── sync.ts                            # Supabase pull/push + conflict resolution
├── migrations/
│   ├── index.ts                       # registry + runMigrations()
│   ├── v1-to-v2.ts                    # migração existente (extraída do atual migrateV1)
│   ├── v2-to-v3.ts                    # bump atual (introduz schemaVersion explícito)
│   └── __tests__/
└── __fixtures__/
    ├── state-v1.json                  # snapshot de save real pré-schemaVersion
    ├── state-v2.json
    └── state-v3.json

src/lib/gameStats.ts                   # applyDampenedWeights, getPrecision,
                                       # getConsistency, isDeckPlayable,
                                       # getUnlockedDecks

src/context/
├── GameContext.tsx                    # provider + orquestração (~130 LOC)
├── gameReducer.ts                     # reducer puro + GameAction (~400 LOC)
└── __tests__/gameReducer.test.ts      # testes do reducer isolado

src/components/
└── SyncConflictModal.tsx              # UI do prompt de conflito
```

**Princípios:**
- `gameReducer` é **pura** (zero IO).
- `persistence.ts` / `sync.ts` são **IO puro** (recebem/retornam state, sem side-effect em React).
- `GameContext` só **orquestra** (hydrate → provide → subscribe → persist debounce).

---

## Contratos

### `gameState/schema.ts`

```ts
export const CURRENT_SCHEMA_VERSION = 3;

export const GameStateSchema = z.object({
  schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
  updatedAt: z.string().default(() => new Date().toISOString()),
  devicePersistedAt: z.string().nullable().default(null),

  wallet: WalletSchema,
  completedDecks: z.record(z.string(), z.string()).default({}),
  ownedDeckIds: z.array(z.string()).default([]),
  plusSubscription: PlusSubscriptionSchema.nullable().default(null),
  runsPaidToday: z.number().int().min(0).default(0),
  runsPaidDate: z.string().nullable().default(null),
  // ... demais campos

  // Opcionais (derivados ou transientes) não entram no schema persistido:
  activeDeck: z.never().optional(),
  activeRun: z.never().optional(),
}).strip();

export type GameState = z.infer<typeof GameStateSchema>;
```

- `.strip()` remove campos desconhecidos silenciosamente (proteção contra lixo de versões futuras rodando em cliente velho, o oposto é bloqueado em `runMigrations`).
- `activeDeck`/`activeRun` são transientes: existem em memória, nunca persistem (já é assim hoje).

### `gameState/migrations/index.ts`

```ts
export type Migration = (raw: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
};

export function runMigrations(raw: unknown, fromVersion: number): unknown {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new VersionTooNewError(fromVersion, CURRENT_SCHEMA_VERSION);
  }
  let current = raw;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) {
      throw new Error(`Missing migration v${v} → v${v + 1}`);
    }
    current = migrate(current);
  }
  return current;
}
```

**Regra de versionamento** (documentar em `migrations/README.md`):
- Adicionar campo novo com valor default razoável → **não bumpa**. Só adiciona `.default(...)` no Zod.
- Renomear campo, reshape, split de campo em múltiplos, mudança semântica de enum → **bump obrigatório** + migration explícita + fixture.

### `gameState/normalize.ts`

```ts
export function normalizeGameState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return INITIAL_STATE;

  const version = (raw as any).schemaVersion ?? 1;
  let migrated: unknown;
  try {
    migrated = runMigrations(raw, version);
  } catch (err) {
    if (err instanceof VersionTooNewError) {
      throw err; // GameContext pega e mostra "atualize o app"
    }
    console.error('[gameState] migration failed', err);
    snapshotCorrupted(raw);
    return INITIAL_STATE;
  }

  const parsed = GameStateSchema.safeParse(migrated);
  if (!parsed.success) {
    console.error('[gameState] parse failed', parsed.error);
    snapshotCorrupted(raw);
    return INITIAL_STATE;
  }
  return parsed.data;
}

function snapshotCorrupted(raw: unknown): void {
  try {
    localStorage.setItem(
      'mindpractice_state_corrupted',
      JSON.stringify({ at: new Date().toISOString(), raw }),
    );
  } catch {
    /* ignore */
  }
}
```

### `gameState/persistence.ts`

```ts
const STORAGE_KEY = 'mindpractice_state';

export function loadLocal(): unknown | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveLocal(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
```

### `gameState/sync.ts`

```ts
export async function loadCloud(): Promise<unknown | null> { ... }
export async function saveCloud(state: GameState): Promise<void> { ... }

export type ConflictResolution =
  | { kind: 'use-cloud' }
  | { kind: 'use-local' }
  | { kind: 'cancel' };

export interface HydrateDecision {
  kind: 'initial' | 'use-local' | 'use-cloud' | 'conflict';
  local?: GameState;
  cloud?: GameState;
}

export function decideHydrate(
  local: GameState | null,
  cloud: GameState | null,
): HydrateDecision {
  if (!local && !cloud) return { kind: 'initial' };
  if (!cloud) return { kind: 'use-local', local: local! };
  if (!local) return { kind: 'use-cloud', cloud };

  if (local.updatedAt === cloud.updatedAt) {
    return { kind: 'use-local', local };
  }

  const cloudIsNewer = cloud.updatedAt > local.updatedAt;
  if (cloudIsNewer) {
    const localIsClean =
      local.devicePersistedAt && local.updatedAt <= local.devicePersistedAt;
    if (localIsClean) return { kind: 'use-cloud', cloud };
    return { kind: 'conflict', local, cloud };
  }
  return { kind: 'use-local', local };
}
```

---

## Fluxo de hydrate (orquestração em `GameContext`)

```
mount
  │
  ├─▶ local = loadLocal()            (síncrono)
  ├─▶ cloud = await loadCloud()      (se logado; null se anon ou erro)
  │
  ├─▶ decision = decideHydrate(local, cloud)
  │
  └─▶ switch (decision.kind)
        ├─ initial     → dispatch HYDRATE(INITIAL_STATE)
        ├─ use-local   → dispatch HYDRATE(normalize(local))
        ├─ use-cloud   → dispatch HYDRATE(normalize(cloud))
        │                saveLocal(cloud)
        └─ conflict    → setState(conflictModal: { local, cloud })
                         (modal resolve → dispatch HYDRATE do escolhido)
```

**Debounce de persist:** após HYDRATE, todo dispatch marca `state.updatedAt = now()`. Um `useEffect` com debounce de 2s escreve em localStorage; um segundo useEffect com debounce de 5s empurra pro cloud (`saveCloud` atualiza `devicePersistedAt`).

---

## Prompt de conflito

Componente `<SyncConflictModal local={} cloud={} onResolve={} />`.

**Diff resumido** mostra campos de alto sinal:
- runs totais (count)
- arquétipo atual
- fichas/wallet
- decks completados (count)
- última atividade (`updatedAt`)

**3 botões:**
- `Usar cloud` — dispatch HYDRATE(cloud), saveLocal(cloud).
- `Usar local e sobrescrever cloud` — dispatch HYDRATE(local), saveCloud(local).
- `Cancelar` — dispatch HYDRATE(local), não sobe cloud nesta sessão até próxima ação do usuário.

**Fallback (fechar modal sem escolher):** equivalente a cancelar.

---

## Error handling

| Cenário | Comportamento |
|---|---|
| localStorage indisponível (privado) | Usa só cloud. Persist local vira no-op. |
| JSON do localStorage corrompido | `loadLocal()` retorna null → trata como sem local. |
| `normalizeGameState` falha (Zod) | Snapshot em `mindpractice_state_corrupted`, retorna `INITIAL_STATE`, log. |
| Migration ausente pra versão | `console.error`, retorna `INITIAL_STATE`, log. |
| `VersionTooNewError` (save mais novo que cliente) | Modal "atualize o app", não carrega. |
| Cloud offline / 5xx | Silencia, continua com local. |
| Cloud 401 (session expirou) | Silencia, continua anon com local. |
| Dispatch numa action desconhecida | Reducer retorna state inalterado (default case). |
| Snapshot corrupted write falha | Swallow, nunca crash. |

---

## Testing

**Cobertura obrigatória antes de fechar a fase:**

1. **Fixtures (`__fixtures__/`):**
   - `state-v1.json`: snapshot real de save pré-schemaVersion (extraído do git history/backup local).
   - `state-v2.json`: snapshot pós-migrateV1 mas pré-schemaVersion explícito.
   - `state-v3.json`: snapshot atual esperado.

2. **Migration tests** (`migrations/__tests__/`):
   - `v1-to-v2.test.ts`: input v1, output esperado v2 (campos críticos preservados).
   - `v2-to-v3.test.ts`: idem.

3. **End-to-end migration test:**
   - Carrega `state-v1.json`, passa em `normalizeGameState`, asserta: `wallet.fichas`, `completedDecks` count, `runsPaidToday`, `plusSubscription`, `achievements` idênticos ao v1.

4. **Schema evolution test:**
   - Pega `state-v3.json`, valida que `GameStateSchema.parse` retorna equivalente.
   - Se alguém adiciona campo com `.default()`, esse teste continua passando sem bump.

5. **Reducer tests** (`gameReducer.test.ts`):
   - ANSWER aplica `resolveWeights`, incrementa `answeredCount`.
   - CLAIM_DAILY dá fichas, marca timestamp.
   - SPEND_FICHAS com saldo insuficiente é no-op.
   - HYDRATE substitui state inteiro.
   - Season rollover zera runs diárias preservando histórico.

6. **Sync resolution matrix** (`sync.test.ts`):
   - Caso a) sem local sem cloud → initial.
   - Caso b) só local → use-local.
   - Caso c) só cloud → use-cloud.
   - Caso d.1) local == cloud (same updatedAt) → use-local.
   - Caso d.2) cloud newer, local limpo → use-cloud.
   - Caso d.3) cloud newer, local dirty → conflict.
   - Caso d.4) local newer que cloud → use-local.

7. **CI gate:** `npm test` falha se qualquer fixture v1/v2/v3 perder campo crítico após migração.

---

## Migração do código existente

**Ordem de extração (evita callsites quebrados):**

1. Criar `gameState/` completo (schema, migrations, normalize, persistence, sync) — arquivos novos, zero import externo.
2. Criar `SyncConflictModal.tsx` — componente novo.
3. Extrair helpers de `GameContext.tsx` pra `gameStats.ts`. Atualizar imports nos consumers (`/perfil`, `/decks`, componentes).
4. Extrair reducer pra `gameReducer.ts`. Actions + tipo saem junto. `GameContext.tsx` importa e usa.
5. Reescrever `useEffect` de hydrate/persist/sync usando as funções novas.
6. Deletar `migrateV1` antigo, substituir `normalizeGameState` em `runScoring.ts` por re-export do novo.
7. Rodar todo teste, build, smoke manual.

---

## Success criteria (GATE)

- [ ] `src/context/GameContext.tsx` ≤ 150 linhas.
- [ ] 100% do estado persistido validado por Zod no boundary (nenhum cast `as GameState` fora do schema).
- [ ] Fixtures v1/v2/v3 carregam corretamente em teste.
- [ ] Conflict matrix 7 casos testada.
- [ ] Reducer testado isolado sem provider.
- [ ] `npm test` + `npm run build` + `npx tsc --noEmit` verdes.
- [ ] Smoke manual: login em 2 abas, ação em A, refresh B → vê dado; ação em B offline, volta online → prompt de conflito aparece.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Fixture v1 real não existe (saves antigos perdidos) | Reconstrói manualmente a partir do código do `migrateV1` atual. Documenta como "fixture sintético". |
| Zod adiciona bundle size | Checa impacto no build; Zod ~12kb gzip é aceitável pro valor. Alternativa: `valibot` se virar problema. |
| Debounce perde dado no unload | `beforeunload` handler síncrono chama flush do debounce. |
| Modal de conflito irrita em falsos positivos | `devicePersistedAt` só é touched quando cloud confirma save; minimiza falso positivo. Log de telemetria futura pra medir taxa real. |
| Callsites de helpers movidos (`getPrecision` etc) quebram | tsc apontaria, mas faço grep exaustivo antes de mover. |

---

## Referências

- Roadmap: `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md` (Fase 3)
- Código atual: `src/context/GameContext.tsx`, `src/lib/runScoring.ts` (`normalizeGameState`), `src/lib/supabase/sync.ts`
- Schema Supabase: `supabase/schema.sql` (`game_state.state_json`)
