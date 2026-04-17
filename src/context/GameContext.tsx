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
  type Wallet,
  type AnswerIntensity,
  STAT_KEYS,
  INITIAL_CALIBRATION,
  INITIAL_WALLET,
  DAILY_FICHAS,
  CALIBRATION_WINDOW,
  CONSISTENCY_WINDOW,
  INTENSITY_MULTIPLIERS,
} from '@/types/game';
import { ARCHETYPES, matchArchetype } from '@/data/archetypes';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';
import {
  appendRunAnswer,
  createDeckSnapshot,
  createRunSession,
  normalizeGameState,
} from '@/lib/runScoring';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'START_DECK'; deck: Deck }
  | { type: 'ANSWER'; weights: Partial<Record<StatKey, number>>; tone: Tone; responseTimeMs?: number; intensity?: AnswerIntensity }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_DECK' }
  | { type: 'CLAIM_DAILY' }
  | { type: 'SPEND_FICHAS'; amount: number; itemId: string }
  | { type: 'EARN_FICHAS'; amount: number; reason: string }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: GameState }
  | { type: 'CAMPAIGN_START'; seasonId: string; deck: Deck }
  | { type: 'CAMPAIGN_ANSWER';
      seasonId: string;
      sceneId: string;
      optionIndex: number;
      nextSceneId: string | null;
      endingId: string | null;
      weights: Partial<Record<StatKey, number>>;
      tone: Tone;
      tensao: number;
    }
  | { type: 'CAMPAIGN_RATE'; seasonId: string; rating: number };

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mindpractice_state';
const UNLOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Light time-based tempero (tempero, not main seasoning).
 * Reading speed varies — we don't punish/reward much for it.
 *   <2000ms     → 1.05x (instintivo)
 *   2000–9000ms → 1.00x (normal)
 *   >9000ms     → 0.95x (bem lento)
 *   undefined   → 1.00x
 */
function timeTempero(responseTimeMs?: number): number {
  if (responseTimeMs === undefined) return 1.0;
  if (responseTimeMs < 2000) return 1.05;
  if (responseTimeMs > 9000) return 0.95;
  return 1.0;
}

/**
 * Apply dampened weights to calibration axes.
 * Formula: axis += weight * tensionMult * intensityMult * timeTempero / min(totalResponses + 1, CALIBRATION_WINDOW)
 *
 * Intensity is the PRIMARY conviction signal — player declares it after choosing.
 * Time is a light tempero only, since reading speed varies.
 */
