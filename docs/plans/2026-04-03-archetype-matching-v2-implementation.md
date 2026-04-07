# Archetype Matching v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace lookup-table archetype matching with distance-based matching using ideal profiles, axis confidence, and change inertia.

**Architecture:** Add `idealProfile` field to each archetype definition. Rewrite `matchArchetype` to compute weighted distance to each profile, using per-axis confidence from recentWeights stddev. Apply 15% inertia bonus to current archetype (skipped in discovery phase <20 responses).

**Tech Stack:** TypeScript, React Context

---

### Task 1: Add idealProfile to Archetype type

**Files:**
- Modify: `src/types/game.ts:81-88`

**Step 1: Add idealProfile to Archetype interface**

```typescript
export interface Archetype {
  id: string;
  name: string;
  category: ArchetypeCategory;
  axes: StatKey[] | 'equilibrio';
  idealProfile: Record<StatKey, number>;
  description: string;
  tagline: string;
}
```

**Step 2: Verify no build errors from missing field (expected — fixed in Task 2)**

---

### Task 2: Add idealProfile to all 15 archetypes

**Files:**
- Modify: `src/data/archetypes.ts:3-124`

**Step 1: Add idealProfile to every archetype entry**

```typescript
export const ARCHETYPES: Archetype[] = [
  {
    id: 'soberano',
    name: 'O Soberano',
    category: 'especial',
    axes: 'equilibrio',
    idealProfile: { vigor: 0.55, harmonia: 0.55, filtro: 0.55, presenca: 0.55, desapego: 0.55 },
    description: 'Dominio completo. Voce age apenas quando necessario. Equilibrio raro entre todos os eixos.',
    tagline: 'O mestre do equilibrio',
  },
  {
    id: 'tubarao',
    name: 'O Tubarao',
    category: 'cruzado',
    axes: ['vigor', 'presenca'],
    idealProfile: { vigor: 0.85, harmonia: 0.10, filtro: 0.30, presenca: 0.80, desapego: 0.35 },
    description: 'Focado em conquista e poder. Sua presenca intimida naturalmente.',
    tagline: 'Conquista e poder',
  },
  {
    id: 'fantasma',
    name: 'O Fantasma',
    category: 'cruzado',
    axes: ['filtro', 'desapego'],
    idealProfile: { vigor: 0.10, harmonia: 0.25, filtro: 0.90, presenca: 0.10, desapego: 0.85 },
    description: 'Oculto. Ninguem sabe o que voce pensa ou sente. Invisivel por escolha.',
    tagline: 'Invisivel por escolha',
  },
  {
    id: 'diplomata',
    name: 'O Diplomata',
    category: 'cruzado',
    axes: ['harmonia', 'presenca'],
    idealProfile: { vigor: 0.15, harmonia: 0.85, filtro: 0.40, presenca: 0.75, desapego: 0.30 },
    description: 'Resolve conflitos sem disparar um tiro. Magnetico e persuasivo.',
    tagline: 'Resolve sem disparar',
  },
  {
    id: 'muralha',
    name: 'O Muralha',
    category: 'cruzado',
    axes: ['filtro', 'vigor'],
    idealProfile: { vigor: 0.75, harmonia: 0.20, filtro: 0.85, presenca: 0.35, desapego: 0.30 },
    description: 'Defensivo e letal. Absorve o golpe e contra-ataca com precisao.',
    tagline: 'Absorve e contra-ataca',
  },
  {
    id: 'estoico',
    name: 'O Estoico',
    category: 'cruzado',
    axes: ['desapego', 'filtro'],
    idealProfile: { vigor: 0.20, harmonia: 0.35, filtro: 0.80, presenca: 0.25, desapego: 0.90 },
    description: 'Imperturbavel. O mundo pode cair ao seu redor e voce continua de pe.',
    tagline: 'Imperturbavel',
  },
  {
    id: 'justiceiro',
    name: 'O Justiceiro',
    category: 'cruzado',
    axes: ['vigor', 'harmonia'],
    idealProfile: { vigor: 0.80, harmonia: 0.70, filtro: 0.30, presenca: 0.45, desapego: 0.15 },
    description: 'Usa a forca para manter a ordem. Age pelo grupo, defende os seus.',
    tagline: 'Forca pela ordem',
  },
  {
    id: 'enigma',
    name: 'O Enigma',
    category: 'cruzado',
    axes: ['presenca', 'desapego'],
    idealProfile: { vigor: 0.20, harmonia: 0.30, filtro: 0.45, presenca: 0.80, desapego: 0.75 },
    description: 'Atrai atencao pelo silencio. Indecifravel. As pessoas querem te entender.',
    tagline: 'Silencio magnetico',
  },
  {
    id: 'pacificador',
    name: 'O Pacificador',
    category: 'cruzado',
    axes: ['harmonia', 'filtro'],
    idealProfile: { vigor: 0.15, harmonia: 0.80, filtro: 0.75, presenca: 0.30, desapego: 0.40 },
    description: 'O lubrificante social. Evita o atrito antes dele nascer.',
    tagline: 'Evita o atrito',
  },
  {
    id: 'mercenario',
    name: 'O Mercenario',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    idealProfile: { vigor: 0.75, harmonia: 0.10, filtro: 0.40, presenca: 0.30, desapego: 0.85 },
    description: 'Sem amarras emocionais. Faz o que precisa ser feito, sem sentimentalismo.',
    tagline: 'Sem amarras',
  },
  {
    id: 'rebelde',
    name: 'O Rebelde',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    idealProfile: { vigor: 0.70, harmonia: 0.10, filtro: 0.20, presenca: 0.50, desapego: 0.85 },
    description: 'Antifragilidade. Quebra regras com sorriso no rosto. O caos e seu playground.',
    tagline: 'Quebra regras sorrindo',
  },
  {
    id: 'vulcao',
    name: 'O Vulcao',
    category: 'puro',
    axes: ['vigor'],
    idealProfile: { vigor: 0.95, harmonia: 0.10, filtro: 0.10, presenca: 0.50, desapego: 0.20 },
    description: 'Explosivo e direto. Nao conhece o conceito de filtro. Energia bruta.',
    tagline: 'Explosivo e direto',
  },
  {
    id: 'monge',
    name: 'O Monge',
    category: 'cruzado',
    axes: ['harmonia', 'desapego'],
    idealProfile: { vigor: 0.10, harmonia: 0.80, filtro: 0.35, presenca: 0.20, desapego: 0.85 },
    description: 'Totalmente em paz. A opiniao alheia e ruido branco para voce.',
    tagline: 'Paz absoluta',
  },
  {
    id: 'camaleao',
    name: 'O Camaleao',
    category: 'cruzado',
    axes: ['harmonia', 'vigor'],
    idealProfile: { vigor: 0.70, harmonia: 0.75, filtro: 0.35, presenca: 0.50, desapego: 0.30 },
    description: 'Adapta-se para vencer. Pode ser doce ou amargo em segundos.',
    tagline: 'Adaptacao pura',
  },
  {
    id: 'estrategista',
    name: 'O Estrategista',
    category: 'cruzado',
    axes: ['filtro', 'presenca'],
    idealProfile: { vigor: 0.30, harmonia: 0.25, filtro: 0.85, presenca: 0.75, desapego: 0.40 },
    description: 'Joga xadrez com as pessoas. Antecipa 5 movimentos a frente.',
    tagline: 'Xadrez humano',
  },
];
```

