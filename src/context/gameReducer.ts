/**
 * gameReducer — função pura extraída de GameContext.tsx.
 *
 * Zero IO: nada de fetch, localStorage, supabase, useState, dispatch aqui.
 * Recebe `state + action`, devolve `state'`. Testável sem React.
 */
import {
  type GameState,
  type StatKey,
  type Tone,
  type Deck,
  type AnswerIntensity,
  type Option,
  STAT_KEYS,
  INITIAL_CALIBRATION,
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
  DAILY_FICHAS,
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
import { matchArchetypes } from '@/lib/bayesEngine';
import {
  appendRunAnswer,
  createDeckSnapshot,
  createRunSession,
  normalizeGameState,
} from '@/lib/runScoring';
import {
  recordAnswer,
  getUnlockedDecks,
  CALIBRAGEM_IDS,
  CALIBRAGEM_COMPLETION_FICHAS,
} from '@/lib/gameStats';
import { getLevelReward } from '@/lib/playerLevel';
import { playerMean } from '@/lib/bayesEngine';
import {
  DEFAULT_CONFIG,
  createPriorProfile,
  updateProfile,
} from '@/lib/bayesEngine';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type GameAction =
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
      tone: Tone;
      evidence?: import('@/lib/bayesEngine/types').OptionEvidence;
    }
  | { type: 'CAMPAIGN_RATE'; seasonId: string; rating: number }
  | { type: 'SKIP_CAMPAIGN_COOLDOWN'; seasonId: string }
  | { type: 'UNLOCK_DECK'; deckId: string; cost: number }
  | { type: 'SET_PLUS_STATUS'; active: boolean; expiresAt: string | null; startedAt?: string }
  | { type: 'CLAIM_DAILY_PLUS_BONUS' }
  | { type: 'MARK_LEVEL_SEEN'; level: number }
  | { type: 'MARK_FIRST_ARCHETYPE_SEEN' };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialState: GameState = {
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
  lastSeenLevel: 1,
  firstFirmArchetypeSeenAt: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_DECK': {
      const startBeliefs = state.calibration.beliefs ?? createPriorProfile();
      const startArchetype = matchArchetypes(startBeliefs).primary.archetype;
      // Snapshot legado pra runScoring delta tracking — derivado do mean recentered.
      const startStats = STAT_KEYS.reduce<Record<StatKey, number>>((acc, k) => {
        acc[k] = (playerMean(startBeliefs[k]) - 0.5) * 2;
        return acc;
      }, { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 });
      return {
        ...state,
        activeDeck: action.deck,
        activeRun: createRunSession(action.deck, startStats, startArchetype.name),
        currentQuestion: 0,
      };
    }

    case 'ANSWER': {
      const question = state.activeDeck?.questions[state.currentQuestion];
      if (!question) return state;

      const isTraining = state.activeDeck?.isTraining === true;

      // Training decks: activeRun avança mas perfil global (beliefs +
      // totalResponses + toneHistory) fica intocado.
      const baseCalibration = isTraining
        ? state.calibration
        : recordAnswer(state.calibration, action.option.tone);

      const evidence = action.option.evidence;
      const nextBeliefs = (!isTraining && evidence)
        ? updateProfile(
            baseCalibration.beliefs ?? createPriorProfile(),
            evidence,
            DEFAULT_CONFIG,
            new Date(),
          )
        : (baseCalibration.beliefs ?? createPriorProfile());

      return {
        ...state,
        calibration: {
          ...baseCalibration,
          beliefs: nextBeliefs,
        },
        activeRun: state.activeRun
          ? appendRunAnswer(
              state.activeRun,
              question.id,
              action.option.tone,
              action.option.evidence,
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

      const finishBeliefs = state.calibration.beliefs ?? createPriorProfile();
      const archetype = matchArchetypes(finishBeliefs).primary.archetype;
      // prevArchId/ARCHETYPES retained for hysteresis logic — re-introduced in Task 21 cleanup.
      void ARCHETYPES;
      void matchArchetype;
      // Snapshot finalStats: derive from beliefs mean recentered to [-1, +1].
      const finalStats = STAT_KEYS.reduce<Record<StatKey, number>>((acc, k) => {
        acc[k] = (playerMean(finishBeliefs[k]) - 0.5) * 2;
        return acc;
      }, { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 });
      const snapshot = state.activeRun
        ? createDeckSnapshot({
            session: state.activeRun,
            archetypeName: archetype.name,
            finalStats,
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

    case 'HYDRATE': {
      // normalizeGameState ja aplica defaults pra ownedDeckIds/plusSubscription
      // (migracao silenciosa de saves antigos). Fonte unica de coercao.
      // PersistedGameState omite activeDeck/activeRun (transientes) — recompoe.
      const normalized = normalizeGameState(action.state) as unknown as Omit<
        GameState,
        'activeDeck' | 'activeRun'
      >;
      return {
        ...normalized,
        activeDeck: null,
        activeRun: null,
        unlockedDecks: getUnlockedDecks(action.state.completedDecks),
      };
    }

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
      const baseCalibration = recordAnswer(state.calibration, action.tone);

      const campaignNextBeliefs = action.evidence
        ? updateProfile(
            baseCalibration.beliefs ?? createPriorProfile(),
            action.evidence,
            DEFAULT_CONFIG,
            new Date(),
          )
        : (baseCalibration.beliefs ?? createPriorProfile());

      const newCalibration = {
        ...baseCalibration,
        beliefs: campaignNextBeliefs,
      };

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

    case 'MARK_FIRST_ARCHETYPE_SEEN': {
      // Idempotente: so seta uma vez. Garante que cerimonia nao reabre.
      if (state.firstFirmArchetypeSeenAt) return state;
      return { ...state, firstFirmArchetypeSeenAt: new Date().toISOString() };
    }

    case 'MARK_LEVEL_SEEN': {
      // Idempotente: so sobe (nunca rebaixa). Garante que ceremony nao reabre.
      if (action.level <= state.lastSeenLevel) return state;
      // Soma fichas pra cada nivel intermediario que foi atingido (caso o
      // jogador tenha pulado mais de um nivel entre dois saves).
      let reward = 0;
      for (let lvl = state.lastSeenLevel + 1; lvl <= action.level; lvl++) {
        reward += getLevelReward(lvl);
      }
      return {
        ...state,
        lastSeenLevel: action.level,
        wallet: reward > 0
          ? {
              ...state.wallet,
              fichas: state.wallet.fichas + reward,
              totalEarned: state.wallet.totalEarned + reward,
            }
          : state.wallet,
      };
    }

    default:
      return state;
  }
}
