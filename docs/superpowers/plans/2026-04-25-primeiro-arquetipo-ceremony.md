# F5b.1 — Primeiro Arquétipo Ceremony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disparar uma cerimônia full-screen única quando o jogador sai do estado `archetypeDisplay.mode === 'discovering'` pela primeira vez, revelando seu primeiro arquétipo com avatar, traits bipolares e recompensa de fichas. Inclui rename dos 10 trait labels pra forma substantivo abstrato.

**Architecture:** Novo field `firstArchetypeShownAt: string | null` em `GameState` (migration v4→v5), action idempotente `MARK_FIRST_ARCHETYPE_SEEN`, hook `useFirstArchetypeCeremony` espelhado de `useLevelCeremony`, componente `FirstArchetypeCeremony.tsx` reusando F5a (Dialog/Badge/Button), componente `AxisBars.tsx` extraído de `/perfil` pra DRY. `AXIS_POLES` migra inline → `types/game.ts` com labels novos. ShareCard ganha variant `firstArchetype`.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, Tailwind v4, Framer Motion, `node:test` + `tsx`, Zod, html2canvas. Spec: `docs/superpowers/specs/2026-04-25-primeiro-arquetipo-ceremony-design.md`.

---

## Estrutura de arquivos

**Criados:**
- `src/lib/gameState/migrations/v4-to-v5.ts` — adiciona `firstArchetypeShownAt: null`
- `src/components/AxisBars.tsx` — componente bipolar reutilizável
- `src/components/AxisBars.test.ts` — comportamento puro (helper de width/sign)
- `src/context/useFirstArchetypeCeremony.ts` — hook espelhado de `useLevelCeremony`
- `src/components/FirstArchetypeCeremony.tsx` — modal cerimonial

**Modificados:**
- `src/types/game.ts` — adiciona `firstArchetypeShownAt`, exporta `AXIS_POLES` com labels novos
- `src/lib/gameState/schema.ts` — bump `CURRENT_SCHEMA_VERSION` 4→5, adiciona `firstArchetypeShownAt` no zod schema, atualiza data type `PersistedGameState`
- `src/lib/gameState/defaults.ts` — `INITIAL_STATE.firstArchetypeShownAt: null`
- `src/lib/gameState/migrations/index.ts` — registra `v4ToV5`
- `src/lib/gameState/__tests__/migrations.test.ts` — atualiza testes pra v5
- `src/lib/gameState/__tests__/normalize.test.ts` — atualiza pra v5
- `src/lib/gameState/__tests__/schema.test.ts` — `CURRENT_SCHEMA_VERSION === 5`
- `src/context/gameReducer.ts` — action `MARK_FIRST_ARCHETYPE_SEEN`
- `src/context/__tests__/gameReducer.test.ts` — teste do novo case
- `src/context/GameContext.tsx` — usa `useFirstArchetypeCeremony` + render do modal
- `src/app/perfil/page.tsx` — substitui inline de `AXIS_POLES` por import + usa `<AxisBars>`
- `src/components/ShareCard.tsx` — variant `firstArchetype`
- `src/components/ShareButton.tsx` — prop `variant`
- `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md` — F5b.1 status

---

## Fase 1 — Modelo de dados

### Task 1: Adicionar `firstArchetypeShownAt` em GameState + schema + defaults

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/gameState/schema.ts`
- Modify: `src/lib/gameState/defaults.ts`

- [ ] **Step 1: Localizar `GameState` em `src/types/game.ts`**

Run: `grep -n "lastSeenLevel" src/types/game.ts`
Expected: encontra `lastSeenLevel: number;` dentro de `interface GameState`.

- [ ] **Step 2: Adicionar field em `GameState`**

Logo após `lastSeenLevel: number;`, inserir:

```ts
  /**
   * Timestamp ISO de quando o jogador viu a cerimônia "Primeiro Arquétipo".
   * `null` = ainda não disparou. Set uma vez, nunca volta a null.
   */
  firstArchetypeShownAt: string | null;
```

- [ ] **Step 3: Adicionar field no zod schema**

Em `src/lib/gameState/schema.ts`, localizar bloco do schema principal (procurar `lastSeenLevel: z.number()`). Imediatamente abaixo, adicionar:

```ts
  firstArchetypeShownAt: z.string().nullable().default(null),
