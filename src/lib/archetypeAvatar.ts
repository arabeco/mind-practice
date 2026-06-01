import type { Archetype } from '@/types/game';

export type AvatarVariant = 'masculino' | 'feminino';

interface ArchetypeAvatarVisual {
  background: string;
  glow: string;
  accent: string;
  line: string;
}

/**
 * Ordem oficial dos 15 arquetipos.
 * Determina o numero do arquivo de avatar:
 *   masculino → /avatars/a<N>.png
 *   feminino  → /avatars/b<N>.png
 */
const ARCHETYPE_ORDER: Record<string, number> = {
  soberano: 1,
  tubarao: 2,
  fantasma: 3,
  diplomata: 4,
  muralha: 5,
  estoico: 6,
  justiceiro: 7,
  enigma: 8,
  pacificador: 9,
  mercenario: 10,
  rebelde: 11,
  vulcao: 12,
  monge: 13,
  camaleao: 14,
  estrategista: 15,
};

// Cores oficiais por arquetipo — usadas pelo glow/aura do avatar
// e devem casar com a paleta dominante do PNG correspondente.
const ARCHETYPE_VISUALS: Record<string, ArchetypeAvatarVisual> = {
  soberano: {
    background: 'linear-gradient(180deg, #120b02 0%, #2f1e03 46%, #0e0903 100%)',
    glow: 'rgba(212, 175, 55, 0.34)',
    accent: '#facc15',
    line: 'rgba(253, 224, 71, 0.24)',
  },
  tubarao: {
    background: 'linear-gradient(180deg, #04101a 0%, #0a2238 46%, #030810 100%)',
    glow: 'rgba(37, 99, 235, 0.32)',
    accent: '#60a5fa',
    line: 'rgba(147, 197, 253, 0.18)',
  },
  fantasma: {
    background: 'linear-gradient(180deg, #0a0712 0%, #1b1432 46%, #06040c 100%)',
    glow: 'rgba(167, 139, 250, 0.28)',
    accent: '#c4b5fd',
    line: 'rgba(221, 214, 254, 0.18)',
  },
  diplomata: {
    background: 'linear-gradient(180deg, #07130e 0%, #143127 46%, #050b09 100%)',
    glow: 'rgba(16, 185, 129, 0.28)',
    accent: '#34d399',
    line: 'rgba(167, 243, 208, 0.18)',
  },
  muralha: {
    background: 'linear-gradient(180deg, #0f0c06 0%, #2a2415 46%, #0a0805 100%)',
    glow: 'rgba(122, 111, 86, 0.32)',
    accent: '#b89c6a',
    line: 'rgba(214, 182, 130, 0.16)',
  },
  estoico: {
    background: 'linear-gradient(180deg, #150e02 0%, #2e1f06 46%, #0a0702 100%)',
    glow: 'rgba(245, 158, 11, 0.3)',
    accent: '#fbbf24',
    line: 'rgba(253, 230, 138, 0.18)',
  },
  justiceiro: {
    background: 'linear-gradient(180deg, #150803 0%, #2e1711 46%, #0b0402 100%)',
    glow: 'rgba(239, 68, 68, 0.32)',
    accent: '#fb7185',
    line: 'rgba(254, 205, 211, 0.18)',
  },
  enigma: {
    background: 'linear-gradient(180deg, #090612 0%, #1e1432 46%, #08040e 100%)',
    glow: 'rgba(139, 92, 246, 0.3)',
    accent: '#a78bfa',
    line: 'rgba(221, 214, 254, 0.18)',
  },
  pacificador: {
    background: 'linear-gradient(180deg, #14110a 0%, #2b2618 46%, #0a0806 100%)',
    glow: 'rgba(245, 230, 200, 0.28)',
    accent: '#fde68a',
    line: 'rgba(253, 230, 138, 0.18)',
  },
  mercenario: {
    background: 'linear-gradient(180deg, #110a04 0%, #2a1c0d 46%, #0a0603 100%)',
    glow: 'rgba(184, 114, 43, 0.3)',
    accent: '#d97706',
    line: 'rgba(251, 191, 36, 0.16)',
  },
  rebelde: {
    background: 'linear-gradient(180deg, #050a18 0%, #0c1d3a 46%, #020510 100%)',
    glow: 'rgba(59, 130, 246, 0.32)',
    accent: '#60a5fa',
    line: 'rgba(147, 197, 253, 0.18)',
  },
  vulcao: {
    background: 'linear-gradient(180deg, #170a02 0%, #3a1907 46%, #0c0502 100%)',
    glow: 'rgba(249, 115, 22, 0.32)',
    accent: '#fb923c',
    line: 'rgba(254, 215, 170, 0.18)',
  },
  monge: {
    background: 'linear-gradient(180deg, #0f0f12 0%, #25262d 46%, #08080a 100%)',
    glow: 'rgba(250, 250, 250, 0.22)',
    accent: '#f5f5f5',
    line: 'rgba(245, 245, 245, 0.18)',
  },
  camaleao: {
    background: 'linear-gradient(180deg, #06121a 0%, #122a2a 46%, #040a0b 100%)',
    glow: 'rgba(45, 212, 191, 0.26)',
    accent: '#5eead4',
    line: 'rgba(204, 251, 241, 0.18)',
  },
  estrategista: {
    background: 'linear-gradient(180deg, #0a0c12 0%, #1a1f2c 46%, #07080c 100%)',
    glow: 'rgba(148, 163, 184, 0.3)',
    accent: '#cbd5e1',
    line: 'rgba(203, 213, 225, 0.18)',
  },
};

const FALLBACK_VISUAL: ArchetypeAvatarVisual = {
  background: 'linear-gradient(180deg, #090b12 0%, #161a2a 46%, #06070a 100%)',
  glow: 'rgba(139, 92, 246, 0.28)',
  accent: '#a78bfa',
  line: 'rgba(221, 214, 254, 0.16)',
};

/**
 * Retorna paths candidatos do PNG do avatar, em ordem de preferencia.
 * Novos PNGs (/avatars/a<N>.png ou b<N>.png) vem primeiro;
 * fallback pra /avatars/archetypes/<id>-<variant>.* (set antigo).
 */
export function getArchetypeAvatarPaths(archetypeId: string, variant: AvatarVariant): string[] {
  const order = ARCHETYPE_ORDER[archetypeId];
  const paths: string[] = [];

  if (order) {
    const prefix = variant === 'masculino' ? 'a' : 'b';
    paths.push(`/avatars/${prefix}${order}.png`);
  }

  // Set legado — fica como fallback se o novo PNG nao existir
  const legacyBase = `/avatars/archetypes/${archetypeId}-${variant}`;
  paths.push(
    `${legacyBase}.png`,
    `${legacyBase}.webp`,
    `${legacyBase}.jpg`,
    `${legacyBase}.jpeg`,
  );

  return paths;
}

export function getArchetypeAvatarVisual(archetype: Archetype): ArchetypeAvatarVisual {
  return ARCHETYPE_VISUALS[archetype.id] ?? FALLBACK_VISUAL;
}
