# Calibration Engine v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade MindPractice with 15 archetypes, dampened calibration engine, 3-tab deck gallery with weekly rotation, hold-to-confirm mechanic, bipolar slider visualization, and scene validation pipeline.

**Architecture:** Modify existing types and GameContext to support CalibrationState with dampened scoring. Add category/tab system to deck gallery. Upgrade play engine with hold mechanic and forced delay. All changes are backwards-compatible via state migration.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12

**Design doc:** `docs/plans/2026-03-13-calibration-engine-v2-design.md`

---

## Task Dependency Order

```
Task 1: Types + Constants (foundation — everything depends on this)
Task 2: 15 Archetypes data
Task 3: Calibration engine (CalibrationState + dampening formula)
Task 4: Deck data migration (add category, focusAxis, difficulty, tone, subtext to JSONs)
Task 5: Deck gallery with 3 tabs + weekly rotation
Task 6: Hold-to-confirm component
Task 7: Play engine upgrade (delay, hold, layered options)
Task 8: Bipolar sliders component
Task 9: Result page upgrade (sliders + snapshots)
Task 10: Config/Profile page upgrade (precision, consistency, identity badge)
Task 11: Deck validator utility
```

---

### Task 1: Update Types and Constants

**Files:**
- Modify: `src/types/game.ts`

**Step 1: Replace the entire types file**

```typescript
// ============================================================
// Core types
// ============================================================

export type StatKey = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
export type QuestionType = 'NORMAL' | 'RANDOM' | 'SOCIAL' | 'TENSION';
export type Ambiente = 'Publico' | 'Privado' | 'Profissional' | 'Digital';
export type Relacao = 'Autoridade' | 'Par' | 'Desconhecido';
export type Aposta = 'Status' | 'Paz Emocional' | 'Dinheiro' | 'Tempo';
export type Pilar = 'ego' | 'propriedade' | 'seguranca';
export type Tone = 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';
export type DeckCategory = 'essencial' | 'arquetipo' | 'cenario';
export type ArchetypeCategory = 'puro' | 'cruzado' | 'especial';

// ============================================================
// Scene / Question
// ============================================================

export interface SceneMetadata {
  tensao: 1 | 2 | 3 | 4 | 5;
  ambiente: Ambiente;
  relacao: Relacao;
  aposta: Aposta;
  pilar: Pilar;
}

export interface Slide {
  tipo: 'contexto' | 'evento';
  texto: string;
}

export interface Option {
  text: string;
  subtext: string;
  tone: Tone;
  weights: Partial<Record<StatKey, number>>;
  feedback: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  metadata: SceneMetadata;
  slides: Slide[];
  options: Option[];
}

// ============================================================
// Deck
// ============================================================

export interface Deck {
  deckId: string;
  name: string;
  description: string;
  tema: string;
  category: DeckCategory;
  focusAxis?: StatKey;
  level: 'leve' | 'medio' | 'extremo';
  difficulty: 1 | 2 | 3 | 4 | 5;
  questions: Question[];
}

// ============================================================
// Archetype
// ============================================================

export interface Archetype {
  id: string;
  name: string;
  category: ArchetypeCategory;
  axes: StatKey[] | 'equilibrio';
  description: string;
  tagline: string;
}

// ============================================================
// Calibration State (replaces old UserStats/GameState)
// ============================================================

export interface CalibrationState {
  axes: Record<StatKey, number>;
  totalResponses: number;
  recentWeights: Record<StatKey, number[]>;
  toneHistory: Tone[];
  snapshots: DeckSnapshot[];
}

export interface DeckSnapshot {
  deckId: string;
  completedAt: string;
  archetypeAtCompletion: string;
  statsAtCompletion: Record<StatKey, number>;
}

export interface GameState {
  calibration: CalibrationState;
  activeDeck: Deck | null;
  currentQuestion: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
}

// ============================================================
// Constants
// ============================================================

export const STAT_KEYS: StatKey[] = ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'];

export const STAT_COLORS: Record<StatKey, string> = {
  vigor: '#ef4444',
  harmonia: '#10b981',
  filtro: '#8b5cf6',
  presenca: '#d4af37',
  desapego: '#60a5fa',
};

export const STAT_LABELS: Record<StatKey, string> = {
  vigor: 'Vigor',
  harmonia: 'Harmonia',
  filtro: 'Filtro',
  presenca: 'Presenca',
  desapego: 'Desapego',
};

export const TIMER_DURATION = 6;

export const INERTIA_PENALTY: Partial<Record<StatKey, number>> = {
  vigor: -15,
  presenca: -15,
};

export const CALIBRATION_WINDOW = 200;
export const CONSISTENCY_WINDOW = 20;
export const HOLD_DURATION_MS = 1000;

export const INITIAL_CALIBRATION: CalibrationState = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
};

/** Delay in ms before options appear, based on scene tension */
export function getSceneDelay(tensao: number): number {
  if (tensao <= 2) return 500;
  if (tensao === 3) return 1000;
  return 1500;
}
```

**Step 2: Verify it compiles**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in files that import old types (GameContext, pages) — that's expected, we'll fix them in subsequent tasks.

**Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: update types for v2 — 15 archetypes, calibration state, deck categories"
```

---

### Task 2: 15 Archetypes Data

**Files:**
- Create: `src/data/archetypes.ts`

**Step 1: Create the archetypes data file**

```typescript
import type { Archetype } from '@/types/game';