```

- [ ] **Step 4: Bump CURRENT_SCHEMA_VERSION**

Em `src/lib/gameState/schema.ts`, trocar:

```ts
export const CURRENT_SCHEMA_VERSION = 4;
```

por:

```ts
export const CURRENT_SCHEMA_VERSION = 5;
```

- [ ] **Step 5: Adicionar default em `INITIAL_STATE`**

Em `src/lib/gameState/defaults.ts`, localizar `lastSeenLevel: 1,` e adicionar logo abaixo:

```ts
  firstArchetypeShownAt: null,
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. (Tests podem falhar — serão corrigidos na Task 3.)

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/gameState/schema.ts src/lib/gameState/defaults.ts
git commit -m "feat(state): firstArchetypeShownAt field + schema v5 bump"
```

---

### Task 2: Migration v4 → v5

**Files:**
- Create: `src/lib/gameState/migrations/v4-to-v5.ts`
- Modify: `src/lib/gameState/migrations/index.ts`
- Modify: `src/lib/gameState/__tests__/migrations.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Em `src/lib/gameState/__tests__/migrations.test.ts`, adicionar (no fim do arquivo):

```ts
import { v4ToV5 } from '../migrations/v4-to-v5';

test('v4 → v5: adiciona firstArchetypeShownAt: null se ausente', () => {
  const v4 = { schemaVersion: 4, wallet: { fichas: 100 }, lastSeenLevel: 3 };
  const out = v4ToV5(v4) as any;
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.firstArchetypeShownAt, null);
  assert.equal(out.wallet.fichas, 100);
  assert.equal(out.lastSeenLevel, 3);
});

test('v4 → v5: preserva firstArchetypeShownAt se já existir (idempotente)', () => {
  const v4 = { schemaVersion: 4, firstArchetypeShownAt: '2026-04-20T10:00:00Z' };
  const out = v4ToV5(v4) as any;
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.firstArchetypeShownAt, '2026-04-20T10:00:00Z');
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../migrations/v4-to-v5'`.

- [ ] **Step 3: Implementar v4-to-v5**

Criar `src/lib/gameState/migrations/v4-to-v5.ts`:

```ts
/**
 * v4 → v5: adiciona `firstArchetypeShownAt: null` para suportar a cerimônia
 * "Primeiro Arquétipo" (F5b.1). Saves antigos NÃO veem a cerimônia retroativa
 * — o trigger só dispara em jogadores cujo field permaneceu null através
 * de uma transição real `discovering → tendency`.
 */
export function v4ToV5(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    schemaVersion: 5,
    firstArchetypeShownAt:
      typeof r.firstArchetypeShownAt === 'string' || r.firstArchetypeShownAt === null
        ? r.firstArchetypeShownAt
        : null,
  };
}
```

- [ ] **Step 4: Registrar no index**

Em `src/lib/gameState/migrations/index.ts`, adicionar import e entry:

```ts
import { v4ToV5 } from './v4-to-v5';
```

E na constante `MIGRATIONS`:

```ts
export const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
  3: v3ToV4,
  4: v4ToV5,
};
```

- [ ] **Step 5: Atualizar testes existentes que asseravam schemaVersion: 4**

Em `src/lib/gameState/__tests__/migrations.test.ts`, localizar testes que esperam `schemaVersion === 4` no resultado de `runMigrations` ou em fixtures e ajustar para 5. Exemplo:

```ts
// Antes
assert.equal(result.schemaVersion, 4);
// Depois
assert.equal(result.schemaVersion, 5);
```

Em `src/lib/gameState/__tests__/normalize.test.ts` e `src/lib/gameState/__tests__/schema.test.ts`, fazer o mesmo:

```ts
// Em schema.test.ts
test('CURRENT_SCHEMA_VERSION é 5', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 5);
});
```

(Substituir o teste que dizia `4`.)

- [ ] **Step 6: Rodar tests**

Run: `npm test`
Expected: PASS — testes novos passam, todos os ajustes de versão alinhados.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gameState/migrations/v4-to-v5.ts src/lib/gameState/migrations/index.ts src/lib/gameState/__tests__/migrations.test.ts src/lib/gameState/__tests__/normalize.test.ts src/lib/gameState/__tests__/schema.test.ts
git commit -m "feat(state): migration v4→v5 — firstArchetypeShownAt"
```

---

### Task 3: Action `MARK_FIRST_ARCHETYPE_SEEN` + reducer

**Files:**
- Modify: `src/context/gameReducer.ts`
- Modify: `src/context/__tests__/gameReducer.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Em `src/context/__tests__/gameReducer.test.ts`, adicionar:

