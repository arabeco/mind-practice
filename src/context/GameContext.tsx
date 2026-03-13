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
  ARCHETYPES,
  INITIAL_STATS,
  INERTIA_PENALTY,
  type GameState,
  type UserStats,
  type StatKey,
  type Deck,
  type Archetype,
} from '@/types/game';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'START_DECK'; deck: Deck }
  | { type: 'ANSWER'; weights: Partial<Record<StatKey, number>> }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_DECK' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: GameState };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mindpractice_state';
const UNLOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h

function applyWeights(
  stats: UserStats,
  weights: Partial<Record<StatKey, number>>,
): UserStats {
  const next = { ...stats };
  for (const key of Object.keys(weights) as StatKey[]) {
    next[key] = next[key] + (weights[key] ?? 0);
  }
  return next;
}

/**
 * Determine which deck IDs are currently unlocked.
 *
 * Rules:
 *  - The first deck in DECK_UNLOCK_ORDER is always unlocked.
 *  - Each subsequent deck unlocks when the previous deck has been completed
 *    AND at least 24 h have elapsed since that completion timestamp.
 */
export function getUnlockedDecks(
  completedDecks: Record<string, string>,
): string[] {
  const unlocked: string[] = [];

  for (let i = 0; i < DECK_UNLOCK_ORDER.length; i++) {
    const deckId = DECK_UNLOCK_ORDER[i];

    if (i === 0) {
      // First deck is always available
      unlocked.push(deckId);
      continue;
    }

    const prevDeckId = DECK_UNLOCK_ORDER[i - 1];
    const prevCompletedAt = completedDecks[prevDeckId];

    if (!prevCompletedAt) break; // previous not completed yet

    const elapsed = Date.now() - new Date(prevCompletedAt).getTime();
    if (elapsed >= UNLOCK_COOLDOWN_MS) {
      unlocked.push(deckId);
    } else {
      break; // subsequent decks can't be unlocked either
    }
  }

  return unlocked;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: GameState = {
  userStats: { ...INITIAL_STATS },
  activeDeck: null,
  currentQuestion: 0,
  unlockedDecks: getUnlockedDecks({}),
  completedDecks: {},
  lastTrainingDate: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_DECK':
      return {
        ...state,
        activeDeck: action.deck,
        currentQuestion: 0,
      };

    case 'ANSWER':
      return {
        ...state,
        userStats: applyWeights(state.userStats, action.weights),
      };

    case 'TIMEOUT':
      return {
        ...state,
        userStats: applyWeights(state.userStats, INERTIA_PENALTY),
      };

    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQuestion: state.currentQuestion + 1,
      };

    case 'FINISH_DECK': {
      const now = new Date().toISOString();
      const deckId = state.activeDeck?.deckId;
      const completedDecks = deckId
        ? { ...state.completedDecks, [deckId]: now }
        : state.completedDecks;

      return {
        ...state,
        activeDeck: null,
        currentQuestion: 0,
        completedDecks,
        unlockedDecks: getUnlockedDecks(completedDecks),
        lastTrainingDate: now,
      };
    }

    case 'RESET_ALL':
      return { ...initialState, unlockedDecks: getUnlockedDecks({}) };

    case 'HYDRATE':
      return {
        ...action.state,
        unlockedDecks: getUnlockedDecks(action.state.completedDecks),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isDeckLocked: (deckId: string) => boolean;
  getTimeUntilUnlock: (deckId: string) => number;
  getArchetype: () => Archetype | null;
}

const GameContext = createContext<GameContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: GameState = JSON.parse(raw);
        dispatch({ type: 'HYDRATE', state: parsed });
      }
    } catch {
      // corrupted data – start fresh
    }
  }, []);

  // Persist to localStorage on every state change (exclude activeDeck)
  useEffect(() => {
    try {
      const { activeDeck: _, ...persistable } = state;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...persistable, activeDeck: null }),
      );
    } catch {
      // storage full or unavailable
    }
  }, [state]);

  // ------ helpers exposed via context ------

  const isDeckLocked = useCallback(
    (deckId: string): boolean => {
      return !state.unlockedDecks.includes(deckId);
    },
    [state.unlockedDecks],
  );

  const getTimeUntilUnlock = useCallback(
    (deckId: string): number => {
      const idx = DECK_UNLOCK_ORDER.indexOf(deckId);
      if (idx <= 0) return 0; // first deck or unknown

      const prevDeckId = DECK_UNLOCK_ORDER[idx - 1];
      const prevCompletedAt = state.completedDecks[prevDeckId];

      if (!prevCompletedAt) return Infinity; // previous not completed

      const elapsed = Date.now() - new Date(prevCompletedAt).getTime();
      const remaining = UNLOCK_COOLDOWN_MS - elapsed;
      return remaining > 0 ? remaining : 0;
    },
    [state.completedDecks],
  );

  const getArchetype = useCallback((): Archetype | null => {
    const stats = state.userStats;
    const entries = (Object.entries(stats) as [StatKey, number][]).sort(
      (a, b) => b[1] - a[1],
    );

    if (entries.length < 2) return null;

    const top2: [StatKey, StatKey] = [entries[0][0], entries[1][0]];

    // Find matching archetype (order-insensitive)
    return (
      ARCHETYPES.find(
        (a) =>
          (a.axes[0] === top2[0] && a.axes[1] === top2[1]) ||
          (a.axes[0] === top2[1] && a.axes[1] === top2[0]),
      ) ?? null
    );
  }, [state.userStats]);

  return (
    <GameContext.Provider
      value={{ state, dispatch, isDeckLocked, getTimeUntilUnlock, getArchetype }}
    >
      {children}
    </GameContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
