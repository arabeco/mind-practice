# Categories & Calibration System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand deck categories (calibragem/eixo/cenario/campanha), add tension multiplier to calibration, update validator for flexible question counts, cut existing decks to 5 cenas, and update UI tabs.

**Architecture:** Type changes propagate from game.ts → validator → CLI scripts → GameContext → UI. Existing decks get trimmed to 5 questions (except calibragem which keeps 10). Tension multiplier is a 1-line change in the reducer. Campaign format (branching) is a separate plan.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Tailwind CSS.

---

## Task 1: Expand DeckCategory type

**Files:**
- Modify: `src/types/game.ts`

**Step 1: Update DeckCategory**

Replace:
```typescript
export type DeckCategory = 'essencial' | 'arquetipo' | 'cenario';
```

With:
```typescript
export type DeckCategory = 'calibragem' | 'eixo' | 'cenario' | 'campanha';
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Build will FAIL — there are references to 'essencial' and 'arquetipo' in decks page, index.ts, and JSON files. That's expected — next tasks fix them.

**Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: expand DeckCategory to calibragem/eixo/cenario/campanha"
```

---

## Task 2: Update deck JSON files — categories + trim to 5 cenas

**Files:**
- Modify: `src/data/decks/basic_01.json`
- Modify: `src/data/decks/holofote.json`
- Modify: `src/data/decks/profissional.json`
- Modify: `src/data/decks/alta_tensao.json`
- Modify: `src/data/decks/social.json`
- Modify: `src/data/decks/livro_amaldicoado.json`

**Step 1: Update categories in all deck JSONs**

| Deck | Old category | New category |
|------|-------------|--------------|
| basic_01 | essencial | **calibragem** |
| holofote | arquetipo | **eixo** |
| profissional | cenario | cenario (unchanged) |
| alta_tensao | cenario | cenario (unchanged) |
| social | cenario | cenario (unchanged) |
| livro_amaldicoado | cenario | cenario (keep as cenario for now; campanha format requires branching which is a separate plan) |

**Step 2: Trim each deck to 5 questions (except calibragem)**

- `basic_01.json` (calibragem): **keep 10 questions** — calibragem needs 10 for axis coverage
- `holofote.json` (eixo): trim from 10 to **5 best questions** (keep the ones with most presenca weight diversity)
- `profissional.json`: trim to **5 best questions**
- `alta_tensao.json`: trim to **5 best questions**
- `social.json`: trim to **5 best questions**
- `livro_amaldicoado.json`: trim to **5 best questions**

When trimming, keep questions that:
- Cover different tension levels
- Have the most option diversity (4-5 options preferred over 3)
- Cover different eixos as dominant
- Have the best/most engaging scenarios

**Step 3: Remove QuestionType enforcement**

In each JSON, change all question `type` values to `"NORMAL"`. Remove `"RANDOM"`, `"SOCIAL"`, `"TENSION"` types — they add no value with 5 questions.

