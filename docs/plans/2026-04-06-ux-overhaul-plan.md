# UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform MindPractice from a functional prototype into an addictive, shareable, desirable product through onboarding, retention mechanics, social features, navigation simplification, and purchase psychology.

**Architecture:** Mostly client-side changes. New components for onboarding, streak, radar, share card. GameContext gets new reducer actions (EARN_FICHAS, streak tracking). Navigation collapses from 5 tabs to 3. Loja merges into Decks. Dashboard merges into Perfil.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Tailwind CSS, html2canvas (new dep for share cards), localStorage persistence.

---

## Task 1: Navigation — Collapse 5 tabs to 3

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Delete: `src/app/dashboard/page.tsx`
- Delete: `src/app/loja/page.tsx`
- Modify: `src/app/layout.tsx` (no changes needed, BottomNav auto-hides)

**Step 1: Update BottomNav tabs array**

Replace the 5-tab config with 3 tabs:

```tsx
const tabs = [
  {
    label: 'Home',
    href: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  },
  {
    label: 'Decks',
    href: '/decks',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    isCenter: true,
  },
  {
    label: 'Perfil',
    href: '/perfil',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
];
```

**Step 2: Delete old pages**

```bash
rm src/app/dashboard/page.tsx
rm src/app/loja/page.tsx
rm -rf .next
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Compiles with no errors. Routes /dashboard and /loja become 404.

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: collapse nav from 5 tabs to 3 (Home, Decks, Perfil)"
```

---

## Task 2: Merge Loja into Decks page

**Files:**
- Modify: `src/app/decks/page.tsx`

**Step 1: Add "Loja" as a 4th tab in the Decks page**

Add to TABS array:
```tsx
const TABS: { id: DeckCategory | 'loja'; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
  { id: 'loja', label: 'Loja' },
];
```

**Step 2: Import wallet state and DECK_PRICES**

Move `DECK_PRICES` map from old loja page into this file. Import `spendFichas` from useGame.

**Step 3: Render loja tab content**

When `activeTab === 'loja'`:
- Show fichas balance header with 💎
- Grid of ALL_DECKS with DeckTarotCard (locked ones show price)
- DeckDetailModal with buy action (price, canAfford, onBuy)

When any other tab: existing behavior (play action).

**Step 4: Handle purchase flow in modal**

```tsx
const handleBuy = () => {
  if (!selectedDeck) return;
  const price = DECK_PRICES[selectedDeck.deckId] ?? 50;
  if (price === 0) return;
  const ok = spendFichas(price, selectedDeck.deckId);
  if (ok) setSelectedDeck(null);
};
```

Pass `price`, `canAfford`, `onBuy` to DeckDetailModal only when `activeTab === 'loja'`. Otherwise pass `owned={true}` and `onPlay`.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/decks/page.tsx && git commit -m "feat: merge loja into decks page as 4th tab"
```

---

## Task 3: Merge Dashboard into Perfil

**Files:**
- Modify: `src/app/perfil/page.tsx`

**Step 1: Add collapsible stats section below the portrait**

After the bottom overlay with precision/consistency bars, add a scrollable section below the fullbleed portrait that contains:
- Axis bars (from old dashboard)
- Rankings per deck (from old dashboard)
- Recent runs list (from old dashboard, limited to 4)

The portrait stays `flex-1` and fills the screen. Below it, a `<div>` section with stats that only appears when user scrolls down (natural overflow).

**Step 2: Move helper functions from dashboard**

Move `getBestPerDeck()`, `getRankFromScore()`, `RANK_STYLES`, `precisionTint()`, `consistencyTint()` into perfil page (or a shared util if they grow).

**Step 3: Import RunReportCard**

Add `import RunReportCard from '@/components/RunReportCard'` and render recent runs.

**Step 4: Add visual divider between portrait and stats**

Small section header: "Historico" with glass-surface styling, axis bars, rankings, runs.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/perfil/page.tsx && git commit -m "feat: merge dashboard stats into perfil page"
```

---

## Task 4: Scene preview for locked decks

**Files:**
- Modify: `src/components/DeckDetailModal.tsx`

**Step 1: Add scene preview to modal for unpurchased decks**

