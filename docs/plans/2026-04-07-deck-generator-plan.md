# Deck Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create CLI scripts for deck validation/registration, update the app to support 3-5 options per question, enforce shorter text rules, and rewrite all 6 existing decks with shorter texts and flexible option counts.

**Architecture:** CLI scripts run via `npx tsx scripts/*.ts` (no build step needed). Validator gets word-count rules and flexible option count. SceneOptionsStage adapts layout for 4-5 options. Existing decks rewritten to new content rules.

**Tech Stack:** TypeScript, tsx (dev runner), Next.js 16, Framer Motion, Tailwind CSS.

---

## Task 1: Update validator — flexible options + word counts

**Files:**
- Modify: `src/utils/validateDeck.ts`

**Step 1: Relax option count from exactly 3 to 3-5**

Replace:
```typescript
if (q.options.length !== 3) {
  errors.push(`${q.id}: Expected 3 options, got ${q.options.length}`);
}
```

With:
```typescript
if (q.options.length < 3 || q.options.length > 5) {
  errors.push(`${q.id}: Expected 3-5 options, got ${q.options.length}`);
}
```

**Step 2: Add word count helper and checks**

Add at the top of the file:
```typescript
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

Inside the `for (const q of deck.questions)` loop, after existing checks, add:
```typescript
// Slide text length checks
for (const slide of q.slides) {
  const wc = wordCount(slide.texto);
  if (slide.tipo === 'contexto' && wc > 25) {
    errors.push(`${q.id}: Context slide has ${wc} words (max 25)`);
  }
  if (slide.tipo === 'evento' && wc > 20) {
    errors.push(`${q.id}: Event slide has ${wc} words (max 20)`);
  }
}

// Option text length checks
for (const opt of q.options) {
  const textWc = wordCount(opt.text);
  if (textWc > 15) {
    errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." has ${textWc} words (max 15)`);
  }
  const fbWc = wordCount(opt.feedback);
  if (fbWc > 15) {
    errors.push(`${q.id}: Feedback "${opt.feedback.slice(0, 25)}..." has ${fbWc} words (max 15)`);
  }
}
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Compiles. Existing decks will NOW fail validation (texts too long) — that's expected, Task 6 fixes them.

**Step 4: Commit**

```bash
git add src/utils/validateDeck.ts
git commit -m "feat: update validator for 3-5 options and word count limits"
```

---

## Task 2: Create CLI validate script

**Files:**
- Create: `scripts/validate-deck.ts`
- Modify: `package.json` (add script)

**Step 1: Create the CLI validator**

