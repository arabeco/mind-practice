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
  if (pct > 30) return { label: 'Calibrando', color: 'text-accent-purple' };
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
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
