# Fase 2 — Engine Narrativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir atribuição de pesos fixa-por-opção por engine de intenção + contexto, com penalidade real de tempo, mantendo compat com decks legados durante a transição.

**Architecture:** Options ganham `intent` + `baseWeights` (opcionais). Nova função pura `resolveWeights(option, metadata, responseTimeMs)` aplica uma tabela `CONTEXT_MODIFIERS[intent]` acumulativa em cima de baseWeights. Fallback automático pro campo `weights` legado. `timeFactor(responseTimeMs)` com decay linear 6s→12s substitui o `timeTempero`. Pipeline downstream (tension × intensity) intocado.

**Tech Stack:** TypeScript 5, Node 20 built-in test runner (`node --test`) com loader `tsx`, Next.js 16, React 19, sem deps novas.

**Spec:** `docs/superpowers/specs/2026-04-19-fase-2-engine-narrativa-design.md`

---

## Estrutura de arquivos

### Criados

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/narrativeEngine/intents.ts` | Enum `OptionIntent` (8 valores) + labels PT. |
| `src/lib/narrativeEngine/timeFactor.ts` | Função pura da curva de tempo (decay linear 6s→12s). |
| `src/lib/narrativeEngine/metadataMatches.ts` | Predicado puro: `ModifierRule.when` casa `SceneMetadata`? |
| `src/lib/narrativeEngine/contextModifiers.ts` | Tabela `CONTEXT_MODIFIERS: Record<OptionIntent, ModifierRule[]>` (seed ~20 rules). |
| `src/lib/narrativeEngine/resolveWeights.ts` | Função pura `resolveWeights(option, metadata, responseTimeMs)` → `{ finalWeights, breakdown }`. |
| `src/lib/narrativeEngine/index.ts` | Barrel de export público. |
| `src/lib/narrativeEngine/__tests__/timeFactor.test.ts` | Pontos-chave da curva. |
| `src/lib/narrativeEngine/__tests__/metadataMatches.test.ts` | Matches simples, tensao ranges, AND de chaves. |
| `src/lib/narrativeEngine/__tests__/resolveWeights.test.ts` | Legacy path, intent+modifiers, múltiplos matches acumulativos, intent sem rules. |
| `scripts/retag-options.ts` | One-shot: lê decks, sugere `intent + baseWeights` via heurística, grava. |
| `scripts/compare-engine-golden.ts` | Golden test de regressão: compara axes antes/depois em 10 fixtures. |

### Modificados

| Arquivo | Mudança |
|---|---|
| `package.json` | Script `test` e `test:deck-engine`. |
| `src/types/game.ts` | `Option`: `weights` vira opcional; adiciona `intent?`, `baseWeights?`. |
| `scripts/validate-deck.ts` | Valida co-ocorrência `intent` ↔ `baseWeights`; `intent` no enum; pelo menos um de `intent/weights`. |
| `src/context/GameContext.tsx` | Payload de `ANSWER` muda; reducer chama `resolveWeights`; `timeTempero` removido; `applyDampenedWeights` usa `timeFactor`. |
| `src/app/play/[deckId]/page.tsx` | Dispatches de `ANSWER` passam `option` inteira (e `intensity`). |
| `src/data/decks/*.json` (12 decks) | Cada Option recebe `intent + baseWeights`. `weights` mantido como legado. |

---

## Task 1: Infra de testes Node built-in

**Files:**
- Modify: `package.json`
- Create: `src/lib/narrativeEngine/__tests__/smoke.test.ts`

Escolha: usar `node --test` (Node 20+) com loader `tsx` pra rodar `.test.ts` sem build. Sem deps novas — `tsx` já está instalado.

- [ ] **Step 1: Adiciona script `test` no package.json**

Abra `package.json` e dentro de `"scripts"`, adicione uma linha após `"deck:validate"`:

```json
"test": "node --test --import tsx 'src/**/*.test.ts'"
```

Resultado final do bloco `scripts`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "deck:validate": "npx tsx scripts/validate-deck.ts",
  "test": "node --test --import tsx 'src/**/*.test.ts'"
}
```

- [ ] **Step 2: Cria smoke test**

Crie `src/lib/narrativeEngine/__tests__/smoke.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node:test runner está funcionando', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: Roda smoke**

Comando: `npm test`
Esperado: 1 passing, 0 failing.

- [ ] **Step 4: Commit**

```bash
git add package.json src/lib/narrativeEngine/__tests__/smoke.test.ts
git commit -m "test(infra): node:test + tsx loader via npm test"
```

---

## Task 2: Enum `OptionIntent` e labels

**Files:**
- Create: `src/lib/narrativeEngine/intents.ts`

- [ ] **Step 1: Cria `intents.ts`**

```ts
/**
 * Intent declarado pela Option — o que o jogador está tentando fazer ao escolher.
 *
 * 8 valores ortogonais. Serve de chave para `CONTEXT_MODIFIERS`.
 * Não confundir com `Tone` (vigor emocional da fala); intent é sobre a jogada.
 */
export type OptionIntent =
  | 'confronto_publico'
  | 'confronto_privado'
  | 'retirada'
  | 'adesao'
  | 'contra_movimento'
  | 'investigacao'
  | 'provocacao'
  | 'protecao';

export const OPTION_INTENTS: OptionIntent[] = [
  'confronto_publico',
  'confronto_privado',
  'retirada',
  'adesao',
  'contra_movimento',
  'investigacao',
  'provocacao',
  'protecao',
];

export const OPTION_INTENT_LABELS: Record<OptionIntent, string> = {
  confronto_publico: 'Confronto publico',
  confronto_privado: 'Confronto privado',
  retirada: 'Retirada',
  adesao: 'Adesao',
  contra_movimento: 'Contra-movimento',
  investigacao: 'Investigacao',
  provocacao: 'Provocacao',
  protecao: 'Protecao',
};
```

- [ ] **Step 2: tsc check**

Comando: `npx tsc --noEmit`
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/narrativeEngine/intents.ts
git commit -m "feat(engine): OptionIntent — 8 intents ortogonais"
```

---

## Task 3: `timeFactor` — curva de tempo