export const ARCHETYPES: Archetype[] = [
  {
    id: 'soberano',
    name: 'O Soberano',
    category: 'especial',
    axes: 'equilibrio',
    description: 'Dominio completo. Voce age apenas quando necessario. Equilibrio raro entre todos os eixos.',
    tagline: 'O mestre do equilibrio',
  },
  {
    id: 'tubarao',
    name: 'O Tubarao',
    category: 'cruzado',
    axes: ['vigor', 'presenca'],
    description: 'Focado em conquista e poder. Sua presenca intimida naturalmente.',
    tagline: 'Conquista e poder',
  },
  {
    id: 'fantasma',
    name: 'O Fantasma',
    category: 'cruzado',
    axes: ['filtro', 'desapego'],
    description: 'Oculto. Ninguem sabe o que voce pensa ou sente. Invisivel por escolha.',
    tagline: 'Invisivel por escolha',
  },
  {
    id: 'diplomata',
    name: 'O Diplomata',
    category: 'cruzado',
    axes: ['harmonia', 'presenca'],
    description: 'Resolve conflitos sem disparar um tiro. Magnetico e persuasivo.',
    tagline: 'Resolve sem disparar',
  },
  {
    id: 'muralha',
    name: 'O Muralha',
    category: 'cruzado',
    axes: ['filtro', 'vigor'],
    description: 'Defensivo e letal. Absorve o golpe e contra-ataca com precisao.',
    tagline: 'Absorve e contra-ataca',
  },
  {
    id: 'estoico',
    name: 'O Estoico',
    category: 'cruzado',
    axes: ['desapego', 'filtro'],
    description: 'Imperturbavel. O mundo pode cair ao seu redor e voce continua de pe.',
    tagline: 'Imperturbavel',
  },
  {
    id: 'justiceiro',
    name: 'O Justiceiro',
    category: 'cruzado',
    axes: ['vigor', 'harmonia'],
    description: 'Usa a forca para manter a ordem. Age pelo grupo, defende os seus.',
    tagline: 'Forca pela ordem',
  },
  {
    id: 'enigma',
    name: 'O Enigma',
    category: 'cruzado',
    axes: ['presenca', 'desapego'],
    description: 'Atrai atencao pelo silencio. Indecifravel. As pessoas querem te entender.',
    tagline: 'Silencio magnetico',
  },
  {
    id: 'pacificador',
    name: 'O Pacificador',
    category: 'cruzado',
    axes: ['harmonia', 'filtro'],
    description: 'O lubrificante social. Evita o atrito antes dele nascer.',
    tagline: 'Evita o atrito',
  },
  {
    id: 'mercenario',
    name: 'O Mercenario',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    description: 'Sem amarras emocionais. Faz o que precisa ser feito, sem sentimentalismo.',
    tagline: 'Sem amarras',
  },
  {
    id: 'rebelde',
    name: 'O Rebelde',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    description: 'Antifragilidade. Quebra regras com sorriso no rosto. O caos e seu playground.',
    tagline: 'Quebra regras sorrindo',
  },
  {
    id: 'vulcao',
    name: 'O Vulcao',
    category: 'puro',
    axes: ['vigor'],
    description: 'Explosivo e direto. Nao conhece o conceito de filtro. Energia bruta.',
    tagline: 'Explosivo e direto',
  },
  {
    id: 'monge',
    name: 'O Monge',
    category: 'cruzado',
    axes: ['harmonia', 'desapego'],
    description: 'Totalmente em paz. A opiniao alheia e ruido branco para voce.',
    tagline: 'Paz absoluta',
  },
  {
    id: 'camaleao',
    name: 'O Camaleao',
    category: 'cruzado',
    axes: ['harmonia', 'vigor'],
    description: 'Adapta-se para vencer. Pode ser doce ou amargo em segundos.',
    tagline: 'Adaptacao pura',
  },
  {
    id: 'estrategista',
    name: 'O Estrategista',
    category: 'cruzado',
    axes: ['filtro', 'presenca'],
    description: 'Joga xadrez com as pessoas. Antecipa 5 movimentos a frente.',
    tagline: 'Xadrez humano',
  },
];

/**
 * Match archetype from calibration axes.
 *
 * Algorithm:
 * 1. Normalize axes to 0-100%
 * 2. If top1 > 2x top2 AND top1 is Vigor → Vulcão (puro)
 * 3. If spread (top1 - top5) < 15% → Soberano (equilíbrio)
 * 4. If top1+top2 = Desapego+Vigor → check tone for Mercenário vs Rebelde
 * 5. Else → cross top1+top2 in table
 */
export function matchArchetype(
  axes: Record<string, number>,
  toneHistory: string[],
): Archetype {
  const entries = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const values = entries.map(e => e[1]);
  const keys = entries.map(e => e[0]);

  const maxVal = Math.max(...values.map(Math.abs), 1);
  const normalized = values.map(v => (v / maxVal) * 100);

  // Check Vulcão: top1 > 2x top2, top1 is vigor
  if (normalized[0] > 0 && normalized[0] > normalized[1] * 2 && keys[0] === 'vigor') {
    return ARCHETYPES.find(a => a.id === 'vulcao')!;
  }

  // Check Soberano: spread < 15%
  const spread = normalized[0] - normalized[normalized.length - 1];
  if (spread < 15 && normalized[0] > 0) {
    return ARCHETYPES.find(a => a.id === 'soberano')!;
  }

  // Top 2 axes
  const top2 = new Set([keys[0], keys[1]]);

  // Mercenário vs Rebelde disambiguation
  if (top2.has('desapego') && top2.has('vigor')) {
    const recent = toneHistory.slice(-20);
    const provocativo = recent.filter(t => t === 'provocativo').length;
    const pragmatico = recent.filter(t => t === 'pragmatico').length;
    if (provocativo > pragmatico) {
      return ARCHETYPES.find(a => a.id === 'rebelde')!;
    }
    return ARCHETYPES.find(a => a.id === 'mercenario')!;
  }

  // Justiceiro vs Camaleão disambiguation (both vigor+harmonia)
  // Justiceiro: more 'protetor' tone; Camaleão: more 'evasivo' or mixed
  if (top2.has('vigor') && top2.has('harmonia')) {
    const recent = toneHistory.slice(-20);
    const protetor = recent.filter(t => t === 'protetor').length;
    if (protetor > recent.length * 0.4) {
      return ARCHETYPES.find(a => a.id === 'justiceiro')!;
    }
    return ARCHETYPES.find(a => a.id === 'camaleao')!;
  }

  // Generic cross-match: find archetype whose axes match top2
  const match = ARCHETYPES.find(a => {
    if (a.category !== 'cruzado' || !Array.isArray(a.axes)) return false;
    const axSet = new Set(a.axes);
    return axSet.has(keys[0]) && axSet.has(keys[1]);
  });

  return match ?? ARCHETYPES.find(a => a.id === 'soberano')!;
}
```

**Step 2: Verify it compiles**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npx tsc --noEmit src/data/archetypes.ts 2>&1 | head -10`