```ts
test('MARK_FIRST_ARCHETYPE_SEEN: seta timestamp + credita +30 fichas', () => {
  const state = { ...INITIAL_STATE };
  const before = state.wallet.fichas;
  const next = gameReducer(state, {
    type: 'MARK_FIRST_ARCHETYPE_SEEN',
    archetypeId: 'sentinela',
    at: '2026-04-25T12:00:00Z',
  });
  assert.equal(next.firstArchetypeShownAt, '2026-04-25T12:00:00Z');
  assert.equal(next.wallet.fichas, before + 30);
  assert.equal(next.wallet.totalEarned, state.wallet.totalEarned + 30);
});

test('MARK_FIRST_ARCHETYPE_SEEN: idempotente — no-op se já set', () => {
  const state = { ...INITIAL_STATE, firstArchetypeShownAt: '2026-04-20T10:00:00Z' };
  const next = gameReducer(state, {
    type: 'MARK_FIRST_ARCHETYPE_SEEN',
    archetypeId: 'sentinela',
    at: '2026-04-25T12:00:00Z',
  });
  assert.equal(next, state, 'reducer deve retornar referência idêntica em no-op');
});
```

(Os imports `INITIAL_STATE` e `gameReducer` já existem no arquivo de teste.)

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — type error em `'MARK_FIRST_ARCHETYPE_SEEN'` (ainda não está em `GameAction`).

- [ ] **Step 3: Adicionar action ao tipo `GameAction`**

Em `src/context/gameReducer.ts`, localizar a union `GameAction` (procurar `MARK_LEVEL_SEEN`). Após esse entry, adicionar:

```ts
  | { type: 'MARK_FIRST_ARCHETYPE_SEEN'; archetypeId: string; at: string }
```

- [ ] **Step 4: Adicionar case no reducer**

Localizar o case `'MARK_LEVEL_SEEN'` (perto do final do switch) e adicionar logo após:

```ts
    case 'MARK_FIRST_ARCHETYPE_SEEN': {
      // Idempotente: se já set, retorna state intacto.
      if (state.firstArchetypeShownAt !== null) return state;
      const REWARD = 30;
      return {
        ...state,
        firstArchetypeShownAt: action.at,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas + REWARD,
          totalEarned: state.wallet.totalEarned + REWARD,
        },
      };
    }
```

- [ ] **Step 5: Rodar tests**

Run: `npm test`
Expected: PASS — 2 testes novos passam.

- [ ] **Step 6: Commit**

```bash
git add src/context/gameReducer.ts src/context/__tests__/gameReducer.test.ts
git commit -m "feat(reducer): MARK_FIRST_ARCHETYPE_SEEN — set timestamp + +30 fichas"
```

---

## Fase 2 — Trait rename + AxisBars

### Task 4: Mover `AXIS_POLES` pra `types/game.ts` com labels novos

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/app/perfil/page.tsx`

- [ ] **Step 1: Adicionar `AXIS_POLES` em `types/game.ts`**

Localizar onde `STAT_LABELS` é declarado (procurar `export const STAT_LABELS`). Após esse bloco, adicionar:

```ts
/**
 * Polos bipolares de cada eixo, em forma de trait (substantivo abstrato).
 * Index 0 = polo negativo (-1), index 1 = polo positivo (+1).
 *
 * Source-of-truth para `/perfil`, `FirstArchetypeCeremony` e qualquer
 * surface que exiba a barra bipolar dos eixos.
 */
export const AXIS_POLES: Record<StatKey, [string, string]> = {
  vigor:    ['Calma',     'Intensidade'],
  harmonia: ['Atrito',    'Concílio'],
  filtro:   ['Impulso',   'Cálculo'],
  presenca: ['Discrição', 'Imponência'],
  desapego: ['Apego',     'Desapego'],
};
```

- [ ] **Step 2: Remover declaração local em `/perfil/page.tsx`**

Em `src/app/perfil/page.tsx`, localizar `const AXIS_POLES: Record<StatKey, [string, string]> = { ... };` (próximo ao final do arquivo, ~linha 668) e DELETAR esse bloco inteiro.

- [ ] **Step 3: Adicionar `AXIS_POLES` ao import existente**

No topo de `src/app/perfil/page.tsx`, localizar `import { ... } from '@/types/game';` e adicionar `AXIS_POLES`:

```ts
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, AXIS_POLES } from '@/types/game';
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Build (verifica que /perfil ainda renderiza com labels novos)**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 6: Commit**

```bash
git add src/types/game.ts src/app/perfil/page.tsx
git commit -m "refactor(traits): AXIS_POLES vira source-of-truth em types/game.ts (labels: Calma/Intensidade, Atrito/Concílio, Impulso/Cálculo, Discrição/Imponência, Apego/Desapego)"
```

---

### Task 5: Componente `AxisBars` extraído + teste

**Files:**
- Create: `src/components/AxisBars.tsx`
- Create: `src/components/AxisBars.test.ts`

