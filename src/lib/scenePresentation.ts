import type { Deck, Question, QuestionType, Ambiente } from '@/types/game';
import { getSceneDelay } from '@/types/game';

export type ScenePhase = 'ready' | 'context' | 'event' | 'delay' | 'options' | 'feedback';
export const OPTIONS_TIME_LIMIT_MS = 12_000;
export type TensionBand = 'leve' | 'media' | 'alta';

export interface PresentationPrefs {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}

export interface ScenePhaseTimings {
  contextMs: number;
  contextSkipMs: number;
  eventMs: number;
  eventSkipMs: number;
  delayMs: number;
  optionStaggerMs: number;
  optionsReadyMs: number;
}

export interface ScenePalette {
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  panelBg: string;
  panelBorder: string;
  textTint: string;
  urgent: string;
}

export interface ScenePresentationProfile {
  key: string;
  palette: ScenePalette;
  ambience: 'publico' | 'privado' | 'profissional' | 'digital' | 'ritual';
  pattern: 'bokeh' | 'cone' | 'grid' | 'scan';
  tierAccent: 'neutral' | 'charged' | 'reticle' | 'gold' | 'ritual';
  panelAlign: 'left' | 'center';
  tensionBand: TensionBand;
  vignetteOpacity: number;
  grainOpacity: number;
  driftDuration: number;
  pulseDuration: number;
  eventScale: number;
  eventShake: number;
  optionStaggerMs: number;
}

interface EnvironmentProfile {
  ambience: ScenePresentationProfile['ambience'];
  pattern: ScenePresentationProfile['pattern'];
  palette: Pick<ScenePalette, 'bgStart' | 'bgEnd' | 'accentSoft' | 'panelBg' | 'panelBorder'>;
  panelAlign: ScenePresentationProfile['panelAlign'];
}

const DEFAULT_PREFS: Omit<PresentationPrefs, 'reducedMotion'> = {
  soundEnabled: false,
  hapticsEnabled: true,
};

const ENVIRONMENT_PROFILES: Record<Ambiente, EnvironmentProfile> = {
  Publico: {
    ambience: 'publico',
    pattern: 'bokeh',
    panelAlign: 'left',
    palette: {
      bgStart: '#08111f',
      bgEnd: '#190d1f',
      accentSoft: 'rgba(96,165,250,0.18)',
      panelBg: 'rgba(7, 16, 30, 0.48)',
      panelBorder: 'rgba(148, 163, 184, 0.18)',
    },
  },
  Privado: {
    ambience: 'privado',
    pattern: 'cone',
    panelAlign: 'left',
    palette: {
      bgStart: '#140910',
      bgEnd: '#040507',
      accentSoft: 'rgba(244,114,182,0.16)',
      panelBg: 'rgba(24, 9, 16, 0.56)',
      panelBorder: 'rgba(244, 114, 182, 0.16)',
    },
  },
  Profissional: {
    ambience: 'profissional',
    pattern: 'grid',
    panelAlign: 'left',
    palette: {
      bgStart: '#071018',
      bgEnd: '#081927',
      accentSoft: 'rgba(125,211,252,0.14)',
      panelBg: 'rgba(8, 25, 39, 0.52)',
      panelBorder: 'rgba(125, 211, 252, 0.14)',
    },
  },
  Digital: {
    ambience: 'digital',
    pattern: 'scan',
    panelAlign: 'center',
    palette: {
      bgStart: '#090817',
      bgEnd: '#04131f',
      accentSoft: 'rgba(34,211,238,0.16)',
      panelBg: 'rgba(7, 12, 24, 0.54)',
      panelBorder: 'rgba(34, 211, 238, 0.18)',
    },
  },
};

const TIER_PALETTES: Record<Deck['tier'], Pick<ScenePalette, 'accent' | 'highlight' | 'textTint' | 'urgent'>> = {
  1: {
    accent: '#e5eef7',
    highlight: '#8ab4ff',
    textTint: 'rgba(255,255,255,0.9)',
    urgent: '#ef4444',
  },
  2: {
    accent: '#8b5cf6',
    highlight: '#c084fc',
    textTint: 'rgba(250,245,255,0.94)',
    urgent: '#ef4444',
  },
  3: {
    accent: '#22d3ee',
    highlight: '#67e8f9',
    textTint: 'rgba(235,255,255,0.94)',
    urgent: '#fb7185',
  },
  4: {
    accent: '#d4af37',
    highlight: '#facc15',
    textTint: 'rgba(255,249,214,0.94)',
    urgent: '#ef4444',
  },
  5: {
    accent: '#d4af37',
    highlight: '#8b5cf6',
    textTint: 'rgba(255,250,236,0.96)',
    urgent: '#f97316',
  },
};

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; className: string }> = {
  NORMAL: {
    label: 'Normal',
    className: 'bg-white/10 text-white/75 border-white/10',
  },
  RANDOM: {
    label: 'Aleatorio',
    className: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/20',
  },
  SOCIAL: {
    label: 'Social',
    className: 'bg-sky-400/20 text-sky-100 border-sky-300/20',
  },
  TENSION: {
    label: 'Alta Tensao',
    className: 'bg-red-500/18 text-red-100 border-red-400/20',
  },
};

