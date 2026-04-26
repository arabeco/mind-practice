'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import { type GameState, type Deck, type Archetype } from '@/types/game';
import { matchArchetype } from '@/data/archetypes';
import { matchArchetypes, createPriorProfile } from '@/lib/bayesEngine';
import { DECK_UNLOCK_ORDER } from '@/data/decks/index';
import {
  isDeckPlayable,
  getPrecision,
  getConsistency,
  UNLOCK_COOLDOWN_MS,
} from '@/lib/gameStats';
import { gameReducer, type GameAction } from './gameReducer';
import { INITIAL_STATE } from '@/lib/gameState/defaults';
import SyncConflictModal from '@/components/SyncConflictModal';
import LevelUpCeremony from '@/components/LevelUpCeremony';
import LevelUpVideo from '@/components/LevelUpVideo';
import FirstArchetypeCeremony from '@/components/FirstArchetypeCeremony';
import { useSocialFeed } from './useSocialFeed';
import { useGameStatePersistence } from './useGameStatePersistence';
import { useLevelCeremony } from './useLevelCeremony';
import { useFirstArchetypeCeremony } from './useFirstArchetypeCeremony';

// Re-export stat helpers so existing callers (perfil page etc) continue working.
export {
  getUnlockedDecks,
  isDeckPlayable,
  getPrecision,
  getPrecisionLabel,
  getConsistency,
  getConsistencyLabel,
} from '@/lib/gameStats';

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
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const { hydrated, conflict, resolveConflict } = useGameStatePersistence(state, dispatch);
  useSocialFeed(state, hydrated);
  const { pending: levelUp, advanceFromVideo, dismiss: dismissLevelUp } = useLevelCeremony(state, hydrated, dispatch);
  const { pending: firstArch, dismiss: dismissFirstArch } = useFirstArchetypeCeremony(state, hydrated, dispatch);

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
    () => {
      const beliefs = state.calibration.beliefs ?? createPriorProfile();
      return matchArchetypes(beliefs).primary.archetype;
    },
    [state.calibration.beliefs],
  );

  // Keep legacy reference compiled until Task 21 deletes matchArchetype.
  void matchArchetype;

  const precision = getPrecision(state.calibration.totalResponses);
  const consistency = getConsistency(state.calibration.beliefs);
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
      <SyncConflictModal
        open={conflict !== null}
        local={conflict?.local ?? null}
        cloud={conflict?.cloud ?? null}
        onResolve={resolveConflict}
      />
      {/* Cerimônia de primeiro arquétipo tem precedência: bloqueia level-up
          até o jogador dismissar. Level-up reabre naturalmente no próximo render. */}
      {firstArch && (
        <FirstArchetypeCeremony
          open={true}
          archetype={firstArch.archetype}
          beliefs={state.calibration.beliefs ?? createPriorProfile()}
          archetypeMatch={firstArch.archetypeMatch}
          onClose={dismissFirstArch}
        />
      )}
      {!firstArch && (
        <>
          <LevelUpVideo
            open={levelUp?.phase === 'video'}
            onComplete={advanceFromVideo}
          />
          {levelUp?.phase === 'modal' && (
            <LevelUpCeremony
              open={true}
              info={levelUp.info}
              beliefs={state.calibration.beliefs ?? createPriorProfile()}
              archetypeMatch={levelUp.archetypeMatch}
              reward={levelUp.reward}
              onClose={dismissLevelUp}
            />
          )}
        </>
      )}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