- [ ] **Step 1: Escrever teste de helper puro**

`src/components/AxisBars.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAxisBarGeometry } from './AxisBars';

test('value=0 → fill 0%, sem sinal negativo', () => {
  const g = computeAxisBarGeometry(0);
  assert.equal(g.pct, 0);
  assert.equal(g.isNeg, false);
  assert.equal(g.barLeft, '50%');
  assert.equal(g.barWidth, '0%');
});

test('value=+1 → fill 50% à direita do centro', () => {
  const g = computeAxisBarGeometry(1);
  assert.equal(g.pct, 50);
  assert.equal(g.isNeg, false);
  assert.equal(g.barLeft, '50%');
  assert.equal(g.barWidth, '50%');
});

test('value=-1 → fill 50% à esquerda do centro', () => {
  const g = computeAxisBarGeometry(-1);
  assert.equal(g.pct, 50);
  assert.equal(g.isNeg, true);
  assert.equal(g.barLeft, '0%');
  assert.equal(g.barWidth, '50%');
});

test('value=+0.5 → fill 25%, indicador em 75%', () => {
  const g = computeAxisBarGeometry(0.5);
  assert.equal(g.pct, 25);
  assert.equal(g.isNeg, false);
  assert.equal(g.indicatorPos, '75%');
});

test('value=-0.5 → fill 25% à esquerda, indicador em 25%', () => {
  const g = computeAxisBarGeometry(-0.5);
  assert.equal(g.pct, 25);
  assert.equal(g.isNeg, true);
  assert.equal(g.indicatorPos, '25%');
});

test('clamp value > 1 → trata como 1', () => {
  const g = computeAxisBarGeometry(2);
  assert.equal(g.pct, 50);
});

test('clamp value < -1 → trata como -1', () => {
  const g = computeAxisBarGeometry(-2);
  assert.equal(g.pct, 50);
  assert.equal(g.isNeg, true);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './AxisBars'`.

- [ ] **Step 3: Implementar AxisBars**

`src/components/AxisBars.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { STAT_KEYS, STAT_COLORS, AXIS_POLES, type StatKey } from '@/types/game';
import { playerMean, createPriorProfile } from '@/lib/bayesEngine';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';

export interface AxisBarGeometry {
  pct: number;          // 0-50, distância do centro em %
  isNeg: boolean;
  barLeft: string;      // CSS left para o fill
  barWidth: string;     // CSS width para o fill
  indicatorPos: string; // CSS left para o número flutuante
}

/**
 * Helper puro — geometria de uma barra bipolar.
 * value ∈ [-1, +1] (clamp se fora). Centro = 50%, fill cresce do centro
 * em direção ao polo. Indicador numérico segue a ponta do fill.
 */
export function computeAxisBarGeometry(value: number): AxisBarGeometry {
  const v = Math.max(-1, Math.min(1, value));
  const isNeg = v < 0;
  const pct = Math.abs(v) * 50; // 0-50%
  const barLeft = isNeg ? `${50 - pct}%` : '50%';
  const barWidth = `${pct}%`;
  const indicatorPos = isNeg ? `${50 - pct}%` : `${50 + pct}%`;
  return { pct, isNeg, barLeft, barWidth, indicatorPos };
}

export interface AxisBarsProps {
  /** Beliefs bayesianos. Se passado, valores derivam de playerMean recentered. */
  beliefs?: PlayerBeliefs;
  /** Valores prontos em [-1, +1]. Tem precedência sobre `beliefs`. */
  axes?: Record<StatKey, number>;
  /** Se false, mostra barras "vazias" (sem fill nem número). Default: true se há dados. */
  hasData?: boolean;
  /** Stagger animation no reveal. Default false (instantâneo). */
  animated?: boolean;
  /** Delay base em ms pro stagger. Default 0. */
  delayMs?: number;
  className?: string;
}

function deriveAxes(beliefs: PlayerBeliefs): Record<StatKey, number> {
  const out = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    out[k] = (playerMean(beliefs[k]) - 0.5) * 2;
  }
  return out;
}

export default function AxisBars({
  beliefs,
  axes,
  hasData,
  animated = false,
  delayMs = 0,
  className,
}: AxisBarsProps) {
  const values: Record<StatKey, number> =
    axes ?? (beliefs ? deriveAxes(beliefs) : deriveAxes(createPriorProfile()));
  const live = hasData ?? (axes !== undefined || beliefs !== undefined);

  return (
    <div className={className ? `${className} space-y-2.5` : 'space-y-2.5'}>
      {STAT_KEYS.map((key, i) => {
        const value = values[key];
        const { pct, isNeg, barLeft, barWidth, indicatorPos } = computeAxisBarGeometry(value);
        const color = STAT_COLORS[key];
        const poles = AXIS_POLES[key];
        const tweenDelay = animated ? (delayMs + i * 80) / 1000 : 0;

        const Outer = animated ? motion.div : 'div';
        const outerProps = animated
          ? {
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: tweenDelay, duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
            }
          : {};

        return (
          <Outer key={key} {...outerProps}>
            {/* Pole labels + floating value */}
            <div className="relative mb-1 flex items-center justify-between">
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
                {poles[0]}
              </span>
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
                {poles[1]}
              </span>
              {live && value !== 0 && (
                <span
                  className="absolute -top-0.5 text-[9px] font-mono font-bold"
                  style={{
                    color: isNeg ? '#ef4444' : color,
                    left: indicatorPos,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {value > 0 ? '+' : ''}
                  {value.toFixed(1)}
                </span>
              )}
            </div>
            {/* Track */}
            <div className="relative h-1.5 w-full rounded-full bg-bg-glass">
              {/* Center tick */}
              <div className="absolute left-1/2 top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-text-tertiary/40" />
              {/* Fill */}
              {live && pct > 0 && (
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: barLeft,
                    width: barWidth,
                    backgroundColor: isNeg ? '#ef4444' : color,
                  }}
                />
              )}
            </div>
          </Outer>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rodar tests**

Run: `npm test`
Expected: PASS — 7 testes geometry passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/AxisBars.tsx src/components/AxisBars.test.ts
git commit -m "feat(ui): AxisBars — bipolar bars component + helper puro"
```