**Files:**
- Create: `src/lib/narrativeEngine/timeFactor.ts`
- Test: `src/lib/narrativeEngine/__tests__/timeFactor.test.ts`

- [ ] **Step 1: Escreve teste falhando**

`src/lib/narrativeEngine/__tests__/timeFactor.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeFactor } from '../timeFactor';

test('undefined → 1.0 (neutro)', () => {
  assert.equal(timeFactor(undefined), 1.0);
});

test('0ms → 1.0', () => {
  assert.equal(timeFactor(0), 1.0);
});

test('6000ms (borda baixa) → 1.0', () => {
  assert.equal(timeFactor(6000), 1.0);
});

test('9000ms (meio da rampa) → 0.65', () => {
  assert.equal(Math.round(timeFactor(9000) * 100) / 100, 0.65);
});

test('12000ms (borda alta) → 0.3', () => {
  assert.equal(Math.round(timeFactor(12000) * 10) / 10, 0.3);
});

test('15000ms (além do limite) → 0.3 (clamp)', () => {
  assert.equal(Math.round(timeFactor(15000) * 10) / 10, 0.3);
});
```

- [ ] **Step 2: Roda teste, confirma falha**

Comando: `npm test`
Esperado: FAIL — `Cannot find module '../timeFactor'`.

- [ ] **Step 3: Implementa `timeFactor.ts`**

```ts
/**
 * Fator de tempo aplicado ao peso da resposta.
 *
 * Curva:
 *   - responseTimeMs = undefined → 1.0 (sem info, neutro)
 *   - responseTimeMs <= 6000ms   → 1.0
 *   - 6000 < responseTimeMs < 12000 → decay linear 1.0 → 0.3
 *   - responseTimeMs >= 12000ms  → 0.3 (clamp)
 *
 * Timeout absoluto (action 'TIMEOUT') não passa por aqui — resposta nem
 * é registrada com peso.
 *
 * Substitui o antigo `timeTempero` (que dava bump de 5% pra resposta rápida).
 * Conviccao vira responsabilidade exclusiva do `intensity` picker.
 */
export function timeFactor(responseTimeMs?: number): number {
  if (responseTimeMs === undefined) return 1.0;
  if (responseTimeMs <= 6000) return 1.0;
  if (responseTimeMs >= 12000) return 0.3;
  const t = (responseTimeMs - 6000) / 6000; // 0..1
  return 1.0 - (0.7 * t);
}
```

- [ ] **Step 4: Roda teste, confirma verde**

Comando: `npm test`
Esperado: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/narrativeEngine/timeFactor.ts src/lib/narrativeEngine/__tests__/timeFactor.test.ts
git commit -m "feat(engine): timeFactor — decay linear 6s→12s, sem bump pra resposta rapida"
```

---

## Task 4: `metadataMatches` — predicado de regra

**Files:**
- Create: `src/lib/narrativeEngine/metadataMatches.ts`
- Test: `src/lib/narrativeEngine/__tests__/metadataMatches.test.ts`

- [ ] **Step 1: Escreve teste falhando**

`src/lib/narrativeEngine/__tests__/metadataMatches.test.ts`:

```ts
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
```

- [ ] **Step 2: Roda teste, confirma falha**

Comando: `npm test`
Esperado: FAIL — `Cannot find module '../metadataMatches'`.

- [ ] **Step 3: Implementa `metadataMatches.ts`**

```ts
import type {
  SceneMetadata,
  Relacao,
  Aposta,
  Ambiente,
  Pilar,
} from '@/types/game';

/** Clausula `when` de um ModifierRule. Todas as chaves são AND. */
export interface ModifierWhen {
  relacao?: Relacao;
  aposta?: Aposta;
  ambiente?: Ambiente;
  pilar?: Pilar;
  tensaoMin?: 1 | 2 | 3 | 4 | 5;
  tensaoMax?: 1 | 2 | 3 | 4 | 5;
}

/**
 * True se TODAS as chaves presentes em `when` casam com `metadata`.
 * Chaves ausentes em `when` são ignoradas (wildcard).
 */
export function metadataMatches(when: ModifierWhen, m: SceneMetadata): boolean {
  if (when.relacao  && when.relacao  !== m.relacao)  return false;
  if (when.aposta   && when.aposta   !== m.aposta)   return false;
  if (when.ambiente && when.ambiente !== m.ambiente) return false;
  if (when.pilar    && when.pilar    !== m.pilar)    return false;
  if (when.tensaoMin !== undefined && m.tensao < when.tensaoMin) return false;
  if (when.tensaoMax !== undefined && m.tensao > when.tensaoMax) return false;
  return true;
}
```

- [ ] **Step 4: Roda teste, confirma verde**

Comando: `npm test`
Esperado: todos passando (smoke + timeFactor + metadataMatches = 16 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/narrativeEngine/metadataMatches.ts src/lib/narrativeEngine/__tests__/metadataMatches.test.ts
git commit -m "feat(engine): metadataMatches — AND de chaves opcionais, tensao com range"
```

---

## Task 5: Tabela `CONTEXT_MODIFIERS`

**Files:**
- Create: `src/lib/narrativeEngine/contextModifiers.ts`

Dado semântico — sem teste dedicado; corretude emerge dos testes de `resolveWeights` (Task 6).

- [ ] **Step 1: Cria `contextModifiers.ts`**

