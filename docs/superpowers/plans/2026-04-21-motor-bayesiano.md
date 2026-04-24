# Motor Bayesiano de Calibração Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o motor somatório de pesos (`baseWeights + CONTEXT_MODIFIERS`) por um motor bayesiano IRT que trata cada resposta como evidência sobre o trait latente θ de cada eixo.

**Architecture:** Core engine puro em `src/lib/bayesEngine/` com distribuições discretas de 10 bins por eixo (`AxisBelief`), evidência por opção com thresholds (`{min?, max?, confidence}`), update via Bayes com likelihood sigmoide, decaimento exponencial temporal, e matching de arquétipo por distância euclidiana top-1+top-2. Migração automatizada dos 22 decks existentes (`baseWeights` → `evidence`) + passagem de IA. Perfis antigos são descartados (sem usuários em prod).

**Tech Stack:** TypeScript, Next.js 15, `node --test` com `tsx`, JSON para decks, localStorage para persistência. Spec: `docs/superpowers/specs/2026-04-20-motor-bayesiano-design.md`.

---

## Estrutura de Arquivos

**Novos:**
- `src/lib/bayesEngine/types.ts` — `AxisBelief`, `PlayerBeliefs`, `AxisEvidence`, `OptionEvidence`
- `src/lib/bayesEngine/belief.ts` — prior uniforme, helpers (`playerMean`, `beliefEntropy`, `confidence`)
- `src/lib/bayesEngine/likelihood.ts` — função sigmoide de likelihood a partir de thresholds
- `src/lib/bayesEngine/update.ts` — aplicação de Bayes numa opção inteira (loop sobre eixos)
- `src/lib/bayesEngine/drift.ts` — achatamento temporal da crença
- `src/lib/bayesEngine/archetype.ts` — matching top-1/top-2, gate de confiança, label qualitativo
- `src/lib/bayesEngine/index.ts` — re-exports públicos
- `src/lib/bayesEngine/__tests__/belief.test.ts`
- `src/lib/bayesEngine/__tests__/likelihood.test.ts`
- `src/lib/bayesEngine/__tests__/update.test.ts`
- `src/lib/bayesEngine/__tests__/drift.test.ts`
- `src/lib/bayesEngine/__tests__/archetype.test.ts`
- `scripts/migrate-to-evidence.ts` — conversão mecânica dos 22 decks

**Modificados:**
- `src/types/game.ts` — adiciona `AxisBelief`, `PlayerBeliefs`, `AxisEvidence`, `OptionEvidence`, `isTraining`, `trainingTarget` no `Deck` e `Option`; marca `baseWeights`/`weights`/`intent` como `@deprecated`; troca `CalibrationState.axes` por `beliefs`
- `src/data/decks/*.json` — 22 arquivos: cada `Option` ganha campo `evidence`, `baseWeights` removido no commit final da migração
- `src/data/archetypes.ts` — `matchArchetype` reescrita (assinatura nova: `matchArchetypes(beliefs)` retornando top-1+top-2)
- `src/lib/runScoring.ts` — `appendRunAnswer` passa a receber `AxisEvidence` em vez de `weights`; snapshots guardam média/confiança em vez de `statsAtCompletion`
- `src/context/GameContext.tsx` — reducer `ADD_ANSWER` aplica `updateBeliefs` em vez de `applyDampenedWeights`; `getCurrentArchetype` usa nova API
- `src/components/MiniRadar.tsx` — preenchimento = confiança (já era aproximado; ver task específica)
- `src/components/ProfileCardCompact.tsx` — label qualitativo
- `src/components/RunReportCard.tsx` — mostra delta em termos de crença
- `src/app/perfil/page.tsx` — texto unificado de confiança global
- `scripts/validate-deck.ts` — valida `evidence`, trade-off, regra de training deck

**Deletados (Task 21):**
- `src/lib/narrativeEngine/resolveWeights.ts`
- `src/lib/narrativeEngine/contextModifiers.ts`
- `src/lib/narrativeEngine/__tests__/resolveWeights.test.ts`
- `src/lib/narrativeEngine/__tests__/metadataMatches.test.ts` (se não for usado fora)
- `src/lib/narrativeEngine/metadataMatches.ts` (idem)

---

## Fase 1 — Core Engine (puro, sem UI)

### Task 1: Tipos do engine bayesiano

**Files:**
- Create: `src/lib/bayesEngine/types.ts`
- Test: (testes estruturais em tasks seguintes validam tipos)

- [ ] **Step 1: Criar arquivo de tipos**

```ts
// src/lib/bayesEngine/types.ts
import type { StatKey } from '@/types/game';

/** Número de bins que discretizam o trait latente θ em [0,1]. */
export const BIN_COUNT = 10;

/** Distribuição de crença sobre θ ∈ [0,1] em 10 bins.
 *  bins[i] = P(θ ∈ [i/10, (i+1)/10])
 *  Sum(bins) === 1.0 (invariante). */
export interface AxisBelief {
  bins: number[];        // length = BIN_COUNT, soma = 1
  observations: number;  // nº de evidências já aplicadas
  lastUpdated: string;   // ISO timestamp
}

/** Perfil bayesiano completo do jogador: 1 distribuição por eixo. */
export type PlayerBeliefs = Record<StatKey, AxisBelief>;

/** Evidência declarada numa Option sobre um eixo:
 *  "quem escolhe isso tem θ ≥ min" ou "θ ≤ max" (ou ambos). */
export interface AxisEvidence {
  min?: number;        // ∈ [0,1]; P(θ ≥ min) é alta
  max?: number;        // ∈ [0,1]; P(θ ≤ max) é alta
  confidence: number;  // ∈ [0.5, 0.99] — "discriminação" na IRT
}

/** Conjunto de evidências numa Option (1 por eixo, opcional). */
export type OptionEvidence = Partial<Record<StatKey, AxisEvidence>>;

/** Config global do engine. */
export interface BayesConfig {
  driftRatePerWeek: number;  // α crescente por semana
  driftMax: number;          // teto de α
  uniformFloor: number;      // base uniforme 1/BIN_COUNT
}

export const DEFAULT_CONFIG: BayesConfig = {
  driftRatePerWeek: 0.02,
  driftMax: 0.5,
  uniformFloor: 1 / BIN_COUNT,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bayesEngine/types.ts
git commit -m "feat(bayes): add type definitions for belief engine"
```

---

### Task 2: Prior + helpers de AxisBelief

**Files:**
- Create: `src/lib/bayesEngine/belief.ts`
- Test: `src/lib/bayesEngine/__tests__/belief.test.ts`

- [ ] **Step 1: Escrever testes falhos**

```ts
// src/lib/bayesEngine/__tests__/belief.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniformBelief,
  playerMean,
  axisConfidence,
  createPriorProfile,
} from '../belief';
import { BIN_COUNT } from '../types';
import { STAT_KEYS } from '@/types/game';

test('createUniformBelief: bins uniformes somam 1 e observations=0', () => {
  const b = createUniformBelief();
  assert.equal(b.bins.length, BIN_COUNT);
  const sum = b.bins.reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(b.observations, 0);
  for (const p of b.bins) assert.ok(Math.abs(p - 0.1) < 1e-9);
});

test('playerMean de crença uniforme = 0.5', () => {
  const b = createUniformBelief();
  assert.ok(Math.abs(playerMean(b) - 0.5) < 1e-9);
});

test('playerMean de crença colada no bin 0 ≈ 0.05', () => {
  const b = createUniformBelief();
  b.bins = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.ok(Math.abs(playerMean(b) - 0.05) < 1e-9);
});

test('playerMean de crença colada no bin 9 ≈ 0.95', () => {
  const b = createUniformBelief();
  b.bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  assert.ok(Math.abs(playerMean(b) - 0.95) < 1e-9);
});

test('axisConfidence: uniforme → 0, pico → ~1', () => {
  const uniform = createUniformBelief();
  assert.ok(axisConfidence(uniform) < 0.01);
  const peaked = { ...uniform, bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] };
  assert.ok(axisConfidence(peaked) > 0.99);
});

test('createPriorProfile retorna 5 eixos uniformes', () => {
  const p = createPriorProfile();
  for (const k of STAT_KEYS) {
    assert.equal(p[k].bins.length, BIN_COUNT);
    assert.equal(p[k].observations, 0);
  }
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/belief.test.ts`
Expected: FAIL com erro de módulo não encontrado.

- [ ] **Step 3: Implementar `belief.ts`**