When `price !== undefined && !owned`, show the first scene's context text from the deck as a read-only preview:

```tsx
{/* Scene preview for unpurchased decks */}
{price !== undefined && !owned && deck.questions[0] && (
  <div className="border-t border-white/8 px-5 py-3">
    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
      Preview da primeira cena
    </p>
    <p className="text-xs italic leading-relaxed text-white/50">
      &ldquo;{deck.questions[0].slides[0]?.texto}&rdquo;
    </p>
  </div>
)}
```

This shows the context slide text only (no event, no options). User reads the setup and feels the atmosphere before buying.

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/DeckDetailModal.tsx && git commit -m "feat: add scene preview for locked decks in modal"
```

---

## Task 5: Streak system in GameContext

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/context/GameContext.tsx`
- Modify: `src/lib/runScoring.ts` (normalizeGameState)

**Step 1: Add streak fields to GameState type**

In `src/types/game.ts`, add to GameState:
```typescript
export interface GameState {
  // ... existing fields ...
  streak: number;           // consecutive days played
  lastPlayDate: string | null; // ISO date 'YYYY-MM-DD'
}
```

**Step 2: Update FINISH_DECK reducer to track streak**

In GameContext reducer, inside `case 'FINISH_DECK'`:
```typescript
const todayStr = now.split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
let newStreak = state.streak;
if (state.lastPlayDate === todayStr) {
  // Already played today, no change
} else if (state.lastPlayDate === yesterday) {
  newStreak = state.streak + 1; // Continue streak
} else {
  newStreak = 1; // Reset streak
}
```

Add `streak: newStreak, lastPlayDate: todayStr` to the returned state.

**Step 3: Update initialState**

```typescript
const initialState: GameState = {
  // ... existing ...
  streak: 0,
  lastPlayDate: null,
};
```

**Step 4: Update normalizeGameState in runScoring.ts**

Add fallback for missing streak/lastPlayDate fields:
```typescript
streak: s.streak ?? 0,
lastPlayDate: s.lastPlayDate ?? null,
```

**Step 5: Update migrateV1 to include streak**

Add `streak: 0, lastPlayDate: null` to migrated state.

**Step 6: Add EARN_FICHAS action for gameplay rewards**

New action type:
```typescript
| { type: 'EARN_FICHAS'; amount: number; reason: string }
```

Reducer:
```typescript
case 'EARN_FICHAS': {
  return {
    ...state,
    wallet: {
      ...state.wallet,
      fichas: state.wallet.fichas + action.amount,
      totalEarned: state.wallet.totalEarned + action.amount,
    },
  };
}
```

**Step 7: Award fichas on FINISH_DECK**

Inside FINISH_DECK, after streak calculation:
```typescript
// Bonus fichas
let bonusFichas = 3; // first deck of day
if (newStreak > 0 && newStreak % 7 === 0) bonusFichas += 20; // weekly streak bonus
const noTimeouts = state.activeRun ? state.activeRun.timeoutCount === 0 : false;
if (noTimeouts) bonusFichas += 5; // no-timeout bonus
```

Add bonus to wallet in returned state.

**Step 8: Expose streak in context value**

Add `streak: state.streak` to GameContextValue interface and provider value.

**Step 9: Build and verify**

Run: `npm run build`

**Step 10: Commit**

```bash
git add src/types/game.ts src/context/GameContext.tsx src/lib/runScoring.ts
git commit -m "feat: add streak tracking + fichas from gameplay rewards"
```

---

## Task 6: Onboarding — First-time story slides

**Files:**
- Create: `src/components/OnboardingStories.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create OnboardingStories component**

3 fullscreen slides with framer-motion transitions:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const ONBOARDING_KEY = 'mindpractice_onboarded';

const slides = [
  {
    title: 'Situacoes reais.',
    subtitle: 'Reacoes suas.',
    description: 'Cenarios do dia a dia que testam como voce reage sob pressao.',
    gradient: 'from-cyan-500/20 to-transparent',
  },
  {
    title: 'Cada escolha',
    subtitle: 'revela quem voce e.',
    description: '5 eixos comportamentais. Nenhuma resposta certa. So a sua.',
    gradient: 'from-purple-500/20 to-transparent',
  },
  {
    title: 'Descubra seu',
    subtitle: 'arquetipo.',
    description: '15 perfis possiveis. O seu muda conforme voce joga.',
    gradient: 'from-amber-500/20 to-transparent',
    isFinal: true,
  },
];
```