---

### Task 3: Rewrite matchArchetype function

**Files:**
- Modify: `src/data/archetypes.ts:126-192`

**Step 1: Replace the entire matchArchetype function**

New signature: `matchArchetype(axes, recentWeights, totalResponses, currentArchetypeId?)`

```typescript
/**
 * Match archetype using distance-based scoring with confidence weighting.
 *
 * Algorithm:
 * 1. Normalize player axes to 0-1
 * 2. Calculate per-axis confidence from recentWeights stddev
 * 3. Score each archetype: weighted sum of (1 - |player - ideal|)
 * 4. Apply 15% inertia bonus to current archetype (if >= 20 responses)
 * 5. Return highest scoring archetype
 */
export function matchArchetype(
  axes: Record<string, number>,
  recentWeights: Record<StatKey, number[]>,
  totalResponses: number,
  currentArchetypeId?: string,
): Archetype {
  const normalized = normalizeAxes(axes);
  const confidence = getAxisConfidence(recentWeights);

  let bestArchetype = ARCHETYPES[0];
  let bestScore = -Infinity;

  for (const archetype of ARCHETYPES) {
    let score = 0;
    let totalWeight = 0;

    for (const key of STAT_KEYS) {
      const w = confidence[key];
      const diff = Math.abs(normalized[key] - archetype.idealProfile[key]);
      score += w * (1 - diff);
      totalWeight += w;
    }

    // Normalize score to 0-1
    score = totalWeight > 0 ? score / totalWeight : 0;

    // Apply inertia: current archetype gets 15% bonus after discovery phase
    if (
      currentArchetypeId &&
      totalResponses >= 20 &&
      archetype.id === currentArchetypeId
    ) {
      score *= 1.15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  }

  return bestArchetype;
}

/** Normalize axes values to 0-1 range */
function normalizeAxes(axes: Record<string, number>): Record<StatKey, number> {
  const values = STAT_KEYS.map(k => axes[k] ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const result = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) {
    result[key] = range > 0 ? ((axes[key] ?? 0) - min) / range : 0.5;
  }
  return result;
}

/** Calculate per-axis confidence: consistent data = high confidence, contradictory = low */
function getAxisConfidence(recentWeights: Record<StatKey, number[]>): Record<StatKey, number> {
  const result = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) {
    const vals = recentWeights[key];
    if (!vals || vals.length < 3) {
      result[key] = 0.5; // not enough data — neutral confidence
      continue;
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const stddev = Math.sqrt(variance);
    // stddev 0 = perfect consistency (confidence 1.0)
    // stddev 30 = max contradiction (confidence 0.1)
    result[key] = Math.max(0.1, Math.min(1.0, 1 - stddev / 30));
  }
  return result;
}
```