**Step 3: Commit**

```bash
git add src/data/archetypes.ts
git commit -m "feat: add 15 archetypes with matching algorithm and tone disambiguation"
```

---

### Task 3: Calibration Engine (New GameContext)

**Files:**
- Modify: `src/context/GameContext.tsx`

**Step 1: Replace GameContext with calibration-aware version**

```typescript
'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type GameState,
  type CalibrationState,
  type StatKey,
  type Tone,
  type Deck,
  type Archetype,
  type DeckSnapshot,
  STAT_KEYS,
  INITIAL_CALIBRATION,
  INERTIA_PENALTY,
  CALIBRATION_WINDOW,
  CONSISTENCY_WINDOW,
} from '@/types/game';
import { ARCHETYPES, matchArchetype } from '@/data/archetypes';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'START_DECK'; deck: Deck }
  | { type: 'ANSWER'; weights: Partial<Record<StatKey, number>>; tone: Tone }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_DECK' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: GameState };

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mindpractice_state';
const UNLOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Apply dampened weights to calibration axes.
 * Formula: axis += weight / min(totalResponses + 1, CALIBRATION_WINDOW)
 */
function applyDampenedWeights(
  cal: CalibrationState,
  weights: Partial<Record<StatKey, number>>,
  tone: Tone,
): CalibrationState {
  const divisor = Math.min(cal.totalResponses + 1, CALIBRATION_WINDOW);
  const newAxes = { ...cal.axes };
  const newRecent = { ...cal.recentWeights };

  for (const key of STAT_KEYS) {
    const w = weights[key];
    if (w !== undefined) {
      newAxes[key] = newAxes[key] + w / divisor;

      // Update recent weights window for consistency tracking
      const arr = [...(newRecent[key] || []), w];
      if (arr.length > CONSISTENCY_WINDOW) arr.shift();
      newRecent[key] = arr;
    }
  }

  const newToneHistory = [...cal.toneHistory, tone];
  if (newToneHistory.length > CONSISTENCY_WINDOW) newToneHistory.shift();

  return {
    ...cal,
    axes: newAxes,
    totalResponses: cal.totalResponses + 1,
    recentWeights: newRecent,
    toneHistory: newToneHistory,
  };
}

function applyInertia(cal: CalibrationState): CalibrationState {
  return applyDampenedWeights(cal, INERTIA_PENALTY, 'neutro');
}

export function getUnlockedDecks(completedDecks: Record<string, string>): string[] {
  const unlocked: string[] = [];
  for (let i = 0; i < DECK_UNLOCK_ORDER.length; i++) {
    const deckId = DECK_UNLOCK_ORDER[i];
    if (i === 0) { unlocked.push(deckId); continue; }
    const prevId = DECK_UNLOCK_ORDER[i - 1];
    const prevAt = completedDecks[prevId];
    if (!prevAt) break;
    const elapsed = Date.now() - new Date(prevAt).getTime();
    if (elapsed >= UNLOCK_COOLDOWN_MS) unlocked.push(deckId);
    else break;
  }
  return unlocked;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: GameState = {
  calibration: { ...INITIAL_CALIBRATION },
  activeDeck: null,
  currentQuestion: 0,
  unlockedDecks: getUnlockedDecks({}),
  completedDecks: {},
  lastTrainingDate: null,
};

// ---------------------------------------------------------------------------
// Migration from v1 state
// ---------------------------------------------------------------------------

function migrateV1(raw: Record<string, unknown>): GameState | null {
  // v1 had `userStats` instead of `calibration`
  if ('userStats' in raw && !('calibration' in raw)) {
    const oldStats = raw.userStats as Record<StatKey, number>;
    const completedDecks = (raw.completedDecks ?? {}) as Record<string, string>;
    const totalResponses = Object.keys(completedDecks).length * 10;

    return {
      calibration: {
        axes: { ...oldStats },
        totalResponses,
        recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
        toneHistory: [],
        snapshots: [],
      },
      activeDeck: null,
      currentQuestion: 0,
      unlockedDecks: getUnlockedDecks(completedDecks),
      completedDecks,
      lastTrainingDate: (raw.lastTrainingDate as string) ?? null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_DECK':
      return { ...state, activeDeck: action.deck, currentQuestion: 0 };

    case 'ANSWER':
      return {
        ...state,
        calibration: applyDampenedWeights(state.calibration, action.weights, action.tone),
      };

    case 'TIMEOUT':
      return { ...state, calibration: applyInertia(state.calibration) };

    case 'NEXT_QUESTION':
      return { ...state, currentQuestion: state.currentQuestion + 1 };

    case 'FINISH_DECK': {
      const now = new Date().toISOString();
      const deckId = state.activeDeck?.deckId;
      const completedDecks = deckId
        ? { ...state.completedDecks, [deckId]: now }
        : state.completedDecks;

      const archetype = matchArchetype(state.calibration.axes, state.calibration.toneHistory);
      const snapshot: DeckSnapshot = {
        deckId: deckId ?? 'unknown',
        completedAt: now,
        archetypeAtCompletion: archetype.name,
        statsAtCompletion: { ...state.calibration.axes },
      };

      return {
        ...state,
        activeDeck: null,
        currentQuestion: 0,
        completedDecks,
        unlockedDecks: getUnlockedDecks(completedDecks),
        lastTrainingDate: now,
        calibration: {
          ...state.calibration,
          snapshots: [...state.calibration.snapshots, snapshot],
        },
      };
    }

    case 'RESET_ALL':
      return { ...initialState, unlockedDecks: getUnlockedDecks({}) };

    case 'HYDRATE':
      return { ...action.state, unlockedDecks: getUnlockedDecks(action.state.completedDecks) };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

export function getPrecision(totalResponses: number): number {
  return Math.min(totalResponses / CALIBRATION_WINDOW, 1.0) * 100;
}

export function getPrecisionLabel(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: 'Blindado', color: 'text-accent-gold' };
  if (pct > 70) return { label: 'Perfil Solido', color: 'text-accent-gold' };
  if (pct > 30) return { label: 'Calibrando...', color: 'text-accent-purple' };
  return { label: 'Fase de Descoberta', color: 'text-orange-400' };
}

export function getConsistency(recentWeights: Record<StatKey, number[]>): number {
  let totalStdDev = 0;
  let totalMaxDev = 0;
  for (const key of STAT_KEYS) {
    const vals = recentWeights[key];
    if (vals.length < 3) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    // Max theoretical stddev for weights in range [-30, 30]
    const maxStdDev = 30;
    totalStdDev += stdDev;
    totalMaxDev += maxStdDev;
  }
  if (totalMaxDev === 0) return 0;
  return Math.max(0, Math.min(1, 1 - totalStdDev / totalMaxDev));
}

export function getConsistencyLabel(c: number): { label: string; icon: 'full' | 'half' | 'cracked' } {
  if (c >= 0.6) return { label: 'Estavel', icon: 'full' };
  if (c >= 0.3) return { label: 'Em formacao', icon: 'half' };
  return { label: 'Instavel', icon: 'cracked' };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isDeckLocked: (deckId: string) => boolean;
  getTimeUntilUnlock: (deckId: string) => number;
  getArchetype: () => Archetype;
  precision: number;
  consistency: number;
  isIdentityValidated: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Hydrate from localStorage (with v1 migration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Try v1 migration first
      const migrated = migrateV1(parsed);
      if (migrated) {
        dispatch({ type: 'HYDRATE', state: migrated });
        return;
      }

      // v2 format
      dispatch({ type: 'HYDRATE', state: parsed as GameState });
    } catch {
      // corrupted — start fresh
    }
  }, []);

  // Persist (exclude activeDeck)
  useEffect(() => {
    try {
      const { activeDeck: _, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...persistable, activeDeck: null }));
    } catch {}
  }, [state]);

  const isDeckLocked = useCallback(
    (deckId: string) => !state.unlockedDecks.includes(deckId),
    [state.unlockedDecks],
  );

  const getTimeUntilUnlock = useCallback(
    (deckId: string): number => {
      const idx = DECK_UNLOCK_ORDER.indexOf(deckId);
      if (idx <= 0) return 0;
      const prevId = DECK_UNLOCK_ORDER[idx - 1];
      const prevAt = state.completedDecks[prevId];
      if (!prevAt) return Infinity;
      const remaining = UNLOCK_COOLDOWN_MS - (Date.now() - new Date(prevAt).getTime());
      return remaining > 0 ? remaining : 0;
    },
    [state.completedDecks],
  );

  const getArchetype = useCallback(
    () => matchArchetype(state.calibration.axes, state.calibration.toneHistory),
    [state.calibration.axes, state.calibration.toneHistory],
  );

  const precision = getPrecision(state.calibration.totalResponses);
  const consistency = getConsistency(state.calibration.recentWeights);
  const isIdentityValidated = precision >= 80 && consistency >= 0.6;

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        isDeckLocked,
        getTimeUntilUnlock,
        getArchetype,
        precision,
        consistency,
        isIdentityValidated,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
```

