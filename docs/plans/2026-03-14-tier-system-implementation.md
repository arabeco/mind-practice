# Tier System (Visual & Data Model) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 3-level system (`leve | medio | extremo`) with a 5-tier visual hierarchy for deck cards, each with distinct glassmorphism styling, while keeping the 3-tab category navigation intact.

**Architecture:** Add `tier: 1 | 2 | 3 | 4 | 5` to the Deck type (removing `level`). Create a `TIER_CONFIG` constant map with labels, CSS classes, and tier metadata. Extract a `DeckCard` component from the inline card JSX in `decks/page.tsx`. Tier 5 uses Framer Motion animated conic-gradient border. Update all 4 deck JSON files and the deck validator.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS 4 (`@theme inline`), Framer Motion 12

---

### Task 1: Update types — replace `level` with `tier`

**Files:**
- Modify: `src/types/game.ts`

**Step 1: Replace level type with tier in Deck interface**

In `src/types/game.ts`, replace the `level` field in the `Deck` interface:

```typescript
// BEFORE (line 59):
level: 'leve' | 'medio' | 'extremo';

// AFTER:
tier: 1 | 2 | 3 | 4 | 5;
```

**Step 2: Add TierConfig type and TIER_CONFIG constant**

After the `STAT_LABELS` constant (after line 125), add:

```typescript
// ============================================================
// Tier System
// ============================================================

export type TierLevel = 1 | 2 | 3 | 4 | 5;

export interface TierConfig {
  label: string;
  subtitle: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  cardShadow: string;
  /** Tier 5 only — animated gradient border */
  animated: boolean;
}

export const TIER_CONFIG: Record<TierLevel, TierConfig> = {
  1: {
    label: 'Zinco',
    subtitle: 'Calibragem basica',
    badgeClass: 'bg-white/10 text-white/60',
    cardBorderClass: 'border-white/10',
    cardBgClass: 'bg-white/5',
    cardShadow: 'none',
    animated: false,
  },
  2: {
    label: 'Cromo',
    subtitle: 'Alta tensao',
    badgeClass: 'bg-purple-500/20 text-purple-400',
    cardBorderClass: 'border-purple-500/30',
    cardBgClass: 'bg-purple-900/10',
    cardShadow: '0 0 15px rgba(139,92,246,0.1)',
    animated: false,
  },
  3: {
    label: 'Dominio',
    subtitle: 'Treino de eixo',
    badgeClass: 'bg-cyan-400/20 text-cyan-400',
    cardBorderClass: 'border-cyan-400/40',
    cardBgClass: 'bg-cyan-900/10',
    cardShadow: 'none',
    animated: false,
  },
  4: {
    label: 'Gold',
    subtitle: 'Desafio',
    badgeClass: 'bg-yellow-500/20 text-yellow-500',
    cardBorderClass: 'border-yellow-500/50',
    cardBgClass: 'bg-yellow-600/5',
    cardShadow: '0 0 20px rgba(212,175,55,0.2)',
    animated: false,
  },
  5: {
    label: 'Lendario',
    subtitle: 'Season',
    badgeClass: 'bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-white',
    cardBorderClass: 'border-transparent',
    cardBgClass: 'bg-white/8',
    cardShadow: 'none',
    animated: true,
  },
};
```