---

### Task 4: Update all matchArchetype call sites in GameContext

**Files:**
- Modify: `src/context/GameContext.tsx`

There are 3 call sites to update:

**Call site 1 — START_DECK (line ~154):**
```typescript
const startArchetype = matchArchetype(
  state.calibration.axes,
  state.calibration.recentWeights,
  state.calibration.totalResponses,
  // no currentArchetypeId on start — let it pick freely
);
```

**Call site 2 — FINISH_DECK (line ~192):**
```typescript
// Need to know current archetype for inertia
const currentArch = matchArchetype(
  state.calibration.axes,
  state.calibration.recentWeights,
  state.calibration.totalResponses,
);
const archetype = matchArchetype(
  state.calibration.axes,
  state.calibration.recentWeights,
  state.calibration.totalResponses,
  currentArch.id,
);
```

Wait — this is circular. The simpler approach: pass the `startArchetype` from the run session as the current:

```typescript
const archetype = matchArchetype(
  state.calibration.axes,
  state.calibration.recentWeights,
  state.calibration.totalResponses,
  state.activeRun?.startArchetype ? ARCHETYPES.find(a => a.name === state.activeRun!.startArchetype)?.id : undefined,
);
```

Actually simplest: store archetype ID not name in startArchetype. But that's a bigger change. For now, find by name:

```typescript
const prevArchId = ARCHETYPES.find(a => a.name === state.activeRun?.startArchetype)?.id;
const archetype = matchArchetype(
  state.calibration.axes,
  state.calibration.recentWeights,
  state.calibration.totalResponses,
  prevArchId,
);
```

**Call site 3 — getArchetype callback (line ~337-338):**
```typescript
const getArchetype = useCallback(
  () => matchArchetype(
    state.calibration.axes,
    state.calibration.recentWeights,
    state.calibration.totalResponses,
  ),
  [state.calibration.axes, state.calibration.recentWeights, state.calibration.totalResponses],
);
```

---

### Task 5: Remove old toneHistory param and verify build

**Files:**
- Modify: `src/data/archetypes.ts` — old matchArchetype already replaced in Task 3
- Modify: `src/context/GameContext.tsx` — remove toneHistory from matchArchetype calls

**Step 1: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 2: Smoke test**

Run dev server, play a deck, verify archetype is assigned correctly.
