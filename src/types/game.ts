export type StatKey = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
export type QuestionType = 'NORMAL' | 'RANDOM' | 'SOCIAL' | 'TENSION';
export type Ambiente = 'Publico' | 'Privado' | 'Profissional' | 'Digital';
export type Relacao = 'Autoridade' | 'Par' | 'Desconhecido';
export type Aposta = 'Status' | 'Paz Emocional' | 'Dinheiro' | 'Tempo';

export interface SceneMetadata {
  tensao: 1 | 2 | 3 | 4 | 5;
  ambiente: Ambiente;
  relacao: Relacao;
  aposta: Aposta;
}

export interface Slide {
  tipo: 'contexto' | 'evento';
  texto: string;
}

export interface Option {
  text: string;
  meta: string;
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

export interface Deck {
  deckId: string;
  name: string;
  description: string;
  tema: string;
  level: 'leve' | 'medio' | 'extremo';
  questions: Question[];
}

export interface UserStats {
  vigor: number;
  harmonia: number;
  filtro: number;
  presenca: number;
  desapego: number;
}

export interface GameState {
  userStats: UserStats;
  activeDeck: Deck | null;
  currentQuestion: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
}

export interface Archetype {
  name: string;
  axes: [StatKey, StatKey];
  description: string;
}

export const ARCHETYPES: Archetype[] = [
  { name: 'Inabalavel', axes: ['desapego', 'filtro'], description: 'Voce desvia a energia do conflito para o nada. Nada te atinge.' },
  { name: 'Lider Natural', axes: ['presenca', 'filtro'], description: 'Voce domina o espaco com calculo. As pessoas seguem sua direcao.' },
  { name: 'Protetor', axes: ['harmonia', 'vigor'], description: 'Voce age com forca para manter os lacos. Defende os seus.' },
  { name: 'Racional', axes: ['filtro', 'vigor'], description: 'Logica pura move suas decisoes. Voce age com precisao cirurgica.' },
  { name: 'Conciliador', axes: ['harmonia', 'desapego'], description: 'Voce mantem a paz sem se apegar ao resultado. Equilibrio natural.' },
  { name: 'Pragmatico', axes: ['vigor', 'filtro'], description: 'Resultado acima de tudo. Voce faz o que precisa ser feito.' },
  { name: 'Espontaneo', axes: ['vigor', 'desapego'], description: 'Instinto puro. Voce age sem pensar duas vezes.' },
  { name: 'Reservado', axes: ['desapego', 'presenca'], description: 'Voce observa tudo de longe. Seu silencio e sua forca.' },
  { name: 'Diplomata', axes: ['harmonia', 'filtro'], description: 'Voce calcula cada palavra para manter a harmonia. Ninguem percebe sua estrategia.' },
  { name: 'Entusiasta', axes: ['presenca', 'vigor'], description: 'Energia pura. Voce entra e toma conta do espaco.' },
];

export const TIMER_DURATION = 6;

export const INERTIA_PENALTY: Partial<Record<StatKey, number>> = {
  vigor: -15,
  presenca: -15,
};

export const INITIAL_STATS: UserStats = {
  vigor: 0,
  harmonia: 0,
  filtro: 0,
  presenca: 0,
  desapego: 0,
};