**Step 2: Verify**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat: rewrite GameContext with dampened calibration engine and v1 migration"
```

---

### Task 4: Migrate Deck JSON Data

**Files:**
- Modify: `src/data/decks/basic_01.json`
- Modify: `src/data/decks/alta_tensao.json`
- Modify: `src/data/decks/profissional.json`
- Modify: `src/data/decks/social.json`
- Modify: `src/data/decks/index.ts`

This task adds the new fields to each deck JSON:
- Root level: `category`, `difficulty`, and optionally `focusAxis`
- Each option: rename `meta` → `subtext`, add `tone`

**Step 1: Update each JSON file**

For each of the 4 deck JSONs, add to the root:
- `basic_01.json`: `"category": "essencial", "difficulty": 2`
- `alta_tensao.json`: `"category": "cenario", "difficulty": 4`
- `profissional.json`: `"category": "cenario", "difficulty": 3`
- `social.json`: `"category": "cenario", "difficulty": 5`

For each option in each question, rename `meta` to `subtext` and add a `tone` field based on the option's archetype pattern:
- Options with Vigor/Confronto/Explosao → `"tone": "provocativo"` or `"tone": "pragmatico"`
- Options with Nonchalant/Desapego/Filtro → `"tone": "evasivo"` or `"tone": "pragmatico"`
- Options with Harmonia/Diplomacia → `"tone": "protetor"` or `"tone": "neutro"`

Also add `"pilar"` to each question's metadata based on the conflict type:
- Conflicts about reputation/status → `"pilar": "ego"`
- Conflicts about money/time/belongings → `"pilar": "propriedade"`
- Conflicts about physical/emotional safety → `"pilar": "seguranca"`

**Step 2: Update index.ts**

```typescript
import basic01 from './basic_01.json';
import altaTensao from './alta_tensao.json';
import profissional from './profissional.json';
import social from './social.json';
import type { Deck, DeckCategory } from '@/types/game';

export const ALL_DECKS: Deck[] = [
  basic01 as unknown as Deck,
  altaTensao as unknown as Deck,
  profissional as unknown as Deck,
  social as unknown as Deck,
];

export const getDeckById = (id: string): Deck | undefined =>
  ALL_DECKS.find(d => d.deckId === id);

export const getDecksByCategory = (cat: DeckCategory): Deck[] =>
  ALL_DECKS.filter(d => d.category === cat);

export const DECK_UNLOCK_ORDER = ['basic_01', 'alta_tensao', 'profissional', 'social'];

/**
 * Weekly free rotation: returns 2 deck IDs (1 arquetipo + 1 cenario)
 * that are free this week. Deterministic based on week number.
 */