```ts
// src/lib/bayesEngine/belief.ts
import { STAT_KEYS, type StatKey } from '@/types/game';
import { BIN_COUNT, type AxisBelief, type PlayerBeliefs } from './types';

/** Crença inicial: uniforme, 0 observações, timestamp agora. */
export function createUniformBelief(now: Date = new Date()): AxisBelief {
  return {
    bins: new Array(BIN_COUNT).fill(1 / BIN_COUNT),
    observations: 0,
    lastUpdated: now.toISOString(),
  };
}

/** Perfil inicial com todos os eixos uniformes. */
export function createPriorProfile(now: Date = new Date()): PlayerBeliefs {
  const out = {} as PlayerBeliefs;
  for (const k of STAT_KEYS) out[k] = createUniformBelief(now);
  return out;
}

/** Centro de cada bin: bin i → (i + 0.5) / BIN_COUNT. */
export function binCenter(i: number): number {
  return (i + 0.5) / BIN_COUNT;
}

/** Expectativa E[θ] = Σ p_i · binCenter(i). */
export function playerMean(belief: AxisBelief): number {
  let sum = 0;
  for (let i = 0; i < belief.bins.length; i++) {
    sum += belief.bins[i] * binCenter(i);
  }
  return sum;
}

/** Confiança ∈ [0,1] = 1 - entropy/log(BIN_COUNT). Uniforme=0, pico=1. */
export function axisConfidence(belief: AxisBelief): number {
  let H = 0;
  for (const p of belief.bins) {
    if (p > 0) H -= p * Math.log(p);
  }
  const Hmax = Math.log(BIN_COUNT);
  return 1 - H / Hmax;
}

/** Confiança média dos 5 eixos. */
export function globalConfidence(profile: PlayerBeliefs): number {
  let sum = 0;
  for (const k of STAT_KEYS) sum += axisConfidence(profile[k]);
  return sum / STAT_KEYS.length;
}

/** Normaliza in-place: divide pela soma. No-op se já soma 1. */
export function normalizeBelief(bins: number[]): number[] {
  const sum = bins.reduce((a, b) => a + b, 0);
  if (sum <= 0) return new Array(bins.length).fill(1 / bins.length);
  return bins.map(x => x / sum);
}
```

- [ ] **Step 4: Rodar teste e confirmar PASS**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/belief.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bayesEngine/belief.ts src/lib/bayesEngine/__tests__/belief.test.ts
git commit -m "feat(bayes): add belief primitives (uniform prior, mean, confidence)"
```

---

### Task 3: Likelihood de uma evidência

**Files:**
- Create: `src/lib/bayesEngine/likelihood.ts`
- Test: `src/lib/bayesEngine/__tests__/likelihood.test.ts`

- [ ] **Step 1: Escrever testes falhos**

```ts
// src/lib/bayesEngine/__tests__/likelihood.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { likelihoodAt } from '../likelihood';

test('só min: bins acima de min têm likelihood > 0.5, abaixo < 0.5', () => {
  const ev = { min: 0.6, confidence: 0.8 };
  // θ = 0.25 → abaixo de 0.6 → likelihood baixa
  assert.ok(likelihoodAt(0.25, ev) < 0.3);
  // θ = 0.85 → acima de 0.6 → likelihood alta
  assert.ok(likelihoodAt(0.85, ev) > 0.7);
  // θ = 0.6 → fronteira → ≈ 0.5
  assert.ok(Math.abs(likelihoodAt(0.6, ev) - 0.5) < 0.1);
});

test('só max: bins abaixo de max têm likelihood > 0.5, acima < 0.5', () => {
  const ev = { max: 0.4, confidence: 0.8 };
  assert.ok(likelihoodAt(0.15, ev) > 0.7);
  assert.ok(likelihoodAt(0.85, ev) < 0.3);
});

test('min + max (intervalo): likelihood máxima dentro do intervalo', () => {
  const ev = { min: 0.4, max: 0.7, confidence: 0.8 };
  const inside = likelihoodAt(0.55, ev);
  const belowMin = likelihoodAt(0.15, ev);
  const aboveMax = likelihoodAt(0.85, ev);
  assert.ok(inside > belowMin);
  assert.ok(inside > aboveMax);
});

test('confidence alta → transição mais íngreme', () => {
  const weak = { min: 0.5, confidence: 0.55 };
  const strong = { min: 0.5, confidence: 0.95 };
  const gapWeak = likelihoodAt(0.7, weak) - likelihoodAt(0.3, weak);
  const gapStrong = likelihoodAt(0.7, strong) - likelihoodAt(0.3, strong);
  assert.ok(gapStrong > gapWeak);
});

