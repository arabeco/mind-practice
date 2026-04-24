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
  type StatKey,
  type Deck,
  type Archetype,
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
} from '@/types/game';
import { matchArchetype } from '@/data/archetypes';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';
import { normalizeGameState } from '@/lib/runScoring';
import {
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getConsistency,
  UNLOCK_COOLDOWN_MS,
} from '@/lib/gameStats';
import { gameReducer, initialState, type GameAction } from './gameReducer';

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
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mindpractice_state';

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
