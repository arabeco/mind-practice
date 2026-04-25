import type { GameState } from '@/types/game';
import {
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
} from '@/types/game';
import { createPriorProfile } from '@/lib/bayesEngine';

/** Calibração zerada — contrato: prior bayesiano uniforme, sem histórico. */
const INITIAL_CALIBRATION: GameState['calibration'] = {
  beliefs: createPriorProfile(),
  totalResponses: 0,
  toneHistory: [],
  snapshots: [],
};

/**
 * Estado inicial do jogo — única fonte de verdade.
 * Qualquer novo campo obrigatório em GameState precisa ser adicionado aqui.
 */
export const INITIAL_STATE: GameState = {
  calibration: INITIAL_CALIBRATION,
  wallet: { ...INITIAL_WALLET },
  activeDeck: null,
  activeRun: null,
  currentQuestion: 0,
  unlockedDecks: [],
  completedDecks: {},
  lastTrainingDate: null,
  streak: 0,
  lastPlayDate: null,
  campaigns: {},
  ownedDeckIds: [],
  plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
};