**Step 3: Verify the build compiles (expect errors in other files — that's expected)**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: Errors in `decks/page.tsx`, deck JSON files, `validateDeck.ts`, `decks/index.ts` referencing `level`. This confirms the type change propagated correctly.

**Step 4: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: replace level with 5-tier system in Deck type + add TIER_CONFIG"
```

---

### Task 2: Update deck JSON files — `level` → `tier`

**Files:**
- Modify: `src/data/decks/basic_01.json`
- Modify: `src/data/decks/alta_tensao.json`
- Modify: `src/data/decks/profissional.json`
- Modify: `src/data/decks/social.json`

**Step 1: Update each deck JSON**

Replace `"level": "..."` with `"tier": N` in each file:

| File | Old | New |
|------|-----|-----|
| `basic_01.json` | `"level": "leve"` | `"tier": 1` |
| `alta_tensao.json` | `"level": "medio"` | `"tier": 2` |
| `profissional.json` | `"level": "medio"` | `"tier": 2` |
| `social.json` | `"level": "extremo"` | `"tier": 4` |

Rationale:
- `basic_01` is the essential calibration deck → **Zinco (Tier 1)**
- `alta_tensao` is high-stress scenarios → **Cromo (Tier 2)**
- `profissional` is professional scenarios → **Cromo (Tier 2)**
- `social` is extreme social intrigue → **Gold (Tier 4)** (highest difficulty existing deck)

> Note: No Tier 3 (Dominio) or Tier 5 (Lendario) decks exist yet — those tiers are for future content.

**Step 2: Verify JSON is valid**

Run: `node -e "require('./src/data/decks/basic_01.json'); require('./src/data/decks/alta_tensao.json'); require('./src/data/decks/profissional.json'); require('./src/data/decks/social.json'); console.log('All JSON valid')"`

Expected: `All JSON valid`

**Step 3: Commit**

```bash
git add src/data/decks/basic_01.json src/data/decks/alta_tensao.json src/data/decks/profissional.json src/data/decks/social.json
git commit -m "feat: migrate deck JSON files from level to tier field"
```

---

### Task 3: Update deck index and validator

**Files:**
- Modify: `src/data/decks/index.ts`
- Modify: `src/utils/validateDeck.ts`

**Step 1: Update `src/data/decks/index.ts`**

No changes needed to the index file itself — the casts use `as unknown as Deck`, so TypeScript won't complain about the JSON shape. The exports remain the same.

However, verify imports still compile. If `getDecksByCategory` or other functions reference `level`, fix them. Currently they don't — confirmed from the read above.

**Step 2: Update `src/utils/validateDeck.ts`**

The current validator checks `category` and `difficulty` but not `level`. Add a `tier` check:

After line 8 (`if (!deck.difficulty) errors.push('Missing difficulty');`), add:

```typescript
if (!deck.tier || deck.tier < 1 || deck.tier > 5) errors.push('Invalid tier (must be 1-5)');
```

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: Only errors remaining should be in `src/app/decks/page.tsx` (references `deck.level` and `levelColors`).

**Step 4: Commit**

```bash
git add src/data/decks/index.ts src/utils/validateDeck.ts
git commit -m "feat: add tier validation to deck validator"
```

---

### Task 4: Create DeckCard component with tier-specific styling

**Files:**
- Create: `src/components/DeckCard.tsx`

**Step 1: Create the DeckCard component**

Create `src/components/DeckCard.tsx` with the full tier visual system:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { Deck, StatKey } from '@/types/game';
import { STAT_COLORS, TIER_CONFIG, type TierLevel } from '@/types/game';

interface DeckCardProps {
  deck: Deck;
  index: number;
  locked: boolean;
  completed: boolean;
  isWeeklyFree: boolean;
  timeLeftLabel: string;
  onClick: () => void;
}

/** Tier 3 (Domínio) target icon */
function TargetIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/** Tier 5 animated gradient border wrapper */
function LegendaryBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl p-[1px]">
      {/* Rotating conic gradient */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-70"
        style={{
          background: 'conic-gradient(from 0deg, #8b5cf6, #d4af37, #ef4444, #10b981, #60a5fa, #8b5cf6)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner content mask */}
      <div className="relative rounded-2xl">
        {children}
      </div>
    </div>
  );
}

export default function DeckCard({
  deck,
  index,
  locked,
  completed,
  isWeeklyFree,
  timeLeftLabel,
  onClick,
}: DeckCardProps) {
  const tier = TIER_CONFIG[deck.tier as TierLevel];
  const focusColor = deck.focusAxis ? STAT_COLORS[deck.focusAxis] : undefined;

  const cardContent = (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      disabled={locked}
      onClick={onClick}
      className={`relative w-full overflow-hidden p-5 text-left rounded-2xl backdrop-blur-[20px] transition-all duration-300 ${
        tier.cardBgClass
      } ${locked ? 'cursor-not-allowed opacity-40 grayscale' : 'hover:brightness-110'}`}
      style={{
        border: deck.tier === 5 ? 'none' : `1px solid`,
        borderColor: deck.tier === 5 ? 'transparent' : undefined,
        boxShadow: tier.cardShadow !== 'none' ? tier.cardShadow : undefined,
        ...(focusColor && !locked && deck.tier < 3
          ? { borderColor: `${focusColor}30` }
          : {}),
      }}
    >
      {/* Apply tier border color via className for non-Tier-5 */}
      {deck.tier !== 5 && (
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none ${tier.cardBorderClass}`}
          style={{ border: '1px solid', borderColor: 'inherit' }}
        />
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Tier badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tier.badgeClass}`}>
          {tier.label}
        </span>
        {completed && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">
            Completo
          </span>
        )}
        {isWeeklyFree && !completed && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            Gratis esta semana
          </span>
        )}
        {/* Tier 3: Target icon */}
        {deck.tier === 3 && (
          <div className="ml-auto">
            <TargetIcon />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold">{deck.name}</h3>
      <p className="text-sm text-white/50 mt-1">{deck.description}</p>

      {/* Focus axis tag */}
      {deck.focusAxis && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: focusColor }} />
          <span className="text-[10px] text-white/30 uppercase">{deck.focusAxis}</span>
        </div>
      )}

      <p className="text-[10px] text-white/20 mt-2">{deck.questions.length} cenas</p>

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/50 backdrop-blur-sm">
          <svg className="w-7 h-7 text-accent-gold/60" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-white/50">{timeLeftLabel}</span>
        </div>
      )}
    </motion.button>
  );

  // Tier 5: wrap with animated gradient border
  if (deck.tier === 5) {
    return <LegendaryBorder>{cardContent}</LegendaryBorder>;
  }

  return cardContent;
}
```