---

### Task 6: `/perfil` consome `<AxisBars>`

**Files:**
- Modify: `src/app/perfil/page.tsx`

- [ ] **Step 1: Adicionar import**

No topo do arquivo, junto aos outros imports de componentes:

```ts
import AxisBars from '@/components/AxisBars';
```

- [ ] **Step 2: Localizar bloco inline das axis bars**

Run: `grep -n "STAT_KEYS.map((key) =>" src/app/perfil/page.tsx`
Expected: linha do mapeamento (~linha 306-345 do bloco "Axis bars — always visible").

- [ ] **Step 3: Substituir o map inteiro pelo componente**

Localizar `<motion.section variants={fadeUp} className="mt-2.5">` que contém o título "Eixos" e o `STAT_KEYS.map(...)`. Substituir o conteúdo do `<div className="space-y-2.5">` por:

```tsx
<AxisBars beliefs={beliefsProfile} hasData={hasData} />
```

A `<motion.section>` externa, o título "Eixos", e o wrapper `<div className="rounded-xl bg-white/[0.04] px-3 py-2.5">` permanecem. Só o conteúdo das barras (o map) é substituído.

Estrutura final:
```tsx
<motion.section variants={fadeUp} className="mt-2.5">
  <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Eixos</p>
    <AxisBars beliefs={beliefsProfile} hasData={hasData} />
  </div>
</motion.section>
```

- [ ] **Step 4: Remover variáveis órfãs do escopo de `/perfil`**

Variáveis usadas SOMENTE no map removido podem ficar órfãs. Procurar:

Run: `grep -n "derivedAxes\|maxAbs" src/app/perfil/page.tsx`

Se `derivedAxes` ou `maxAbs` não forem mais usadas em nenhum outro lugar do arquivo, remover. Se ainda forem usadas (ex: ShareButton recebe `axes={derivedAxes}`), manter.

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 erros, build verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "refactor(perfil): consome <AxisBars> em vez de inline"
```

---

## Fase 3 — Cerimônia

### Task 7: Hook `useFirstArchetypeCeremony`

**Files:**
- Create: `src/context/useFirstArchetypeCeremony.ts`

- [ ] **Step 1: Implementar o hook**

`src/context/useFirstArchetypeCeremony.ts`:

```ts
'use client';

/**
 * useFirstArchetypeCeremony — detecta a transição inicial do estado
 * `discovering` para `tendency`/`firm` e abre a cerimônia uma única vez.
 *
 * - Aguarda hydrate (evita disparar com `discovering` falso do INITIAL_STATE)
 * - Idempotente cross-render via `state.firstArchetypeShownAt`
 * - Não dispara se a cerimônia já foi vista (mesmo que beliefs voltem a discovering)
 */
import { useEffect, useState } from 'react';
import type { GameState, Archetype } from '@/types/game';
import {
  archetypeDisplayState,
  createPriorProfile,
} from '@/lib/bayesEngine';
import type { GameAction } from './gameReducer';