export function getDefaultPresentationPrefs(): PresentationPrefs {
  return {
    ...DEFAULT_PREFS,
    reducedMotion: false,
  };
}

export function getTensionBand(tensao: number): TensionBand {
  if (tensao <= 2) return 'leve';
  if (tensao === 3) return 'media';
  return 'alta';
}

export function getScenePhaseTimings(
  question: Question,
  reducedMotion = false,
): ScenePhaseTimings {
  const contextWords = countWords(getSlideText(question, 'contexto'));
  const eventWords = countWords(getSlideText(question, 'evento'));
  const optionStaggerMs = reducedMotion ? 45 : 90;
  const contextMs = clamp(2200 + contextWords * 45, 3000, 6000);
  const eventMs = clamp(1800 + eventWords * 38, 2500, 5000);
  const delayMs = getSceneDelay(question.metadata.tensao);
  const optionsReadyMs = (reducedMotion ? 150 : 220) + optionStaggerMs * 2;

  return {
    contextMs,
    contextSkipMs: 3000,
    eventMs,
    eventSkipMs: 3000,
    delayMs,
    optionStaggerMs,
    optionsReadyMs,
  };
}

export function getScenePresentationProfile(
  deck: Deck,
  question: Question,
  reducedMotion = false,
): ScenePresentationProfile {
  const baseEnvironment = ENVIRONMENT_PROFILES[question.metadata.ambiente];
  const tierPalette = TIER_PALETTES[deck.tier];
  const tensionBand = getTensionBand(question.metadata.tensao);
  const isBook = deck.deckId === 'livro_amaldicoado';
  const isBasic = deck.deckId === 'basic_01';

  const profile: ScenePresentationProfile = {
    key: `${deck.deckId}:${question.metadata.ambiente}:${question.metadata.tensao}:${deck.tier}`,
    palette: {
      ...baseEnvironment.palette,
      ...tierPalette,
    },
    ambience: isBook ? 'ritual' : baseEnvironment.ambience,
    pattern: isBook ? 'cone' : baseEnvironment.pattern,
    tierAccent: getTierAccent(deck.tier),
    panelAlign: isBook ? 'center' : baseEnvironment.panelAlign,
    tensionBand,
    vignetteOpacity: question.metadata.tensao >= 4 ? 0.72 : question.metadata.tensao === 3 ? 0.58 : 0.42,
    grainOpacity: isBook ? 0.11 : question.metadata.tensao >= 4 ? 0.08 : 0.05,
    driftDuration: reducedMotion ? 0 : question.metadata.tensao >= 4 ? 8 : question.metadata.tensao === 3 ? 11 : 15,
    pulseDuration: reducedMotion ? 0 : question.metadata.tensao >= 4 ? 2.8 : question.metadata.tensao === 3 ? 4.4 : 6.8,
    eventScale: reducedMotion ? 1.02 : question.metadata.tensao >= 4 ? 1.045 : 1.025,
    eventShake: reducedMotion ? 0 : question.metadata.tensao >= 4 ? 14 : question.metadata.tensao === 3 ? 8 : 0,
    optionStaggerMs: reducedMotion ? 45 : 90,
  };

  if (isBasic) {
    profile.palette = {
      ...profile.palette,
      bgStart: '#081018',
      bgEnd: '#121625',
      panelBg: 'rgba(8, 16, 24, 0.48)',
      panelBorder: 'rgba(255, 255, 255, 0.1)',
      accentSoft: 'rgba(148, 163, 184, 0.12)',
    };
    profile.vignetteOpacity = Math.max(0.34, profile.vignetteOpacity - 0.08);
    profile.grainOpacity = 0.04;
  }

  if (isBook) {
    profile.palette = {
      ...profile.palette,
      bgStart: '#060307',
      bgEnd: '#150914',
      accent: '#d4af37',
      accentSoft: 'rgba(212, 175, 55, 0.14)',
      highlight: '#8b5cf6',
      panelBg: 'rgba(18, 8, 14, 0.6)',
      panelBorder: 'rgba(212, 175, 55, 0.18)',
      textTint: 'rgba(255,244,220,0.96)',
      urgent: '#f97316',
    };
    profile.vignetteOpacity = 0.8;
    profile.grainOpacity = 0.12;
    profile.eventScale = reducedMotion ? 1.03 : 1.055;
    profile.eventShake = reducedMotion ? 0 : 16;
  }

  return profile;
}

function getTierAccent(tier: Deck['tier']): ScenePresentationProfile['tierAccent'] {
  if (tier === 2) return 'charged';
  if (tier === 3) return 'reticle';
  if (tier === 4) return 'gold';
  if (tier === 5) return 'ritual';
  return 'neutral';
}

function getSlideText(question: Question, tipo: 'contexto' | 'evento'): string {
  return question.slides.find(slide => slide.tipo === tipo)?.texto ?? '';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