```typescript
// scripts/validate-deck.ts
import * as fs from 'fs';
import * as path from 'path';

// Inline the validation logic (can't use @/ aliases in scripts)
// Copy the types and validator function directly

type StatKey = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
type Tone = 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';

interface Slide { tipo: 'contexto' | 'evento'; texto: string; }
interface Option {
  text: string; subtext: string; tone: Tone;
  weights: Partial<Record<StatKey, number>>; feedback: string;
}
interface Question {
  id: string; type: string; sceneHook?: string;
  metadata: Record<string, unknown>; slides: Slide[]; options: Option[];
}
interface Deck {
  deckId: string; name: string; description: string; tema: string;
  category: string; tier: number; difficulty: number; questions: Question[];
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validScale = new Set(['baixa', 'media', 'alta']);

  if (!deck.deckId) errors.push('Missing deckId');
  if (!deck.name) errors.push('Missing name');
  if (!deck.category) errors.push('Missing category');
  if (!deck.difficulty) errors.push('Missing difficulty');
  if (!deck.tier || deck.tier < 1 || deck.tier > 5) errors.push('Invalid tier (must be 1-5)');

  if (deck.questions.length !== 10) {
    errors.push(`Expected 10 questions, got ${deck.questions.length}`);
  }

  const types = deck.questions.map(q => q.type);
  const counts = { NORMAL: 0, RANDOM: 0, SOCIAL: 0, TENSION: 0 };
  for (const t of types) {
    if (t in counts) counts[t as keyof typeof counts]++;
  }
  if (counts.NORMAL !== 7) errors.push(`Expected 7 NORMAL, got ${counts.NORMAL}`);
  if (counts.RANDOM !== 1) errors.push(`Expected 1 RANDOM, got ${counts.RANDOM}`);
  if (counts.SOCIAL !== 1) errors.push(`Expected 1 SOCIAL, got ${counts.SOCIAL}`);
  if (counts.TENSION !== 1) errors.push(`Expected 1 TENSION, got ${counts.TENSION}`);

  const axisAppearances: Record<string, number> = { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 };

  for (const q of deck.questions) {
    // Option count
    if (q.options.length < 3 || q.options.length > 5) {
      errors.push(`${q.id}: Expected 3-5 options, got ${q.options.length}`);
    }

    // Metadata
    if (!q.metadata.pilar) errors.push(`${q.id}: Missing pilar`);

    // Slides
    if (q.slides.length !== 2) {
      errors.push(`${q.id}: Expected 2 slides (contexto + evento), got ${q.slides.length}`);
    }
    for (const slide of q.slides) {
      const wc = wordCount(slide.texto);
      if (slide.tipo === 'contexto' && wc > 25) {
        errors.push(`${q.id}: Context slide has ${wc} words (max 25)`);
      }
      if (slide.tipo === 'evento' && wc > 20) {
        errors.push(`${q.id}: Event slide has ${wc} words (max 20)`);
      }
    }

    // Options
    for (const opt of q.options) {
      const textWc = wordCount(opt.text);
      if (textWc > 15) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 30)}..." has ${textWc} words (max 15)`);
      }
      const fbWc = wordCount(opt.feedback);
      if (fbWc > 15) {
        errors.push(`${q.id}: Feedback "${opt.feedback.slice(0, 30)}..." has ${fbWc} words (max 15)`);
      }

      const weights = Object.entries(opt.weights);
      if (weights.length === 0) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." has no weights`);
      }
      const hasPos = weights.some(([, v]) => v > 0);
      const hasNeg = weights.some(([, v]) => v < 0);
      if (!hasPos || !hasNeg) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." missing trade-off`);
      }
      if (!opt.tone) {
        errors.push(`${q.id}: Option missing tone`);
      }

      // Track dominant axis
      let maxKey = '';
      let maxVal = -Infinity;
      for (const [k, v] of weights) {
        if (v > maxVal) { maxVal = v; maxKey = k; }
      }
      if (maxKey) axisAppearances[maxKey]++;

      // Weight sum check (warning if > 1 or < -1)
      const sum = weights.reduce((acc, [, v]) => acc + v, 0);
      if (Math.abs(sum) > 3) {
        warnings.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." weight sum is ${sum} (ideally near 0)`);
      }
    }
  }

  // Check all 5 axes appear as dominant at least once
  for (const [axis, count] of Object.entries(axisAppearances)) {
    if (count === 0) {
      warnings.push(`Axis "${axis}" never appears as dominant in any option`);
    }
  }

  return [...errors.map(e => `ERROR: ${e}`), ...warnings.map(w => `WARN: ${w}`)];
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length === 0) {
  // Validate all decks
  const decksDir = path.join(__dirname, '..', 'src', 'data', 'decks');
  const files = fs.readdirSync(decksDir).filter(f => f.endsWith('.json'));
  let totalErrors = 0;

  for (const file of files) {
    const filePath = path.join(decksDir, file);
    const deck: Deck = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const issues = validateDeck(deck);
    const errors = issues.filter(i => i.startsWith('ERROR'));
    const warnings = issues.filter(i => i.startsWith('WARN'));

    if (errors.length === 0) {
      console.log(`\x1b[32m✓\x1b[0m ${file} — ${deck.questions.length} questions, OK`);
    } else {
      console.log(`\x1b[31m✗\x1b[0m ${file} — ${errors.length} errors`);
      totalErrors += errors.length;
    }
    for (const e of errors) console.log(`  \x1b[31m${e}\x1b[0m`);
    for (const w of warnings) console.log(`  \x1b[33m${w}\x1b[0m`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
} else {
  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31mFile not found: ${filePath}\x1b[0m`);
    process.exit(1);
  }
  const deck: Deck = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const issues = validateDeck(deck);
  const errors = issues.filter(i => i.startsWith('ERROR'));
  const warnings = issues.filter(i => i.startsWith('WARN'));

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`\x1b[32m✓ ${deck.name} (${deck.deckId}) — All checks passed!\x1b[0m`);
  } else {
    for (const e of errors) console.log(`\x1b[31m${e}\x1b[0m`);
    for (const w of warnings) console.log(`\x1b[33m${w}\x1b[0m`);
    console.log(`\n${errors.length} errors, ${warnings.length} warnings`);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}
```

**Step 2: Add npm scripts**

Add to `package.json` scripts:
```json
"deck:validate": "npx tsx scripts/validate-deck.ts",
"deck:register": "npx tsx scripts/register-deck.ts"
```

**Step 3: Install tsx as dev dependency**

Run: `npm install -D tsx`

**Step 4: Test the validator**

Run: `npm run deck:validate`
Expected: All 6 decks should show errors for word count violations (texts too long) and possibly for having only 3 options on high-tension questions (warnings, not errors — 3 is still valid).

**Step 5: Commit**

```bash
git add scripts/validate-deck.ts package.json package-lock.json
git commit -m "feat: add CLI deck validator script"
```

---

## Task 3: Create CLI register script

**Files:**
- Create: `scripts/register-deck.ts`

**Step 1: Create the register script**

```typescript
// scripts/register-deck.ts
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npm run deck:register <deckId> [price]');
  console.error('Example: npm run deck:register familia_01 20');
  process.exit(1);
}

const deckId = args[0];
const price = args[1] ? parseInt(args[1], 10) : undefined;

const decksDir = path.join(__dirname, '..', 'src', 'data', 'decks');
const indexPath = path.join(decksDir, 'index.ts');
const deckJsonPath = path.join(decksDir, `${deckId}.json`);

// Check deck JSON exists
if (!fs.existsSync(deckJsonPath)) {
  console.error(`\x1b[31mDeck file not found: ${deckJsonPath}\x1b[0m`);
  console.error('Create the JSON file first, then run this script.');
  process.exit(1);
}

// Read current index
let indexContent = fs.readFileSync(indexPath, 'utf-8');

// Check if already registered
if (indexContent.includes(`'${deckId}'`) || indexContent.includes(`"${deckId}"`)) {
  console.log(`\x1b[33m⚠ Deck "${deckId}" is already registered in index.ts\x1b[0m`);
  process.exit(0);
}

// Generate camelCase variable name
const varName = deckId.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// 1. Add import after last import line
const importLines = indexContent.match(/^import .+ from '.\/.*\.json';$/gm) || [];
const lastImport = importLines[importLines.length - 1];
const newImport = `import ${varName} from './${deckId}.json';`;
indexContent = indexContent.replace(lastImport, `${lastImport}\n${newImport}`);

// 2. Add to ALL_DECKS array (before the closing bracket)
indexContent = indexContent.replace(
  /(\s+)(.*as unknown as Deck,\n)(];)/,
  `$1$2$1${varName} as unknown as Deck,\n$3`
);

// 3. Add to DECK_UNLOCK_ORDER
indexContent = indexContent.replace(
  /('livro_amaldicoado',?\n)(];)/,
  `'livro_amaldicoado',\n  '${deckId}',\n$2`
);

fs.writeFileSync(indexPath, indexContent);

console.log(`\x1b[32m✓ Registered "${deckId}" in index.ts\x1b[0m`);
console.log(`  - Import: ${newImport}`);
console.log(`  - Added to ALL_DECKS`);
console.log(`  - Added to DECK_UNLOCK_ORDER`);

if (price !== undefined) {
  // Also update DECK_PRICES in decks/page.tsx
  const decksPagePath = path.join(__dirname, '..', 'src', 'app', 'decks', 'page.tsx');
  if (fs.existsSync(decksPagePath)) {
    let pageContent = fs.readFileSync(decksPagePath, 'utf-8');
    pageContent = pageContent.replace(
      /(livro_amaldicoado:\s*\d+,?)/,
      `$1\n  ${deckId}: ${price},`
    );
    fs.writeFileSync(decksPagePath, pageContent);
    console.log(`  - Set price: ${price} fichas in DECK_PRICES`);
  }
}

console.log('\nDon\'t forget to run: npm run build');
```

**Step 2: Test with a dry run (don't actually run yet — no new deck to register)**

Just verify the script compiles:
Run: `npx tsx scripts/register-deck.ts`
Expected: Shows usage message and exits.

**Step 3: Commit**

```bash
git add scripts/register-deck.ts
git commit -m "feat: add CLI deck register script"
```

---

## Task 4: Update SceneOptionsStage layout for 4-5 options

**Files:**
- Modify: `src/components/play/SceneOptionsStage.tsx`

**Step 1: Make layout adaptive**

Replace the options grid section. The current code uses a simple `<div className="grid gap-1.5">`. Update to adapt based on option count:

For 3 options: keep current single column.
For 4 options: 2x2 grid on larger screens, single column on mobile.
For 5 options: smaller padding, tighter spacing.

Replace the grid container:
```tsx
<div className={`grid gap-1.5 ${
  shuffledOptions.length >= 4 ? 'sm:grid-cols-2' : ''
}`}>
```

For 4-5 options, make option cards slightly more compact. Replace the HoldButton content:
```tsx
<HoldButton
  onConfirm={() => onAnswer(option)}
  holdColor={holdColor}
  enableHaptics={enableHaptics}
  className={`w-full rounded-xl border border-white/10 bg-white/6 text-left backdrop-blur-xl transition-colors hover:bg-white/8 ${
    shuffledOptions.length >= 4 ? 'px-2.5 py-1.5' : 'px-3 py-2'
  }`}
>
```

Also reduce the letter badge and text size when there are 4+ options:
```tsx
<div
  className={`flex items-center justify-center rounded-full border font-bold flex-shrink-0 ${
    shuffledOptions.length >= 4 ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
  }`}
  style={{
    borderColor: `${holdColor}40`,
    color: holdColor,
    backgroundColor: `${holdColor}12`,
  }}
>
  {OPTION_LETTERS[index]}
</div>
<p className={`leading-snug text-white/90 ${
  shuffledOptions.length >= 4 ? 'text-[12px]' : 'text-[13px]'
}`}>
  {option.text}
</p>
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Compiles with no errors. No visual change yet (all decks still have 3 options).

**Step 3: Commit**

```bash
git add src/components/play/SceneOptionsStage.tsx
git commit -m "feat: adaptive layout for 3-5 options in play screen"
```

---

## Task 5: Update SceneFeedbackStage for shorter feedback text

**Files:**
- Modify: `src/components/play/SceneFeedbackStage.tsx` (check if it needs changes for shorter text display)

**Step 1: Read the file and check if any changes needed**

The feedback text currently displays at 18px/32px. With shorter feedback (max 15 words), this should look fine. Only adjust if the text area feels oversized for shorter content.

If the component renders feedback at `text-xl sm:text-2xl` or larger, consider reducing to `text-lg sm:text-xl` to better fit 15-word max feedback.

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit (if changes made)**

```bash
git add src/components/play/SceneFeedbackStage.tsx
git commit -m "refactor: adjust feedback display for shorter text"
```

---

## Task 6: Rewrite all 6 existing decks

**Files:**
- Modify: `src/data/decks/basic_01.json`
- Modify: `src/data/decks/profissional.json`
- Modify: `src/data/decks/alta_tensao.json`
- Modify: `src/data/decks/holofote.json`
- Modify: `src/data/decks/social.json`
- Modify: `src/data/decks/livro_amaldicoado.json`

**Important:** This is the biggest task. Each deck has 10 questions that need:
- Context slides shortened to max 25 words
- Event slides shortened to max 20 words
- Option text shortened to max 15 words
- Feedback shortened to max 15 words
- High-tension questions (tensao 4-5) expanded to 4-5 options
- Medium-tension (tensao 3) can get a 4th option where natural
- Low-tension (tensao 1-2) keep 3 options
- New options should include "same action, different intention" pairs where fitting
- Weight values rescaled to ±1 to ±3 range (current deck uses ±5 to ±10 — normalize to smaller scale)
- All weights must have trade-offs (positive + negative)

**Step 1: Rewrite basic_01.json**

This deck has tensao mostly 2 (low). Keep 3 options per question. Focus on shortening texts and rescaling weights from ±5-10 to ±1-3.

**Step 2: Rewrite profissional.json**

Mixed tension. Questions at tensao 3+ get 4 options. Shorten texts.

**Step 3: Rewrite alta_tensao.json**

High tension deck. Most questions should have 4-5 options. Add nuanced pairs.

**Step 4: Rewrite holofote.json**

Mixed tension. Expand high-tension to 4-5 options.

**Step 5: Rewrite social.json**

Social dynamics deck. Expand where natural.

**Step 6: Rewrite livro_amaldicoado.json**

Highest tier. Most questions get 4-5 options with deep nuance.

**Step 7: Validate all decks**

Run: `npm run deck:validate`
Expected: All 6 decks pass with 0 errors. Warnings about weight sums are acceptable.

**Step 8: Build and verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 9: Commit**

```bash
git add src/data/decks/*.json
git commit -m "content: rewrite all 6 decks — shorter texts, flexible options, rescaled weights"
```

---

## Task 7: Final integration test

**Step 1: Run full validation**

Run: `npm run deck:validate`
Expected: All 6 decks pass.

**Step 2: Build**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 3: Manual smoke test checklist**

- [ ] Start `npm run dev`
- [ ] Play through basic_01 — all questions render, 3 options each
- [ ] Play a high-tension deck — verify 4-5 options display correctly on mobile
- [ ] Check options fit on screen without scroll on mobile viewport (375px)
- [ ] Verify feedback text renders properly (shorter text)
- [ ] Complete a deck — resultado page shows correctly
- [ ] Verify streak increments

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for deck generator"
```

---

## Execution Order Summary

| Task | What | Depends on |
|------|------|-----------|
| 1 | Update validator (3-5 options + word counts) | — |
| 2 | CLI validate script | Task 1 |
| 3 | CLI register script | — |
| 4 | SceneOptionsStage adaptive layout | — |
| 5 | SceneFeedbackStage check | — |
| 6 | Rewrite all 6 decks | Tasks 1, 4 |
| 7 | Final integration test | All |

**Parallelizable:**
- Tasks 1, 3, 4, 5 can run in parallel
- Task 2 depends on Task 1
- Task 6 depends on Tasks 1 + 4
- Task 7 depends on all
