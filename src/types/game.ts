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
export type DeckCategory = 'essencial' | 'arquetipo' | 'cenario';
export type ArchetypeCategory = 'puro' | 'cruzado' | 'especial';

// ============================================================
// Scene / Question
// ============================================================

export interface SceneMetadata {
  tensao: 1 | 2 | 3 | 4 | 5;
  ambiente: Ambiente;
  relacao: Relacao;
  aposta: Aposta;
  pilar: Pilar;
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
}

export interface Question {
  id: string;
  type: QuestionType;
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
  tier: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questions: Question[];
}

// ============================================================
// Archetype
// ============================================================

export interface Archetype {
  id: string;
  name: string;
  category: ArchetypeCategory;
  axes: StatKey[] | 'equilibrio';
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

export interface DeckSnapshot {
  deckId: string;
  completedAt: string;
  archetypeAtCompletion: string;
  statsAtCompletion: Record<StatKey, number>;
}

export interface GameState {
  calibration: CalibrationState;
  activeDeck: Deck | null;
  currentQuestion: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
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

export type TierLevel = 1 | 2 | 3 | 4 | 5;

export interface TierConfig {
  label: string;
  subtitle: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  cardShadow: string;
  /** Tier 5 only — animated gradient border */
  animated: boolean;
}

export const TIER_CONFIG: Record<TierLevel, TierConfig> = {
  1: {
    label: 'Zinco',
    subtitle: 'Calibragem basica',
    badgeClass: 'bg-white/10 text-white/60',
    cardBorderClass: 'border-white/10',
    cardBgClass: 'bg-white/5',
    cardShadow: 'none',
    animated: false,
  },
  2: {
    label: 'Cromo',
    subtitle: 'Alta tensao',
    badgeClass: 'bg-purple-500/20 text-purple-400',
    cardBorderClass: 'border-purple-500/30',
    cardBgClass: 'bg-purple-900/10',
    cardShadow: '0 0 15px rgba(139,92,246,0.1)',
    animated: false,
  },
  3: {
    label: 'Dominio',
    subtitle: 'Treino de eixo',
    badgeClass: 'bg-cyan-400/20 text-cyan-400',
    cardBorderClass: 'border-cyan-400/40',
    cardBgClass: 'bg-cyan-900/10',
    cardShadow: 'none',
    animated: false,
  },
  4: {
    label: 'Gold',
    subtitle: 'Desafio',
    badgeClass: 'bg-yellow-500/20 text-yellow-500',
    cardBorderClass: 'border-yellow-500/50',
    cardBgClass: 'bg-yellow-600/5',
    cardShadow: '0 0 20px rgba(212,175,55,0.2)',
    animated: false,
  },
  5: {
    label: 'Lendario',
    subtitle: 'Season',
    badgeClass: 'bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-white',
    cardBorderClass: 'border-transparent',
    cardBgClass: 'bg-white/8',
    cardShadow: 'none',
    animated: true,
  },
};

export const TIMER_DURATION = 6;

export const INERTIA_PENALTY: Partial<Record<StatKey, number>> = {
  vigor: -15,
  presenca: -15,
};

export const CALIBRATION_WINDOW = 200;
export const CONSISTENCY_WINDOW = 20;
export const HOLD_DURATION_MS = 1000;

export const INITIAL_CALIBRATION: CalibrationState = {
  axes: { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 },
  totalResponses: 0,
  recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
  toneHistory: [],
  snapshots: [],
};

/** Delay in ms before options appear, based on scene tension */
export function getSceneDelay(tensao: number): number {
  if (tensao <= 2) return 500;
  if (tensao === 3) return 1000;
  return 1500;
}