**Step 4: Build (will still fail due to index.ts references — that's OK)**

**Step 5: Commit**

```bash
git add src/data/decks/*.json
git commit -m "content: update categories + trim decks to 5 cenas"
```

---

## Task 3: Update deck index and references

**Files:**
- Modify: `src/data/decks/index.ts`
- Modify: `src/app/decks/page.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Update getDecksByCategory in index.ts**

The function already works generically — it filters by `d.category`. No code change needed, just verify it works with new category strings.

**Step 2: Update TABS in decks/page.tsx**

Replace:
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
  { id: 'loja', label: 'Loja' },
];
```

With:
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'calibragem', label: 'Calibragem' },
  { id: 'eixo', label: 'Eixos' },
  { id: 'cenario', label: 'Cenarios' },
  { id: 'campanha', label: 'Campanhas' },
  { id: 'loja', label: 'Loja' },
];
```

Update `TabId` type accordingly:
```typescript
type TabId = DeckCategory | 'loja';
```

**Step 3: Update home page category references**

In `src/app/page.tsx`, check if there are any hardcoded references to 'essencial' or 'arquetipo' in deck filtering. The current code uses `isDeckLocked()` which doesn't filter by category, so likely no changes needed. Verify.

**Step 4: Update getWeeklyFreeDeckIds in index.ts**

Currently filters by `d.category === 'arquetipo'` and `d.category === 'cenario'`. Update:
- Change `'arquetipo'` to `'eixo'`
- Keep `'cenario'` as is

**Step 5: Build and verify**

Run: `npm run build`
Expected: Should compile now.

**Step 6: Commit**

```bash
git add src/data/decks/index.ts src/app/decks/page.tsx src/app/page.tsx
git commit -m "feat: update UI tabs and references for new categories"
```

---

## Task 4: Add tension multiplier to calibration

**Files:**
- Modify: `src/context/GameContext.tsx`

**Step 1: Update applyDampenedWeights signature**

Add `tensao` parameter:

```typescript
function applyDampenedWeights(
  cal: CalibrationState,
  weights: Partial<Record<StatKey, number>>,
  tone: Tone,
  tensao: number = 2,  // default to 2 (normal) if not provided
): CalibrationState {
```

**Step 2: Add tension multiplier calculation**

Inside the function, before the weights loop:

```typescript
const tensionMultiplier = 0.5 + (tensao * 0.5);
// tensao 1 → 1.0x, tensao 2 → 1.5x, tensao 3 → 2.0x, tensao 4 → 2.5x, tensao 5 → 3.0x
```

**Step 3: Apply multiplier in the weights loop**

Replace:
```typescript
newAxes[key] = newAxes[key] + w / divisor;
```

With:
```typescript
const adjustedW = w * tensionMultiplier;
newAxes[key] = newAxes[key] + adjustedW / divisor;
```

**Step 4: Update ANSWER action to pass tensao**

In the ANSWER case, get tensao from the current question's metadata:

```typescript
case 'ANSWER': {
  const question = state.activeDeck?.questions[state.currentQuestion];
  const tensao = question?.metadata?.tensao ?? 2;

  return {
    ...state,
    calibration: applyDampenedWeights(state.calibration, action.weights, action.tone, tensao),
    activeRun:
      state.activeRun && question
        ? appendRunAnswer(state.activeRun, question.id, action.tone, action.weights, action.responseTimeMs)
        : state.activeRun,
  };
}
```

**Step 5: Build and verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 6: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat: add tension multiplier to calibration weights"
```

---

## Task 5: Update validators for flexible question count

**Files:**
- Modify: `src/utils/validateDeck.ts`
- Modify: `scripts/validate-deck.ts`

**Step 1: Update in-app validator**

In `src/utils/validateDeck.ts`:

Remove the type distribution checks entirely (NORMAL/RANDOM/SOCIAL/TENSION counts). Replace with flexible question count:

```typescript
// Replace the entire distribution check block with:
if (deck.questions.length < 5 || deck.questions.length > 10) {
  errors.push(`Expected 5-10 questions, got ${deck.questions.length}`);
}
```

**Step 2: Update CLI validator**

In `scripts/validate-deck.ts`:

Remove `REQUIRED_TYPE_COUNTS` constant and the type distribution validation. Replace question count check:

```typescript
// Replace:
// if (questions.length !== 10) { ... }
// and the type distribution block with:
if (questions.length < 5 || questions.length > 10) {
  err(`Expected 5-10 questions, found ${questions.length}`);
}
```

Also remove the `VALID_QUESTION_TYPES` and `REQUIRED_TYPE_COUNTS` constants if they exist.

**Step 3: Add calibragem-specific check**

In the CLI validator, after the axis coverage check, add:

```typescript
// Calibragem-specific: each axis must be dominant in >= 20% of options
if (deck.category === 'calibragem') {
  const totalOptions = questions.reduce((sum: number, q: any) => sum + q.options.length, 0);
  const minPerAxis = Math.ceil(totalOptions * 0.2);
  for (const [axis, count] of Object.entries(axisAppearances)) {
    if (count < minPerAxis) {
      warn(`Calibragem: axis "${axis}" is dominant in ${count}/${totalOptions} options (need ${minPerAxis} for 20%)`);
    }
  }
}
```

**Step 4: Test**

Run: `npm run deck:validate`
Expected: All 6 decks pass (basic_01 with 10 questions, rest with 5).

**Step 5: Commit**

```bash
git add src/utils/validateDeck.ts scripts/validate-deck.ts
git commit -m "feat: update validators for flexible 5-10 questions, remove type distribution"
```

---

## Task 6: Build and final verification

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build, all routes compile.

**Step 2: Validate all decks**

Run: `npm run deck:validate`
Expected: 0 errors on all 6 decks.

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: final adjustments for categories and calibration"
```

---

## Execution Order Summary

| Task | What | Depends on |
|------|------|-----------|
| 1 | Expand DeckCategory type | — |
| 2 | Update deck JSONs (categories + trim) | Task 1 |
| 3 | Update index + UI tabs + references | Tasks 1, 2 |
| 4 | Tension multiplier | — |
| 5 | Update validators | Task 2 |
| 6 | Final build verification | All |

**Parallelizable:**
- Tasks 1 + 4 (independent)
- Task 2 after Task 1
- Tasks 3, 5 after Task 2
- Task 6 after all
