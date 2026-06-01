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

/**
 * Recompensa em fichas por nivel atingido (indice = nivel).
 * Indice 0 nao existe; indice 1 é zero (estado inicial, nao recompensa).
 *
 * Curva crescente — premia chegar em firme/soberano sem inflar economy
 * (total acumulado lvl 2..10 = 1555 fichas, pouco mais que 2 decks raros).
 *
 * Referencias: DAILY_FICHAS=10, raro=150, epico=350, lendario=800.
 */
export const LEVEL_REWARDS: number[] = [0, 0, 25, 35, 50, 70, 100, 140, 190, 250, 400];

export function getLevelReward(level: number): number {
  if (level < 1 || level > 10) return 0;
  return LEVEL_REWARDS[level] ?? 0;
}

/** Cor (hex) por tier — escala de cinza ate dourado pra alinhar com a
 *  identidade do app (preto + dourado). Progressao visual sem fugir do brand. */
export const LEVEL_TIER_COLOR: Record<LevelTier, string> = {
  descobrindo: '#9ca3af', // cinza claro
  esboco:      '#cbd5e1', // prata
  contorno:    '#e5e7eb', // branco quase puro
  firme:       '#d4af37', // dourado MindPractice
  soberano:    '#facc15', // dourado intenso
};

/** Glow CSS-ready por tier — escala cinza → dourado, sem matiz de outras cores. */
export const LEVEL_TIER_GLOW: Record<LevelTier, string> = {
  descobrindo: '0 0 20px rgba(156,163,175,0.18)',
  esboco:      '0 0 24px rgba(203,213,225,0.20)',
  contorno:    '0 0 26px rgba(229,231,235,0.22)',
  firme:       '0 0 30px rgba(212,175,55,0.30)',
  soberano:    '0 0 36px rgba(250,204,21,0.34)',
};
