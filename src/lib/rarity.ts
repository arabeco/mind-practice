// ============================================================================
// Rarity helpers — cor, label e preço default.
// Mapeia Rarity pra tokens visuais consumidos por componentes de card/badge.
// ============================================================================

import type { Rarity } from '@/types/game';

export interface RarityVisual {
  /** Cor principal Tailwind v4 (referenciada em classes dinâmicas — usar cn()). */
  borderClass: string;
  textClass: string;
  bgGlowClass: string;
  /** Hex pra SVGs e drop-shadows inline (não-Tailwind). */
  hex: string;
  /** Label legível em PT-BR. */
  label: string;
}

export const RARITY_VISUALS: Record<Rarity, RarityVisual> = {
  comum: {
    borderClass: 'border-slate-300/60',
    textClass: 'text-slate-200',
    bgGlowClass: 'shadow-none',
    hex: '#cbd5e1',
    label: 'Comum',
  },
  raro: {
    borderClass: 'border-sky-400/70',
    textClass: 'text-sky-200',
    bgGlowClass: 'shadow-[0_0_16px_rgba(56,189,248,0.35)]',
    hex: '#38bdf8',
    label: 'Raro',
  },
  epico: {
    borderClass: 'border-violet-500/80',
    textClass: 'text-violet-200',
    bgGlowClass: 'shadow-[0_0_22px_rgba(139,92,246,0.45)]',
    hex: '#8b5cf6',
    label: 'Épico',
  },
  lendario: {
    borderClass: 'border-amber-400/90',
    textClass: 'text-amber-200',
    bgGlowClass: 'shadow-[0_0_28px_rgba(251,191,36,0.55)]',
    hex: '#fbbf24',
    label: 'Lendário',
  },
  campanha: {
    borderClass: 'border-rose-700/80',
    textClass: 'text-rose-200',
    bgGlowClass: 'shadow-[0_0_18px_rgba(190,18,60,0.45)]',
    hex: '#be123c',
    label: 'Campanha',
  },
};

export function getRarityVisual(rarity: Rarity): RarityVisual {
  return RARITY_VISUALS[rarity];
}