Each slide: fullscreen, dark bg, centered text, tap/swipe to advance. Last slide has CTA "Jogar agora" that:
1. Sets `localStorage.setItem(ONBOARDING_KEY, 'true')`
2. Navigates to `/play/basic_01`

**Step 2: Wrap layout with onboarding gate**

In `layout.tsx`, render `<OnboardingGate>` wrapper that checks `localStorage.getItem(ONBOARDING_KEY)`. If not set, show OnboardingStories instead of children. If set, render children normally.

Since layout.tsx is a server component, create a client wrapper:

```tsx
// src/components/OnboardingGate.tsx
'use client';
import { useEffect, useState } from 'react';
import OnboardingStories from './OnboardingStories';

const ONBOARDING_KEY = 'mindpractice_onboarded';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    setNeedsOnboarding(!localStorage.getItem(ONBOARDING_KEY));
    setChecked(true);
  }, []);

  if (!checked) return null; // flash prevention
  if (needsOnboarding) return <OnboardingStories onComplete={() => setNeedsOnboarding(false)} />;
  return <>{children}</>;
}
```

**Step 3: Update layout.tsx**

```tsx
<GameProvider>
  <OnboardingGate>
    <main className="min-h-screen pb-20">{children}</main>
    <BottomNav />
  </OnboardingGate>
</GameProvider>
```

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/components/OnboardingStories.tsx src/components/OnboardingGate.tsx src/app/layout.tsx
git commit -m "feat: add 3-slide onboarding for first-time users"
```

---

## Task 7: Home redesign — Streak + Mini radar + Daily challenge

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/MiniRadar.tsx`

**Step 1: Create MiniRadar component**

SVG pentagon chart showing 5 axes. Normalized 0-1 scale. Transparent fill with colored stroke.

```tsx
// src/components/MiniRadar.tsx
'use client';
import type { StatKey } from '@/types/game';
import { STAT_KEYS, STAT_COLORS } from '@/types/game';

interface MiniRadarProps {
  axes: Record<StatKey, number>;
  size?: number;
}
```

Renders a 5-point radar (pentagon) where each vertex maps to an axis. Points calculated with trigonometry. Values normalized by max absolute value. Fill area with `rgba(103,232,249,0.08)`, stroke with `rgba(103,232,249,0.4)`. Dots at each vertex colored by axis.

**Step 2: Redesign Home page**

New layout (top to bottom, no scroll ideally):

1. **Header row**: "MindPractice" left-aligned + fichas pill right-aligned
2. **Streak + Radar row**: Left = streak counter with fire emoji ("3 dias 🔥"), Right = MiniRadar (120x120px)
3. **Archetype change banner** (conditional): "Voce agora e O Diplomata" with shimmer border. Only shows if archetype changed since last visit. Track `lastSeenArchetype` in localStorage.
4. **Daily claim button** (if available): Full-width glass card "+10 fichas diarias" with gold accent
5. **Suggested decks**: 3-column tarot card grid (existing)
6. **CTA**: "Todos os Decks" button

**Step 3: Add streak display**

```tsx
<div className="flex items-center gap-1.5">
  <span className="text-lg">🔥</span>
  <span className="text-sm font-bold text-white/80">{state.streak}</span>
  <span className="text-[10px] text-white/34">
    {state.streak === 1 ? 'dia' : 'dias'}
  </span>
</div>
```

**Step 4: Add archetype change banner**

Check localStorage `mindpractice_last_seen_archetype`. If current archetype differs, show banner with shimmer. On dismiss or after 5s, update localStorage.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/MiniRadar.tsx
git commit -m "feat: redesign home with streak counter, mini radar, archetype banner"
```

---

## Task 8: Result screen — Shimmer reveal + Evolution timeline

**Files:**
- Modify: `src/app/resultado/[deckId]/page.tsx`

**Step 1: Add shimmer/glow to archetype name reveal**

Wrap the archetype name `<h1>` with a delayed entrance:

```tsx
<motion.h1
  initial={{ opacity: 0, filter: 'blur(12px)' }}
  animate={{ opacity: 1, filter: 'blur(0px)' }}
  transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
  className="text-3xl font-bold text-white/95"
  style={{
    textShadow: archetypeChanged
      ? '0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.15)'
      : '0 0 30px rgba(103,232,249,0.2)',
  }}