export interface FirstArchetypeCeremonyHookValue {
  pending: {
    archetype: Archetype;
  } | null;
  dismiss: () => void;
}

export function useFirstArchetypeCeremony(
  state: GameState,
  hydrated: boolean,
  dispatch: (action: GameAction) => void,
): FirstArchetypeCeremonyHookValue {
  const [pending, setPending] = useState<FirstArchetypeCeremonyHookValue['pending']>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (state.firstArchetypeShownAt !== null) return;
    if (pending !== null) return;

    const beliefs = state.calibration.beliefs ?? createPriorProfile();
    const display = archetypeDisplayState(beliefs);
    if (display.mode === 'discovering') return;
    if (display.primary === null) return;

    setPending({ archetype: display.primary.archetype });
  }, [hydrated, state.calibration.beliefs, state.firstArchetypeShownAt, pending]);

  const dismiss = () => {
    if (!pending) return;
    dispatch({
      type: 'MARK_FIRST_ARCHETYPE_SEEN',
      archetypeId: pending.archetype.id,
      at: new Date().toISOString(),
    });
    setPending(null);
  };

  return { pending, dismiss };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/context/useFirstArchetypeCeremony.ts
git commit -m "feat(state): useFirstArchetypeCeremony hook — detecta primeira saída de discovering"
```

---

### Task 8: Componente `FirstArchetypeCeremony`

**Files:**
- Create: `src/components/FirstArchetypeCeremony.tsx`

- [ ] **Step 1: Implementar componente**

`src/components/FirstArchetypeCeremony.tsx`:

```tsx
'use client';

/**
 * FirstArchetypeCeremony — cerimônia full-screen de reveal do primeiro
 * arquétipo, disparada pelo useFirstArchetypeCeremony quando o jogador
 * sai de `discovering` pela primeira vez.
 *
 * Visual: backdrop blur + card cinematográfico com avatar, nome, tagline,
 * AxisBars animadas e tile de recompensa. Sequência ~3s pré-interatividade.
 *
 * Reuse F5a: Badge, Button (Card opcional — usamos div próprio aqui pelo
 * gradient hero específico).
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { Archetype } from '@/types/game';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';
import AxisBars from './AxisBars';
import { Badge, Button } from '@/components/ui';

interface FirstArchetypeCeremonyProps {
  open: boolean;
  archetype: Archetype;
  beliefs: PlayerBeliefs;
  reward?: number;
  onClose: () => void;
}

export default function FirstArchetypeCeremony({
  open,
  archetype,
  beliefs,
  reward = 30,
  onClose,
}: FirstArchetypeCeremonyProps) {
  const visual = getArchetypeAvatarVisual(archetype);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(8, 8, 14, 0.78)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[1.8rem] border border-border-default bg-bg-glass-strong backdrop-blur-md shadow-[0_20px_55px_rgba(6,8,24,0.32)]"
          >
            {/* Hero gradient */}
            <div
              className="relative h-32 w-full overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at top, ${visual.glow} 0%, transparent 75%), linear-gradient(180deg, ${visual.background} 0%, transparent 100%)`,
              }}
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="absolute left-1/2 top-4 -translate-x-1/2"
              >
                <Badge variant="gold">PRIMEIRO ARQUÉTIPO</Badge>
              </motion.div>
            </div>

            <div className="px-6 pb-6 pt-2">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mx-auto -mt-12 flex h-20 w-20 items-center justify-center rounded-full border-2"
                style={{
                  background: visual.background,
                  borderColor: visual.line,
                  boxShadow: `0 0 24px ${visual.glow}`,
                }}
              >
                <span className="text-3xl font-bold" style={{ color: visual.accent }}>
                  {archetype.name.charAt(0)}
                </span>
              </motion.div>

              {/* Separator */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '60%', opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="mx-auto mt-4 h-px bg-border-strong"
              />

              {/* "Você é" + nome */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-4 text-center"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Você é</p>
                <h2 className="mt-1 text-4xl font-black text-text-primary">{archetype.name}</h2>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.4 }}
                className="mt-2 text-center text-sm italic text-text-secondary"
              >
                {archetype.tagline}
              </motion.p>

              {/* AxisBars */}
              <div className="mt-5 rounded-xl bg-bg-surface px-3 py-3">
                <AxisBars beliefs={beliefs} hasData animated delayMs={1700} />
              </div>

              {/* Reward tile */}
              {reward > 0 && (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 2.2, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4 rounded-xl border border-accent-gold-border bg-accent-gold-bg px-4 py-3 text-center"
                  style={{ boxShadow: '0 0 18px rgba(212,175,55,0.25)' }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-gold">
                    Recompensa
                  </span>
                  <p className="mt-0.5 text-xl font-black text-accent-gold">+{reward} fichas</p>
                </motion.div>
              )}

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.6, duration: 0.3 }}
                className="mt-5 flex gap-2"
              >
                <Button variant="primary" fullWidth onClick={onClose}>
                  Continuar
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Build (verifica que componente compila)**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 4: Commit**

