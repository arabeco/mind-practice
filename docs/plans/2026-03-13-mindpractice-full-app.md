# MindPractice - Full App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete dark luxury glassmorphism social reactivity simulator with deck selection, timed gameplay engine, archetype calculation, and persistent stats.

**Architecture:** Next.js App Router with React Context for game state, LocalStorage for persistence, Framer Motion for slide transitions. 3-tab bottom nav (Home, Desafio, Config). Mobile-first design with glassmorphism UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12

---

## What Already Exists

- `src/types/game.ts` - All types, archetypes array, constants (TIMER_DURATION=6, INERTIA_PENALTY, INITIAL_STATS)
- `src/data/decks/*.json` - 4 complete decks (basic_01, alta_tensao, profissional, social) with 10 questions each
- `src/data/decks/index.ts` - ALL_DECKS, getDeckById, DECK_UNLOCK_ORDER
- `src/app/globals.css` - Theme variables, glass-card classes, animations already defined
- Dependencies installed: framer-motion, tailwindcss 4, next 16

## What Needs to Be Built

7 tasks total, in dependency order.

---

### Task 1: GameContext - State Management + LocalStorage Persistence

**Files:**
- Create: `src/context/GameContext.tsx`

**Why first:** Every other component depends on this context for stats, deck state, and unlock logic.

**Step 1: Create the GameContext file**

```tsx
'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { type GameState, type UserStats, type StatKey, INITIAL_STATS, INERTIA_PENALTY } from '@/types/game';
import { getDeckById, DECK_UNLOCK_ORDER } from '@/data/decks';

const STORAGE_KEY = 'mindpractice_state';
const LOCK_HOURS = 24;

type Action =
  | { type: 'START_DECK'; deckId: string }
  | { type: 'ANSWER'; weights: Partial<Record<StatKey, number>> }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_DECK' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: GameState };

const defaultState: GameState = {
  userStats: { ...INITIAL_STATS },
  activeDeck: null,
  currentQuestion: 0,
  unlockedDecks: ['basic_01'],
  completedDecks: {},
  lastTrainingDate: null,
};

function applyWeights(stats: UserStats, weights: Partial<Record<StatKey, number>>): UserStats {
  const next = { ...stats };
  for (const [key, val] of Object.entries(weights)) {
    if (val !== undefined) next[key as StatKey] += val;
  }
  return next;
}

function canUnlockDeck(deckId: string, completedDecks: Record<string, string>): boolean {
  const idx = DECK_UNLOCK_ORDER.indexOf(deckId);
  if (idx <= 0) return true; // basic_01 always unlocked
  const prevId = DECK_UNLOCK_ORDER[idx - 1];
  const completedAt = completedDecks[prevId];
  if (!completedAt) return false;
  const elapsed = Date.now() - new Date(completedAt).getTime();
  return elapsed >= LOCK_HOURS * 60 * 60 * 1000;
}

function getUnlockedDecks(completedDecks: Record<string, string>): string[] {
  const unlocked: string[] = ['basic_01'];
  for (let i = 1; i < DECK_UNLOCK_ORDER.length; i++) {
    if (canUnlockDeck(DECK_UNLOCK_ORDER[i], completedDecks)) {
      unlocked.push(DECK_UNLOCK_ORDER[i]);
    }
  }
  return unlocked;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.state, unlockedDecks: getUnlockedDecks(action.state.completedDecks) };

    case 'START_DECK': {
      const deck = getDeckById(action.deckId);
      if (!deck) return state;
      return { ...state, activeDeck: deck, currentQuestion: 0 };
    }

    case 'ANSWER':
      return { ...state, userStats: applyWeights(state.userStats, action.weights) };

    case 'TIMEOUT':
      return { ...state, userStats: applyWeights(state.userStats, INERTIA_PENALTY) };

    case 'NEXT_QUESTION':
      return { ...state, currentQuestion: state.currentQuestion + 1 };

    case 'FINISH_DECK': {
      const deckId = state.activeDeck?.deckId;
      if (!deckId) return state;
      const completedDecks = { ...state.completedDecks, [deckId]: new Date().toISOString() };
      return {
        ...state,
        activeDeck: null,
        currentQuestion: 0,
        completedDecks,
        unlockedDecks: getUnlockedDecks(completedDecks),
        lastTrainingDate: new Date().toISOString(),
      };
    }

    case 'RESET_ALL':
      return { ...defaultState };

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  isDeckLocked: (deckId: string) => boolean;
  getTimeUntilUnlock: (deckId: string) => number | null;
  getArchetype: () => { name: string; description: string; topAxes: [StatKey, StatKey] } | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        dispatch({ type: 'HYDRATE', state: parsed });
      }
    } catch {}
  }, []);

  // Persist to localStorage on state change
  useEffect(() => {
    try {
      const { activeDeck, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {}
  }, [state]);

  const isDeckLocked = (deckId: string): boolean => {
    return !state.unlockedDecks.includes(deckId) && !canUnlockDeck(deckId, state.completedDecks);
  };

  const getTimeUntilUnlock = (deckId: string): number | null => {
    const idx = DECK_UNLOCK_ORDER.indexOf(deckId);
    if (idx <= 0) return null;
    const prevId = DECK_UNLOCK_ORDER[idx - 1];
    const completedAt = state.completedDecks[prevId];
    if (!completedAt) return null;
    const unlockAt = new Date(completedAt).getTime() + LOCK_HOURS * 60 * 60 * 1000;
    const remaining = unlockAt - Date.now();
    return remaining > 0 ? remaining : null;
  };

  const getArchetype = () => {
    const { userStats } = state;
    const entries = Object.entries(userStats) as [StatKey, number][];
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0 && sorted[1][1] === 0) return null;
    const topAxes: [StatKey, StatKey] = [sorted[0][0], sorted[1][0]];

    // Find matching archetype
    const { ARCHETYPES } = require('@/types/game');
    const match = ARCHETYPES.find((a: any) =>
      (a.axes[0] === topAxes[0] && a.axes[1] === topAxes[1]) ||
      (a.axes[0] === topAxes[1] && a.axes[1] === topAxes[0])
    );
    if (match) return { name: match.name, description: match.description, topAxes };
    // Fallback: use the first axis pair
    return { name: 'Indefinido', description: 'Seu perfil ainda esta se formando.', topAxes };
  };

  return (
    <GameContext.Provider value={{ state, dispatch, isDeckLocked, getTimeUntilUnlock, getArchetype }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
```

