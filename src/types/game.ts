import { createPriorProfile } from '@/lib/bayesEngine';

// Re-exports do motor bayesiano (fonte única da verdade para AxisBelief etc.)
export type {
  AxisBelief,
  PlayerBeliefs,
  AxisEvidence,
  OptionEvidence,
} from '@/lib/bayesEngine/types';

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

export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'campanha';

export const RARITY_ORDER: Rarity[] = ['comum', 'raro', 'epico', 'lendario', 'campanha'];

/** Preco default em fichas por raridade. Pode ser sobrescrito por deck (campanha especial grátis, etc). */
export const RARITY_DEFAULT_PRICE: Record<Rarity, number> = {
  comum: 60,
  raro: 150,
  epico: 350,
  lendario: 800,
  campanha: 100,
};

export type ArchetypeCategory = 'puro' | 'cruzado' | 'especial';
export type SceneProximidade = 'baixa' | 'media' | 'alta';
export type SceneUrgencia = 'baixa' | 'media' | 'alta';
export type AnswerIntensity = 'alta' | 'media' | 'baixa';

/** Intensity multiplier applied on top of weights.
 *  alta = "com certeza" (player owns it)
 *  media = "é isso" (normal)
 *  baixa = "isso mas depende" (qualified)
 */
export const INTENSITY_MULTIPLIERS: Record<AnswerIntensity, number> = {
  alta: 1.35,
  media: 1.0,
  baixa: 0.6,
};

export const INTENSITY_LABELS: Record<AnswerIntensity, string> = {
  alta: 'Com certeza',
  media: 'É isso',
  baixa: 'Mais ou menos',
};

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

/**
 * Tipos de slide de uma pergunta. Renderizados em ordem (ambiente → ator
 * → contexto → evento) pra construir imersão antes do dilema.
 * - `ambiente`: onde + quando + corpo/estado (sensorial)
 * - `ator`: quem é a outra pessoa, com textura visual
 * - `contexto`: setup adicional (legado — antigos decks usavam só esse)
 * - `evento`: ação que dispara o dilema (sempre obrigatório)
 */
export interface Slide {
  tipo: 'ambiente' | 'ator' | 'contexto' | 'evento';
  texto: string;
}

export interface Option {
  text: string;
  subtext: string;
  tone: Tone;

  /**
   * Evidência bayesiana declarada nesta opção. Fonte de verdade pra `beliefs`.
   * Quem escolhe esta opção é evidência sobre θ em cada eixo declarado.
   */
  evidence?: import('@/lib/bayesEngine/types').OptionEvidence;

  feedback: string;
  /**
   * Post-decision narrative beat. Usado principalmente em campanha,
   * onde a pessoa fica olhando essa tela até a próxima cena destravar (até 24h).
   *
   * Convenção: 2-4 frases que **(a)** mostram consequência imediata e
   * **(b)** antecipam/ancoram a próxima cena — mudança de lugar, clima,
   * quem vai estar lá. Funciona como ponte narrativa.
   *
   * Ex: "Você sai batendo a porta. Amanhã, a Juliana vai estar na sala
   *      de reunião com o chefe. E o chefe já sabe o que aconteceu."
   *
   * Se não definido, cai pro `feedback` (1 frase curta, suficiente
   * pra cenários normais).
   */
  aftermath?: string;
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
  /** If equal to `currentSceneId`, bypasses the daily cooldown (paid skip).
   *  Cleared automatically when the next CAMPAIGN_ANSWER is dispatched. */
  pendingSkipSceneId?: string | null;
  /** ISO timestamp de quando o jogador viu a cerimonia de Season Finale.
   *  Null = ainda nao viu. Set uma vez via MARK_SEASON_FINALE_SEEN. */
  finaleSeenAt?: string | null;
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
  /** Raridade do deck no sistema de season. Afeta UI (cor/glow), preço e gating. */
  rarity: Rarity;
  /** ID da season a qual o deck pertence. Ex: 'season-0', 'season-1'. */
  seasonId: string;
  /** Preço em fichas para desbloquear avulso. `null` = gratuito (calibragem, promocionais). */
  priceFichas: number | null;
  /** Se true, só acessível via assinatura Plus (sem compra avulsa). Default: false. */
  plusOnly?: boolean;

  /** Se true, runs deste deck NÃO persistem no perfil bayesiano. */
  isTraining?: boolean;
  /** Eixo-foco do deck de treino (validado: ≥60% das options devem declarar evidência nesse eixo). */
  trainingTarget?: StatKey;

  /**
   * Gênero sugerido do protagonista nas cenas deste deck.
   * Usado pra filtrar decks com situações gendered (ex: flerte) pra usuários
   * com identidade compatível. Omitido → deck aparece pra todo mundo.
   */
  protagonistGender?: 'M' | 'F';
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
  /** Distribuições bayesianas por eixo. Fonte única da verdade pro perfil. */
  beliefs: import('@/lib/bayesEngine/types').PlayerBeliefs;
  totalResponses: number;
  toneHistory: Tone[];
  snapshots: DeckSnapshot[];
}