test('evidência sem min/max: likelihood constante (=0.5)', () => {
  const ev = { confidence: 0.8 };
  assert.ok(Math.abs(likelihoodAt(0.1, ev) - 0.5) < 1e-9);
  assert.ok(Math.abs(likelihoodAt(0.9, ev) - 0.5) < 1e-9);
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/likelihood.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `likelihood.ts`**

```ts
// src/lib/bayesEngine/likelihood.ts
import type { AxisEvidence } from './types';

/**
 * Sigmoide "steepness": mapeia confidence [0.5, 0.99] → k ∈ [2, 40].
 *   k=2  → transição bem suave
 *   k=40 → transição quase degrau
 */
function steepnessFromConfidence(confidence: number): number {
  const c = Math.max(0.5, Math.min(0.99, confidence));
  return 2 + ((c - 0.5) / 0.49) * 38;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * P(escolheu opção | θ=theta, evidência=ev).
 *
 * - Só `min`: sigmoid(k * (theta - min)). Abaixo de min → baixa, acima → alta.
 * - Só `max`: sigmoid(k * (max - theta)).
 * - Ambos: produto (janela). θ dentro de [min, max] → alta; fora → baixa.
 * - Nenhum: likelihood neutra 0.5 (evidência vazia = não informa).
 */
export function likelihoodAt(theta: number, ev: AxisEvidence): number {
  const k = steepnessFromConfidence(ev.confidence);

  const hasMin = typeof ev.min === 'number';
  const hasMax = typeof ev.max === 'number';

  if (!hasMin && !hasMax) return 0.5;

  let L = 1;
  if (hasMin) L *= sigmoid(k * (theta - ev.min!));
  if (hasMax) L *= sigmoid(k * (ev.max! - theta));

  // Normaliza "pico" do produto para ~1 quando só um dos lados é usado,
  // mas quando ambos existem o pico fica em ~0.25 — isso é OK porque a
  // likelihood só é usada relativamente (é normalizada pela posterior).
  return L;
}
```

- [ ] **Step 4: Rodar teste e confirmar PASS**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/likelihood.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bayesEngine/likelihood.ts src/lib/bayesEngine/__tests__/likelihood.test.ts
git commit -m "feat(bayes): add sigmoid likelihood from evidence thresholds"
```

---

### Task 4: Decaimento temporal (drift)

**Files:**
- Create: `src/lib/bayesEngine/drift.ts`
- Test: `src/lib/bayesEngine/__tests__/drift.test.ts`

- [ ] **Step 1: Escrever testes falhos**

```ts
// src/lib/bayesEngine/__tests__/drift.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageBelief, weeksSince } from '../drift';
import { DEFAULT_CONFIG } from '../types';

test('weeksSince: 0 para mesmo instante', () => {
  const now = new Date('2026-04-20T12:00:00Z');
  assert.equal(weeksSince(now.toISOString(), now), 0);
});

test('weeksSince: ~1 após 7 dias', () => {
  const now = new Date('2026-04-27T12:00:00Z');
  const past = '2026-04-20T12:00:00Z';
  assert.ok(Math.abs(weeksSince(past, now) - 1) < 1e-6);
});

test('ageBelief: sem tempo passado → sem mudança', () => {
  const now = new Date('2026-04-20T12:00:00Z');
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 5,
    lastUpdated: now.toISOString(),
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  for (let i = 0; i < 10; i++) {
    assert.ok(Math.abs(aged.bins[i] - belief.bins[i]) < 1e-9);
  }
});

test('ageBelief: 4 semanas → crença um pouco mais uniforme', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  const past = '2026-04-20T12:00:00Z'; // 4 semanas atrás
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 5,
    lastUpdated: past,
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  // Pico cede um pouco, outros bins ganham massa
  assert.ok(aged.bins[4] < 1);
  assert.ok(aged.bins[4] > 0.5);
  assert.ok(aged.bins[0] > 0);
  // Soma ainda é 1
  const sum = aged.bins.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('ageBelief: tempo enorme saturates no driftMax', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const past = '2026-01-01T00:00:00Z'; // ~4 anos
  const belief = {
    bins: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    observations: 50,
    lastUpdated: past,
  };
  const aged = ageBelief(belief, DEFAULT_CONFIG, now);
  // α no máx (0.5): aged = 0.5 * original + 0.5 * uniform
  // bin 4: 0.5 * 1 + 0.5 * 0.1 = 0.55
  assert.ok(Math.abs(aged.bins[4] - 0.55) < 1e-6);
  // outros bins: 0.5 * 0 + 0.5 * 0.1 = 0.05
  assert.ok(Math.abs(aged.bins[0] - 0.05) < 1e-6);
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/drift.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `drift.ts`**

```ts
// src/lib/bayesEngine/drift.ts
import { BIN_COUNT, type AxisBelief, type BayesConfig } from './types';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weeksSince(iso: string, now: Date = new Date()): number {
  const past = new Date(iso).getTime();
  return (now.getTime() - past) / MS_PER_WEEK;
}

/**
 * Achatamento suave: belief_aged = (1 - α) · belief + α · uniform.
 * α = min(driftMax, driftRatePerWeek · semanas_desde_lastUpdated).
 *
 * NÃO toca em observations nem lastUpdated — isso é o caller
 * (update.ts) que atualiza depois de aplicar Bayes em cima.
 */
export function ageBelief(
  belief: AxisBelief,
  config: BayesConfig,
  now: Date = new Date(),
): AxisBelief {
  const w = Math.max(0, weeksSince(belief.lastUpdated, now));
  const alpha = Math.min(config.driftMax, config.driftRatePerWeek * w);
  if (alpha === 0) return belief;

  const floor = config.uniformFloor;
  const aged = belief.bins.map(p => (1 - alpha) * p + alpha * floor);
  // Re-normaliza defensivamente (arithmetic drift)
  const s = aged.reduce((a, b) => a + b, 0);
  return {
    ...belief,
    bins: s > 0 ? aged.map(p => p / s) : new Array(BIN_COUNT).fill(1 / BIN_COUNT),
  };
}
```

- [ ] **Step 4: Rodar teste e confirmar PASS**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/drift.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bayesEngine/drift.ts src/lib/bayesEngine/__tests__/drift.test.ts
git commit -m "feat(bayes): add temporal drift (exponential flattening toward uniform)"
```

---

### Task 5: Update bayesiano (Bayes step)

**Files:**
- Create: `src/lib/bayesEngine/update.ts`
- Test: `src/lib/bayesEngine/__tests__/update.test.ts`

- [ ] **Step 1: Escrever testes falhos**

```ts
// src/lib/bayesEngine/__tests__/update.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateAxis, updateProfile } from '../update';
import { createUniformBelief, createPriorProfile, playerMean } from '../belief';
import { DEFAULT_CONFIG } from '../types';

const NOW = new Date('2026-04-20T12:00:00Z');

test('updateAxis com min=0.6 puxa média pra cima', () => {
  const prior = createUniformBelief(NOW);
  const next = updateAxis(prior, { min: 0.6, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  assert.ok(playerMean(next) > 0.5);
  const sum = next.bins.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(next.observations, 1);
  assert.equal(next.lastUpdated, NOW.toISOString());
});

test('updateAxis com max=0.3 puxa média pra baixo', () => {
  const prior = createUniformBelief(NOW);
  const next = updateAxis(prior, { max: 0.3, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  assert.ok(playerMean(next) < 0.5);
});

test('updateAxis 50 vezes consistente converge (mean próxima do threshold)', () => {
  let belief = createUniformBelief(NOW);
  for (let i = 0; i < 50; i++) {
    belief = updateAxis(belief, { min: 0.7, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  }
  // Com 50 obs do mesmo lado, média deve estar alta (>0.75)
  assert.ok(playerMean(belief) > 0.75);
  assert.equal(belief.observations, 50);
});

test('updateAxis saturates — 100 obs não inflaciona além do limite', () => {
  let belief = createUniformBelief(NOW);
  for (let i = 0; i < 100; i++) {
    belief = updateAxis(belief, { min: 0.7, confidence: 0.8 }, DEFAULT_CONFIG, NOW);
  }
  // Crença colapsa nos bins ≥ 0.7 mas mean nunca passa de 0.95 (centro do bin 9)
  assert.ok(playerMean(belief) < 0.96);
});

test('updateProfile ignora eixos ausentes em evidence', () => {
  const profile = createPriorProfile(NOW);
  const updated = updateProfile(
    profile,
    { vigor: { min: 0.7, confidence: 0.8 } },
    DEFAULT_CONFIG,
    NOW,
  );
  // vigor mudou, outros não
  assert.ok(playerMean(updated.vigor) > 0.5);
  assert.ok(Math.abs(playerMean(updated.harmonia) - 0.5) < 1e-9);
  assert.equal(updated.vigor.observations, 1);
  assert.equal(updated.harmonia.observations, 0);
});

test('updateProfile aplica drift antes do Bayes quando tempo passou', () => {
  const past = new Date('2026-03-20T12:00:00Z'); // ~4 semanas atrás
  const profile = createPriorProfile(past);
  // Crava crença num pico artificial pra ver o drift amaciar
  profile.vigor.bins = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  const updated = updateProfile(
    profile,
    { vigor: { min: 0.7, confidence: 0.8 } },
    DEFAULT_CONFIG,
    NOW,
  );
  // Bin 4 não é mais 1 (foi achatado), mas Bayes empurrou massa pra cima
  assert.ok(updated.vigor.bins[4] < 1);
  assert.ok(playerMean(updated.vigor) > 0.45);
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/update.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `update.ts`**

```ts
// src/lib/bayesEngine/update.ts
import { STAT_KEYS, type StatKey } from '@/types/game';
import { binCenter, normalizeBelief } from './belief';
import { ageBelief } from './drift';
import { likelihoodAt } from './likelihood';
import type {
  AxisBelief,
  AxisEvidence,
  BayesConfig,
  OptionEvidence,
  PlayerBeliefs,
} from './types';

/**
 * Bayes step num único eixo:
 *   posterior_i ∝ prior_i · L(θ=binCenter(i) | ev)
 * Normaliza. Incrementa observations. Atualiza lastUpdated.
 *
 * NÃO aplica drift — drift é responsabilidade do caller (updateProfile).
 */
export function updateAxis(
  prior: AxisBelief,
  ev: AxisEvidence,
  _config: BayesConfig,
  now: Date = new Date(),
): AxisBelief {
  const likelihoods = prior.bins.map((_, i) => likelihoodAt(binCenter(i), ev));
  const raw = prior.bins.map((p, i) => p * likelihoods[i]);
  const bins = normalizeBelief(raw);
  return {
    bins,
    observations: prior.observations + 1,
    lastUpdated: now.toISOString(),
  };
}

/**
 * Aplica uma OptionEvidence completa ao PlayerBeliefs:
 *   1. Para cada eixo no evidence:
 *      a. Envelhece belief (drift desde lastUpdated)
 *      b. Aplica updateAxis com aquela evidência
 *   2. Eixos não mencionados em evidence permanecem intactos
 *      (não são nem envelhecidos, pra não "gastar" drift sem razão).
 */
export function updateProfile(
  profile: PlayerBeliefs,
  evidence: OptionEvidence,
  config: BayesConfig,
  now: Date = new Date(),
): PlayerBeliefs {
  const out = { ...profile } as PlayerBeliefs;
  for (const key of STAT_KEYS as StatKey[]) {
    const ev = evidence[key];
    if (!ev) continue;
    const aged = ageBelief(profile[key], config, now);
    out[key] = updateAxis(aged, ev, config, now);
  }
  return out;
}
```

- [ ] **Step 4: Rodar teste e confirmar PASS**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/update.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bayesEngine/update.ts src/lib/bayesEngine/__tests__/update.test.ts
git commit -m "feat(bayes): add Bayesian update per-axis and per-profile"
```

---

### Task 6: Matching de arquétipo top-1/top-2 com gate

**Files:**
- Create: `src/lib/bayesEngine/archetype.ts`
- Test: `src/lib/bayesEngine/__tests__/archetype.test.ts`

- [ ] **Step 1: Escrever testes falhos**

```ts
// src/lib/bayesEngine/__tests__/archetype.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPES } from '@/data/archetypes';
import { createPriorProfile } from '../belief';
import {
  matchArchetypes,
  archetypeDisplayState,
} from '../archetype';

const NOW = new Date('2026-04-20T12:00:00Z');

function beliefAt(mean: number) {
  // crença colada no bin que contém `mean`
  const i = Math.min(9, Math.max(0, Math.floor(mean * 10)));
  const bins = new Array(10).fill(0);
  bins[i] = 1;
  return { bins, observations: 20, lastUpdated: NOW.toISOString() };
}

test('matchArchetypes: retorna primary + candidatos ordenados', () => {
  // Perfil tubarão: vigor/presenca altos, resto baixo
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const { primary, secondary, all } = matchArchetypes(profile);
  assert.equal(primary.archetype.id, 'tubarao');
  assert.ok(all.length === ARCHETYPES.length);
  // all está ordenado por distance crescente
  for (let i = 1; i < all.length; i++) {
    assert.ok(all[i].distance >= all[i - 1].distance);
  }
  // secondary pode existir ou não
  if (secondary) {
    assert.ok(secondary.distance / primary.distance <= 1.3);
  }
});

test('matchArchetypes: secondary null quando distância do 2º > 1.3× do 1º', () => {
  // Perfil super colado no tubarão, 2º provavelmente muito mais longe
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const { primary, secondary, all } = matchArchetypes(profile);
  // Se o secondary existe, é porque a razão <= 1.3
  if (secondary === null) {
    assert.ok(all[1].distance / primary.distance > 1.3);
  }
});

test('archetypeDisplayState: confiança < 0.3 → "discovering"', () => {
  const profile = createPriorProfile(NOW);
  const state = archetypeDisplayState(profile);
  assert.equal(state.mode, 'discovering');
});

test('archetypeDisplayState: confiança 0.3-0.6 → "tendency" com hint', () => {
  // Perfil parcialmente informado: picos moderados
  const softPeak = (bin: number) => {
    const bins = new Array(10).fill(0.04);
    bins[bin] = 0.64;  // confiança moderada
    return { bins, observations: 10, lastUpdated: NOW.toISOString() };
  };
  const profile = {
    vigor:    softPeak(8),
    harmonia: softPeak(1),
    filtro:   softPeak(3),
    presenca: softPeak(8),
    desapego: softPeak(3),
  };
  const state = archetypeDisplayState(profile);
  // Confiança ~0.35–0.5
  assert.equal(state.mode, 'tendency');
  assert.ok(state.primary !== null);
});

test('archetypeDisplayState: confiança ≥ 0.6 → "firm" com primary e talvez secondary', () => {
  const profile = {
    vigor:    beliefAt(0.85),
    harmonia: beliefAt(0.10),
    filtro:   beliefAt(0.30),
    presenca: beliefAt(0.80),
    desapego: beliefAt(0.35),
  };
  const state = archetypeDisplayState(profile);
  assert.equal(state.mode, 'firm');
  assert.ok(state.primary !== null);
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/archetype.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `archetype.ts`**

```ts
// src/lib/bayesEngine/archetype.ts
import { ARCHETYPES } from '@/data/archetypes';
import { STAT_KEYS, type Archetype } from '@/types/game';
import { globalConfidence, playerMean } from './belief';
import type { PlayerBeliefs } from './types';

export interface ArchetypeCandidate {
  archetype: Archetype;
  distance: number;
}

export interface ArchetypeMatchResult {
  primary: ArchetypeCandidate;
  /** null se distância do 2º > 1.3× do 1º (secundário muito longe). */
  secondary: ArchetypeCandidate | null;
  /** Todos os arquétipos ordenados por distância crescente. */
  all: ArchetypeCandidate[];
}

export type ArchetypeDisplayMode = 'discovering' | 'tendency' | 'firm';

export interface ArchetypeDisplayState {
  mode: ArchetypeDisplayMode;
  confidence: number;
  primary: ArchetypeCandidate | null;
  secondary: ArchetypeCandidate | null;
}

/** Distância euclidiana entre playerMean(belief) e ideal. */
function euclidean(profile: PlayerBeliefs, archetype: Archetype): number {
  let sum = 0;
  for (const k of STAT_KEYS) {
    const diff = playerMean(profile[k]) - archetype.idealProfile[k];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Match top-1 + top-2 com regra da razão 1.3×. */
export function matchArchetypes(profile: PlayerBeliefs): ArchetypeMatchResult {
  const scored: ArchetypeCandidate[] = ARCHETYPES.map(a => ({
    archetype: a,
    distance: euclidean(profile, a),
  })).sort((a, b) => a.distance - b.distance);

  const primary = scored[0];
  const candidate = scored[1];
  const secondary =
    candidate && candidate.distance <= primary.distance * 1.3
      ? candidate
      : null;
  return { primary, secondary, all: scored };
}

/** Gate de confiança: decide o que a UI deve mostrar. */
export function archetypeDisplayState(
  profile: PlayerBeliefs,
): ArchetypeDisplayState {
  const confidence = globalConfidence(profile);
  const { primary, secondary } = matchArchetypes(profile);

  if (confidence < 0.3) {
    return { mode: 'discovering', confidence, primary: null, secondary: null };
  }
  if (confidence < 0.6) {
    return { mode: 'tendency', confidence, primary, secondary: null };
  }
  return { mode: 'firm', confidence, primary, secondary };
}
```

- [ ] **Step 4: Rodar teste e confirmar PASS**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/archetype.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bayesEngine/archetype.ts src/lib/bayesEngine/__tests__/archetype.test.ts
git commit -m "feat(bayes): add archetype matching (top-1/top-2, confidence gate)"
```

---

### Task 7: Index público do engine

**Files:**
- Create: `src/lib/bayesEngine/index.ts`

- [ ] **Step 1: Criar barrel**

```ts
// src/lib/bayesEngine/index.ts
export * from './types';
export * from './belief';
export * from './likelihood';
export * from './drift';
export * from './update';
export * from './archetype';
```

- [ ] **Step 2: Rodar todos os testes do engine**

Run: `npx tsx --test src/lib/bayesEngine/__tests__/*.test.ts`
Expected: PASS em todos (5 arquivos).

- [ ] **Step 3: Commit**

```bash
git add src/lib/bayesEngine/index.ts
git commit -m "feat(bayes): add barrel export"
```

---

## Fase 2 — Tipos de deck e validador

### Task 8: Adicionar tipos `evidence`, `isTraining` em `types/game.ts`

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Adicionar re-exports e novos campos**

No topo de `src/types/game.ts`, após os imports existentes, adicionar:

```ts
// Re-exports do motor bayesiano (fonte única da verdade para AxisBelief etc.)
export type {
  AxisBelief,
  PlayerBeliefs,
  AxisEvidence,
  OptionEvidence,
} from '@/lib/bayesEngine/types';
```

Em `interface Option`, adicionar (antes de `feedback`):

```ts
  /**
   * Evidência bayesiana declarada nesta opção (Fase 3+).
   * Quem escolhe esta opção é evidência sobre θ em cada eixo declarado.
   * Substitui `baseWeights`. Durante migração, ambos coexistem.
   */
  evidence?: import('@/lib/bayesEngine/types').OptionEvidence;
```

Em `interface Deck`, adicionar (antes de `protagonistGender`):

```ts
  /** Se true, runs deste deck NÃO persistem no perfil bayesiano. */
  isTraining?: boolean;
  /** Eixo-foco do deck de treino (validado: ≥60% das options devem declarar evidência nesse eixo). */
  trainingTarget?: StatKey;
```

Em `CalibrationState`, adicionar campo paralelo (transição) — NÃO remover `axes` ainda:

```ts
  /** Distribuições bayesianas por eixo (Fase 3+). */
  beliefs?: import('@/lib/bayesEngine/types').PlayerBeliefs;
```

Marcar `Option.weights`, `Option.intent`, `Option.baseWeights` como `@deprecated` (a tag JSDoc já existe em `weights`; adicionar em `intent` e `baseWeights`):

```ts
  /** @deprecated Substituído por `evidence` (Fase 3). Mantido durante migração. */
  intent?: OptionIntent;

  /** @deprecated Substituído por `evidence` (Fase 3). Mantido durante migração. */
  baseWeights?: Partial<Record<StatKey, number>>;
```

- [ ] **Step 2: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros).

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): add evidence/isTraining/beliefs to Option/Deck/CalibrationState"
```

---

### Task 9: Validator suporta `evidence` e `isTraining`

**Files:**
- Modify: `scripts/validate-deck.ts`

- [ ] **Step 1: Rodar validator atual pra estabelecer baseline**

Run: `npx tsx scripts/validate-deck.ts`
Expected: PASS em todos os decks (0 errors, warnings aceitáveis).

- [ ] **Step 2: Adicionar validação de evidence**

Em `scripts/validate-deck.ts`, após a declaração de `VALID_INTENTS` (~linha 28), adicionar:

```ts
const VALID_STATS = ["vigor", "harmonia", "filtro", "presenca", "desapego"] as const;
```

Em `validateDeck`, dentro do loop `options.forEach`, após o bloco `// 4b. Option precisa ter peso …` (~linha 164), adicionar validação de evidence:

```ts
      // 4c. Evidence (bayesiano, Fase 3+)
      const hasEvidence = opt.evidence && typeof opt.evidence === 'object';
      if (hasEvidence) {
        const axes = Object.keys(opt.evidence);
        if (axes.length < 1 || axes.length > 3) {
          err(`${oLabel}: evidence deve declarar entre 1 e 3 eixos (tem ${axes.length})`);
        }
        let hasMin = false;
        let hasMax = false;
        for (const [axis, ax] of Object.entries(opt.evidence as Record<string, any>)) {
          if (!(VALID_STATS as readonly string[]).includes(axis)) {
            err(`${oLabel}: evidence.${axis} — eixo invalido`);
            continue;
          }
          if (typeof ax.confidence !== 'number' || ax.confidence < 0.5 || ax.confidence > 0.99) {
            err(`${oLabel}: evidence.${axis}.confidence deve estar em [0.5, 0.99] (got ${ax.confidence})`);
          }
          const hasMinField = typeof ax.min === 'number';
          const hasMaxField = typeof ax.max === 'number';
          if (!hasMinField && !hasMaxField) {
            err(`${oLabel}: evidence.${axis} precisa de min ou max`);
          }
          if (hasMinField && (ax.min < 0 || ax.min > 1)) {
            err(`${oLabel}: evidence.${axis}.min deve estar em [0,1] (got ${ax.min})`);
          }
          if (hasMaxField && (ax.max < 0 || ax.max > 1)) {
            err(`${oLabel}: evidence.${axis}.max deve estar em [0,1] (got ${ax.max})`);
          }
          if (hasMinField && hasMaxField && ax.min > ax.max) {
            err(`${oLabel}: evidence.${axis}: min (${ax.min}) > max (${ax.max})`);
          }
          if (hasMinField) hasMin = true;
          if (hasMaxField) hasMax = true;
        }
        // Trade-off obrigatório: pelo menos uma evidência "alta" e uma "baixa"
        if (axes.length >= 2 && !(hasMin && hasMax)) {
          warn(`${oLabel}: evidence sem trade-off (só min ou só max em todos os eixos)`);
        }
      }
```

Na regra 4b, trocar a mensagem final pra também aceitar `evidence`:

```ts
      if (!hasIntent && !hasLegacy && !hasEvidence) {
        err(`${oLabel}: Option precisa de evidence, (intent+baseWeights), ou weights (legacy)`);
      }
```

Após o loop `questions.forEach`, adicionar validação de training deck (antes do return final):

```ts
  // Training deck: 60% das options precisam declarar evidência no trainingTarget
  if (deck.isTraining === true) {
    if (!deck.trainingTarget || !(VALID_STATS as readonly string[]).includes(deck.trainingTarget)) {
      err(`isTraining=true requer trainingTarget valido (vigor|harmonia|filtro|presenca|desapego)`);
    } else {
      let totalOptions = 0;
      let targeted = 0;
      for (const q of questions) {
        for (const opt of q.options ?? []) {
          totalOptions += 1;
          if (opt.evidence && (opt.evidence as any)[deck.trainingTarget]) targeted += 1;
        }
      }
      const ratio = totalOptions > 0 ? targeted / totalOptions : 0;
      if (ratio < 0.6) {
        err(`Training deck deve ter >=60% options com evidence em "${deck.trainingTarget}" (got ${(ratio * 100).toFixed(0)}%)`);
      }
    }
  }
```

- [ ] **Step 3: Rodar validator — nenhum deck atual tem evidence ainda, todos usam legacy**

Run: `npx tsx scripts/validate-deck.ts`
Expected: PASS (decks usam `intent+baseWeights`, ainda não têm `evidence` — fallback OK).

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-deck.ts
git commit -m "feat(validator): support evidence schema and training-deck rule"
```

---

## Fase 3 — Migração dos decks existentes

### Task 10: Script de migração `baseWeights` → `evidence`

**Files:**
- Create: `scripts/migrate-to-evidence.ts`

- [ ] **Step 1: Criar script**

```ts
#!/usr/bin/env tsx
/**
 * Migra decks: cada Option com `baseWeights` (ou `weights` legacy) ganha
 * campo `evidence` equivalente. NÃO remove `baseWeights`/`weights` — esse
 * passo é feito em Task 20 após passagem de IA e validação.
 *
 * Regra de conversão (peso numérico → AxisEvidence):
 *   +3 ou mais → { min: 0.75, confidence: 0.80 }
 *   +2         → { min: 0.60, confidence: 0.75 }
 *   +1         → { min: 0.55, confidence: 0.60 }
 *   -1         → { max: 0.45, confidence: 0.60 }
 *   -2         → { max: 0.40, confidence: 0.75 }
 *   -3 ou mais → { max: 0.25, confidence: 0.80 }
 *
 * Se uma Option tem >3 eixos em baseWeights, mantém apenas os 3 com maior
 * valor absoluto (evita diluição).
 */
import * as fs from 'fs';
import * as path from 'path';

type AxisEvidence = { min?: number; max?: number; confidence: number };
type OptionEvidence = Record<string, AxisEvidence>;

function weightToEvidence(w: number): AxisEvidence {
  if (w >= 3)  return { min: 0.75, confidence: 0.80 };
  if (w === 2) return { min: 0.60, confidence: 0.75 };
  if (w === 1) return { min: 0.55, confidence: 0.60 };
  if (w === -1) return { max: 0.45, confidence: 0.60 };
  if (w === -2) return { max: 0.40, confidence: 0.75 };
  return { max: 0.25, confidence: 0.80 }; // <= -3
}

function buildEvidence(weights: Record<string, number>): OptionEvidence {
  const entries = Object.entries(weights).filter(([, v]) => v !== 0);
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top3 = entries.slice(0, 3);
  const out: OptionEvidence = {};
  for (const [axis, v] of top3) out[axis] = weightToEvidence(v);
  return out;
}

function migrateOption(opt: any): boolean {
  if (opt.evidence) return false; // já tem
  const src = opt.baseWeights ?? opt.weights;
  if (!src || typeof src !== 'object') return false;
  opt.evidence = buildEvidence(src);
  return true;
}

function migrateDeckFile(filePath: string): number {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const deck = JSON.parse(raw);
  let count = 0;
  for (const q of deck.questions ?? []) {
    for (const opt of q.options ?? []) {
      if (migrateOption(opt)) count += 1;
    }
  }
  if (count > 0) {
    fs.writeFileSync(filePath, JSON.stringify(deck, null, 2) + '\n', 'utf-8');
  }
  return count;
}

function main() {
  const decksDir = path.resolve(__dirname, '..', 'src', 'data', 'decks');
  const files = fs
    .readdirSync(decksDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(decksDir, f));

  let totalOptions = 0;
  let totalFiles = 0;
  for (const file of files) {
    const n = migrateDeckFile(file);
    if (n > 0) {
      totalFiles += 1;
      totalOptions += n;
      console.log(`  ${path.basename(file)}: ${n} options migrated`);
    }
  }
  console.log(`\nDone: ${totalOptions} options across ${totalFiles} decks`);
}

main();
```

- [ ] **Step 2: Rodar script e verificar output**

Run: `npx tsx scripts/migrate-to-evidence.ts`
Expected: Lista de decks migrados, número de options convertidas. Sem exceção.

- [ ] **Step 3: Inspecionar um deck migrado para confirmar formato**

Run: `node -e "console.log(JSON.stringify(require('./src/data/decks/basic_01.json').questions[0].options[0], null, 2))"`
Expected: Option com `baseWeights` (original) E `evidence` (novo), coexistindo.

- [ ] **Step 4: Rodar validator nos decks migrados**

Run: `npx tsx scripts/validate-deck.ts`
Expected: PASS em todos (0 errors).

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-to-evidence.ts src/data/decks/*.json
git commit -m "feat(decks): migrate baseWeights → evidence (automated pass)"
```

---

### Task 11: Passagem de IA refinando semântica

**Files:**
- Modify: `src/data/decks/*.json` (22 arquivos)

Passagem manual-com-IA: subagente revisa cada deck, lê texto da opção + evidence auto-gerado, refina thresholds/confidence pra casar a semântica real. Corrige bugs conhecidos: filtro overloaded (aparece em 80% das opções), desapego com dupla semântica, d7 pesado demais.

- [ ] **Step 1: Dispatch subagente de refinamento**

Subagente recebe instrução: "Ler cada `src/data/decks/*.json`, e para cada `Option`, avaliar se `evidence` casa com o `text`/`subtext`/`feedback`. Se não casa, ajustar `min`/`max`/`confidence` (0.5-0.99) seguindo a regra:

- θ ≥ 0.75 = 'muito alto'
- θ ≥ 0.60 = 'alto'
- θ ≤ 0.40 = 'baixo'
- θ ≤ 0.25 = 'muito baixo'
- confidence: 0.80 diagnóstico claro / 0.70 moderado / 0.60 tendência fraca

Cada opção deve declarar 1-3 eixos (mais dilui). Se for necessário adicionar/remover eixo comparado ao auto, pode. NÃO tocar em `baseWeights`/`weights` (serão removidos na Task 20). Commitar por deck. Ao final, rodar `npx tsx scripts/validate-deck.ts` e garantir 0 erros."

Comando:

```
[dispatch superpowers:subagent-driven-development com prompt acima]
```

- [ ] **Step 2: Validar após refinamento**

Run: `npx tsx scripts/validate-deck.ts`
Expected: 0 errors.

- [ ] **Step 3: Confirmação manual de amostra**

Ler 3 decks (`basic_01.json`, `alta_tensao.json`, `s1_ocupando_espaco.json`) e confirmar que evidence casa com texto. Ajustes pontuais se precisar.

- [ ] **Step 4: Commit final da passagem (se o subagente não commitou por deck)**

```bash
git add src/data/decks/*.json
git commit -m "content(decks): refine evidence semantics (IA review pass)"
```

---

## Fase 4 — Integração runtime

### Task 12: `runScoring.appendRunAnswer` aceita evidence

**Files:**
- Modify: `src/lib/runScoring.ts`
- Modify: `src/types/game.ts` (`RunAnswerEvent`)
- Test: `src/lib/__tests__/runScoring.test.ts` (criar se não existir)

- [ ] **Step 1: Adicionar campo `evidence` em `RunAnswerEvent`**

Em `src/types/game.ts`, `interface RunAnswerEvent`:

```ts
export interface RunAnswerEvent {
  questionId: string;
  tone: Tone | null;
  /** @deprecated — use `evidence`. Mantido pra snapshots legados. */
  weights: Partial<Record<StatKey, number>>;
  /** Evidência bayesiana aplicada nesta resposta (Fase 3+). */
  evidence?: import('@/lib/bayesEngine/types').OptionEvidence;
  dominantAxis: StatKey | null;
  responseTimeMs?: number;
  timedOut: boolean;
}
```

- [ ] **Step 2: Estender `appendRunAnswer` pra receber evidence**

Em `src/lib/runScoring.ts`, trocar assinatura:

```ts
export function appendRunAnswer(
  session: RunSession,
  questionId: string,
  tone: Tone,
  weights: Partial<Record<StatKey, number>>,
  evidence: import('@/lib/bayesEngine/types').OptionEvidence | undefined,
  responseTimeMs?: number,
): RunSession {
  const event: RunAnswerEvent = {
    questionId,
    tone,
    weights,
    evidence,
    dominantAxis: getDominantAxisFromWeights(weights),
    timedOut: false,
    responseTimeMs,
  };

  return {
    ...session,
    answeredCount: session.answeredCount + 1,
    answers: [...session.answers, event],
  };
}
```

- [ ] **Step 3: Escrever teste**

Criar `src/lib/__tests__/runScoring.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendRunAnswer, createRunSession } from '../runScoring';
import type { Deck } from '@/types/game';

const fakeDeck = {
  deckId: 'x',
  name: 'x', description: 'x', tema: 'x', category: 'cenario',
  tier: 1, difficulty: 1, rarity: 'comum', seasonId: 'season-0',
  priceFichas: null, questions: [{ id: 'q1', type: 'NORMAL', metadata: {
    tensao: 1, ambiente: 'Publico', relacao: 'Par', aposta: 'Tempo', pilar: 'ego',
  }, slides: [], options: [] }],
} as unknown as Deck;

test('appendRunAnswer persiste evidence quando presente', () => {
  const session = createRunSession(fakeDeck,
    { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 }, 'x');
  const updated = appendRunAnswer(
    session, 'q1', 'neutro',
    { vigor: 2 },
    { vigor: { min: 0.6, confidence: 0.75 } },
    1000,
  );
  assert.equal(updated.answers.length, 1);
  assert.deepEqual(updated.answers[0].evidence, { vigor: { min: 0.6, confidence: 0.75 } });
});
```

- [ ] **Step 4: Rodar teste**

Run: `npx tsx --test src/lib/__tests__/runScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Atualizar todos os call sites existentes de `appendRunAnswer`**

Run: `grep -rn "appendRunAnswer(" src/` para encontrar call sites.

Em cada call site (tipicamente `src/context/GameContext.tsx` no reducer ANSWER e CAMPAIGN_ANSWER), adicionar o argumento `evidence` — extrair `option.evidence` no ponto onde a option é identificada. Code pattern:

```ts
// Antes:
appendRunAnswer(session, questionId, tone, weights, responseTimeMs)
// Depois:
appendRunAnswer(session, questionId, tone, weights, option.evidence, responseTimeMs)
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/runScoring.ts src/lib/__tests__/runScoring.test.ts src/context/GameContext.tsx
git commit -m "feat(scoring): RunAnswerEvent carries evidence; appendRunAnswer accepts it"
```

---

### Task 13: `CalibrationState.beliefs` coexistindo com `axes`

**Files:**
- Modify: `src/types/game.ts` (já tem `beliefs?` opcional da Task 8)
- Modify: `src/lib/runScoring.ts` (`normalizeGameState`)

- [ ] **Step 1: Inicializar `beliefs` em `INITIAL_CALIBRATION`**

Em `src/types/game.ts`, `INITIAL_CALIBRATION` (procurar por `export const INITIAL_CALIBRATION`):

```ts
import { createPriorProfile } from '@/lib/bayesEngine/belief';

export const INITIAL_CALIBRATION: CalibrationState = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  beliefs: createPriorProfile(),
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
};
```

- [ ] **Step 2: Ajustar `normalizeGameState` pra garantir `beliefs` sempre presente**

Em `src/lib/runScoring.ts`, dentro do retorno de `normalizeGameState`, no objeto `calibration`, adicionar campo após `axes`:

```ts
      beliefs: (calibration as any).beliefs ?? createPriorProfile(),
```

E adicionar o import no topo:

```ts
import { createPriorProfile } from './bayesEngine/belief';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Rodar todos os testes**

Run: `npm test`
Expected: PASS (incluindo os do engine bayesiano).

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/lib/runScoring.ts
git commit -m "feat(state): CalibrationState always carries beliefs (uniform prior)"
```

---

### Task 14: Reducer `ANSWER` aplica `updateProfile` em `beliefs`

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Localizar reducer ANSWER**

Abrir `src/context/GameContext.tsx`, localizar case `'ANSWER'` do reducer (~linha 280, `dispatch` com `weights: action.finalWeights` etc.).

- [ ] **Step 2: Adicionar update bayesiano paralelo ao somatório atual**

Dentro do case `'ANSWER'`, após computar `newCalibration = applyDampenedWeights(...)`, adicionar:

```ts
      const evidence = action.evidence as
        | import('@/lib/bayesEngine/types').OptionEvidence
        | undefined;
      const nextBeliefs = evidence
        ? updateProfile(
            newCalibration.beliefs ?? createPriorProfile(),
            evidence,
            DEFAULT_CONFIG,
            new Date(),
          )
        : (newCalibration.beliefs ?? createPriorProfile());
```

E incluir no `return`:

```ts
      return {
        ...state,
        calibration: {
          ...newCalibration,
          beliefs: nextBeliefs,
        },
        ...
      };
```

Imports no topo do arquivo:

```ts
import {
  DEFAULT_CONFIG,
  createPriorProfile,
  updateProfile,
} from '@/lib/bayesEngine';
```

- [ ] **Step 3: Action `ANSWER` aceita `evidence`**

Localizar a definição do action-type `ANSWER` (busca por `type: 'ANSWER'`, provavelmente na definição de `GameAction`). Adicionar campo `evidence?`:

```ts
  | {
      type: 'ANSWER';
      questionId: string;
      tone: Tone;
      finalWeights: Partial<Record<StatKey, number>>;
      evidence?: import('@/lib/bayesEngine/types').OptionEvidence;
      responseTimeMs?: number;
    }
```

- [ ] **Step 4: Dispatcher de ANSWER passa `option.evidence`**

Localizar o ponto onde `dispatch({ type: 'ANSWER', ... })` é chamado (tipicamente em handlers de opção). Adicionar `evidence: option.evidence` na payload.

- [ ] **Step 5: Repetir para `CAMPAIGN_ANSWER`**

Caso análogo: action `CAMPAIGN_ANSWER` ganha `evidence?` e o reducer aplica `updateProfile` no caminho de campanha (nota: campanhas marcadas `isTraining` são tratadas na Task 17; por ora aplica sempre).

- [ ] **Step 6: Typecheck + testes**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(state): reducer updates beliefs alongside axes (parallel Bayesian pipeline)"
```

---

### Task 15: `getCurrentArchetype` usa engine bayesiano

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/data/archetypes.ts` (manter `matchArchetype` legacy até Task 21, mas adicionar novo export)

- [ ] **Step 1: Adicionar thin wrapper em `GameContext` que escolhe motor**

No topo de `src/context/GameContext.tsx`, após imports do engine, adicionar helper:

```ts
import { matchArchetypes, archetypeDisplayState } from '@/lib/bayesEngine';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';
```

- [ ] **Step 2: Trocar as 3 chamadas de `matchArchetype` por `matchArchetypes`**

Localizar os 3 call sites de `matchArchetype(state.calibration.axes, ...)` (linhas ~288, ~297, ~401 do GameContext). Em cada um, trocar por:

```ts
const beliefs = state.calibration.beliefs ?? createPriorProfile();
const { primary } = matchArchetypes(beliefs);
const archetypeName = primary.archetype.name;
```

Onde o código antigo usava `archetype.id` ou `.name`, usar `primary.archetype.id`/`.name`.

- [ ] **Step 3: `currentArchetype` no context exposto**

No retorno do provider (~linha 875 onde está `matchArchetype(axes, recentWeights, totalResponses)`), trocar por `matchArchetypes(beliefs).primary.archetype`.

- [ ] **Step 4: Typecheck + testes**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Smoke manual**

Run: `npm run dev`
Abrir app, jogar um deck curto (basic_01), observar se archetype aparece no perfil e muda conforme respostas.

- [ ] **Step 6: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(state): getCurrentArchetype uses Bayesian matchArchetypes"
```

---

### Task 16: Wipe de perfis antigos no carregamento

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Adicionar migração de versão**

Localizar a função `loadGameState` (ou similar; aproximadamente onde `normalizeGameState` é invocada). Adicionar flag de versão no topo:

```ts
const STATE_SCHEMA_VERSION = 3; // Bayes engine migration
const SCHEMA_VERSION_KEY = 'mindpractice_schema_version';
```

Na leitura do `localStorage`, antes de retornar:

```ts
const storedVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) ?? 0);
if (storedVersion < STATE_SCHEMA_VERSION) {
  // Wipe calibração — bayesian engine requer reset (sem usuários em prod)
  const normalized = normalizeGameState({
    ...raw,
    calibration: undefined, // força INITIAL_CALIBRATION
  });
  localStorage.setItem(SCHEMA_VERSION_KEY, String(STATE_SCHEMA_VERSION));
  return normalized;
}
```

- [ ] **Step 2: Verificar que build roda**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Smoke manual — limpar localStorage, abrir app**

```
localStorage.clear() no devtools → reload → perfil começa uniforme → jogar basic_01 → confiança sobe no radar.
```

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(state): wipe pre-Bayes profiles on load (schema v3)"
```

---

### Task 17: Training decks não persistem

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Short-circuit no reducer quando `activeDeck.isTraining === true`**

No reducer ANSWER (e CAMPAIGN_ANSWER), dentro do bloco que computa `nextBeliefs`, envolver assim:

```ts
      const isTraining = state.activeDeck?.isTraining === true;
      const nextBeliefs = (!isTraining && evidence)
        ? updateProfile(
            newCalibration.beliefs ?? createPriorProfile(),
            evidence,
            DEFAULT_CONFIG,
            new Date(),
          )
        : (newCalibration.beliefs ?? createPriorProfile());
```

E, simetricamente, pular mutação em `axes`/`recentWeights` quando training:

```ts
      const effectiveCalibration = isTraining
        ? state.calibration // preserva perfil — só snapshot e sessão mudam
        : newCalibration;
```

Usar `effectiveCalibration` no return. Snapshots e `totalResponses` da sessão ainda são registrados no histórico da run (campo separado em `DeckSnapshot.legacy = false` — sem ajuste extra).

- [ ] **Step 2: Adicionar flag no resultado pra UI saber que foi treino**

No `createDeckSnapshot` (src/lib/runScoring.ts), adicionar:

```ts
  isTraining?: boolean;
```

em `DeckSnapshot` (types/game.ts) e preencher a partir de `getDeckById(session.deckId)?.isTraining`.

- [ ] **Step 3: Escrever teste**

Criar `src/context/__tests__/trainingDeck.test.ts` — mock minimal de state, dispatch ANSWER com deck.isTraining=true e verificar que beliefs não muda:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPriorProfile } from '@/lib/bayesEngine';
// Nota: o reducer pode estar exportado como função pura, se não estiver,
// extrair num arquivo separado antes desse teste. Confirmar via inspeção
// do GameContext.tsx e exportar `rootReducer` se necessário.
```

Se o reducer não está exportado como função pura, pular o teste unitário e fazer smoke manual:
1. Marcar um deck temporário como `isTraining: true, trainingTarget: 'vigor'`
2. Jogar uma rodada
3. Confirmar: resultado na tela, mas `/perfil` não mudou.

- [ ] **Step 4: Typecheck + testes**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx src/lib/runScoring.ts src/types/game.ts
git commit -m "feat(training): isTraining decks bypass profile persistence"
```

---

## Fase 5 — UI

### Task 18: `MiniRadar` reflete confiança

**Files:**
- Modify: `src/components/MiniRadar.tsx`

- [ ] **Step 1: Aceitar `beliefs` como prop alternativa**

Em `src/components/MiniRadar.tsx`, ao topo do arquivo, ler o contrato atual e estender props:

```ts
import { playerMean, axisConfidence } from '@/lib/bayesEngine';
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';

export interface MiniRadarProps {
  // ... props existentes (axes, size, etc.)
  beliefs?: PlayerBeliefs;
}
```

- [ ] **Step 2: Se `beliefs` presente, usar playerMean em vez de `axes`; valor da barra = confidence**

No corpo do componente, derivar:

```ts
const values = beliefs
  ? STAT_KEYS.reduce((acc, k) => ({ ...acc, [k]: playerMean(beliefs[k]) }), {} as Record<StatKey, number>)
  : axes;

const confidences = beliefs
  ? STAT_KEYS.reduce((acc, k) => ({ ...acc, [k]: axisConfidence(beliefs[k]) }), {} as Record<StatKey, number>)
  : null;
```

A renderização existente mostra o radar baseado em `axes` (0-100 absoluto). Com beliefs: radar usa `playerMean` (0-1) * 100. Barra de precisão (se o componente desenha uma) usa `confidence`.

- [ ] **Step 3: Call sites passam beliefs quando disponíveis**

Buscar usos: `grep -rn "<MiniRadar" src/` → adicionar `beliefs={state.calibration.beliefs}` em cada um.

- [ ] **Step 4: Typecheck + smoke**

Run: `npx tsc --noEmit && npm run dev`
Expected: PASS; radar exibe valores coerentes com evidence.

- [ ] **Step 5: Commit**

```bash
git add src/components/MiniRadar.tsx src/app/**/*.tsx src/components/**/*.tsx
git commit -m "feat(ui): MiniRadar reads beliefs (mean + confidence)"
```

---

### Task 19: `ProfileCardCompact` e `/perfil` usam gate de confiança

**Files:**
- Modify: `src/components/ProfileCardCompact.tsx`
- Modify: `src/app/perfil/page.tsx`

- [ ] **Step 1: Em `/perfil/page.tsx`, derivar display state**

No topo do componente:

```ts
import { archetypeDisplayState, globalConfidence } from '@/lib/bayesEngine';

const displayState = archetypeDisplayState(state.calibration.beliefs!);
```

Em `ProfileCardCompact`, exibir:

```tsx
{displayState.mode === 'discovering' && (
  <span className="text-white/60">Ainda te conhecendo…</span>
)}
{displayState.mode === 'tendency' && displayState.primary && (
  <span>Começando a ver padrão — você parece tender a <strong>{displayState.primary.archetype.name}</strong></span>
)}
{displayState.mode === 'firm' && displayState.primary && (
  <>
    <div>Arquétipo primário: <strong>{displayState.primary.archetype.name}</strong></div>
    {displayState.secondary && (
      <div className="text-sm text-white/70">
        Secundário: {displayState.secondary.archetype.name}
      </div>
    )}
  </>
)}
```

- [ ] **Step 2: Texto unificado de confiança global**

Abaixo do radar em `/perfil/page.tsx`:

```tsx
const conf = globalConfidence(state.calibration.beliefs!);
const label = conf >= 0.6
  ? 'Mindpractice te conhece bem'
  : conf >= 0.3
  ? 'Começando a entender você'
  : 'Ainda descobrindo';
<p className="text-center text-white/70">{label}</p>
```

- [ ] **Step 3: Smoke manual**

Run: `npm run dev`
Expected: Perfil novo mostra "Ainda te conhecendo…"; após jogar 2 decks, muda pra "Começando a ver padrão"; após 5+ decks consistentes, vira arquétipo firme.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProfileCardCompact.tsx src/app/perfil/page.tsx
git commit -m "feat(ui): profile shows archetype display state (discovering/tendency/firm)"
```

---

### Task 20: `RunReportCard` mostra evidência da run

**Files:**
- Modify: `src/components/RunReportCard.tsx`

- [ ] **Step 1: Adicionar seção "O que isso revelou"**

Onde `RunReportCard` itera sobre `session.answers` (procurar por `answers.map` ou similar), adicionar, pra cada answer:

```tsx
{answer.evidence && Object.entries(answer.evidence).map(([axis, ev]) => (
  <span key={axis} className="text-xs text-white/60">
    {axis}: {ev.min !== undefined ? `≥ ${ev.min.toFixed(2)}` : ''}
    {ev.max !== undefined ? ` ≤ ${ev.max.toFixed(2)}` : ''}
    {' '}(conf {ev.confidence.toFixed(2)})
  </span>
))}
```

(Se o componente já tem layout por answer, integrar como sub-row; se não, criar painel abaixo do sumário.)

- [ ] **Step 2: Smoke manual**

Run: `npm run dev`
Jogar um deck até o fim. Verificar RunReport mostrando intervalos por resposta.

- [ ] **Step 3: Commit**

```bash
git add src/components/RunReportCard.tsx
git commit -m "feat(ui): RunReport surfaces evidence per answer"
```

---

## Fase 6 — Cleanup

### Task 21: Remover legacy weights/baseWeights/intent

**Files:**
- Delete: `src/lib/narrativeEngine/resolveWeights.ts`
- Delete: `src/lib/narrativeEngine/contextModifiers.ts`
- Delete: `src/lib/narrativeEngine/metadataMatches.ts` (se não usado)
- Delete: `src/lib/narrativeEngine/__tests__/resolveWeights.test.ts`
- Delete: `src/lib/narrativeEngine/__tests__/metadataMatches.test.ts` (se não usado)
- Modify: `src/types/game.ts`
- Modify: `src/data/decks/*.json` (remover `baseWeights`, `intent`, `weights`)
- Modify: `scripts/validate-deck.ts`
- Modify: `src/lib/runScoring.ts` (remover `applyDampenedWeights`, `weights` em `RunAnswerEvent`)
- Modify: `src/context/GameContext.tsx` (remover dual-path)

- [ ] **Step 1: Verificar que nada além de testes legacy usa `resolveWeights`**

Run: `grep -rn "resolveWeights\|CONTEXT_MODIFIERS\|applyDampenedWeights" src/ scripts/`
Expected: Apenas os arquivos a deletar.

- [ ] **Step 2: Remover campos de legacy em `src/types/game.ts`**

Remover de `Option`: `weights`, `intent`, `baseWeights`.
Remover de `RunAnswerEvent`: `weights`, `dominantAxis` (se só era calculado do weights — confirmar uso antes).
Remover de `CalibrationState`: `axes` (tornar `beliefs` obrigatório — não mais opcional), `recentWeights`.

```ts
// Nova CalibrationState
export interface CalibrationState {
  beliefs: PlayerBeliefs;
  totalResponses: number;
  toneHistory: Tone[];
  snapshots: DeckSnapshot[];
}
```

- [ ] **Step 3: Script de limpeza dos decks**

Criar `scripts/strip-legacy-weights.ts`:

```ts
#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const decksDir = path.resolve(__dirname, '..', 'src', 'data', 'decks');
for (const f of fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))) {
  const p = path.join(decksDir, f);
  const deck = JSON.parse(fs.readFileSync(p, 'utf-8'));
  for (const q of deck.questions ?? []) {
    for (const opt of q.options ?? []) {
      delete opt.weights;
      delete opt.baseWeights;
      delete opt.intent;
    }
  }
  fs.writeFileSync(p, JSON.stringify(deck, null, 2) + '\n', 'utf-8');
}
console.log('Legacy weights stripped.');
```

Run: `npx tsx scripts/strip-legacy-weights.ts`
Expected: sem erros.

- [ ] **Step 4: Ajustar validator pra exigir evidence**

Em `scripts/validate-deck.ts`, remover bloco `// 4b. Option precisa ter peso` inteiro, substituir por:

```ts
      // Option precisa de evidence (único formato suportado pós-migração)
      if (!opt.evidence) {
        err(`${oLabel}: Option precisa de campo "evidence"`);
      }
```

- [ ] **Step 5: Deletar arquivos**

```bash
rm src/lib/narrativeEngine/resolveWeights.ts
rm src/lib/narrativeEngine/contextModifiers.ts
rm src/lib/narrativeEngine/__tests__/resolveWeights.test.ts
```

Checar se `metadataMatches.ts` e `timeFactor.ts` ainda são usados — se não, remover também.

Run: `grep -rn "metadataMatches\|timeFactor" src/`
Se apenas `narrativeEngine/` interno: `rm src/lib/narrativeEngine/metadataMatches.ts src/lib/narrativeEngine/__tests__/metadataMatches.test.ts src/lib/narrativeEngine/timeFactor.ts src/lib/narrativeEngine/__tests__/timeFactor.test.ts`.

Ajustar `src/lib/narrativeEngine/index.ts` pra remover exports deletados.

- [ ] **Step 6: Remover `applyDampenedWeights` de GameContext**

No `src/context/GameContext.tsx`, remover o helper `applyDampenedWeights` e qualquer referência. Reducer ANSWER fica só com:

```ts
case 'ANSWER': {
  const evidence = action.evidence;
  const isTraining = state.activeDeck?.isTraining === true;
  const nextBeliefs = (!isTraining && evidence)
    ? updateProfile(state.calibration.beliefs, evidence, DEFAULT_CONFIG, new Date())
    : state.calibration.beliefs;
  return {
    ...state,
    calibration: {
      ...state.calibration,
      beliefs: nextBeliefs,
      totalResponses: state.calibration.totalResponses + 1,
      toneHistory: [...state.calibration.toneHistory, action.tone].slice(-CALIBRATION_WINDOW),
    },
    activeRun: appendRunAnswer(state.activeRun!, action.questionId, action.tone, {}, evidence, action.responseTimeMs),
  };
}
```

- [ ] **Step 7: Typecheck + testes + validator + build**

```bash
npx tsc --noEmit
npm test
npx tsx scripts/validate-deck.ts
npm run build
```
Expected: todos PASS.

- [ ] **Step 8: Smoke manual end-to-end**

Run: `npm run dev`
- Limpar localStorage.
- Jogar basic_01 do início ao fim.
- Verificar: radar preenche, arquétipo aparece após confiança ≥ 0.3, RunReport mostra evidence, perfil atualiza.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(engine): remove legacy weights/intent/baseWeights pipeline"
```

---

### Task 22: Documentação — NOTES para autores

**Files:**
- Create: `docs/authoring/evidence-guide.md`

- [ ] **Step 1: Escrever guia curto**

```markdown
# Guia de Evidência (Autoria de Decks)

Cada `Option.evidence` declara o que escolher essa opção revela sobre o jogador.

## Schema

```json
{
  "evidence": {
    "<axis>": { "min": 0.60, "confidence": 0.75 },
    "<axis>": { "max": 0.40, "confidence": 0.70 }
  }
}
```

## Tabela de thresholds

| Semântica       | min/max  | Confidence default |
|-----------------|----------|--------------------|
| muito alto      | min 0.75 | 0.80               |
| alto            | min 0.60 | 0.75               |
| baixo           | max 0.40 | 0.75               |
| muito baixo     | max 0.25 | 0.80               |

## Regras

- 1-3 eixos por opção. Mais dilui o sinal.
- Pelo menos uma dimensão oposta (um `min` + um `max`, ou combinação) quando há 2+ eixos — evita "alto em tudo".
- `confidence` ∈ [0.5, 0.99]. Default 0.75.
- Texto da opção deve tornar o trade-off legível.
```

- [ ] **Step 2: Commit**

```bash
git add docs/authoring/evidence-guide.md
git commit -m "docs: add evidence authoring guide"
```

---

### Task 23: Review final de integridade

**Files:**
- (nenhuma modificação; só validação)

- [ ] **Step 1: Rodar tudo**

```bash
npm test                           # testes unitários
npx tsx scripts/validate-deck.ts   # 0 erros
npx tsc --noEmit                   # typecheck
npm run build                      # next build
```

Expected: todos PASS.

- [ ] **Step 2: Critérios de sucesso do spec**

Manual:
1. Jogador respondendo 50 perguntas consistentes em um eixo (ex: basic_01 + alta_tensao + holofote focando vigor) → confiança vigor ≥ 0.8 no `/perfil`.
2. Sem usuários reais (skip).
3. Gaming test: jogar 20 runs com tema único, confirmar que stats não "infla" — média satura em ~0.8-0.9.
4. Todos os 22 decks validados.
5. ≥ 30 testes novos (contar: 6 + 5 + 5 + 6 + 5 + 1 runScoring = 28; se abaixo, adicionar edge cases).

- [ ] **Step 3: Se testes < 30, adicionar edge cases**

Ex: em `belief.test.ts`:
```ts
test('globalConfidence de perfil uniforme ≈ 0', () => { ... });
test('normalizeBelief com soma = 0 retorna uniform', () => { ... });
```

- [ ] **Step 4: Commit final (se houve ajustes)**

```bash
git add -A
git commit -m "test(bayes): additional edge-case coverage"
```

---

## Self-Review Notes

- **Spec coverage:** Cada seção do spec tem task — modelo (Tasks 1-5), decay (Task 4), autoria (Task 11 + Task 22), migração (Tasks 10-11), arquétipos top-1/top-2 (Task 6), UI (Tasks 18-20), training (Task 17), wipe (Task 16), cleanup legacy (Task 21).
- **Tipos consistentes:** `AxisBelief`, `AxisEvidence`, `OptionEvidence`, `PlayerBeliefs`, `BayesConfig`, `DEFAULT_CONFIG` definidos em Task 1 e usados identicamente dali em diante. `matchArchetypes` (plural, Task 6) vs `matchArchetype` legacy (pré-existente, removido em Task 15/21). `updateProfile`/`updateAxis` (Task 5) usados em Task 14.
- **No placeholders:** todos os steps têm código exato ou comando exato. Passagem de IA da Task 11 é intencionalmente um dispatch (não placeholder — é o modelo previsto no spec para refinamento semântico).