export function getWeeklyFreeDeckIds(): string[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  const arquetipoDecks = ALL_DECKS.filter(d => d.category === 'arquetipo');
  const cenarioDecks = ALL_DECKS.filter(d => d.category === 'cenario' && d.deckId !== 'basic_01');

  const freeDeckIds: string[] = [];
  if (arquetipoDecks.length > 0) {
    freeDeckIds.push(arquetipoDecks[weekNumber % arquetipoDecks.length].deckId);
  }
  if (cenarioDecks.length > 0) {
    freeDeckIds.push(cenarioDecks[weekNumber % cenarioDecks.length].deckId);
  }
  return freeDeckIds;
}
```

**Step 3: Verify build**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/data/decks/
git commit -m "feat: migrate deck JSONs with category, tone, pilar, and weekly rotation"
```

---

### Task 5: Deck Gallery with 3 Tabs

**Files:**
- Modify: `src/app/decks/page.tsx`

**Step 1: Replace decks page with tabbed gallery**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS, getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory, StatKey } from '@/types/game';
import { STAT_COLORS } from '@/types/game';

const TABS: { id: DeckCategory; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquétipos' },
  { id: 'cenario', label: 'Cenários' },
];

const levelColors: Record<Deck['level'], string> = {
  leve: 'bg-green-500/20 text-green-400',
  medio: 'bg-yellow-500/20 text-yellow-400',
  extremo: 'bg-red-500/20 text-red-400',
};

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
            const focusColor = deck.focusAxis ? STAT_COLORS[deck.focusAxis] : undefined;

            return (
              <motion.button
                key={deck.deckId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                disabled={locked}
                onClick={() => handleSelect(deck)}
                className={`glass-card-hover relative overflow-hidden p-5 text-left ${
                  locked ? 'cursor-not-allowed opacity-40 grayscale' : ''
                }`}
                style={focusColor && !locked ? { borderColor: `${focusColor}30` } : undefined}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColors[deck.level]}`}>
                    {deck.level}
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
                </div>

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
                    <span className="text-xs text-white/50">{formatTimeLeft(timeLeft)}</span>
                  </div>
                )}
              </motion.button>
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

**Step 2: Verify**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npm run build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add src/app/decks/page.tsx
git commit -m "feat: add 3-tab deck gallery with weekly free rotation and focus axis display"
```

---

### Task 6: HoldButton Component

**Files:**
- Create: `src/components/HoldButton.tsx`

**Step 1: Create hold-to-confirm button**

```typescript
'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HOLD_DURATION_MS } from '@/types/game';

interface HoldButtonProps {
  onConfirm: () => void;
  holdColor: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export default function HoldButton({
  onConfirm,
  holdColor,
  disabled = false,
  children,
  className = '',
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const confirmedRef = useRef(false);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
    setProgress(pct);

    if (pct >= 1 && !confirmedRef.current) {
      confirmedRef.current = true;
      setHolding(false);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
      onConfirm();
      return;
    }

    if (pct < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [onConfirm]);

  const handleStart = useCallback(() => {
    if (disabled) return;
    confirmedRef.current = false;
    startRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(animate);
  }, [disabled, animate]);

  const handleEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      type="button"
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      disabled={disabled}
      className={`relative overflow-hidden touch-none select-none ${className}`}
    >
      {/* Hold progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-full"
        style={{ backgroundColor: holdColor }}
        initial={{ width: '0%' }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0 }}
      />

      {/* Glow effect when holding */}
      {holding && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: holdColor }}
        />
      )}

      {children}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/HoldButton.tsx
git commit -m "feat: add HoldButton component with progress bar and haptic feedback"
```

---

### Task 7: Play Engine Upgrade

**Files:**
- Modify: `src/app/play/[deckId]/page.tsx`

**Step 1: Replace play page with upgraded engine**

Key changes:
- Replace tap-to-select with HoldButton
- Add forced delay between event and options (based on `metadata.tensao`)
- Layered option visual (text + subtext + axis tags)
- Pass `tone` to dispatch ANSWER action

```typescript
'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks/index';
import Timer from '@/components/Timer';
import HoldButton from '@/components/HoldButton';
import SlideTransition from '@/components/SlideTransition';
import { STAT_COLORS, STAT_KEYS, getSceneDelay } from '@/types/game';
import type { QuestionType, StatKey, Option } from '@/types/game';

type Phase = 'context' | 'event' | 'delay' | 'options' | 'feedback';

const TYPE_COLORS: Record<QuestionType, string> = {
  TENSION: 'bg-red-500/30 text-red-300',
  RANDOM: 'bg-yellow-500/30 text-yellow-300',
  SOCIAL: 'bg-blue-500/30 text-blue-300',
  NORMAL: 'bg-white/10 text-white/70',
};

const TYPE_LABELS: Record<QuestionType, string> = {
  TENSION: 'Alta Tensao',
  RANDOM: 'Aleatorio',
  SOCIAL: 'Social',
  NORMAL: 'Normal',
};

function getDominantAxis(weights: Partial<Record<StatKey, number>>): StatKey {
  let max: StatKey = 'vigor';
  let maxVal = -Infinity;
  for (const key of STAT_KEYS) {
    const v = weights[key];
    if (v !== undefined && v > maxVal) { maxVal = v; max = key; }
  }
  return max;
}

function getAxisTags(weights: Partial<Record<StatKey, number>>): { key: StatKey; value: number }[] {
  return STAT_KEYS
    .filter(k => weights[k] !== undefined && weights[k] !== 0)
    .map(k => ({ key: k, value: weights[k]! }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);
}

export default function PlayPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const router = useRouter();
  const { state, dispatch } = useGame();

  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('context');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.activeDeck?.deckId === deckId) return;
    const deck = getDeckById(deckId);
    if (!deck) { router.replace('/decks'); return; }
    dispatch({ type: 'START_DECK', deck });
  }, [deckId, state.activeDeck, dispatch, router]);

  const deck = state.activeDeck;
  const question = deck?.questions[questionIdx] ?? null;
  const totalQuestions = deck?.questions.length ?? 0;
  const isLast = questionIdx >= totalQuestions - 1;

  useEffect(() => () => { if (autoRef.current) clearTimeout(autoRef.current); }, []);

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'context') {
      autoRef.current = setTimeout(() => setPhase('event'), 3000);
    } else if (phase === 'event') {
      const delayMs = question ? getSceneDelay(question.metadata.tensao) : 1000;
      autoRef.current = setTimeout(() => setPhase('delay'), 3000);
      // 'delay' phase will handle the forced pause
    } else if (phase === 'delay') {
      const delayMs = question ? getSceneDelay(question.metadata.tensao) : 1000;
      autoRef.current = setTimeout(() => {
        setPhase('options');
        setTimerRunning(true);
      }, delayMs);
    }
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [phase, questionIdx, question]);

  const handleTapAdvance = useCallback(() => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (phase === 'context') setPhase('event');
    else if (phase === 'event') {
      setPhase('delay');
    }
  }, [phase]);

  const handleAnswer = useCallback((opt: Option) => {
    setTimerRunning(false);
    dispatch({ type: 'ANSWER', weights: opt.weights, tone: opt.tone ?? 'neutro' });
    setSelectedFeedback(opt.feedback);
    setPhase('feedback');
  }, [dispatch]);

  const handleTimeout = useCallback(() => {
    setTimerRunning(false);
    dispatch({ type: 'TIMEOUT' });
    setSelectedFeedback('Tempo esgotado! A inercia falou por voce.');
    setPhase('feedback');
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (isLast) {
      dispatch({ type: 'FINISH_DECK' });
      router.push(`/resultado/${deckId}`);
      return;
    }
    dispatch({ type: 'NEXT_QUESTION' });
    setQuestionIdx(prev => prev + 1);
    setPhase('context');
    setSelectedFeedback('');
    setTimerRunning(false);
  }, [isLast, dispatch, router, deckId]);

  if (!deck || !question) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-white/50">Carregando...</p></div>;
  }

  const contextSlide = question.slides.find(s => s.tipo === 'contexto');
  const eventSlide = question.slides.find(s => s.tipo === 'evento');
  const progress = ((questionIdx + 1) / totalQuestions) * 100;

  return (
    <div className="flex flex-col min-h-screen pb-4 px-4">
      {/* Top bar */}
      <div className="pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/60 truncate max-w-[50%]">{deck.name}</h2>
          <span className="text-sm text-white/40">{questionIdx + 1}/{totalQuestions}</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-accent-purple" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex justify-center pt-1">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${TYPE_COLORS[question.type]}`}>{TYPE_LABELS[question.type]}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Context */}
        {phase === 'context' && contextSlide && (
          <SlideTransition slideKey={`ctx-${questionIdx}`} type="context">
            <button type="button" onClick={handleTapAdvance} className="glass-card p-6 max-w-md w-full text-center space-y-4 cursor-pointer">
              <p className="text-lg text-white/90 leading-relaxed">{contextSlide.texto}</p>
              <p className="text-xs text-white/30">Toque para avancar</p>
            </button>
          </SlideTransition>
        )}

        {/* Event */}
        {phase === 'event' && eventSlide && (
          <SlideTransition slideKey={`evt-${questionIdx}`} type="event">
            <button type="button" onClick={handleTapAdvance} className="glass-card border-accent-purple/30 p-6 max-w-md w-full text-center space-y-4 cursor-pointer">
              <p className="text-xl font-semibold text-white leading-relaxed">{eventSlide.texto}</p>
              <p className="text-xs text-white/30">Toque para responder</p>
            </button>
          </SlideTransition>
        )}

        {/* Delay (forced pause — screen dims) */}
        {phase === 'delay' && (
          <SlideTransition slideKey={`delay-${questionIdx}`} type="context">
            <div className="flex items-center justify-center py-12">
              <div className="w-3 h-3 rounded-full bg-accent-purple animate-pulse" />
            </div>
          </SlideTransition>
        )}

        {/* Options with Hold */}
        {phase === 'options' && (
          <SlideTransition slideKey={`opt-${questionIdx}`} type="options">
            <div className="w-full max-w-md space-y-6">
              <div className="flex justify-center">
                <Timer running={timerRunning} onTimeout={handleTimeout} />
              </div>
              <div className="space-y-3">
                {question.options.map((opt, idx) => {
                  const dominant = getDominantAxis(opt.weights);
                  const holdColor = STAT_COLORS[dominant];
                  const tags = getAxisTags(opt.weights);

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <HoldButton
                        onConfirm={() => handleAnswer(opt)}
                        holdColor={holdColor}
                        className="glass-card-hover w-full p-4 text-left rounded-2xl"
                      >
                        <p className="text-white/90 font-medium leading-snug">{opt.text}</p>
                        <p className="text-xs text-white/30 mt-1">{opt.subtext ?? opt.meta}</p>
                        <div className="flex gap-1.5 mt-2">
                          {tags.map(t => (
                            <span
                              key={t.key}
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                color: STAT_COLORS[t.key],
                                backgroundColor: `${STAT_COLORS[t.key]}15`,
                              }}
                            >
                              {t.key.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </HoldButton>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </SlideTransition>
        )}

        {/* Feedback */}
        {phase === 'feedback' && (
          <SlideTransition slideKey={`fb-${questionIdx}`} type="context">
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="glass-card p-6">
                <p className="text-white/90 text-lg leading-relaxed">{selectedFeedback}</p>
              </div>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleNext}
                className="mx-auto block px-8 py-3 rounded-xl bg-accent-purple text-white font-semibold hover:bg-accent-purple-light transition-colors"
              >
                {isLast ? 'Ver Resultado' : 'Proxima'}
              </motion.button>
            </div>
          </SlideTransition>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd C:/Users/Afonso/Desktop/mindpractice && npm run build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add src/app/play/ src/components/HoldButton.tsx
git commit -m "feat: upgrade play engine with hold-to-confirm, forced delay, and axis tags"
```

---

### Task 8: Bipolar Sliders Component

**Files:**
- Create: `src/components/BipolarSliders.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { motion } from 'framer-motion';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, type StatKey } from '@/types/game';

interface BipolarSlidersProps {
  axes: Record<StatKey, number>;
  animate?: boolean;
  delay?: number;
}

export default function BipolarSliders({ axes, animate = true, delay = 0 }: BipolarSlidersProps) {
  const maxAbs = Math.max(1, ...STAT_KEYS.map(k => Math.abs(axes[k])));

  return (
    <div className="flex flex-col gap-4 w-full">
      {STAT_KEYS.map((key, i) => {
        const value = axes[key];
        const pct = (Math.abs(value) / maxAbs) * 50; // 50% max each side
        const isPositive = value >= 0;

        return (
          <motion.div
            key={key}
            initial={animate ? { opacity: 0, x: -10 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.08, duration: 0.4 }}
          >
            {/* Label row */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white/50">{STAT_LABELS[key]}</span>
              <span
                className="text-xs font-mono font-bold"
                style={{ color: value > 0 ? STAT_COLORS[key] : value < 0 ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
              >
                {value > 0 ? '+' : ''}{value.toFixed(1)}
              </span>
            </div>

            {/* Slider bar */}
            <div className="relative h-2.5 rounded-full bg-white/5">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

              {/* Value bar */}
              <motion.div
                className="absolute top-0 h-full rounded-full"
                style={{
                  backgroundColor: isPositive ? STAT_COLORS[key] : '#ef444480',
                  ...(isPositive
                    ? { left: '50%', width: 0 }
                    : { right: '50%', width: 0 }),
                }}
                animate={isPositive
                  ? { width: `${pct}%` }
                  : { width: `${pct}%` }
                }
                transition={{ delay: delay + 0.2 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/BipolarSliders.tsx
git commit -m "feat: add BipolarSliders component with center-zero animated bars"
```

---

### Task 9: Result Page Upgrade

**Files:**
- Modify: `src/app/resultado/[deckId]/page.tsx`

**Step 1: Replace result page with upgraded version**

Uses BipolarSliders, shows archetype from new matching, includes snapshot timeline if there are previous completions.

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import BipolarSliders from '@/components/BipolarSliders';

export default function ResultadoPage() {
  const { state, getArchetype, precision } = useGame();
  const archetype = getArchetype();
  const { snapshots } = state.calibration;

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-12">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-accent-gold/5 blur-[100px]" />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-white/50"
      >
        Resultado
      </motion.p>

      {/* Archetype Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-card glow-gold mb-8 w-full max-w-md p-8 text-center"
      >
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
          Seu Arquetipo Provisorio
        </p>
        <h2 className="mb-1 text-3xl font-bold text-accent-gold">{archetype.name}</h2>
        <p className="text-xs text-white/30 italic mb-3">{archetype.tagline}</p>
        <p className="text-sm leading-relaxed text-white/60">{archetype.description}</p>
      </motion.div>

      {/* Precision bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md mb-8"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Calibragem</span>
          <span className="text-[10px] text-white/40">{Math.round(precision)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-purple"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(precision, 100)}%` }}
            transition={{ delay: 0.4, duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Bipolar Sliders */}
      <div className="w-full max-w-md mb-8">
        <BipolarSliders axes={state.calibration.axes} delay={0.5} />
      </div>

      {/* Evolution Timeline (if snapshots exist) */}
      {snapshots.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="w-full max-w-md mb-8"
        >
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Evolucao</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {snapshots.slice(-5).map((snap, i) => (
              <div key={i} className="glass-card px-3 py-2 min-w-[100px] text-center flex-shrink-0">
                <p className="text-[9px] text-white/30 truncate">{snap.deckId}</p>
                <p className="text-xs font-semibold text-accent-gold truncate">{snap.archetypeAtCompletion}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <Link href="/decks" className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-accent-gold hover:bg-white/10 transition-colors">
          Voltar aos Decks
        </Link>
        <Link href="/" className="glass-card flex-1 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-colors">
          Ir para Home
        </Link>
      </motion.div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/resultado/ src/components/BipolarSliders.tsx
git commit -m "feat: upgrade result page with bipolar sliders, precision bar, and evolution timeline"
```

---

### Task 10: Config/Profile Page Upgrade

**Files:**
- Modify: `src/app/config/page.tsx`

**Step 1: Replace config page with upgraded version**

Adds precision bar, consistency shield, identity validated badge, and bipolar sliders.

```typescript
'use client';

import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import BipolarSliders from '@/components/BipolarSliders';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function ConfigPage() {
  const { state, dispatch, getArchetype, precision, consistency, isIdentityValidated } = useGame();
  const archetype = getArchetype();
  const deckCount = Object.keys(state.completedDecks).length;
  const precLabel = getPrecisionLabel(precision);
  const consLabel = getConsistencyLabel(consistency);

  function handleReset() {
    if (confirm('Tem certeza? Todo progresso sera apagado.')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-5 px-4 py-8 max-w-md mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={fadeUp}>
        <h2 className="text-2xl font-bold">Configuracoes</h2>
        <p className="text-sm text-white/40 mt-1">Seu perfil e preferencias</p>
      </motion.header>

      {/* Profile Card */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">Perfil</span>
        <div className="flex items-center gap-3 mt-2">
          <h3 className="text-xl font-bold text-accent-gold">{archetype.name}</h3>
          {isIdentityValidated && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">
              Identidade Confirmada
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 italic">{archetype.tagline}</p>
        <p className="text-sm text-white/50 mt-2">{archetype.description}</p>
        <p className="text-[10px] text-white/20 mt-2">{deckCount} deck(s) completo(s)</p>
      </motion.section>

      {/* Metrics */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-3 block">Metricas</span>
        <div className="grid grid-cols-2 gap-4">
          {/* Precision */}
          <div>
            <p className="text-[10px] text-white/30 uppercase mb-1">Calibragem</p>
            <p className={`text-lg font-bold ${precLabel.color}`}>{Math.round(precision)}%</p>
            <p className={`text-[10px] ${precLabel.color}`}>{precLabel.label}</p>
          </div>
          {/* Consistency */}
          <div>
            <p className="text-[10px] text-white/30 uppercase mb-1">Consistencia</p>
            <p className={`text-lg font-bold ${
              consLabel.icon === 'full' ? 'text-accent-gold' :
              consLabel.icon === 'half' ? 'text-accent-purple' : 'text-red-400'
            }`}>
              {(consistency * 100).toFixed(0)}%
            </p>
            <p className={`text-[10px] ${
              consLabel.icon === 'full' ? 'text-accent-gold' :
              consLabel.icon === 'half' ? 'text-accent-purple' : 'text-red-400'
            }`}>
              {consLabel.label}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Axes */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-4 block">Eixos</span>
        <BipolarSliders axes={state.calibration.axes} animate={false} />
      </motion.section>

      {/* About */}
      <motion.section className="glass-card p-5" variants={fadeUp}>
        <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">Sobre</span>
        <p className="text-sm text-white/50 mt-2">
          MindPractice e um simulador de reatividade social. Treine seu comportamento
          atraves de micro-conflitos sob pressao e descubra seu arquetipo.
        </p>
        <p className="text-[10px] text-white/20 mt-2">v0.2.0</p>
      </motion.section>

      {/* Reset */}
      <motion.button
        variants={fadeUp}
        onClick={handleReset}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
      >
        Resetar Progresso
      </motion.button>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/config/page.tsx
git commit -m "feat: upgrade config page with precision, consistency, identity badge, and bipolar sliders"
```

---

### Task 11: Update Home Page + Deck Validator

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/utils/validateDeck.ts`

**Step 1: Update Home page to use new context API**

Key changes: `state.userStats` → `state.calibration.axes`, `getArchetype()` now returns non-null.

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, type StatKey } from '@/types/game';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Home() {
  const { state, getArchetype, precision } = useGame();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const archetype = getArchetype();

  return (
    <motion.main variants={container} initial="hidden" animate="show"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[120px]" />

      <motion.div variants={fadeUp} className="relative z-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-accent-gold">Simulador</p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Mind<span className="text-accent-purple">Practice</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60">
          Treina a tua mente para situacoes reais. Descobre o teu arquetipo comportamental.
        </p>
      </motion.div>

      {hasPlayed && (
        <motion.div variants={fadeUp} className="glass-card relative z-10 mt-10 px-8 py-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Teu Arquetipo</p>
          <p className="mt-1 text-xl font-bold text-accent-gold">{archetype.name}</p>
          <p className="text-xs text-white/30 italic">{archetype.tagline}</p>
          <p className="mt-1 max-w-sm text-sm text-white/50">{archetype.description}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="h-1 rounded-full bg-accent-purple/30 w-20 overflow-hidden">
              <div className="h-full rounded-full bg-accent-purple" style={{ width: `${Math.min(precision, 100)}%` }} />
            </div>
            <span className="text-[9px] text-white/20">{Math.round(precision)}%</span>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="relative z-10 mt-10">
        <Link href="/decks"
          className="inline-block rounded-full bg-accent-purple px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-purple/25 transition-all hover:scale-105 hover:shadow-accent-purple/40">
          {hasPlayed ? 'Continuar Treino' : 'Comecar'}
        </Link>
      </motion.div>

      {hasPlayed && (
        <motion.div variants={fadeUp} className="relative z-10 mt-10 flex gap-6">
          {STAT_KEYS.map(key => {
            const value = state.calibration.axes[key];
            return (
              <div key={key} className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">{STAT_LABELS[key].slice(0, 3)}</p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: value > 0 ? STAT_COLORS[key] : value < 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}
                </p>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.main>
  );
}
```

**Step 2: Create deck validator**

```typescript
import type { Deck, Question, Option } from '@/types/game';

export function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];

  // Check required root fields
  if (!deck.category) errors.push('Missing category');
  if (!deck.difficulty) errors.push('Missing difficulty');

  // Distribution check
  const types = deck.questions.map(q => q.type);
  const normalCount = types.filter(t => t === 'NORMAL').length;
  const randomCount = types.filter(t => t === 'RANDOM').length;
  const socialCount = types.filter(t => t === 'SOCIAL').length;
  const tensionCount = types.filter(t => t === 'TENSION').length;

  if (normalCount !== 7) errors.push(`Expected 7 NORMAL, got ${normalCount}`);
  if (randomCount !== 1) errors.push(`Expected 1 RANDOM, got ${randomCount}`);
  if (socialCount !== 1) errors.push(`Expected 1 SOCIAL, got ${socialCount}`);
  if (tensionCount !== 1) errors.push(`Expected 1 TENSION, got ${tensionCount}`);

  for (const q of deck.questions) {
    if (q.options.length !== 3) {
      errors.push(`${q.id}: Expected 3 options, got ${q.options.length}`);
    }

    if (!q.metadata.pilar) {
      errors.push(`${q.id}: Missing pilar`);
    }

    for (const opt of q.options) {
      const weights = Object.values(opt.weights);
      if (weights.length === 0) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." has no weights`);
      }
      const hasPos = weights.some(v => v > 0);
      const hasNeg = weights.some(v => v < 0);
      if (!hasPos || !hasNeg) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." missing trade-off (needs + and - weights)`);
      }
      if (!opt.tone) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." missing tone`);
      }
    }
  }

  return errors;
}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/utils/validateDeck.ts
git commit -m "feat: update home page for v2 calibration and add deck validator utility"
```

---

## File Tree (Final v2)

```
src/
  app/
    globals.css              (no changes)
    layout.tsx               (no changes — already has GameProvider)
    page.tsx                 (Task 11 — update for calibration.axes)
    decks/page.tsx           (Task 5 — 3 tabs + weekly rotation)
    play/[deckId]/page.tsx   (Task 7 — hold + delay + axis tags)
    resultado/[deckId]/page.tsx (Task 9 — bipolar sliders + snapshots)
    config/page.tsx          (Task 10 — metrics + identity badge)
  components/
    BottomNav.tsx            (no changes)
    Timer.tsx                (no changes)
    SlideTransition.tsx      (no changes)
    HoldButton.tsx           (Task 6 — NEW)
    BipolarSliders.tsx       (Task 8 — NEW)
  context/
    GameContext.tsx           (Task 3 — full rewrite)
  data/
    archetypes.ts            (Task 2 — NEW)
    decks/*.json             (Task 4 — add fields)
    decks/index.ts           (Task 4 — add category helpers)
  types/
    game.ts                  (Task 1 — full rewrite)
  utils/
    validateDeck.ts          (Task 11 — NEW)
```
