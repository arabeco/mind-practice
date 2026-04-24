import type { GameState } from '@/types/game';
import {
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
} from '@/types/game';

/** Calibração zerada — contrato: todos os eixos em 0, sem histórico. */
const INITIAL_CALIBRATION: GameState['calibration'] = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
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