function applyDampenedWeights(
  cal: CalibrationState,
  weights: Partial<Record<StatKey, number>>,
  tone: Tone,
  tensao: number = 2,
  responseTimeMs?: number,
  intensity?: AnswerIntensity,
): CalibrationState {
  const divisor = Math.min(cal.totalResponses + 1, CALIBRATION_WINDOW);
  const tensionMultiplier = 0.5 + (tensao * 0.5);
  // tensao 1 → 1.0x, tensao 2 → 1.5x, tensao 3 → 2.0x, tensao 4 → 2.5x, tensao 5 → 3.0x
  const intensityMult = intensity ? INTENSITY_MULTIPLIERS[intensity] : 1.0;
  const timeMult = timeTempero(responseTimeMs);
  const newAxes = { ...cal.axes };
  const newRecent = { ...cal.recentWeights };

  for (const key of STAT_KEYS) {
    const w = weights[key];
    if (w !== undefined) {
      const adjustedW = w * tensionMultiplier * intensityMult * timeMult;
      newAxes[key] = newAxes[key] + adjustedW / divisor;

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

export function getUnlockedDecks(completedDecks: Record<string, string>): string[] {
  const unlocked: string[] = [];
  for (let i = 0; i < DECK_UNLOCK_ORDER.length; i++) {
    const deckId = DECK_UNLOCK_ORDER[i];
    if (i === 0) { unlocked.push(deckId); continue; }
    const prevId = DECK_UNLOCK_ORDER[i - 1];
    const prevAt = completedDecks[prevId];
    if (!prevAt) break;
    // Calibragem decks unlock the next one immediately on completion.
    // Non-calibragem decks still honor the 24h cooldown.
    const prevIsCalibragem = CALIBRAGEM_IDS.has(prevId);
    if (prevIsCalibragem) {
      unlocked.push(deckId);
      continue;
    }
    const elapsed = Date.now() - new Date(prevAt).getTime();
    if (elapsed >= UNLOCK_COOLDOWN_MS) unlocked.push(deckId);
    else break;
  }
  return unlocked;
}

/** Deck IDs that belong to the "calibragem" category — fast unlock + reward. */
const CALIBRAGEM_IDS = new Set([
  'basic_01',
  'espelho',
  'mascara',
  'roda',
  'teste',
  'limite',
  'escolha',
]);
const CALIBRAGEM_COMPLETION_FICHAS = 5;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: GameState = {
  calibration: { ...INITIAL_CALIBRATION },
  wallet: { ...INITIAL_WALLET },
  activeDeck: null,
  activeRun: null,
  currentQuestion: 0,
  unlockedDecks: getUnlockedDecks({}),
  completedDecks: {},
  lastTrainingDate: null,
  streak: 0,
  lastPlayDate: null,
  campaigns: {},
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
      wallet: { ...INITIAL_WALLET },
      activeDeck: null,
      activeRun: null,
      currentQuestion: 0,
      unlockedDecks: getUnlockedDecks(completedDecks),
      completedDecks,
      lastTrainingDate: (raw.lastTrainingDate as string) ?? null,
      streak: 0,
      lastPlayDate: null,
      campaigns: {},
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
      const startArchetype = matchArchetype(
        state.calibration.axes,
        state.calibration.recentWeights,
        state.calibration.totalResponses,
      );
      return {
        ...state,
        activeDeck: action.deck,
        activeRun: createRunSession(
          action.deck,
          state.calibration.axes,
          startArchetype.name,
        ),
        currentQuestion: 0,
      };

    case 'ANSWER': {
      const question = state.activeDeck?.questions[state.currentQuestion];
      const tensao = question?.metadata?.tensao ?? 2;

      return {
        ...state,
        calibration: applyDampenedWeights(state.calibration, action.weights, action.tone, tensao, action.responseTimeMs, action.intensity),
        activeRun:
          state.activeRun && question
            ? appendRunAnswer(state.activeRun, question.id, action.tone, action.weights, action.responseTimeMs)
            : state.activeRun,
      };
    }

    case 'TIMEOUT': {
      const question = state.activeDeck?.questions[state.currentQuestion];
      if (!state.activeRun || !question) return state;
      const event = {
        questionId: question.id,
        tone: null,
        weights: {},
        dominantAxis: null,
        timedOut: true,
      };
      return {
        ...state,
        activeRun: {
          ...state.activeRun,
          timeoutCount: state.activeRun.timeoutCount + 1,
          answers: [...state.activeRun.answers, event],
        },
      };
    }

    case 'NEXT_QUESTION':
      return { ...state, currentQuestion: state.currentQuestion + 1 };

    case 'FINISH_DECK': {
      const now = new Date().toISOString();
      const deckId = state.activeDeck?.deckId;
      const completedDecks = deckId
        ? { ...state.completedDecks, [deckId]: now }
        : state.completedDecks;

      const todayStr = now.split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = state.streak;
      if (state.lastPlayDate === todayStr) {
        // Already played today, no streak change
      } else if (state.lastPlayDate === yesterday) {
        newStreak = state.streak + 1;
      } else {
        newStreak = 1;
      }

      // Bonus fichas from gameplay
      let bonusFichas = 3; // first deck of day
      if (state.lastPlayDate === todayStr) bonusFichas = 0; // already played today
      if (newStreak > 0 && newStreak % 7 === 0) bonusFichas += 20; // weekly streak bonus
      const noTimeouts = state.activeRun ? state.activeRun.timeoutCount === 0 : false;
      if (noTimeouts) bonusFichas += 5;
      // Calibragem completion — rewarded every time (not just first of day)
      // because each calibragem feeds into the profile and unlocks the next one.
      if (deckId && CALIBRAGEM_IDS.has(deckId)) {
        bonusFichas += CALIBRAGEM_COMPLETION_FICHAS;
      }

      const prevArchId = ARCHETYPES.find(a => a.name === state.activeRun?.startArchetype)?.id;
      const archetype = matchArchetype(
        state.calibration.axes,
        state.calibration.recentWeights,
        state.calibration.totalResponses,
        prevArchId,
      );
      const snapshot = state.activeRun
        ? createDeckSnapshot({
            session: state.activeRun,
            archetypeName: archetype.name,
            finalStats: state.calibration.axes,
          })
        : null;

      return {
        ...state,
        activeDeck: null,
        activeRun: null,
        currentQuestion: 0,
        completedDecks,
        unlockedDecks: getUnlockedDecks(completedDecks),
        lastTrainingDate: now,
        streak: newStreak,
        lastPlayDate: todayStr,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas + bonusFichas,
          totalEarned: state.wallet.totalEarned + bonusFichas,
        },
        calibration: {
          ...state.calibration,
          snapshots: snapshot
            ? [...state.calibration.snapshots, snapshot]
            : state.calibration.snapshots,
        },
      };
    }

    case 'CLAIM_DAILY': {
      const today = new Date().toISOString().split('T')[0];
      if (state.wallet.lastDailyClaim === today) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas + DAILY_FICHAS,
          lastDailyClaim: today,
          totalEarned: state.wallet.totalEarned + DAILY_FICHAS,
        },
      };
    }

    case 'SPEND_FICHAS': {
      if (state.wallet.fichas < action.amount) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas - action.amount,
          totalSpent: state.wallet.totalSpent + action.amount,
        },
      };
    }

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

    case 'RESET_ALL':
      return { ...initialState, unlockedDecks: getUnlockedDecks({}) };

    case 'HYDRATE':
      return {
        ...normalizeGameState(action.state),
        unlockedDecks: getUnlockedDecks(action.state.completedDecks),
      };

    case 'CAMPAIGN_START': {
      if (state.campaigns[action.seasonId]) return state; // idempotent
      const startSceneId = action.deck.startSceneId ?? action.deck.questions[0]?.id;
      if (!startSceneId) return state;
      const now = new Date().toISOString();
      return {
        ...state,
        campaigns: {
          ...state.campaigns,
          [action.seasonId]: {
            deckId: action.deck.deckId,
            seasonId: action.seasonId,
            startedAt: now,
            lastAnsweredAt: null,
            currentSceneId: startSceneId,
            path: [],
            endingId: null,
            rating: null,
            completedAt: null,
          },
        },
      };
    }

    case 'CAMPAIGN_ANSWER': {
      const progress = state.campaigns[action.seasonId];
      if (!progress || progress.endingId) return state;

      const now = new Date().toISOString();
      const step = {
        sceneId: action.sceneId,
        optionIndex: action.optionIndex,
        answeredAt: now,
      };

      // Apply calibration like a normal ANSWER so campaign responses still
      // shape the player's profile.
      const newCalibration = applyDampenedWeights(
        state.calibration,
        action.weights,
        action.tone,
        action.tensao,
      );

      return {
        ...state,
        calibration: newCalibration,
        campaigns: {
          ...state.campaigns,
          [action.seasonId]: {
            ...progress,
            lastAnsweredAt: now,
            path: [...progress.path, step],
            currentSceneId: action.nextSceneId ?? progress.currentSceneId,
            endingId: action.endingId,
            completedAt: action.endingId ? now : null,
          },
        },
      };
    }

    case 'CAMPAIGN_RATE': {
      const progress = state.campaigns[action.seasonId];
      if (!progress || !progress.endingId) return state;
      return {
        ...state,
        campaigns: {
          ...state.campaigns,
          [action.seasonId]: { ...progress, rating: action.rating },
        },
      };
    }

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
  canClaimDaily: boolean;
  claimDaily: () => void;
  spendFichas: (amount: number, itemId: string) => boolean;
  streak: number;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Hydrate — try cloud first, fall back to localStorage
  useEffect(() => {
    (async () => {
      // 1. Try cloud
      try {
        const { loadStateFromCloud } = await import('@/lib/supabase/sync');
        const cloud = await loadStateFromCloud();
        if (cloud) {
          dispatch({ type: 'HYDRATE', state: normalizeGameState(cloud as GameState) });
          return;
        }
      } catch { /* Supabase not configured — fall through */ }

      // 2. Fall back to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);

        const migrated = migrateV1(parsed);
        if (migrated) {
          dispatch({ type: 'HYDRATE', state: migrated });
          return;
        }

        dispatch({ type: 'HYDRATE', state: normalizeGameState(parsed as GameState) });
      } catch {
        // corrupted — start fresh
      }
    })();
  }, []);

  // Persist to localStorage (exclude activeDeck and activeRun)
  useEffect(() => {
    try {
      const { activeDeck: _, activeRun: __, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {}
  }, [state]);

  // Cloud sync — debounced save to Supabase when logged in
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/lib/supabase/sync').then(({ saveStateToCloud }) => {
        saveStateToCloud(state).catch(() => {});
      });
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
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
    () => matchArchetype(
      state.calibration.axes,
      state.calibration.recentWeights,
      state.calibration.totalResponses,
    ),
    [state.calibration.axes, state.calibration.recentWeights, state.calibration.totalResponses],
  );

  const precision = getPrecision(state.calibration.totalResponses);
  const consistency = getConsistency(state.calibration.recentWeights);
  const isIdentityValidated = precision >= 80 && consistency >= 0.6;

  const canClaimDaily = state.wallet.lastDailyClaim !== new Date().toISOString().split('T')[0];

  const claimDaily = useCallback(() => {
    dispatch({ type: 'CLAIM_DAILY' });
  }, []);

  const spendFichas = useCallback(
    (amount: number, itemId: string) => {
      if (state.wallet.fichas < amount) return false;
      dispatch({ type: 'SPEND_FICHAS', amount, itemId });
      return true;
    },
    [state.wallet.fichas],
  );

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
        canClaimDaily,
        claimDaily,
        spendFichas,
        streak: state.streak,
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
