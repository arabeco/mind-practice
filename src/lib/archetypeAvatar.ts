import type { Archetype } from '@/types/game';

export type AvatarVariant = 'masculino' | 'feminino';

interface ArchetypeAvatarVisual {
  background: string;
  glow: string;
  accent: string;
  line: string;
}

const ARCHETYPE_VISUALS: Record<string, ArchetypeAvatarVisual> = {
  soberano: {
    background: 'linear-gradient(180deg, #120b02 0%, #2f1e03 46%, #0e0903 100%)',
    glow: 'rgba(212, 175, 55, 0.34)',
    accent: '#facc15',
    line: 'rgba(253, 224, 71, 0.24)',
  },
  tubarao: {
    background: 'linear-gradient(180deg, #180607 0%, #3a1014 46%, #110406 100%)',
    glow: 'rgba(239, 68, 68, 0.3)',
    accent: '#fb7185',
    line: 'rgba(253, 164, 175, 0.18)',
  },
  fantasma: {
    background: 'linear-gradient(180deg, #060812 0%, #10172c 46%, #05070d 100%)',
    glow: 'rgba(96, 165, 250, 0.26)',
    accent: '#93c5fd',
    line: 'rgba(191, 219, 254, 0.16)',
  },
  diplomata: {
    background: 'linear-gradient(180deg, #071310 0%, #143127 46%, #050b09 100%)',
    glow: 'rgba(16, 185, 129, 0.26)',
    accent: '#34d399',
    line: 'rgba(167, 243, 208, 0.18)',
  },
  muralha: {
    background: 'linear-gradient(180deg, #10070f 0%, #24162e 46%, #09040a 100%)',
    glow: 'rgba(168, 85, 247, 0.28)',
    accent: '#c084fc',
    line: 'rgba(233, 213, 255, 0.16)',
  },
  estoico: {
    background: 'linear-gradient(180deg, #081017 0%, #0f202d 46%, #05070c 100%)',
    glow: 'rgba(125, 211, 252, 0.24)',
    accent: '#7dd3fc',
    line: 'rgba(186, 230, 253, 0.16)',
  },
  justiceiro: {
    background: 'linear-gradient(180deg, #150803 0%, #2e1711 46%, #0b0402 100%)',
    glow: 'rgba(248, 113, 113, 0.28)',
    accent: '#fb7185',
    line: 'rgba(254, 205, 211, 0.16)',
  },
  enigma: {
    background: 'linear-gradient(180deg, #090612 0%, #1e1432 46%, #08040e 100%)',
    glow: 'rgba(167, 139, 250, 0.28)',
    accent: '#c4b5fd',
    line: 'rgba(221, 214, 254, 0.18)',
  },
  pacificador: {
    background: 'linear-gradient(180deg, #07120d 0%, #163125 46%, #050908 100%)',
    glow: 'rgba(74, 222, 128, 0.24)',
    accent: '#4ade80',
    line: 'rgba(187, 247, 208, 0.16)',
  },
  mercenario: {
    background: 'linear-gradient(180deg, #0b0814 0%, #1a1730 46%, #07050d 100%)',
    glow: 'rgba(129, 140, 248, 0.26)',
    accent: '#818cf8',
    line: 'rgba(199, 210, 254, 0.16)',
  },
  rebelde: {
    background: 'linear-gradient(180deg, #170704 0%, #38130b 46%, #0c0402 100%)',
    glow: 'rgba(249, 115, 22, 0.28)',
    accent: '#fb923c',
    line: 'rgba(254, 215, 170, 0.18)',
  },
  vulcao: {
    background: 'linear-gradient(180deg, #180503 0%, #3c1207 46%, #120302 100%)',
    glow: 'rgba(239, 68, 68, 0.34)',
    accent: '#f87171',
    line: 'rgba(254, 202, 202, 0.16)',
  },
  monge: {
    background: 'linear-gradient(180deg, #08120a 0%, #152c1a 46%, #050806 100%)',
    glow: 'rgba(74, 222, 128, 0.24)',
    accent: '#86efac',
    line: 'rgba(220, 252, 231, 0.16)',
  },
  camaleao: {
    background: 'linear-gradient(180deg, #0a1117 0%, #15302f 46%, #07090d 100%)',
    glow: 'rgba(45, 212, 191, 0.24)',
    accent: '#5eead4',
    line: 'rgba(204, 251, 241, 0.18)',
  },
  estrategista: {
    background: 'linear-gradient(180deg, #090c16 0%, #161f34 46%, #06070c 100%)',
    glow: 'rgba(96, 165, 250, 0.28)',
    accent: '#93c5fd',
    line: 'rgba(191, 219, 254, 0.18)',
  },
};

const FALLBACK_VISUAL: ArchetypeAvatarVisual = {
  background: 'linear-gradient(180deg, #090b12 0%, #161a2a 46%, #06070a 100%)',
  glow: 'rgba(139, 92, 246, 0.28)',
  accent: '#a78bfa',
  line: 'rgba(221, 214, 254, 0.16)',
};

export function getArchetypeAvatarPaths(archetypeId: string, variant: AvatarVariant): string[] {
  const base = `/avatars/archetypes/${archetypeId}-${variant}`;
  return [`${base}.png`, `${base}.webp`, `${base}.jpg`, `${base}.jpeg`];
}

export function getArchetypeAvatarVisual(archetype: Archetype): ArchetypeAvatarVisual {
  return ARCHETYPE_VISUALS[archetype.id] ?? FALLBACK_VISUAL;
}