```ts
import type { StatKey } from '@/types/game';
import type { OptionIntent } from './intents';
import type { ModifierWhen } from './metadataMatches';

export interface ModifierRule {
  when: ModifierWhen;
  delta: Partial<Record<StatKey, number>>;
}

/**
 * Modificadores contextuais aplicados em cima de `Option.baseWeights`.
 *
 * Regra: pra cada Option.intent, engine avalia TODAS as rules; toda rule
 * cujo `when` casa a SceneMetadata soma seu `delta` em finalWeights.
 * Múltiplas rules no mesmo eixo acumulam.
 *
 * Seed inicial (~20 rules). Expande organicamente com Season 1 conforme
 * autor descobre padrões — edits à tabela são commits auditáveis.
 */
export const CONTEXT_MODIFIERS: Record<OptionIntent, ModifierRule[]> = {
  confronto_publico: [
    { when: { relacao: 'Autoridade', aposta: 'Status' }, delta: { vigor: +1, filtro: -1 } },
    { when: { relacao: 'Par',        aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
    { when: { relacao: 'Desconhecido' }, delta: { vigor: -1, presenca: +1 } },
    { when: { tensaoMin: 4 }, delta: { vigor: +1 } },
  ],

  confronto_privado: [
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1, presenca: +1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
  ],

  retirada: [
    { when: { tensaoMin: 4 }, delta: { desapego: +1, vigor: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
    { when: { aposta: 'Status' }, delta: { presenca: -1 } },
  ],

  adesao: [
    { when: { relacao: 'Autoridade' }, delta: { harmonia: +1, presenca: -1 } },
    { when: { relacao: 'Par' }, delta: { harmonia: +1 } },
  ],

  contra_movimento: [
    { when: { tensaoMin: 3 }, delta: { filtro: +1, vigor: +1 } },
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1 } },
  ],

  investigacao: [
    { when: { tensaoMax: 2 }, delta: { filtro: +1 } },
    { when: { tensaoMin: 4 }, delta: { filtro: +1, vigor: -1 } },
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1 } },
  ],

  provocacao: [
    { when: { relacao: 'Autoridade' }, delta: { vigor: +2, harmonia: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
  ],

  protecao: [
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1, filtro: +1 } },
    { when: { relacao: 'Desconhecido' }, delta: { desapego: +1 } },
  ],
};
```

- [ ] **Step 2: tsc check**

Comando: `npx tsc --noEmit`
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/narrativeEngine/contextModifiers.ts
git commit -m "feat(engine): CONTEXT_MODIFIERS — seed de ~20 rules por intent"
```

---

## Task 6: `resolveWeights` + barrel

**Files:**
- Create: `src/lib/narrativeEngine/resolveWeights.ts`
- Create: `src/lib/narrativeEngine/index.ts`
- Test: `src/lib/narrativeEngine/__tests__/resolveWeights.test.ts`

- [ ] **Step 1: Expõe `Option` com novos campos opcionais**

Abra `src/types/game.ts` e substitua a interface `Option` inteira (atualmente nas linhas ~76-103) por:

```ts
import type { OptionIntent } from '@/lib/narrativeEngine/intents';
// ... (adicionar este import perto do topo do arquivo, junto aos outros)

export interface Option {
  text: string;
  subtext: string;
  tone: Tone;

  /**
   * @deprecated Preferir `intent + baseWeights` (Fase 2).
   * Mantido como fallback até todo deck ser retaggeado e validado.
   */
  weights?: Partial<Record<StatKey, number>>;

  /** Intenção declarada do jogador ao escolher (Fase 2+). */
  intent?: OptionIntent;

  /**
   * Pesos base — "intenção pura", sem contexto. ±1 a ±2 por eixo.
   * Modifiers de `CONTEXT_MODIFIERS[intent]` somam em cima.
   */
  baseWeights?: Partial<Record<StatKey, number>>;

  feedback: string;
  /**
   * Post-decision narrative beat. Usado principalmente em campanha,
   * onde a pessoa fica olhando essa tela até a próxima cena destravar (até 24h).
   *
   * Convenção: 2-4 frases que (a) mostram consequência imediata e
   * (b) antecipam/ancoram a próxima cena — mudança de lugar, clima,
   * quem vai estar lá. Funciona como ponte narrativa.
   *
   * Se não definido, cai pro `feedback` (1 frase curta, suficiente
   * pra cenários normais).
   */
  aftermath?: string;
  /** Campaign only: id of the next scene to load after this choice.
   *  If omitted and `endingId` also omitted in a campaign, deck is treated linear (next in list). */
  nextSceneId?: string;
  /** Campaign only: id of the ending this choice resolves to.
   *  Marks a terminal option in the narrative graph. */
  endingId?: string;
}
```

Adicione o import no bloco de imports do arquivo se ainda não estiver lá. `src/types/game.ts` não importa nada hoje — adicione a linha `import type { OptionIntent } from '@/lib/narrativeEngine/intents';` como **primeira linha** do arquivo, antes dos comentários de seção.

- [ ] **Step 2: Valida com tsc**

Comando: `npx tsc --noEmit`
Esperado: sem erros. Os decks legados continuam compilando porque `weights` ficou opcional.

- [ ] **Step 3: Escreve teste de `resolveWeights`**

`src/lib/narrativeEngine/__tests__/resolveWeights.test.ts`:

```ts
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
  // confronto_publico @ Autoridade+Status: {vigor:+1, filtro:-1}
  // confronto_publico @ tensaoMin 4:        {vigor:+1}
  // base: {vigor:2} → final: {vigor:4, filtro:-1}
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
  // retirada @ tensaoMin 4: {desapego:+1, vigor:-1}
  // retirada @ aposta Status: {presenca:-1}
  // base: {desapego:1} → final: {desapego:2, vigor:-1, presenca:-1}
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
  // provocacao só tem rules pra Autoridade e Paz Emocional.
  // Metadata: Par + Status → nenhuma casa.
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