export interface RunAnswerEvent {
  questionId: string;
  tone: Tone | null;
  /** Evidência bayesiana aplicada nesta resposta. Único formato pós-Fase 4. */
  evidence?: import('@/lib/bayesEngine/types').OptionEvidence;
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
  /** Respostas detalhadas — usadas pelo RunReportCard pra surface evidence per-answer. */
  answers: RunAnswerEvent[];
  legacy: boolean;
}

export interface Wallet {
  fichas: number;
  lastDailyClaim: string | null; // ISO date string e.g. '2026-04-05'
  totalEarned: number;
  totalSpent: number;
  /** Number of runs that have paid the piso today (resets at date change). */
  runsPaidToday?: number;
  /** Local date ('YYYY-MM-DD') that `runsPaidToday` refers to. */
  runsPaidDate?: string | null;
}

export const INITIAL_WALLET: Wallet = {
  fichas: 20,
  lastDailyClaim: null,
  totalEarned: 20,
  totalSpent: 0,
  runsPaidToday: 0,
  runsPaidDate: null,
};

// ============================================================
// Economia v2 — "começo generoso, parede escassa" (viral + lucro)
// Diário simples: 10/dia (login) + 50 no streak de 5 dias = ~20/dia em regime.
// Onboarding generoso via DECK_FIRST_TIME_BONUS (1ª semana rende forte → arquétipo).
// SEM grind por run (piso/1ª-do-dia/sem-timeout = 0) → mata farm infinito.
// ============================================================

/** Fichas ao logar pela 1a vez no dia. */
export const DAILY_FICHAS = 10;

/** Bonus ao completar o streak de login. */
export const DAILY_STREAK_BONUS_FICHAS = 50;

/** Tamanho da streak (em dias) que dispara o bonus. */
export const DAILY_STREAK_LENGTH = 5;

// Ficha economy — fonts/sinks.
export const RUN_PISO_FICHAS = 0;             // v2: sem grind por run
export const RUN_PISO_CAP_PER_DAY = 5;
export const FIRST_RUN_OF_DAY_BONUS = 0;      // v2: diário vem do CLAIM_DAILY
export const STREAK_7_BONUS = 0;              // v2: streak consolidada no login
export const DECK_FIRST_TIME_BONUS = 25;      // onboarding generoso (1ª vez por deck)
export const NO_TIMEOUT_RUN_BONUS = 0;        // v2: sem bonus por run
export const CAMPAIGN_ENDING_BONUS = 40;      // payoff narrativo (mantido)
export const FRIEND_ACCEPT_BONUS = 5;
export const SKIP_COOLDOWN_COST = 10;
export const PLUS_DAILY_BONUS = 10;           // NOVO — claim diario Plus

export interface PlusSubscription {
  active: boolean;
  /** ISO timestamp de quando começou (null se nunca teve). */
  startedAt: string | null;
  /** ISO timestamp da próxima renovação / expiração. null se active=false. */
  expiresAt: string | null;
  /** ISO yyyy-mm-dd do último claim diário do bônus Plus. null se nunca claimou. */
  lastPlusDailyClaim: string | null;
}

export const INITIAL_PLUS_SUBSCRIPTION: PlusSubscription = {
  active: false,
  startedAt: null,
  expiresAt: null,
  lastPlusDailyClaim: null,
};

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
  /** Decks desbloqueados via compra (SPEND_FICHAS ou bundle). Persistentes mesmo após cancelar Plus. */
  ownedDeckIds: string[];
  /** Estado da assinatura Plus do usuário. */
  plusSubscription: PlusSubscription;
  /** Maior nivel de perfil ja visto pelo jogador. Usado pra disparar a tela cerimonial em level-up. */
  lastSeenLevel: number;
  /** ISO timestamp da primeira vez que archetypeDisplayState virou "firm". Null = ainda nao aconteceu. */
  firstFirmArchetypeSeenAt: string | null;
  /** ID do ultimo arquetipo "firme" visto pelo jogador. Usado pra detectar evolucoes (mudanca de arquetipo). */
  lastFirmArchetypeId: string | null;
  /** Data ISO (YYYY-MM-DD local) do ultimo claim de fichas diarias. Null = nunca clamou. */
  dailyLoginClaimedAt: string | null;
  /** Streak de logins consecutivos. Quebra se pular um dia. */
  loginStreak: number;
  /** Achievements destrancados: { achievementId: ISO timestamp do unlock }. */
  achievements: Record<string, string>;
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

// AXIS_POLES, AXIS_POLE_SLUGS e pickPoleSlug agora vivem em '@/lib/axisPoles'.

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
  beliefs: createPriorProfile(),
  totalResponses: 0,
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
