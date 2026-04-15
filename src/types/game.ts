// ============================================================
// Core types
// ============================================================

export type StatKey = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
export type QuestionType = 'NORMAL' | 'RANDOM' | 'SOCIAL' | 'TENSION';
export type Ambiente = 'Publico' | 'Privado' | 'Profissional' | 'Digital';
export type Relacao = 'Autoridade' | 'Par' | 'Desconhecido';
export type Aposta = 'Status' | 'Paz Emocional' | 'Dinheiro' | 'Tempo';
export type Pilar = 'ego' | 'propriedade' | 'seguranca';
export type Tone = 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';
export type DeckCategory = 'calibragem' | 'eixo' | 'cenario' | 'campanha';
export type ArchetypeCategory = 'puro' | 'cruzado' | 'especial';
export type SceneProximidade = 'baixa' | 'media' | 'alta';
export type SceneUrgencia = 'baixa' | 'media' | 'alta';

// ============================================================
// Scene / Question
// ============================================================

export interface SceneMetadata {
  tensao: 1 | 2 | 3 | 4 | 5;
  ambiente: Ambiente;
  relacao: Relacao;
  aposta: Aposta;
  pilar: Pilar;
  papel?: string;
  proximidade?: SceneProximidade;
  historico?: string;
  canal?: string;
  plateia?: string;
  momento?: string;
  intencaoDoOutro?: string;
  assimetria?: string;
  riscoPrincipal?: string;
  urgencia?: SceneUrgencia;
}

export interface Slide {
  tipo: 'contexto' | 'evento';
  texto: string;
}

export interface Option {
  text: string;
  subtext: string;
  tone: Tone;
  weights: Partial<Record<StatKey, number>>;
  feedback: string;
  /** Campaign only: id of the next scene to load after this choice.
   *  If omitted and `endingId` also omitted in a campaign, deck is treated linear (next in list). */
  nextSceneId?: string;
  /** Campaign only: id of the ending this choice resolves to.
   *  Marks a terminal option in the narrative graph. */
  endingId?: string;
}

// ============================================================
// Campaign / Season
// ============================================================

export interface CampaignEnding {
  id: string;
  title: string;
  tagline: string;
  description: string;
  /** Optional dominant-trait hint that inspired the ending. */
  flavor?: string;
}

export interface CampaignScenePath {
  sceneId: string;
  optionIndex: number;
  answeredAt: string; // ISO
}

export interface CampaignProgress {
  deckId: string;
  seasonId: string;
  startedAt: string;           // ISO
  lastAnsweredAt: string | null; // ISO — gates the 00:00 unlock
  currentSceneId: string;      // next scene to play
  path: CampaignScenePath[];
  endingId: string | null;     // set when campaign finishes
  rating: number | null;       // 1..5
  completedAt: string | null;  // ISO when ending reached
}

export interface Question {
  id: string;
  type: QuestionType;
  sceneHook?: string;
  metadata: SceneMetadata;
  slides: Slide[];
  options: Option[];
}

// ============================================================
// Deck
// ============================================================

export interface Deck {
  deckId: string;
  name: string;
  description: string;
  tema: string;
  category: DeckCategory;
  focusAxis?: StatKey;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  difficulty: 1 | 2 | 3 | 4 | 5;
  coverImage?: string;
  /** Optional presentation format. "quick" skips the 3-phase ritual for fast calibration decks. */
  format?: 'quick';
  questions: Question[];
  /** Campaign only: id of the opening scene. Required when category === 'campanha'. */
  startSceneId?: string;
  /** Campaign only: all possible endings the narrative graph can resolve to. */
  endings?: CampaignEnding[];
}

// ============================================================
// Archetype
// ============================================================

export interface Archetype {
  id: string;
  name: string;
  category: ArchetypeCategory;
  axes: StatKey[] | 'equilibrio';
  idealProfile: Record<StatKey, number>;
  description: string;
  tagline: string;
}

// ============================================================
// Calibration State (replaces old UserStats/GameState)
// ============================================================

export interface CalibrationState {
  axes: Record<StatKey, number>;
  totalResponses: number;
  recentWeights: Record<StatKey, number[]>;
  toneHistory: Tone[];
  snapshots: DeckSnapshot[];
}

export interface RunAnswerEvent {
  questionId: string;
  tone: Tone | null;
  weights: Partial<Record<StatKey, number>>;
  dominantAxis: StatKey | null;
  responseTimeMs?: number;
  timedOut: boolean;
}

export interface RunScoreBreakdown {
  completion: number;
  decisiveness: number;
  coherence: number;
}

export interface RunSession {
  deckId: string;
  startedAt: string;
  totalQuestions: number;
  startStats: Record<StatKey, number>;
  startArchetype: string;
  answeredCount: number;
  timeoutCount: number;
  answers: RunAnswerEvent[];
}