**Step 2: Verify it compiles**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npx tsc --noEmit src/context/GameContext.tsx 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat: add GameContext with state management and localStorage persistence"
```

---

### Task 2: Layout + Bottom Navigation

**Files:**
- Create: `src/components/BottomNav.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create BottomNav component**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  { href: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { href: '/decks', label: 'Desafio', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { href: '/config', label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav during gameplay
  if (pathname.startsWith('/play') || pathname.startsWith('/resultado')) return null;

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 px-4 safe-bottom">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 py-2 px-4 relative">
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-accent-purple"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <svg className={`w-5 h-5 transition-colors ${active ? 'text-accent-purple' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span className={`text-[10px] font-medium transition-colors ${active ? 'text-accent-purple' : 'text-white/40'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 2: Update layout.tsx**

Replace entire `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '@/context/GameContext';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'MindPractice - Simulador de Reatividade Social',
  description: 'Descubra seu arquetipo comportamental atraves de micro-conflitos sob pressao.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <GameProvider>
          <main className="min-h-screen pb-20">{children}</main>
          <BottomNav />
        </GameProvider>
      </body>
    </html>
  );
}
```

**Step 3: Verify build**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npm run build 2>&1 | tail -10`

**Step 4: Commit**

```bash
git add src/components/BottomNav.tsx src/app/layout.tsx
git commit -m "feat: add bottom navigation and update layout with GameProvider"
```

---

### Task 3: Home Page (Hero + CTA)

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace page.tsx with Home screen**

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';

export default function Home() {
  const { state, getArchetype } = useGame();
  const archetype = getArchetype();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent-purple/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-accent-gold text-xs font-semibold tracking-[0.3em] uppercase">Simulador</span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Mind<span className="text-accent-purple">Practice</span>
          </h1>
          <p className="text-white/50 text-sm max-w-xs mt-2 leading-relaxed">
            Descubra como voce reage sob pressao. Treine sua reatividade social.
          </p>
        </div>

        {/* Current archetype badge (if played) */}
        {hasPlayed && archetype && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card px-6 py-4 flex flex-col items-center gap-1"
          >
            <span className="text-white/40 text-[10px] tracking-widest uppercase">Seu Arquetipo</span>
            <span className="text-accent-gold text-lg font-semibold">{archetype.name}</span>
            <span className="text-white/50 text-xs max-w-[240px]">{archetype.description}</span>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            href="/decks"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-accent-purple text-white font-semibold text-sm tracking-wide transition-all hover:bg-accent-purple-light hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-95"
          >
            {hasPlayed ? 'Continuar Treino' : 'Comecar'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>

        {/* Stats mini preview */}
        {hasPlayed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3 mt-2"
          >
            {(Object.entries(state.userStats) as [string, number][]).map(([key, val]) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-white/30 text-[9px] uppercase">{key.slice(0, 3)}</span>
                <span className={`text-xs font-mono ${val > 0 ? 'text-accent-gold' : val < 0 ? 'text-red-400' : 'text-white/20'}`}>
                  {val > 0 ? '+' : ''}{val}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
```

**Step 2: Visual check**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npm run dev`
Open http://localhost:3000 and verify home page renders.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Home page with hero, archetype badge, and CTA"
```

---

### Task 4: Deck Selection Page

**Files:**
- Create: `src/app/decks/page.tsx`

**Step 1: Create decks page**

```tsx
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS, DECK_UNLOCK_ORDER } from '@/data/decks';
import type { Deck } from '@/types/game';

const levelColors: Record<string, string> = {
  leve: 'text-green-400',
  medio: 'text-yellow-400',
  extremo: 'text-red-400',
};

function formatTimeLeft(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function DecksPage() {
  const { state, dispatch, isDeckLocked, getTimeUntilUnlock } = useGame();
  const router = useRouter();

  const handleSelect = (deck: Deck) => {
    if (isDeckLocked(deck.deckId)) return;
    dispatch({ type: 'START_DECK', deckId: deck.deckId });
    router.push(`/play/${deck.deckId}`);
  };

  return (
    <div className="px-5 pt-12 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold">Decks</h2>
        <p className="text-white/40 text-sm mt-1">Escolha seu desafio</p>
      </motion.div>

      <div className="flex flex-col gap-4">
        {DECK_UNLOCK_ORDER.map((deckId, i) => {
          const deck = ALL_DECKS.find(d => d.deckId === deckId);
          if (!deck) return null;

          const locked = isDeckLocked(deckId);
          const completed = !!state.completedDecks[deckId];
          const timeLeft = getTimeUntilUnlock(deckId);

          return (
            <motion.button
              key={deckId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleSelect(deck)}
              disabled={locked}
              className={`glass-card-hover text-left p-5 relative overflow-hidden transition-all ${locked ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Level indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-semibold tracking-widest uppercase ${levelColors[deck.level] || 'text-white/40'}`}>
                  {deck.level}
                </span>
                {completed && (
                  <span className="text-[10px] text-accent-gold tracking-wider uppercase flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Completo
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold">{deck.name}</h3>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">{deck.description}</p>

              {/* Lock overlay */}
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                  <svg className="w-8 h-8 text-accent-gold/60 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {timeLeft ? (
                    <span className="text-white/50 text-xs">Desbloqueia em {formatTimeLeft(timeLeft)}</span>
                  ) : (
                    <span className="text-white/50 text-xs">Complete o deck anterior</span>
                  )}
                </div>
              )}

              {/* Questions count */}
              <div className="mt-3 flex items-center gap-1 text-white/20 text-[10px]">
                <span>{deck.questions.length} cenas</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Visual check**

Navigate to http://localhost:3000/decks

**Step 3: Commit**

```bash
git add src/app/decks/page.tsx
git commit -m "feat: add deck selection page with lock system and time-gated unlocks"
```

---

### Task 5: Play Engine (The Core - Slideshow + Timer + Options)

**Files:**
- Create: `src/app/play/[deckId]/page.tsx`
- Create: `src/components/Timer.tsx`
- Create: `src/components/SlideTransition.tsx`

**Step 1: Create Timer component**

```tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { TIMER_DURATION } from '@/types/game';

interface TimerProps {
  running: boolean;
  onTimeout: () => void;
  duration?: number;
}

export default function Timer({ running, onTimeout, duration = TIMER_DURATION }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    setTimeLeft(duration);
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        callbackRef.current();
      }
    }, 50);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, duration]);

  const pct = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 2;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={isUrgent ? '#ef4444' : '#8b5cf6'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-colors duration-300"
          style={{ filter: isUrgent ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' : 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }}
        />
      </svg>
      <span className={`absolute text-sm font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-white/80'}`}>
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}
```

**Step 2: Create SlideTransition component**

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SlideTransitionProps {
  slideKey: string;
  children: React.ReactNode;
  type?: 'context' | 'event' | 'options';
}

const variants = {
  context: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  },
  event: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  },
  options: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
  },
};

export default function SlideTransition({ slideKey, children, type = 'context' }: SlideTransitionProps) {
  const v = variants[type];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={slideKey} initial={v.initial} animate={v.animate} exit={v.exit}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 3: Create Play page**

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks';
import Timer from '@/components/Timer';
import SlideTransition from '@/components/SlideTransition';
import type { StatKey } from '@/types/game';

type Phase = 'context' | 'event' | 'options' | 'feedback';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch } = useGame();

  const deckId = params.deckId as string;
  const deck = state.activeDeck || getDeckById(deckId);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('context');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);

  // Start deck if not active
  useEffect(() => {
    if (!state.activeDeck && deck) {
      dispatch({ type: 'START_DECK', deckId });
    }
  }, []);

  if (!deck) {
    router.replace('/decks');
    return null;
  }

  const question = deck.questions[questionIdx];
  if (!question) {
    router.replace('/decks');
    return null;
  }

  const totalQuestions = deck.questions.length;
  const progress = ((questionIdx) / totalQuestions) * 100;

  // Phase transitions
  const advancePhase = useCallback(() => {
    if (phase === 'context') {
      setPhase('event');
    } else if (phase === 'event') {
      setPhase('options');
      setTimerRunning(true);
    }
  }, [phase]);

  // Auto-advance context slide after 3s
  useEffect(() => {
    if (phase === 'context') {
      const t = setTimeout(() => setPhase('event'), 3000);
      return () => clearTimeout(t);
    }
    if (phase === 'event') {
      const t = setTimeout(() => {
        setPhase('options');
        setTimerRunning(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [phase, questionIdx]);

  const handleAnswer = (weights: Partial<Record<StatKey, number>>, feedback: string) => {
    setTimerRunning(false);
    dispatch({ type: 'ANSWER', weights });
    setSelectedFeedback(feedback);
    setPhase('feedback');
  };

  const handleTimeout = () => {
    setTimerRunning(false);
    dispatch({ type: 'TIMEOUT' });
    setSelectedFeedback('Voce travou sob pressao. Vigor -15, Presenca -15.');
    setPhase('feedback');
  };

  const handleNext = () => {
    const nextIdx = questionIdx + 1;
    if (nextIdx >= totalQuestions) {
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
    } else {
      dispatch({ type: 'NEXT_QUESTION' });
      setQuestionIdx(nextIdx);
      setPhase('context');
      setSelectedFeedback('');
    }
  };

  const contextSlide = question.slides.find(s => s.tipo === 'contexto');
  const eventSlide = question.slides.find(s => s.tipo === 'evento');

  return (
    <div className="min-h-screen flex flex-col px-5 pt-6 pb-8">
      {/* Top bar: progress + timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30 tracking-wider uppercase">{deck.name}</span>
            <span className="text-[10px] text-white/30 font-mono">{questionIdx + 1}/{totalQuestions}</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-purple"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        {phase === 'options' && <Timer running={timerRunning} onTimeout={handleTimeout} />}
      </div>

      {/* Question type badge */}
      <div className="mb-4">
        <span className={`text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full ${
          question.type === 'TENSION' ? 'bg-red-500/20 text-red-400' :
          question.type === 'RANDOM' ? 'bg-yellow-500/20 text-yellow-400' :
          question.type === 'SOCIAL' ? 'bg-blue-500/20 text-blue-400' :
          'bg-white/5 text-white/30'
        }`}>
          {question.type}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* CONTEXT */}
          {phase === 'context' && contextSlide && (
            <SlideTransition slideKey={`ctx-${questionIdx}`} type="context">
              <div className="glass-card p-6" onClick={advancePhase}>
                <p className="text-white/70 text-base leading-relaxed">{contextSlide.texto}</p>
                <span className="text-white/20 text-[10px] mt-3 block">Toque para avancar</span>
              </div>
            </SlideTransition>
          )}

          {/* EVENT */}
          {phase === 'event' && eventSlide && (
            <SlideTransition slideKey={`evt-${questionIdx}`} type="event">
              <div className="glass-card p-6 border-accent-purple/30" onClick={advancePhase}>
                <p className="text-white text-lg font-medium leading-relaxed">{eventSlide.texto}</p>
                <span className="text-white/20 text-[10px] mt-3 block">Toque para responder</span>
              </div>
            </SlideTransition>
          )}

          {/* OPTIONS */}
          {phase === 'options' && (
            <SlideTransition slideKey={`opt-${questionIdx}`} type="options">
              <div className="flex flex-col gap-3">
                {question.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleAnswer(opt.weights, opt.feedback)}
                    className="glass-card-hover p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <p className="text-white/90 text-sm leading-relaxed">{opt.text}</p>
                    <span className="text-white/20 text-[9px] mt-1 block">{opt.meta}</span>
                  </motion.button>
                ))}
              </div>
            </SlideTransition>
          )}

          {/* FEEDBACK */}
          {phase === 'feedback' && (
            <SlideTransition slideKey={`fb-${questionIdx}`} type="context">
              <div className="flex flex-col items-center gap-6">
                <div className="glass-card p-6 text-center">
                  <p className="text-white/80 text-sm leading-relaxed">{selectedFeedback}</p>
                </div>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-accent-purple-light text-sm font-medium transition-all hover:bg-accent-purple/30 active:scale-95"
                >
                  {questionIdx + 1 >= totalQuestions ? 'Ver Resultado' : 'Proxima'}
                </button>
              </div>
            </SlideTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npm run build 2>&1 | tail -15`

**Step 5: Commit**

```bash
git add src/components/Timer.tsx src/components/SlideTransition.tsx src/app/play/
git commit -m "feat: add play engine with slideshow, timer, and option selection"
```

---

### Task 6: Result Page (Archetype + Stats Visualization)

**Files:**
- Create: `src/app/resultado/[deckId]/page.tsx`

**Step 1: Create result page**

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import type { StatKey } from '@/types/game';

const statLabels: Record<StatKey, string> = {
  vigor: 'Vigor',
  harmonia: 'Harmonia',
  filtro: 'Filtro',
  presenca: 'Presenca',
  desapego: 'Desapego',
};

const statColors: Record<StatKey, string> = {
  vigor: 'bg-red-500',
  harmonia: 'bg-green-500',
  filtro: 'bg-blue-500',
  presenca: 'bg-yellow-500',
  desapego: 'bg-purple-500',
};

export default function ResultadoPage() {
  const { state, getArchetype } = useGame();
  const archetype = getArchetype();

  const stats = state.userStats;
  const entries = Object.entries(stats) as [StatKey, number][];
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-accent-gold/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center">
          <span className="text-white/30 text-[10px] tracking-[0.3em] uppercase">Resultado</span>
        </div>

        {/* Archetype Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="glass-card p-8 w-full text-center glow-gold"
        >
          <span className="text-white/40 text-[10px] tracking-widest uppercase block mb-2">Seu Arquetipo Provisorio</span>
          <h2 className="text-3xl font-bold text-accent-gold mb-3">{archetype?.name || 'Indefinido'}</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {archetype?.description || 'Complete mais decks para definir seu perfil.'}
          </p>
        </motion.div>

        {/* Stats Bars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full flex flex-col gap-3"
        >
          {entries.map(([key, val], i) => {
            const pct = Math.abs(val) / maxAbs * 100;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/50 text-xs">{statLabels[key]}</span>
                  <span className={`text-xs font-mono ${val > 0 ? 'text-accent-gold' : val < 0 ? 'text-red-400' : 'text-white/20'}`}>
                    {val > 0 ? '+' : ''}{val}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${statColors[key]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    style={{ opacity: 0.7 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="flex flex-col items-center gap-3 mt-4"
        >
          <Link
            href="/decks"
            className="px-8 py-3 rounded-full bg-accent-purple text-white font-semibold text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-95"
          >
            Voltar aos Decks
          </Link>
          <Link href="/" className="text-white/30 text-xs hover:text-white/50 transition-colors">
            Ir para Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

**Step 2: Visual check**

Complete a deck and verify result page renders.

**Step 3: Commit**

```bash
git add src/app/resultado/
git commit -m "feat: add result page with archetype display and stats visualization"
```

---

### Task 7: Config Page

**Files:**
- Create: `src/app/config/page.tsx`

**Step 1: Create config page**

```tsx
'use client';

import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';

export default function ConfigPage() {
  const { state, dispatch, getArchetype } = useGame();
  const archetype = getArchetype();
  const completedCount = Object.keys(state.completedDecks).length;

  const handleReset = () => {
    if (confirm('Tem certeza? Isso vai apagar todo seu progresso.')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  };

  return (
    <div className="px-5 pt-12 pb-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold mb-1">Configuracoes</h2>
        <p className="text-white/40 text-sm mb-8">Seu perfil e preferencias</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 mb-4"
      >
        <span className="text-white/30 text-[10px] tracking-widest uppercase">Perfil Atual</span>
        <h3 className="text-accent-gold text-xl font-semibold mt-1">{archetype?.name || 'Nenhum'}</h3>
        <p className="text-white/40 text-xs mt-1">{archetype?.description || 'Complete um deck para descobrir.'}</p>
        <div className="mt-3 flex gap-4 text-[10px] text-white/30">
          <span>{completedCount} deck(s) completo(s)</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5 mb-4"
      >
        <span className="text-white/30 text-[10px] tracking-widest uppercase mb-3 block">Eixos Acumulados</span>
        <div className="grid grid-cols-5 gap-2 text-center">
          {(Object.entries(state.userStats) as [string, number][]).map(([key, val]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <span className={`text-lg font-mono font-bold ${val > 0 ? 'text-accent-gold' : val < 0 ? 'text-red-400' : 'text-white/20'}`}>
                {val > 0 ? '+' : ''}{val}
              </span>
              <span className="text-white/30 text-[9px] uppercase">{key.slice(0, 4)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5 mb-4"
      >
        <span className="text-white/30 text-[10px] tracking-widest uppercase">Sobre</span>
        <p className="text-white/50 text-xs mt-2 leading-relaxed">
          MindPractice e um simulador de reatividade social. Treine seu comportamento atraves de micro-conflitos sob pressao e descubra seu arquetipo.
        </p>
        <p className="text-white/20 text-[10px] mt-2">v0.1.0</p>
      </motion.div>

      {/* Reset */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={handleReset}
          className="w-full p-4 rounded-2xl border border-red-500/20 text-red-400 text-sm font-medium transition-all hover:bg-red-500/10 active:scale-[0.98]"
        >
          Resetar Todo Progresso
        </button>
      </motion.div>
    </div>
  );
}
```

**Step 2: Visual check**

Navigate to http://localhost:3000/config

**Step 3: Commit**

```bash
git add src/app/config/page.tsx
git commit -m "feat: add config page with profile, stats, and reset"
```

---

## File Tree (Final)

```
src/
  app/
    globals.css           (exists - no changes)
    layout.tsx            (modify - Task 2)
    page.tsx              (modify - Task 3)
    decks/
      page.tsx            (create - Task 4)
    play/
      [deckId]/
        page.tsx          (create - Task 5)
    resultado/
      [deckId]/
        page.tsx          (create - Task 6)
    config/
      page.tsx            (create - Task 7)
  components/
    BottomNav.tsx          (create - Task 2)
    Timer.tsx              (create - Task 5)
    SlideTransition.tsx    (create - Task 5)
  context/
    GameContext.tsx         (create - Task 1)
  data/
    decks/                 (exists - no changes)
  types/
    game.ts                (exists - no changes)
```
