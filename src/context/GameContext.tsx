'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
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
  type Option,
  type PlusSubscription,
  STAT_KEYS,
  INITIAL_CALIBRATION,
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
  DAILY_FICHAS,
  CALIBRATION_WINDOW,
  CONSISTENCY_WINDOW,
  INTENSITY_MULTIPLIERS,
  RUN_PISO_FICHAS,
  RUN_PISO_CAP_PER_DAY,
  FIRST_RUN_OF_DAY_BONUS,
  STREAK_7_BONUS,
  DECK_FIRST_TIME_BONUS,
  NO_TIMEOUT_RUN_BONUS,
  CAMPAIGN_ENDING_BONUS,
  SKIP_COOLDOWN_COST,
  PLUS_DAILY_BONUS,
} from '@/types/game';
import { ARCHETYPES, matchArchetype } from '@/data/archetypes';
import { resolveWeights } from '@/lib/narrativeEngine';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';
import {
  appendRunAnswer,
  createDeckSnapshot,
  createRunSession,
  normalizeGameState,
} from '@/lib/runScoring';
import {
  applyDampenedWeights,
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getConsistency,
  UNLOCK_COOLDOWN_MS,
  CALIBRAGEM_IDS,
  CALIBRAGEM_COMPLETION_FICHAS,
} from '@/lib/gameStats';