test('intent presente sem baseWeights → finalWeights vazio + warn via breakdown', () => {
  const option: Option = {
    text: 't', subtext: 's', tone: 'pragmatico',
    intent: 'confronto_publico',
    // baseWeights ausente (erro de validator em prod, mas defensive aqui)
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
```

- [ ] **Step 4: Roda teste, confirma falha**

Comando: `npm test`
Esperado: FAIL — `Cannot find module '../resolveWeights'`.

- [ ] **Step 5: Implementa `resolveWeights.ts`**

```ts
import type { Option, SceneMetadata, StatKey } from '@/types/game';
import { CONTEXT_MODIFIERS } from './contextModifiers';
import { metadataMatches } from './metadataMatches';
import { timeFactor } from './timeFactor';

export interface ResolvedWeights {
  finalWeights: Partial<Record<StatKey, number>>;
  /**
   * Debug trace. `applied` lista cada rule (pelo índice na tabela) que bateu.
   * `timeFactor` é reportado pra o reducer aplicar na etapa do pipeline —
   * NÃO é aplicado em `finalWeights`.
   */
  breakdown: {
    base: Partial<Record<StatKey, number>>;
    applied: Array<{ ruleIndex: number; delta: Partial<Record<StatKey, number>> }>;
    timeFactor: number;
  };
}

const EMPTY: Partial<Record<StatKey, number>> = {};

/**
 * Resolve os pesos finais de uma Option dada a metadata da cena.
 *
 * Contrato:
 *   - Se Option tem `intent` E `baseWeights` → soma modifiers de `CONTEXT_MODIFIERS[intent]`
 *     que casam a metadata em cima do `baseWeights`.
 *   - Se Option só tem `weights` (legacy) → retorna `weights` direto, sem modifiers.
 *   - Se Option tem `intent` sem `baseWeights` (estado inválido permitido em dev) →
 *     retorna `{}` vazio (defensive; validator de deck deve bloquear antes).
 *   - `timeFactor` é computado e reportado no breakdown mas não multiplicado
 *     em finalWeights. O reducer é quem aplica no pipeline (junto com
 *     tensionMult e intensityMult) pra manter um único ponto de aplicação.
 */
export function resolveWeights(
  option: Option,
  metadata: SceneMetadata,
  responseTimeMs?: number,
): ResolvedWeights {
  const tf = timeFactor(responseTimeMs);

  // Legacy path
  if (!option.intent || !option.baseWeights) {
    const legacy = option.weights ?? EMPTY;
    return {
      finalWeights: { ...legacy },
      breakdown: {
        base: { ...legacy },
        applied: [],
        timeFactor: tf,
      },
    };
  }

  const base = option.baseWeights;
  const final: Partial<Record<StatKey, number>> = { ...base };
  const rules = CONTEXT_MODIFIERS[option.intent] ?? [];
  const applied: ResolvedWeights['breakdown']['applied'] = [];

  rules.forEach((rule, ruleIndex) => {
    if (!metadataMatches(rule.when, metadata)) return;
    for (const [axis, delta] of Object.entries(rule.delta) as Array<[StatKey, number]>) {
      final[axis] = (final[axis] ?? 0) + delta;
    }
    applied.push({ ruleIndex, delta: { ...rule.delta } });
  });

  return {
    finalWeights: final,
    breakdown: { base: { ...base }, applied, timeFactor: tf },
  };
}
```

- [ ] **Step 6: Cria `index.ts` barrel**

`src/lib/narrativeEngine/index.ts`:

```ts
export type { OptionIntent } from './intents';
export { OPTION_INTENTS, OPTION_INTENT_LABELS } from './intents';
export type { ModifierRule, ModifierWhen } from './metadataMatches';
export { CONTEXT_MODIFIERS } from './contextModifiers';
export { metadataMatches } from './metadataMatches';
export { timeFactor } from './timeFactor';
export { resolveWeights, type ResolvedWeights } from './resolveWeights';
```

> Ajuste: `ModifierWhen` está em `metadataMatches.ts`, mas `ModifierRule` está em `contextModifiers.ts`. Corrija o barrel pra refletir:

```ts
export type { OptionIntent } from './intents';
export { OPTION_INTENTS, OPTION_INTENT_LABELS } from './intents';
export type { ModifierWhen } from './metadataMatches';
export { metadataMatches } from './metadataMatches';
export type { ModifierRule } from './contextModifiers';
export { CONTEXT_MODIFIERS } from './contextModifiers';
export { timeFactor } from './timeFactor';
export { resolveWeights, type ResolvedWeights } from './resolveWeights';
```

- [ ] **Step 7: Roda testes, confirma verde**

Comando: `npm test`
Esperado: todos passando (smoke + timeFactor + metadataMatches + resolveWeights).

- [ ] **Step 8: tsc check**

Comando: `npx tsc --noEmit`
Esperado: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/lib/narrativeEngine/resolveWeights.ts src/lib/narrativeEngine/index.ts src/lib/narrativeEngine/__tests__/resolveWeights.test.ts src/types/game.ts
git commit -m "feat(engine): resolveWeights + Option.intent/baseWeights, legacy fallback preservado"
```

---

## Task 7: Validator reconhece intent + baseWeights

**Files:**
- Modify: `scripts/validate-deck.ts`

Regras novas:
1. Se `intent` presente, `baseWeights` obrigatório (e vice-versa).
2. Se `intent` presente, precisa estar no enum `OPTION_INTENTS`.
3. Uma Option precisa ter pelo menos um de: `(intent + baseWeights)` OU `weights`.
4. `baseWeights` segue as mesmas regras de `weights` (pelo menos um positivo E um negativo, sum abs ≤ 3).

- [ ] **Step 1: Abre `scripts/validate-deck.ts` e adiciona constante**

Logo abaixo de `const VALID_RARITIES = ...` (linha ~24), adicione:

```ts
const VALID_INTENTS = [
  'confronto_publico', 'confronto_privado', 'retirada', 'adesao',
  'contra_movimento', 'investigacao', 'provocacao', 'protecao',
] as const;
```

- [ ] **Step 2: Substitui bloco de validação de weights (dentro de `options.forEach`)**

Substitua as linhas 157-170 (o bloco "4b. Weights: at least one positive AND one negative" + "7. Weight sum warning") por:

```ts
      // 4b. Option precisa ter peso — novo (intent+baseWeights) ou legacy (weights)
      const hasIntent = typeof opt.intent === 'string';
      const hasBase = opt.baseWeights && typeof opt.baseWeights === 'object';
      const hasLegacy = opt.weights && typeof opt.weights === 'object';

      if (hasIntent && !VALID_INTENTS.includes(opt.intent)) {
        err(`${oLabel}: intent "${opt.intent}" nao esta em VALID_INTENTS`);
      }
      if (hasIntent && !hasBase) {
        err(`${oLabel}: intent presente mas baseWeights ausente`);
      }
      if (hasBase && !hasIntent) {
        err(`${oLabel}: baseWeights presente mas intent ausente`);
      }
      if (!hasIntent && !hasLegacy) {
        err(`${oLabel}: Option precisa de (intent+baseWeights) ou weights (legacy)`);
      }

      // Checa forma dos weights que existirem (base e/ou legacy)
      const checkShape = (label: string, w: Record<string, number>) => {
        const vals = Object.values(w);
        const hasPos = vals.some((v) => v > 0);
        const hasNeg = vals.some((v) => v < 0);
        if (!hasPos || !hasNeg) {
          err(`${oLabel}: ${label} precisa de pelo menos um valor positivo E um negativo`);
        }
        const sum = vals.reduce((a, b) => a + b, 0);
        if (Math.abs(sum) > 3) {
          warn(`${oLabel}: ${label} sum ${sum} (abs > 3)`);
        }
      };

      if (hasLegacy) checkShape('weights', opt.weights);
      if (hasBase)   checkShape('baseWeights', opt.baseWeights);

      // Usa baseWeights se houver, senão weights, pro tracking de dominant axis
      const effective: Record<string, number> = hasBase ? opt.baseWeights : (opt.weights ?? {});
```

Depois, logo após, o bloco existente que rastreia dominant axis usa a variável `weights` — renomeie pra `effective`:

```ts
      // Track dominant axis (highest absolute weight)
      let maxAbs = 0;
      let dominant = "";
      for (const [axis, val] of Object.entries(effective)) {
        if (Math.abs(val as number) > maxAbs) {
          maxAbs = Math.abs(val as number);
          dominant = axis;
        }
      }
      if (dominant) dominantAxes.add(dominant);

      // Track axis appearances across all options
      for (const axis of Object.keys(effective)) {
        axisAppearances[axis] = (axisAppearances[axis] || 0) + 1;
      }
```

A declaração antiga `const weights: Record<string, number> = opt.weights ?? {};` (linha 158 original) sai junto no substituto acima.

- [ ] **Step 3: Roda validator nos decks atuais**

Comando: `npm run deck:validate`
Esperado: todos os 12 decks passam (erros seriam esperados só depois do retag — que ainda não rodou). Warnings sobre `weights sum > 3` podem aparecer em decks existentes (pré-existentes). Se houver errors novos, investigue antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-deck.ts
git commit -m "feat(validator): valida intent↔baseWeights e fallback legacy"
```

---

## Task 8: Pipeline do reducer — payload novo + resolveWeights

**Files:**
- Modify: `src/context/GameContext.tsx`

Duas mudanças atômicas: (a) tipo da action, (b) body do case `ANSWER`. Nada mais do reducer é afetado.

- [ ] **Step 1: Atualiza tipo da action `ANSWER`**

Em `src/context/GameContext.tsx`, linha 55, substitua:

```ts
  | { type: 'ANSWER'; weights: Partial<Record<StatKey, number>>; tone: Tone; responseTimeMs?: number; intensity?: AnswerIntensity }
```

por:

```ts
  | { type: 'ANSWER'; option: Option; responseTimeMs?: number; intensity?: AnswerIntensity }
```

Certifique-se de que `Option` está no bloco de imports de `@/types/game` (provavelmente já está, junto com `AnswerIntensity` etc).

- [ ] **Step 2: Adiciona import de `resolveWeights`**

No bloco de imports no topo de `GameContext.tsx`, adicione:

```ts
import { resolveWeights } from '@/lib/narrativeEngine';
```

- [ ] **Step 3: Substitui body do case `ANSWER`**

Encontre o case `ANSWER` (linha ~315, começa com `case 'ANSWER': {`). Substitua o case INTEIRO por:

```ts
    case 'ANSWER': {
      const question = state.activeDeck?.questions[state.currentQuestion];
      if (!question) return state;

      const resolved = resolveWeights(action.option, question.metadata, action.responseTimeMs);
      const tensao = question.metadata.tensao;

      return {
        ...state,
        calibration: applyDampenedWeights(
          state.calibration,
          resolved.finalWeights,
          action.option.tone,
          tensao,
          action.responseTimeMs,
          action.intensity,
        ),
        activeRun: state.activeRun
          ? appendRunAnswer(
              state.activeRun,
              question.id,
              action.option.tone,
              resolved.finalWeights,
              action.responseTimeMs,
            )
          : state.activeRun,
      };
    }
```

O shape do case novo preserva: passa `finalWeights` pra ambas calibration e appendRunAnswer. `tone` sai de `action.option.tone`. `tensao` sai de `question.metadata`. Nada mais muda.

- [ ] **Step 4: tsc check**

Comando: `npx tsc --noEmit`
Esperado: 2 erros em `src/app/play/[deckId]/page.tsx` — os callsites passam o shape antigo. Próxima task resolve.

- [ ] **Step 5: Commit parcial (ainda com tsc vermelho esperado nos callers)**

```bash
git add src/context/GameContext.tsx
git commit -m "refactor(context): ANSWER carrega Option inteira e usa resolveWeights"
```

(Commit parcial propositalmente — a próxima task fecha o loop.)

---

## Task 9: Callers do `ANSWER` passam Option inteira

**Files:**
- Modify: `src/app/play/[deckId]/page.tsx`

- [ ] **Step 1: Atualiza `handleResolvedAnswer` (linha ~58)**

Substitua o callback:

```ts
  const handleResolvedAnswer = useCallback((option: Option, responseTimeMs: number) => {
    dispatch({ type: 'ANSWER', weights: option.weights, tone: option.tone, responseTimeMs });
    playUiCue('hold-confirm');
    vibrate(18);
  }, [dispatch, playUiCue, vibrate]);
```

por:

```ts
  const handleResolvedAnswer = useCallback((option: Option, responseTimeMs: number) => {
    dispatch({ type: 'ANSWER', option, responseTimeMs });
    playUiCue('hold-confirm');
    vibrate(18);
  }, [dispatch, playUiCue, vibrate]);
```

- [ ] **Step 2: Atualiza o segundo callsite (linha ~152)**

Localize a linha `dispatch({ type: 'ANSWER', weights: option.weights, tone: option.tone, responseTimeMs, intensity });` e substitua por:

```ts
      dispatch({ type: 'ANSWER', option, responseTimeMs, intensity });
```

- [ ] **Step 3: tsc check**

Comando: `npx tsc --noEmit`
Esperado: sem erros.

- [ ] **Step 4: Roda testes + validator + build como sanity**

```bash
npm test && npm run deck:validate && npm run build
```

Esperado: tudo verde. Decks legados continuam rodando via fallback de `weights` porque `resolveWeights` aceita Option sem intent/baseWeights.

- [ ] **Step 5: Commit**

```bash
git add src/app/play/[deckId]/page.tsx
git commit -m "refactor(play): dispatches de ANSWER passam Option inteira"
```

---

## Task 10: Substituir `timeTempero` por `timeFactor`

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Remove `timeTempero`**

Em `src/context/GameContext.tsx`, encontre a função `timeTempero` (linha ~96) e apague o bloco inteiro:

```ts
function timeTempero(responseTimeMs?: number): number {
  if (responseTimeMs === undefined) return 1.0;
  if (responseTimeMs < 2000) return 1.05;
  if (responseTimeMs > 9000) return 0.95;
  return 1.0;
}
```

(O comentário JSDoc acima da função também sai.)

- [ ] **Step 2: Adiciona import de `timeFactor`**

No import existente `import { resolveWeights } from '@/lib/narrativeEngine';` (Task 8), adicione `timeFactor`:

```ts
import { resolveWeights, timeFactor } from '@/lib/narrativeEngine';
```

- [ ] **Step 3: Substitui chamada dentro de `applyDampenedWeights`**

Dentro da função `applyDampenedWeights` (linha ~110), substitua a linha:

```ts
  const timeMult = timeTempero(responseTimeMs);
```

por:

```ts
  const timeMult = timeFactor(responseTimeMs);
```

Nada mais muda — a variável `timeMult` é usada na multiplicação `adjustedW = w * tensionMultiplier * intensityMult * timeMult` (linha 129), que continua idêntica.

- [ ] **Step 4: Atualiza o JSDoc acima de `applyDampenedWeights`**

O comentário diz "Time is a light tempero only". Substitua a frase por:

```
 * Time is a real penalty curve (`timeFactor`) — hesitation over 6s
 * progressively drops the weight toward 0.3 at the 12s timeout.
```

- [ ] **Step 5: tsc + tests**

```bash
npx tsc --noEmit && npm test
```

Esperado: sem erros, testes verdes.

- [ ] **Step 6: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "refactor(context): timeFactor substitui timeTempero (sem bump pra resposta rapida)"
```

---

## Task 11: Script de retag — heurística

**Files:**
- Create: `scripts/retag-options.ts`

Script one-shot. Lê cada deck JSON, sugere `intent + baseWeights` em cada Option que não tenha, grava. Mantém `weights` legado. Imprime diff legível ao final.

- [ ] **Step 1: Cria `scripts/retag-options.ts`**

```ts
#!/usr/bin/env tsx
/**
 * Retag one-shot: para cada Option em src/data/decks/*.json, sugere
 * (intent, baseWeights) via heurística sobre (tone, weights), grava
 * in-place (mantendo `weights` legado), imprime diff resumido.
 *
 * Uso:
 *   npx tsx scripts/retag-options.ts             # todos os decks, sobrescreve
 *   npx tsx scripts/retag-options.ts --dry       # só imprime, não grava
 */

import * as fs from 'fs';
import * as path from 'path';

type Axis = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
type Tone = 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';
type Intent =
  | 'confronto_publico' | 'confronto_privado' | 'retirada'
  | 'adesao' | 'contra_movimento' | 'investigacao'
  | 'provocacao' | 'protecao';

interface RawOption {
  text: string;
  subtext: string;
  tone: Tone;
  weights?: Partial<Record<Axis, number>>;
  intent?: Intent;
  baseWeights?: Partial<Record<Axis, number>>;
  [k: string]: unknown;
}

const DECKS_DIR = path.resolve(process.cwd(), 'src/data/decks');
const DRY = process.argv.includes('--dry');

function strongest(weights: Partial<Record<Axis, number>>): { axis: Axis | null; value: number } {
  let axis: Axis | null = null;
  let best = 0;
  for (const [a, v] of Object.entries(weights) as Array<[Axis, number]>) {
    if (v > best) { axis = a; best = v; }
  }
  return { axis, value: best };
}

function weight(w: Partial<Record<Axis, number>>, axis: Axis): number {
  return w[axis] ?? 0;
}

/**
 * Heurística de sugestão de intent.
 * Documentada na tabela do spec: (tone × eixo dominante × magnitude) → intent.
 */
function suggestIntent(tone: Tone, w: Partial<Record<Axis, number>>): Intent {
  const { axis, value } = strongest(w);

  if (tone === 'provocativo') {
    return (axis === 'vigor' && value >= 2) ? 'confronto_publico' : 'provocacao';
  }
  if (tone === 'pragmatico') {
    if (axis === 'vigor' && value >= 2 && weight(w, 'filtro') >= 1) return 'confronto_privado';
    if (axis === 'filtro' && value >= 2) return 'investigacao';
    if (axis === 'desapego' && value >= 2) return 'retirada';
    return 'confronto_privado';
  }
  if (tone === 'protetor') {
    if (axis === 'filtro' || (axis === 'harmonia' && value >= 2)) return 'protecao';
    return 'protecao';
  }
  if (tone === 'evasivo') {
    if (axis === 'desapego' && value >= 1) return 'retirada';
    return 'contra_movimento';
  }
  if (tone === 'neutro') {
    if (axis === 'harmonia' && value >= 2) return 'adesao';
    if (axis === 'filtro' && value >= 1) return 'investigacao';
    if (axis === 'presenca' && value >= 1) return 'adesao';
    return 'adesao';
  }
  return 'contra_movimento';
}

/** baseWeights sugerido: cada valor de weights dividido por 2, arredondado; zeros omitidos. */
function suggestBase(w: Partial<Record<Axis, number>>): Partial<Record<Axis, number>> {
  const base: Partial<Record<Axis, number>> = {};
  for (const [axis, v] of Object.entries(w) as Array<[Axis, number]>) {
    const halved = Math.round(v / 2);
    if (halved !== 0) base[axis] = halved;
  }
  // Garante "pelo menos um positivo E um negativo" — o validator exige.
  // Se tudo ficou zero ou do mesmo sinal, tenta fallback preservando sinais:
  const vals = Object.values(base) as number[];
  const hasPos = vals.some((v) => v > 0);
  const hasNeg = vals.some((v) => v < 0);
  if (!hasPos || !hasNeg) {
    // Fallback: pega os extremos do weights original.
    let maxAxis: Axis | null = null, minAxis: Axis | null = null;
    let maxV = -Infinity, minV = Infinity;
    for (const [a, v] of Object.entries(w) as Array<[Axis, number]>) {
      if (v > maxV) { maxV = v; maxAxis = a; }
      if (v < minV) { minV = v; minAxis = a; }
    }
    base[maxAxis as Axis] = 1;
    base[minAxis as Axis] = -1;
  }
  return base;
}

function process(filePath: string): { changed: boolean; diffs: string[] } {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const diffs: string[] = [];
  const deckId = raw.deckId ?? path.basename(filePath, '.json');

  for (const q of raw.questions ?? []) {
    for (let i = 0; i < (q.options ?? []).length; i++) {
      const opt: RawOption = q.options[i];
      if (opt.intent && opt.baseWeights) continue; // Já retaggeado
      if (!opt.weights) continue;                  // Sem weights nem base — skip

      const intent = suggestIntent(opt.tone, opt.weights);
      const base = suggestBase(opt.weights);

      opt.intent = intent;
      opt.baseWeights = base;

      diffs.push(`${deckId} › ${q.id} › Opt${i + 1}: intent=${intent}, base=${JSON.stringify(base)} (de weights=${JSON.stringify(opt.weights)})`);
    }
  }

  if (!DRY && diffs.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
  }
  return { changed: diffs.length > 0, diffs };
}

function main() {
  const files = fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json'));
  let total = 0;
  for (const f of files) {
    const full = path.join(DECKS_DIR, f);
    const { changed, diffs } = process(full);
    if (changed) {
      console.log(`\n--- ${f} (${diffs.length} options retaggeadas) ---`);
      for (const d of diffs) console.log('  ' + d);
      total += diffs.length;
    }
  }
  console.log(`\n${DRY ? '[dry] ' : ''}Total: ${total} options retaggeadas em ${files.length} decks.`);
}

main();
```

- [ ] **Step 2: Dry run pra sanidade**

Comando: `npx tsx scripts/retag-options.ts --dry`
Esperado: lista longa de diffs, dos 12 decks (exceto calibragem pura de format:quick se não tiver weights — mas todos têm). **Não grava**.

Leia o output. Todo intent sugerido faz sentido? Se 2-3 opções parecem mal taggadas, anote pra corrigir manualmente depois.

- [ ] **Step 3: Commit do script (antes de rodar real)**

```bash
git add scripts/retag-options.ts
git commit -m "tool(retag): script one-shot de sugestao intent+baseWeights"
```

---

## Task 12: Rodar retag e revisar diffs

**Files:**
- Modify: `src/data/decks/*.json` (12 arquivos)

- [ ] **Step 1: Rodar retag real**

Comando: `npx tsx scripts/retag-options.ts`
Esperado: output idêntico ao dry, agora os arquivos foram reescritos.

- [ ] **Step 2: Verifica diff do git**

Comando: `git diff --stat src/data/decks/`
Esperado: 12 arquivos modificados, só adições (intent + baseWeights novos em cada Option).

- [ ] **Step 3: Valida decks**

Comando: `npm run deck:validate`
Esperado: sem errors. Warnings podem aparecer em `baseWeights` com sum > 3 — investigue e, se o caso, corrija manualmente o JSON.

- [ ] **Step 4: Roda build**

Comando: `npm run build`
Esperado: sucesso — verifica que os JSONs parseiam bem via import + que o pipeline novo não quebra nada em runtime.

- [ ] **Step 5: Smoke manual no app (opcional mas recomendado)**

Inicie dev server (`npm run dev`), abra um deck não-calibragem (ex: alta_tensao), jogue 2-3 perguntas. Veja se tudo roda sem console error. Feche o server.

- [ ] **Step 6: Commit**

```bash
git add src/data/decks/
git commit -m "feat(decks): retag mecanico de todas as Options com intent+baseWeights"
```

---

## Task 13: Golden test de regressão axes

**Files:**
- Create: `scripts/compare-engine-golden.ts`

Este script não é automatizado verde/vermelho — é auditoria visual. Ele:
1. Simula 10 respostas específicas (fixtures).
2. Computa axes resultantes via `weights` legado (pipeline antigo simulado) vs via `finalWeights` (pipeline novo).
3. Imprime tabela de comparação por eixo.

A aprovação é humana: o autor lê e valida que o delta faz sentido (vigor caindo em contextos onde saturava, outros eixos compensando).

- [ ] **Step 1: Cria `scripts/compare-engine-golden.ts`**

```ts
#!/usr/bin/env tsx
/**
 * Golden test manual: compara axes computados pelo pipeline legado (weights fixo)
 * vs pipeline novo (baseWeights + CONTEXT_MODIFIERS) em 10 cenas fixas.
 *
 * Reporte somente — não falha. Autor revisa e decide se o delta é aceitável.
 *
 * Uso: npx tsx scripts/compare-engine-golden.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveWeights } from '@/lib/narrativeEngine';
import type { Option, SceneMetadata, StatKey } from '@/types/game';

const DECKS_DIR = path.resolve(process.cwd(), 'src/data/decks');

interface Fixture {
  deckId: string;
  questionId: string;
  optionIndex: number;
  responseTimeMs: number;
}

/**
 * 10 fixtures: 2 opções por deck em 5 decks não-calibragem. Responder
 * sempre a primeira opção (geralmente a mais "vigorosa") pra testar o
 * caso que satura hoje.
 */
const FIXTURES: Fixture[] = [
  { deckId: 'alta_tensao',       questionId: 'at1', optionIndex: 0, responseTimeMs: 4000 },
  { deckId: 'alta_tensao',       questionId: 'at2', optionIndex: 0, responseTimeMs: 5500 },
  { deckId: 'profissional',      questionId: 'pr1', optionIndex: 0, responseTimeMs: 3000 },
  { deckId: 'profissional',      questionId: 'pr2', optionIndex: 1, responseTimeMs: 7000 },
  { deckId: 'social',            questionId: 'so1', optionIndex: 0, responseTimeMs: 4500 },
  { deckId: 'social',            questionId: 'so2', optionIndex: 2, responseTimeMs: 6500 },
  { deckId: 'holofote',          questionId: 'ho1', optionIndex: 0, responseTimeMs: 3800 },
  { deckId: 'holofote',          questionId: 'ho2', optionIndex: 1, responseTimeMs: 8000 },
  { deckId: 'livro_amaldicoado', questionId: 'la1', optionIndex: 0, responseTimeMs: 5000 },
  { deckId: 'livro_amaldicoado', questionId: 'la2', optionIndex: 1, responseTimeMs: 4200 },
];

const AXES: StatKey[] = ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'];

function loadDeck(deckId: string): any {
  return JSON.parse(fs.readFileSync(path.join(DECKS_DIR, `${deckId}.json`), 'utf-8'));
}

function zeros(): Record<StatKey, number> {
  return { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 };
}

function main() {
  let legacySum = zeros();
  let newSum = zeros();

  console.log('Fixture-by-fixture:\n');
  console.log('deck/qid/opt           | legacy weights           | new finalWeights         | delta');
  console.log('-'.repeat(110));

  for (const f of FIXTURES) {
    const deck = loadDeck(f.deckId);
    const question = (deck.questions as any[]).find((q) => q.id === f.questionId);
    if (!question) { console.warn(`Pulou: ${f.deckId}/${f.questionId} nao encontrado`); continue; }
    const option = question.options[f.optionIndex] as Option;
    if (!option) { console.warn(`Pulou: ${f.deckId}/${f.questionId}/opt${f.optionIndex}`); continue; }
    const meta = question.metadata as SceneMetadata;

    // Legacy: só weights, sem modifiers
    const legacy = option.weights ?? {};
    // New: pelo pipeline
    const resolved = resolveWeights(option, meta, f.responseTimeMs);

    const deltaStr = AXES.map((a) => {
      const L = legacy[a] ?? 0;
      const N = resolved.finalWeights[a] ?? 0;
      legacySum[a] += L;
      newSum[a] += N;
      return `${a[0]}:${N - L >= 0 ? '+' : ''}${N - L}`;
    }).join(' ');

    console.log(
      `${f.deckId.padEnd(18)} ${f.questionId}/${f.optionIndex} | ${JSON.stringify(legacy).padEnd(24)} | ${JSON.stringify(resolved.finalWeights).padEnd(24)} | ${deltaStr}`,
    );
  }

  console.log('\nSoma total (10 fixtures):');
  console.log('axis      | legacy | new   | delta');
  console.log('-'.repeat(40));
  for (const a of AXES) {
    console.log(`${a.padEnd(9)} | ${String(legacySum[a]).padStart(6)} | ${String(newSum[a]).padStart(5)} | ${(newSum[a] - legacySum[a] >= 0 ? '+' : '')}${newSum[a] - legacySum[a]}`);
  }

  console.log('\nCritério de sanidade:');
  console.log('  - Vigor total deve cair ou se manter vs legacy.');
  console.log('  - Harmonia/filtro/presenca/desapego podem subir (compensa vigor saturado).');
  console.log('  - Nenhum eixo deve se mover >3x o legacy em magnitude absoluta.');
}

main();
```

- [ ] **Step 2: Roda o golden**

Comando: `npx tsx scripts/compare-engine-golden.ts`
Esperado: tabela de 10 linhas + resumo. **Sem erro**. O soma-total do vigor deve estar ≤ legacy; pelo menos um outro eixo compensa.

Se vigor **subiu** vs legacy, algo está errado na tabela CONTEXT_MODIFIERS ou na heurística do retag. Investigar antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add scripts/compare-engine-golden.ts
git commit -m "tool(engine): golden test comparando axes legacy vs novo pipeline"
```

---

## Task 14: Sanity final — build + tsc + tests + validator

**Files:** nenhum — só verificação.

- [ ] **Step 1: Roda tudo**

```bash
npx tsc --noEmit && npm test && npm run deck:validate && npm run build
```

Esperado: todos verdes. Se build falhar especificamente por algo não-relacionado (ex: plugin), registre, mas não é bloqueio da Fase 2.

- [ ] **Step 2: Commit de milestone (se houver algo pendente no working tree, senão pula)**

Se o working tree está limpo, nenhuma ação. Caso contrário:

```bash
git status
# revise
git add .
git commit -m "chore: fase 2 (engine narrativa) completa"
```

---

## Self-review notes (autor do plan)

**Spec coverage:**
- ✅ OptionIntent + 8 valores → Task 2.
- ✅ timeFactor decay linear 6s→12s → Task 3.
- ✅ CONTEXT_MODIFIERS aditivo + AND acumulativo → Tasks 4, 5, 6.
- ✅ resolveWeights com fallback legacy → Task 6.
- ✅ Option.intent/baseWeights opcionais → Task 6.
- ✅ Validator atualizado → Task 7.
- ✅ Reducer ANSWER payload novo → Task 8.
- ✅ Callers atualizados → Task 9.
- ✅ timeTempero removido, timeFactor em applyDampenedWeights → Task 10.
- ✅ Script de retag com heurística do spec → Task 11.
- ✅ Retag real + validação → Task 12.
- ✅ Golden test de regressão → Task 13.

**Fora do plan (escopo Fase 2.5):** reescrita narrativa (P1 outro ambíguo, P2 dossiê completo), remoção do campo `weights` legado, UI de breakdown pro autor. Confirmado como explicitamente fora do escopo no spec.

**Type consistency:** `OptionIntent` (2), `ModifierWhen` (4), `ModifierRule` (5), `resolveWeights` (6), `CONTEXT_MODIFIERS` (5) — todos os símbolos aparecem consistentes entre tasks. Barrel em Task 6 step 6 exporta tudo.
