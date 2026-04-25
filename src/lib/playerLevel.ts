/**
 * Nível do Perfil (1-10) — função pura derivada de calibração.
 *
 * Combina três sinais que o motor já produz:
 *   - precision  (0-100): saturação por respostas (CALIBRATION_WINDOW=200)
 *   - consistency (0-1): média de axisConfidence dos 5 eixos (Bayes)
 *   - archetype state: discovering / tendency / firm
 *
 * Score = 0.55*precision + 0.45*(consistency*100), clamp 0..100.
 * Level = floor(score / 10) + 1, clamp 1..10.
 *
 * Capping por estado de arquétipo evita "level alto sem identidade":
 *   - discovering → max nível 4
 *   - tendency    → max nível 7
 *   - firm        → sem cap (até 10)
 */
import type { PlayerBeliefs } from '@/lib/bayesEngine/types';
import { archetypeDisplayState } from '@/lib/bayesEngine';
import { getPrecision, getConsistency } from '@/lib/gameStats';

export type LevelTier = 'descobrindo' | 'esboco' | 'contorno' | 'firme' | 'soberano';

export interface PlayerLevelInfo {
  level: number;          // 1..10
  name: string;           // nome cerimonial
  tagline: string;        // 1 linha
  tier: LevelTier;        // pra estilização
  score: number;          // 0..100, pra barra
  precisionPct: number;   // 0..100
  consistencyPct: number; // 0..100
  archetypeMode: 'discovering' | 'tendency' | 'firm';
}

interface LevelDef {
  level: number;
  name: string;
  tagline: string;
  tier: LevelTier;
}

const LEVEL_DEFS: LevelDef[] = [
  { level: 1,  name: 'Recem-chegado', tagline: 'Sem leitura ainda. So olhando.',                tier: 'descobrindo' },
  { level: 2,  name: 'Sondando',      tagline: 'Primeiras pegadas. O perfil esta vazio.',       tier: 'descobrindo' },
  { level: 3,  name: 'Esboco',        tagline: 'Padroes comecam a aparecer.',                   tier: 'esboco' },
  { level: 4,  name: 'Esboco firme',  tagline: 'Tendencia visivel, mas ainda fluida.',          tier: 'esboco' },
  { level: 5,  name: 'Contorno',      tagline: 'Da pra desenhar quem voce e em duas linhas.',   tier: 'contorno' },
  { level: 6,  name: 'Contorno duro', tagline: 'Arquetipo aparece sem asterisco.',              tier: 'contorno' },
  { level: 7,  name: 'Firme',         tagline: 'Identidade legivel. Outros leriam igual.',      tier: 'firme' },
  { level: 8,  name: 'Limpo',         tagline: 'Coerencia alta nos cinco eixos.',               tier: 'firme' },
  { level: 9,  name: 'Cristalino',    tagline: 'Quase nada de ruido. Voce sabe quem e.',        tier: 'soberano' },
  { level: 10, name: 'Soberano',      tagline: 'Identidade calibrada e blindada.',              tier: 'soberano' },
];

const ARCHETYPE_CAP: Record<'discovering' | 'tendency' | 'firm', number> = {
  discovering: 4,
  tendency: 7,
  firm: 10,
};

export function getPlayerLevel(
  beliefs: PlayerBeliefs,
  totalResponses: number,
): PlayerLevelInfo {
  const precision = getPrecision(totalResponses); // 0..100
  const consistency = getConsistency(beliefs);    // 0..1
  const arch = archetypeDisplayState(beliefs);

  const score = Math.max(
    0,
    Math.min(100, precision * 0.55 + consistency * 100 * 0.45),
  );

  const rawLevel = Math.max(1, Math.min(10, Math.floor(score / 10) + 1));
  const cappedLevel = Math.min(rawLevel, ARCHETYPE_CAP[arch.mode]);

  const def = LEVEL_DEFS[cappedLevel - 1];

  return {
    level: cappedLevel,
    name: def.name,
    tagline: def.tagline,
    tier: def.tier,
    score: Math.round(score),
    precisionPct: Math.round(precision),
    consistencyPct: Math.round(consistency * 100),
    archetypeMode: arch.mode,
  };
}

/** Cor (hex) por tier — espelha STAT_COLORS pra harmonia visual. */
export const LEVEL_TIER_COLOR: Record<LevelTier, string> = {
  descobrindo: '#94a3b8', // slate
  esboco:      '#a78bfa', // violet
  contorno:    '#7dd3fc', // sky
  firme:       '#d4af37', // gold
  soberano:    '#f97316', // orange flame
};

/** Glow CSS-ready por tier — pra cards/modais. */
export const LEVEL_TIER_GLOW: Record<LevelTier, string> = {
  descobrindo: '0 0 18px rgba(148,163,184,0.18)',
  esboco:      '0 0 24px rgba(167,139,250,0.22)',
  contorno:    '0 0 26px rgba(125,211,252,0.24)',
  firme:       '0 0 30px rgba(212,175,55,0.30)',
  soberano:    '0 0 36px rgba(249,115,22,0.34)',
};