```bash
git add src/components/FirstArchetypeCeremony.tsx
git commit -m "feat(ceremony): FirstArchetypeCeremony component — modal cinematográfico do reveal"
```

---

### Task 9: Trigger no `GameProvider`

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Adicionar imports**

No topo de `src/context/GameContext.tsx`, junto aos outros imports de hooks e componentes, adicionar:

```ts
import { useFirstArchetypeCeremony } from './useFirstArchetypeCeremony';
import FirstArchetypeCeremony from '@/components/FirstArchetypeCeremony';
```

- [ ] **Step 2: Chamar o hook no provider**

Localizar o ponto onde `useLevelCeremony` é chamado (procurar por `const { pending: levelUp,`). Imediatamente abaixo dessa linha, adicionar:

```ts
  const {
    pending: firstArchetype,
    dismiss: dismissFirstArchetype,
  } = useFirstArchetypeCeremony(state, hydrated, dispatch);
```

- [ ] **Step 3: Adicionar render do modal no JSX**

No retorno do provider, próximo ao `<LevelUpCeremony>` existente, adicionar:

```tsx
      {firstArchetype && (
        <FirstArchetypeCeremony
          open={true}
          archetype={firstArchetype.archetype}
          beliefs={state.calibration.beliefs ?? createPriorProfile()}
          reward={30}
          onClose={dismissFirstArchetype}
        />
      )}
```