// Re-export stat helpers so existing callers (perfil page etc) continue working.
export {
  applyDampenedWeights,
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getPrecisionLabel,
  getConsistency,
  getConsistencyLabel,
} from '@/lib/gameStats';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'START_DECK'; deck: Deck }
  | { type: 'ANSWER'; option: Option; responseTimeMs?: number; intensity?: AnswerIntensity }
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
  | { type: 'CAMPAIGN_RATE'; seasonId: string; rating: number }
  | { type: 'SKIP_CAMPAIGN_COOLDOWN'; seasonId: string }
  | { type: 'UNLOCK_DECK'; deckId: string; cost: number }
  | { type: 'SET_PLUS_STATUS'; active: boolean; expiresAt: string | null; startedAt?: string }
  | { type: 'CLAIM_DAILY_PLUS_BONUS' };

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mindpractice_state';

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
  ownedDeckIds: [],
  plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
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
      ownedDeckIds: [],
      plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
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
      if (!question) return state;

      const resolved = resolveWeights(action.option, question.metadata, action.responseTimeMs);
      const tensao = question.metadata.tensao;

      return {
        ...state,
        calibration: applyDampenedWeights(
          state.calibration,
          resolved.finalWeights,
          action.option.tone,
          tensao,
          action.responseTimeMs,
          action.intensity,
        ),
        activeRun: state.activeRun
          ? appendRunAnswer(
              state.activeRun,
              question.id,
              action.option.tone,
              resolved.finalWeights,
              action.responseTimeMs,
            )
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

      // --- Ficha economy -----------------------------------------------------
      // Reset per-day run counter if we crossed midnight.
      const sameDay = state.wallet.runsPaidDate === todayStr;
      const runsPaidSoFar = sameDay ? (state.wallet.runsPaidToday ?? 0) : 0;

      // Piso: every run pays RUN_PISO_FICHAS, capped at RUN_PISO_CAP_PER_DAY runs.
      const pisoFichas = runsPaidSoFar < RUN_PISO_CAP_PER_DAY ? RUN_PISO_FICHAS : 0;
      const nextRunsPaidToday = pisoFichas > 0 ? runsPaidSoFar + 1 : runsPaidSoFar;

      let bonusFichas = pisoFichas;
      // First run of the calendar day
      const firstOfDay = state.lastPlayDate !== todayStr;
      if (firstOfDay) bonusFichas += FIRST_RUN_OF_DAY_BONUS;
      // Weekly streak bonus (a cada 7 dias consecutivos)
      if (newStreak > 0 && newStreak % 7 === 0) bonusFichas += STREAK_7_BONUS;
      // Zero-timeout run
      const noTimeouts = state.activeRun ? state.activeRun.timeoutCount === 0 : false;
      if (noTimeouts) bonusFichas += NO_TIMEOUT_RUN_BONUS;
      // Calibragem — always rewarded (feeds profile + unlocks next)
      if (deckId && CALIBRAGEM_IDS.has(deckId)) {
        bonusFichas += CALIBRAGEM_COMPLETION_FICHAS;
      }
      // NEW: primeira vez completando este deck (não paga em completar de novo)
      const isFirstTimeDeck = deckId ? !state.completedDecks[deckId] : false;
      if (isFirstTimeDeck) bonusFichas += DECK_FIRST_TIME_BONUS;

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
          runsPaidToday: nextRunsPaidToday,
          runsPaidDate: todayStr,
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
      // normalizeGameState ja aplica defaults pra ownedDeckIds/plusSubscription
      // (migração silenciosa de saves antigos). Fonte única de coerção.
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

      // +30 fichas when an ending is reached.
      const reachedEnding = !!action.endingId;
      const endingBonus = reachedEnding ? CAMPAIGN_ENDING_BONUS : 0;

      return {
        ...state,
        calibration: newCalibration,
        wallet: endingBonus > 0
          ? {
              ...state.wallet,
              fichas: state.wallet.fichas + endingBonus,
              totalEarned: state.wallet.totalEarned + endingBonus,
            }
          : state.wallet,
        campaigns: {
          ...state.campaigns,
          [action.seasonId]: {
            ...progress,
            lastAnsweredAt: now,
            path: [...progress.path, step],
            currentSceneId: action.nextSceneId ?? progress.currentSceneId,
            endingId: action.endingId,
            completedAt: action.endingId ? now : null,
            pendingSkipSceneId: null, // consume any paid skip
          },
        },
      };
    }

    case 'SKIP_CAMPAIGN_COOLDOWN': {
      const progress = state.campaigns[action.seasonId];
      if (!progress || progress.endingId) return state;
      if (state.wallet.fichas < SKIP_COOLDOWN_COST) return state;
      // Already skipped for this scene — no-op.
      if (progress.pendingSkipSceneId === progress.currentSceneId) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas - SKIP_COOLDOWN_COST,
          totalSpent: state.wallet.totalSpent + SKIP_COOLDOWN_COST,
        },
        campaigns: {
          ...state.campaigns,
          [action.seasonId]: {
            ...progress,
            pendingSkipSceneId: progress.currentSceneId,
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

    case 'SET_PLUS_STATUS': {
      const now = new Date().toISOString();
      const startedAt = action.active
        ? (state.plusSubscription.startedAt ?? action.startedAt ?? now)
        : state.plusSubscription.startedAt;
      return {
        ...state,
        plusSubscription: {
          ...state.plusSubscription,
          active: action.active,
          expiresAt: action.expiresAt,
          startedAt,
        },
      };
    }

    case 'CLAIM_DAILY_PLUS_BONUS': {
      if (!state.plusSubscription.active) return state;
      const today = new Date().toISOString().split('T')[0];
      if (state.plusSubscription.lastPlusDailyClaim === today) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas + PLUS_DAILY_BONUS,
          totalEarned: state.wallet.totalEarned + PLUS_DAILY_BONUS,
        },
        plusSubscription: {
          ...state.plusSubscription,
          lastPlusDailyClaim: today,
        },
      };
    }

    case 'UNLOCK_DECK': {
      // Já possui — idempotente.
      if (state.ownedDeckIds.includes(action.deckId)) return state;
      // Sem saldo — rejeita silenciosamente. UI deve ter desabilitado o botão.
      if (state.wallet.fichas < action.cost) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas - action.cost,
          totalSpent: state.wallet.totalSpent + action.cost,
        },
        ownedDeckIds: [...state.ownedDeckIds, action.deckId],
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isDeckLocked: (deckId: string) => boolean;
  isDeckPlayable: (deck: Deck) => boolean;
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
  // Tracks whether initial hydrate has finished. The persist effects gate on
  // this flag so we never overwrite good localStorage/cloud data with the
  // transient `initialState` during the async hydrate window.
  const hydratedRef = useRef(false);

  // Hydrate — try cloud first, fall back to localStorage
  useEffect(() => {
    (async () => {
      try {
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
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, []);

  // Persist to localStorage (exclude activeDeck and activeRun).
  // Gated on hydrate completing so the initial `initialState` render
  // doesn't clobber real stored data during the async hydrate window.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      const { activeDeck: _, activeRun: __, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {}
  }, [state]);

  // Cloud sync — debounced save to Supabase when logged in
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      import('@/lib/supabase/sync').then(({ saveStateToCloud }) => {
        saveStateToCloud(state).catch(() => {});
      });
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [state]);

  // Social feed — detecta novos snapshots (deck concluído) e novos arquétipos,
  // e publica eventos no feed se usuário logado.
  const lastSnapshotCountRef = useRef<number | null>(null);
  const lastArchetypeRef = useRef<string | null>(null);
  const lastLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshots = state.calibration.snapshots;
    const currentCount = snapshots.length;
    const currentLevel = Math.floor(state.calibration.totalResponses / 20) + 1;
    const currentArch = snapshots.length > 0
      ? snapshots[snapshots.length - 1].archetypeAtCompletion
      : null;

    // Primeira passada após hydrate — só memoriza, não loga histórico
    if (lastSnapshotCountRef.current === null) {
      lastSnapshotCountRef.current = currentCount;
      lastArchetypeRef.current = currentArch;
      lastLevelRef.current = currentLevel;
      return;
    }

    (async () => {
      try {
        const { logFeedEvent } = await import('@/lib/supabase/social');

        // Deck concluído?
        if (currentCount > (lastSnapshotCountRef.current ?? 0)) {
          const latest = snapshots[snapshots.length - 1];
          if (latest) {
            const { getDeckById } = await import('@/data/decks/index');
            const deck = getDeckById(latest.deckId);
            await logFeedEvent('deck_completed', {
              deckId: latest.deckId,
              deckName: deck?.name ?? latest.deckId,
              score: latest.runScore,
              archetype: latest.archetypeAtCompletion,
            });

            // Mudança de arquétipo (detectada no próprio snapshot)
            if (latest.archetypeChanged && latest.archetypeBeforeRun) {
              await logFeedEvent('archetype_changed', {
                archetype: latest.archetypeAtCompletion,
                from: latest.archetypeBeforeRun,
              });
            }
          }
        }

        // Level up?
        if (lastLevelRef.current !== null && currentLevel > lastLevelRef.current) {
          await logFeedEvent('level_up', { level: currentLevel });
        }

        // Streak milestone (a cada 7 dias)?
        if (state.streak > 0 && state.streak % 7 === 0) {
          // Só loga uma vez por milestone — compara com ref
          if (lastLevelRef.current !== null) {
            // reusa currentCount check — só loga quando sobe snapshot (jogou hoje)
            if (currentCount > (lastSnapshotCountRef.current ?? 0)) {
              await logFeedEvent('streak_milestone', { streak: state.streak });
            }
          }
        }
      } catch {
        // Supabase indisponível ou usuário deslogado — silencioso
      } finally {
        lastSnapshotCountRef.current = currentCount;
        lastArchetypeRef.current = currentArch;
        lastLevelRef.current = currentLevel;
      }
    })();
  }, [state.calibration.snapshots, state.calibration.totalResponses, state.streak]);

  const isDeckLocked = useCallback(
    (deckId: string) => !state.unlockedDecks.includes(deckId),
    [state.unlockedDecks],
  );

  const isDeckPlayableBound = useCallback(
    (deck: Deck) => isDeckPlayable(deck, state),
    [state],
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
        isDeckPlayable: isDeckPlayableBound,
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