export interface DeckSnapshot {
  deckId: string;
  completedAt: string;
  archetypeBeforeRun: string | null;
  archetypeAtCompletion: string;
  archetypeChanged: boolean;
  statsAtCompletion: Record<StatKey, number>;
  runScore: number | null;
  scoreBreakdown: RunScoreBreakdown | null;
  answeredCount: number;
  timeoutCount: number;
  dominantAxis: StatKey | null;
  axisDelta: Record<StatKey, number>;
  profileShift: number;
  focusAlignment: number | null;
  legacy: boolean;
}

export interface Wallet {
  fichas: number;
  lastDailyClaim: string | null; // ISO date string e.g. '2026-04-05'
  totalEarned: number;
  totalSpent: number;
}

export const INITIAL_WALLET: Wallet = {
  fichas: 20,
  lastDailyClaim: null,
  totalEarned: 20,
  totalSpent: 0,
};

export const DAILY_FICHAS = 10;

export interface GameState {
  calibration: CalibrationState;
  wallet: Wallet;
  activeDeck: Deck | null;
  activeRun: RunSession | null;
  currentQuestion: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
  streak: number;
  lastPlayDate: string | null;
  /** Persisted campaign progress — keyed by seasonId. */
  campaigns: Record<string, CampaignProgress>;
}

// ============================================================
// Constants
// ============================================================

export const STAT_KEYS: StatKey[] = ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'];

export const STAT_COLORS: Record<StatKey, string> = {
  vigor: '#ef4444',
  harmonia: '#10b981',
  filtro: '#8b5cf6',
  presenca: '#d4af37',
  desapego: '#60a5fa',
};

export const STAT_LABELS: Record<StatKey, string> = {
  vigor: 'Vigor',
  harmonia: 'Harmonia',
  filtro: 'Filtro',
  presenca: 'Presenca',
  desapego: 'Desapego',
};

// ============================================================
// Tier System
// ============================================================

export type TierLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TierConfig {
  label: string;
  subtitle: string;
  color: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  cardShadow: string;
  animated: boolean;
}

export const TIER_CONFIG: Record<TierLevel, TierConfig> = {
  1: {
    label: 'Comum',
    subtitle: 'Calibragem basica',
    color: '#cd7f32',
    badgeClass: 'border border-[#cd7f32]/30 bg-[#cd7f32]/12 text-[#cd7f32]',
    cardBorderClass: 'border-[#cd7f32]/20',
    cardBgClass: 'bg-white/[0.06]',
    cardShadow: 'none',
    animated: false,
  },
  2: {
    label: 'Incomum',
    subtitle: 'Alta tensao',
    color: '#c0c0c0',
    badgeClass: 'border border-[#c0c0c0]/30 bg-[#c0c0c0]/12 text-[#c0c0c0]',
    cardBorderClass: 'border-[#c0c0c0]/25',
    cardBgClass: 'bg-white/[0.065]',
    cardShadow: '0 0 16px rgba(192,192,192,0.1)',
    animated: false,
  },
  3: {
    label: 'Raro',
    subtitle: 'Treino de eixo',
    color: '#d4af37',
    badgeClass: 'border border-[#d4af37]/30 bg-[#d4af37]/12 text-[#d4af37]',
    cardBorderClass: 'border-[#d4af37]/28',
    cardBgClass: 'bg-white/[0.065]',
    cardShadow: '0 0 18px rgba(212,175,55,0.14)',
    animated: false,
  },
  4: {
    label: 'Epico',
    subtitle: 'Desafio',
    color: '#3b82f6',
    badgeClass: 'border border-[#3b82f6]/30 bg-[#3b82f6]/12 text-[#3b82f6]',
    cardBorderClass: 'border-[#3b82f6]/28',
    cardBgClass: 'bg-white/[0.07]',
    cardShadow: '0 0 22px rgba(59,130,246,0.16)',
    animated: false,
  },
  5: {
    label: 'Lendario',
    subtitle: 'Lenda',
    color: '#f97316',
    badgeClass: 'border border-[#f97316]/30 bg-[#f97316]/12 text-[#f97316]',
    cardBorderClass: 'border-transparent',
    cardBgClass: 'bg-white/[0.09]',
    cardShadow: '0 0 28px rgba(249,115,22,0.18)',
    animated: true,
  },
  6: {
    label: 'Temporada',
    subtitle: 'Season',
    color: '#8b5cf6',
    badgeClass: 'border border-[#8b5cf6]/30 bg-[#8b5cf6]/12 text-[#8b5cf6]',
    cardBorderClass: 'border-transparent',
    cardBgClass: 'bg-white/[0.09]',
    cardShadow: '0 0 28px rgba(139,92,246,0.18)',
    animated: true,
  },
};

export const CALIBRATION_WINDOW = 200;
export const CONSISTENCY_WINDOW = 20;
export const HOLD_DURATION_MS = 500;

export const INITIAL_CALIBRATION: CalibrationState = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
};

export const EMPTY_STAT_RECORD: Record<StatKey, number> = {
  vigor: 0,
  harmonia: 0,
  filtro: 0,
  presenca: 0,
  desapego: 0,
};

/** Delay in ms before options appear, based on scene tension */
export function getSceneDelay(tensao: number): number {
  if (tensao <= 2) return 500;
  if (tensao === 3) return 1000;
  return 1500;
}