(Posicionar lógicamente: pode ficar antes ou depois do `<LevelUpCeremony>` block — não há overlap esperado pois um requer `lastSeenLevel < currentLevel`, o outro requer `firstArchetypeShownAt === null`. Se ambos dispararem, o modal F5b.1 entra em cima — aceitável MVP. Para evitar overlap visual, posicionar APÓS o `<LevelUpCeremony>` e ele tomará a frente quando ambos abertos.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 erros, build verde.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(provider): wire FirstArchetypeCeremony — trigger via useFirstArchetypeCeremony"
```

---

## Fase 4 — Share

### Task 10: ShareCard variant `firstArchetype`

**Files:**
- Modify: `src/components/ShareCard.tsx`
- Modify: `src/components/ShareButton.tsx`

- [ ] **Step 1: Adicionar prop `variant` ao ShareCard**

Em `src/components/ShareCard.tsx`, localizar a interface `ShareCardProps` e adicionar:

```ts
interface ShareCardProps {
  archetype: Archetype;
  axes: Record<StatKey, number>;
  nickname: string;
  /** Default 'default' (radar pentagonal). 'firstArchetype' é o reveal cerimonial. */
  variant?: 'default' | 'firstArchetype';
}
```

- [ ] **Step 2: Render condicional baseado em variant**

No corpo do componente, antes do `return`, adicionar:

```tsx
const isFirst = variant === 'firstArchetype';
```

E no JSX, adicionar um header condicional logo abaixo do wrapper (fora do bloco SVG do radar):

```tsx
{isFirst && (
  <div
    style={{
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      textAlign: 'center',
      zIndex: 2,
    }}
  >
    <span
      style={{
        display: 'inline-block',
        padding: '8px 24px',
        borderRadius: 9999,
        border: `2px solid ${visual.line}`,
        background: 'rgba(212,175,55,0.12)',
        color: '#d4af37',
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      Primeiro Arquétipo
    </span>
  </div>
)}
```

(O `visual` deve ser derivado de `archetype` — se já não estiver presente no escopo do componente, adicionar `const visual = getArchetypeAvatarVisual(archetype);` perto do topo do componente, junto ao import: `import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';`)

- [ ] **Step 3: Atualizar destructuring para receber variant**

Onde props são destructuradas (top do componente forwardRef):

```tsx
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ archetype, axes, nickname, variant = 'default' }, ref) => {
```

- [ ] **Step 4: Adicionar prop `variant` ao ShareButton**

Em `src/components/ShareButton.tsx`, localizar a interface de props e adicionar:

```ts
interface ShareButtonProps {
  // ... props existentes
  variant?: 'default' | 'firstArchetype';
}
```

E na destructuring:

```tsx
export default function ShareButton({
  archetype,
  axes,
  nickname,
  compact = false,
  variant = 'default',
}: ShareButtonProps) {
```

(Substituir a destructuring atual; manter o resto do corpo intacto.)

E onde renderiza o `<ShareCard>` interno (off-screen para html2canvas):

```tsx
<ShareCard ref={cardRef} archetype={archetype} axes={axes} nickname={nickname} variant={variant} />
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/ShareCard.tsx src/components/ShareButton.tsx
git commit -m "feat(share): ShareCard/ShareButton variant 'firstArchetype'"
```

---

## Fase 5 — Gate

### Task 11: Sanity gate + roadmap update

**Files:**
- Modify: `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md`

- [ ] **Step 1: Sanity completa**

Run em sequência:
```bash
npx tsc --noEmit
npm test
npm run build
```

Esperado:
- 0 type errors
- Tests passing (todos os testes existentes + os novos: 2 migration v4-to-v5, 2 reducer MARK_FIRST_ARCHETYPE_SEEN, 7 AxisBars geometry)
- Build verde com 11 rotas (10 existentes + /dev/ui — não muda)

- [ ] **Step 2: Smoke manual (opcional mas recomendado)**

```bash
npm run dev
```

No browser:
1. DevTools console: `localStorage.clear()` e reload
2. Jogar o deck `basic_01` até o fim (10 perguntas) — confidence deve subir o suficiente pra sair de 'discovering' (modo `tendency` ou `firm`)
3. Confirmar que `FirstArchetypeCeremony` aparece após `FINISH_DECK`
4. Clicar Continuar
5. DevTools: `JSON.parse(localStorage.mindpractice_state).firstArchetypeShownAt` deve ser uma string ISO
6. DevTools: `JSON.parse(localStorage.mindpractice_state).wallet.fichas` deve ter +30 vs valor anterior
7. Jogar outro deck — cerimônia NÃO aparece de novo (idempotência)

- [ ] **Step 3: Atualizar roadmap**

Editar `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md`. Localizar a seção `## 🎨 FASE 5 — DESIGN SYSTEM + TELAS RITUAIS` e atualizar:

Substituir a linha `### F5b — Telas Rituais ⏳ (próximo brainstorm)` e seu bloco por:

```markdown
### F5b — Telas Rituais 🟡 EM ANDAMENTO (1/3)
- ✅ **F5b.1 — Primeiro Arquétipo** — cerimônia full-screen disparada na primeira saída de `discovering`. AxisBars extraído pra DRY. Trait labels migrados pra forma trait (Calma/Intensidade, Atrito/Concílio, Impulso/Cálculo, Discrição/Imponência, Apego/Desapego). +30 fichas reward. Schema v5.
- ⏳ F5b.2 — Evolução: detectar transição A → B de archetype.id, mostrar mini-timeline
- ⏳ F5b.3 — Season finale: Spotify-Wrapped-style ao terminar season
```

- [ ] **Step 4: Commit final**

```bash
git add docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md
git commit -m "docs(roadmap): F5b.1 fechada — Primeiro Arquétipo Ceremony"
```

---

## Self-review notes

**Spec coverage:**
- §4.1 Estado novo `firstArchetypeShownAt` → Task 1 ✅
- §4.2 Migration v4→v5 → Task 2 ✅
- §4.3 Action `MARK_FIRST_ARCHETYPE_SEEN` + reducer → Task 3 ✅
- §4.4 Trigger via hook → Tasks 7 + 9 ✅
- §4.5 Trait rename → Task 4 ✅
- §4.6 `AxisBars` componente → Tasks 5 + 6 ✅
- §4.7 `FirstArchetypeCeremony` → Task 8 ✅
- §4.8 ShareCard variant → Task 10 ✅
- §5 Gate → Task 11 ✅

**Type consistency:**
- `firstArchetypeShownAt: string | null` consistente em GameState, schema, defaults, migration, reducer, hook ✅
- `MARK_FIRST_ARCHETYPE_SEEN` payload `{ archetypeId, at }` consistente em reducer + hook ✅
- `AxisBarsProps.beliefs` opcional, `axes` opcional, `hasData` opcional — combinação default funciona ✅
- `computeAxisBarGeometry(value: number)` retorna `AxisBarGeometry` consistente entre teste e componente ✅
- `archetypeDisplayState` import já existe em `@/lib/bayesEngine` (verificado em Task 7) ✅

**Placeholder scan:**
- 0 TBD/TODO no plano
- Cada task tem código real
- Comandos têm output esperado

**YAGNI flags:**
- Não há test de integração da ceremony em browser (puppeteer/playwright) — smoke manual basta
- Não há áudio/haptic — defer pra refinement futuro
- Não há custom imagem/vídeo por arquétipo — gradient + avatar atual basta