>
  {archetype.name}
</motion.h1>
```

Brief blur-to-sharp with glow. Gold glow if archetype changed, cyan if maintained.

**Step 2: Add evolution timeline**

After the expandable details section, add an "Evolucao" section showing archetype history from snapshots:

```tsx
const archetypeTimeline = useMemo(() => {
  const timeline: { date: string; archetype: string }[] = [];
  let lastArch = '';
  for (const snap of state.calibration.snapshots) {
    if (snap.archetypeAtCompletion !== lastArch) {
      timeline.push({
        date: new Date(snap.completedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
        archetype: snap.archetypeAtCompletion,
      });
      lastArch = snap.archetypeAtCompletion;
    }
  }
  return timeline;
}, [state.calibration.snapshots]);
```

Render as horizontal timeline with dots and labels. Only show if 2+ entries.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/app/resultado/[deckId]/page.tsx
git commit -m "feat: add shimmer reveal + evolution timeline to result screen"
```

---

## Task 9: Shareable archetype card

**Files:**
- Create: `src/components/ShareCard.tsx`
- Create: `src/components/ShareButton.tsx`
- Modify: `src/app/resultado/[deckId]/page.tsx`
- Modify: `src/app/perfil/page.tsx`
- Install: `html2canvas` dependency

**Step 1: Install html2canvas**

```bash
npm install html2canvas
```

**Step 2: Create ShareCard component**

Hidden off-screen div (used as canvas source). Fixed 1080x1920 (9:16 story format):

```tsx
// src/components/ShareCard.tsx
'use client';
import { forwardRef } from 'react';
import type { Archetype, StatKey } from '@/types/game';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';

interface ShareCardProps {
  archetype: Archetype;
  axes: Record<StatKey, number>;
  nickname: string;
}
```

Renders:
- Dark background with gradient
- Archetype name large + tagline
- 5-axis radar (inline SVG, same logic as MiniRadar but bigger)
- Nickname at bottom
- "Eu sou {archetype.name}. E voce?" text
- "MindPractice" watermark + link

**Step 3: Create ShareButton component**

```tsx
// src/components/ShareButton.tsx
'use client';
import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import ShareCard from './ShareCard';

interface ShareButtonProps {
  archetype: Archetype;
  axes: Record<StatKey, number>;
  nickname: string;
}
```

On click:
1. Renders ShareCard in hidden div
2. Calls `html2canvas()` on it
3. If `navigator.share` available: share as image file
4. Else: download as PNG

**Step 4: Add ShareButton to result page**

After the "Proximo Deck" CTA, add:
```tsx
<ShareButton archetype={archetype} axes={state.calibration.axes} nickname={nickname} />
```

Need to read nickname from localStorage in resultado page.

**Step 5: Add ShareButton to perfil page**

In the top toolbar, add share icon button next to edit/delete.

**Step 6: Build and verify**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/ShareCard.tsx src/components/ShareButton.tsx \
  src/app/resultado/[deckId]/page.tsx src/app/perfil/page.tsx package.json package-lock.json
git commit -m "feat: add shareable archetype card with share/download"
```

---

## Task 10: Purchase psychology — Discount countdown + Popular badge

**Files:**
- Modify: `src/app/decks/page.tsx` (loja tab)
- Create: `src/lib/weeklyDiscount.ts`

**Step 1: Create weekly discount helper**

```typescript
// src/lib/weeklyDiscount.ts
export function getWeeklyDiscountDeckId(): string | null {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const discountable = ['holofote', 'alta_tensao', 'profissional', 'social', 'livro_amaldicoado'];
  return discountable[weekNum % discountable.length];
}

export function getDiscountTimeRemaining(): string {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(0, 0, 0, 0);
  const diff = endOfWeek.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
```

**Step 2: Show discount badge in loja tab**

In the deck grid (loja tab), if `deck.deckId === getWeeklyDiscountDeckId()`:
- Show "50% OFF" badge on the tarot card
- Show countdown timer below grid: "Oferta expira em 23h 45m"
- Apply discounted price in modal

**Step 3: Add "Popular" badge**

Hardcode `POPULAR_DECK = 'basic_01'` for now. Show orange "Popular" badge on that card.

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/lib/weeklyDiscount.ts src/app/decks/page.tsx
git commit -m "feat: add weekly discount countdown + popular badge in loja"
```

---

## Task 11: Polish — Contrast, haptics, swipe

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/play/SceneTextStage.tsx`
- Modify: Various pages for contrast fixes

**Step 1: Improve text contrast globally**

Search for `text-white/3` and `text-white/4` patterns across all pages. Raise informational text (descriptions, subtitles, labels) from `/30-40` to `/50-60`. Keep decorative/muted text at `/20-30`.

Key files to update:
- `src/app/page.tsx` — suggestion subtitles
- `src/app/decks/page.tsx` — deck count, tab labels
- `src/app/perfil/page.tsx` — stat labels
- `src/components/DeckTarotCard.tsx` — "X cenas" text
- `src/components/DeckDetailModal.tsx` — detail labels

**Step 2: Add swipe to advance in SceneTextStage**

Add horizontal swipe detection using pointer events:

```tsx
const handlePointerDown = (e: React.PointerEvent) => { startX.current = e.clientX; };
const handlePointerUp = (e: React.PointerEvent) => {
  const dx = e.clientX - startX.current;
  if (dx < -50 && canTapAdvance) onTapAdvance(); // swipe left = advance
};
```

Add these handlers to the SceneTextStage container div.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add -A && git commit -m "polish: improve text contrast + add swipe to advance in play"
```

---

## Task 12: Cleanup orphaned files

**Files:**
- Delete: `src/components/ArchetypeProfileHero.tsx`
- Delete: `src/components/BipolarSliders.tsx`
- Delete: `src/components/SlideTransition.tsx`
- Delete: `src/components/Timer.tsx`
- Delete: `src/components/DeckCard.tsx` (replaced by DeckTarotCard)
- Delete: `src/components/DeckCoverArt.tsx` (only used by DeckCard)
- Modify: `src/app/tiers/page.tsx` — update to use DeckTarotCard instead of DeckCard

**Step 1: Update tiers page to use DeckTarotCard**

Replace DeckCard import with DeckTarotCard. Adjust rendering accordingly.

**Step 2: Delete orphaned components**

```bash
rm src/components/ArchetypeProfileHero.tsx
rm src/components/BipolarSliders.tsx
rm src/components/SlideTransition.tsx
rm src/components/Timer.tsx
rm src/components/DeckCard.tsx
rm src/components/DeckCoverArt.tsx
```

**Step 3: Verify no remaining imports**

```bash
grep -r "ArchetypeProfileHero\|BipolarSliders\|SlideTransition\|Timer\|DeckCard\|DeckCoverArt" src/ --include="*.tsx" --include="*.ts"
```

Should return 0 results (except DeckTarotCard references which are fine).

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add -A && git commit -m "cleanup: remove 6 orphaned components, update tiers to use DeckTarotCard"
```

---

## Execution Order Summary

| Task | What | Depends on |
|------|------|-----------|
| 1 | Nav: 5 → 3 tabs | — |
| 2 | Loja → Decks tab | Task 1 |
| 3 | Dashboard → Perfil | Task 1 |
| 4 | Scene preview modal | — |
| 5 | Streak + fichas rewards | — |
| 6 | Onboarding stories | — |
| 7 | Home redesign (streak/radar/banner) | Task 5 |
| 8 | Result shimmer + timeline | — |
| 9 | Shareable card | — |
| 10 | Discount + popular badge | Task 2 |
| 11 | Polish (contrast/swipe) | — |
| 12 | Cleanup orphans | Task 1 |

**Parallelizable groups:**
- Group A: Tasks 1→2→3→10→12 (navigation chain)
- Group B: Tasks 4, 5, 6, 8, 9 (independent features)
- Group C: Task 7 (depends on Task 5)
- Group D: Task 11 (independent polish)
