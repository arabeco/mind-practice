'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
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
import ArchetypeEvolutionCeremony from '@/components/ArchetypeEvolutionCeremony';
import SeasonFinaleCeremony from '@/components/SeasonFinaleCeremony';
import { useSocialFeed } from './useSocialFeed';
import { useGameStatePersistence } from './useGameStatePersistence';
import { useLevelCeremony } from './useLevelCeremony';
import { useFirstArchetypeCeremony } from './useFirstArchetypeCeremony';
import { useArchetypeEvolution } from './useArchetypeEvolution';
import { useSeasonFinale } from './useSeasonFinale';
import { useLeaderboardSync } from './useLeaderboardSync';
import { checkAchievements } from '@/lib/achievementChecks';

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
  useLeaderboardSync(state, hydrated);
  const { pending: levelUp, advanceFromVideo, dismiss: dismissLevelUp } = useLevelCeremony(state, hydrated, dispatch);
  const { pending: firstArch, dismiss: dismissFirstArch } = useFirstArchetypeCeremony(state, hydrated, dispatch);
  const { pending: evolution, dismiss: dismissEvolution } = useArchetypeEvolution(state, hydrated, dispatch);
  const { pending: seasonFinale, dismiss: dismissSeasonFinale } = useSeasonFinale(state, hydrated, dispatch);

  // Avaliacao automatica de achievements — dispara unlocks idempotente
  // sempre que o estado relevante muda (runs, respostas, decks completados).
  const lastAchievementCheck = useRef<string>('');
  useEffect(() => {
    if (!hydrated) return;
    const snaps = state.calibration?.snapshots?.length ?? 0;
    const resp = state.calibration?.totalResponses ?? 0;
    const completed = state.completedDecks ? Object.keys(state.completedDecks).length : 0;
    const achs = state.achievements ? Object.keys(state.achievements).length : 0;
    const sig = `${snaps}|${resp}|${completed}|${achs}`;
    if (sig === lastAchievementCheck.current) return;
    lastAchievementCheck.current = sig;
    // Garante state minimo pra check rodar sem crash
    const safeState = {
      ...state,
      achievements: state.achievements ?? {},
      completedDecks: state.completedDecks ?? {},
    };
    const newUnlocks = checkAchievements(safeState);
    for (const u of newUnlocks) {
      dispatch({ type: 'UNLOCK_ACHIEVEMENT', achievementId: u.id, rewardFichas: u.rewardFichas });
    }
  }, [
    hydrated,
    state.calibration?.snapshots?.length,
    state.calibration?.totalResponses,
    state.completedDecks,
    state.achievements,
    state,
  ]);

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
      {/* Precedência cerimônias: firstArch > evolution > levelUp.
          Cada uma bloqueia as seguintes até dismiss. */}
      {firstArch && (
        <FirstArchetypeCeremony
          open={true}
          archetype={firstArch.archetype}
          beliefs={state.calibration.beliefs ?? createPriorProfile()}
          archetypeMatch={firstArch.archetypeMatch}
          onClose={dismissFirstArch}
        />
      )}
      {!firstArch && evolution && (
        <ArchetypeEvolutionCeremony
          open={true}
          fromArchetype={evolution.fromArchetype}
          toArchetype={evolution.toArchetype}
          beliefs={state.calibration.beliefs ?? createPriorProfile()}
          archetypeMatch={evolution.archetypeMatch}
          onClose={dismissEvolution}
        />
      )}
      {!firstArch && !evolution && seasonFinale && (
        <SeasonFinaleCeremony
          open={true}
          season={seasonFinale.season}
          ending={seasonFinale.ending}
          archetypeMatch={seasonFinale.archetypeMatch}
          answerCount={seasonFinale.answerCount}
          decksCompletedInSeason={seasonFinale.decksCompletedInSeason}
          onClose={dismissSeasonFinale}
        />
      )}
      {!firstArch && !evolution && !seasonFinale && (
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