**Step 2: Verify component compiles in isolation**

Run: `npx tsc --noEmit src/components/DeckCard.tsx 2>&1 | head -10`

Note: This may still show errors from other files. The key check is that DeckCard itself has no type errors.

**Step 3: Commit**

```bash
git add src/components/DeckCard.tsx
git commit -m "feat: create DeckCard component with 5-tier visual hierarchy"
```

---

### Task 5: Refactor decks page to use DeckCard

**Files:**
- Modify: `src/app/decks/page.tsx`

**Step 1: Rewrite `decks/page.tsx` to use DeckCard**

Replace the entire file with:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory } from '@/types/game';
import DeckCard from '@/components/DeckCard';

const TABS: { id: DeckCategory; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
];

function formatTimeLeft(ms: number): string {
  if (ms === Infinity) return 'Complete o deck anterior';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DecksPage() {
  const [activeTab, setActiveTab] = useState<DeckCategory>('essencial');
  const router = useRouter();
  const { state, dispatch, isDeckLocked, getTimeUntilUnlock } = useGame();
  const weeklyFree = getWeeklyFreeDeckIds();

  const decks = getDecksByCategory(activeTab);

  const handleSelect = (deck: Deck) => {
    const locked = isDeckLocked(deck.deckId) && !weeklyFree.includes(deck.deckId);
    if (locked) return;
    dispatch({ type: 'START_DECK', deck });
    router.push(`/play/${deck.deckId}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Decks</h2>
        <p className="mt-1 text-sm text-white/40">Escolha seu desafio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab.id
                ? 'bg-accent-purple text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deck list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {decks.map((deck, i) => {
            const isWeeklyFree = weeklyFree.includes(deck.deckId);
            const locked = isDeckLocked(deck.deckId) && !isWeeklyFree;
            const completed = deck.deckId in state.completedDecks;
            const timeLeft = getTimeUntilUnlock(deck.deckId);

            return (
              <DeckCard
                key={deck.deckId}
                deck={deck}
                index={i}
                locked={locked}
                completed={completed}
                isWeeklyFree={isWeeklyFree}
                timeLeftLabel={formatTimeLeft(timeLeft)}
                onClick={() => handleSelect(deck)}
              />
            );
          })}

          {decks.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Nenhum deck nesta categoria ainda.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
```

**Step 2: Add tier card hover styles to globals.css**

In `src/app/globals.css`, inside the `@layer components` block, after `.glow-gold`, add:

```css
  .tier-card-hover:hover {
    filter: brightness(1.1);
  }
```

**Step 3: Build the project**

Run: `npm run build`

Expected: Clean build, no errors. All routes compile.

**Step 4: Commit**

```bash
git add src/app/decks/page.tsx src/app/globals.css
git commit -m "refactor: use DeckCard component in decks page with tier visuals"
```

---

### Task 6: Fix any remaining `level` references across the codebase

**Files:**
- Potentially modify: any file still referencing `deck.level` or the old level type

**Step 1: Search for remaining `level` references**

Run: `grep -rn "\.level\b\|'leve'\|'medio'\|'extremo'" src/ --include="*.ts" --include="*.tsx" --include="*.json"`

Expected: Zero matches after previous tasks. If any remain, fix them.

**Step 2: Search for the old `levelColors` reference**

Run: `grep -rn "levelColors" src/`

Expected: Zero matches (was only in old `decks/page.tsx`).

**Step 3: Full build verification**

Run: `npm run build`

Expected: Clean build with all routes compiling successfully.

**Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: remove remaining level references, replaced by tier system"
```

---

### Task 7: Visual verification

**Step 1: Start dev server and verify each tab**

Run: `npm run dev -- -p 3737`

Verify:
1. **Essenciais tab**: "O Despertar" shows Zinco tier badge (white/muted), standard glass card
2. **Cenarios tab**:
   - "Alta Tensao" shows Cromo badge (purple), purple-tinted border with subtle glow
   - "Arena Profissional" shows Cromo badge (purple), purple-tinted border
   - "Circulos Sociais" shows Gold badge (yellow/gold), gold-tinted border with gold glow
3. **Arquetipos tab**: Empty state message
4. Lock overlays still work on locked decks
5. Weekly free badge still appears on rotating deck
6. Click through to play a deck — confirm game flow still works end-to-end

**Step 2: Take screenshots for verification**

Use the preview tools to capture each tab state.

No commit needed — this is verification only.
