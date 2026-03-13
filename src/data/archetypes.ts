import type { Archetype, StatKey } from '@/types/game';

export const ARCHETYPES: Archetype[] = [
  {
    id: 'soberano',
    name: 'O Soberano',
    category: 'especial',
    axes: 'equilibrio',
    description: 'Dominio completo. Voce age apenas quando necessario. Equilibrio raro entre todos os eixos.',
    tagline: 'O mestre do equilibrio',
  },
  {
    id: 'tubarao',
    name: 'O Tubarao',
    category: 'cruzado',
    axes: ['vigor', 'presenca'],
    description: 'Focado em conquista e poder. Sua presenca intimida naturalmente.',
    tagline: 'Conquista e poder',
  },
  {
    id: 'fantasma',
    name: 'O Fantasma',
    category: 'cruzado',
    axes: ['filtro', 'desapego'],
    description: 'Oculto. Ninguem sabe o que voce pensa ou sente. Invisivel por escolha.',
    tagline: 'Invisivel por escolha',
  },
  {
    id: 'diplomata',
    name: 'O Diplomata',
    category: 'cruzado',
    axes: ['harmonia', 'presenca'],
    description: 'Resolve conflitos sem disparar um tiro. Magnetico e persuasivo.',
    tagline: 'Resolve sem disparar',
  },
  {
    id: 'muralha',
    name: 'O Muralha',
    category: 'cruzado',
    axes: ['filtro', 'vigor'],
    description: 'Defensivo e letal. Absorve o golpe e contra-ataca com precisao.',
    tagline: 'Absorve e contra-ataca',
  },
  {
    id: 'estoico',
    name: 'O Estoico',
    category: 'cruzado',
    axes: ['desapego', 'filtro'],
    description: 'Imperturbavel. O mundo pode cair ao seu redor e voce continua de pe.',
    tagline: 'Imperturbavel',
  },
  {
    id: 'justiceiro',
    name: 'O Justiceiro',
    category: 'cruzado',
    axes: ['vigor', 'harmonia'],
    description: 'Usa a forca para manter a ordem. Age pelo grupo, defende os seus.',
    tagline: 'Forca pela ordem',
  },
  {
    id: 'enigma',
    name: 'O Enigma',
    category: 'cruzado',
    axes: ['presenca', 'desapego'],
    description: 'Atrai atencao pelo silencio. Indecifravel. As pessoas querem te entender.',
    tagline: 'Silencio magnetico',
  },
  {
    id: 'pacificador',
    name: 'O Pacificador',
    category: 'cruzado',
    axes: ['harmonia', 'filtro'],
    description: 'O lubrificante social. Evita o atrito antes dele nascer.',
    tagline: 'Evita o atrito',
  },
  {
    id: 'mercenario',
    name: 'O Mercenario',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    description: 'Sem amarras emocionais. Faz o que precisa ser feito, sem sentimentalismo.',
    tagline: 'Sem amarras',
  },
  {
    id: 'rebelde',
    name: 'O Rebelde',
    category: 'cruzado',
    axes: ['desapego', 'vigor'],
    description: 'Antifragilidade. Quebra regras com sorriso no rosto. O caos e seu playground.',
    tagline: 'Quebra regras sorrindo',
  },
  {
    id: 'vulcao',
    name: 'O Vulcao',
    category: 'puro',
    axes: ['vigor'],
    description: 'Explosivo e direto. Nao conhece o conceito de filtro. Energia bruta.',
    tagline: 'Explosivo e direto',
  },
  {
    id: 'monge',
    name: 'O Monge',
    category: 'cruzado',
    axes: ['harmonia', 'desapego'],
    description: 'Totalmente em paz. A opiniao alheia e ruido branco para voce.',
    tagline: 'Paz absoluta',
  },
  {
    id: 'camaleao',
    name: 'O Camaleao',
    category: 'cruzado',
    axes: ['harmonia', 'vigor'],
    description: 'Adapta-se para vencer. Pode ser doce ou amargo em segundos.',
    tagline: 'Adaptacao pura',
  },
  {
    id: 'estrategista',
    name: 'O Estrategista',
    category: 'cruzado',
    axes: ['filtro', 'presenca'],
    description: 'Joga xadrez com as pessoas. Antecipa 5 movimentos a frente.',
    tagline: 'Xadrez humano',
  },
];

/**
 * Match archetype from calibration axes.
 *
 * Algorithm:
 * 1. Normalize axes to 0-100%
 * 2. If top1 > 2x top2 AND top1 is Vigor -> Vulcao (puro)
 * 3. If spread (top1 - top5) < 15% -> Soberano (equilibrio)
 * 4. If top1+top2 = Desapego+Vigor -> check tone for Mercenario vs Rebelde
 * 5. If top1+top2 = Vigor+Harmonia -> check tone for Justiceiro vs Camaleao
 * 6. Else -> cross top1+top2 in table
 */
export function matchArchetype(
  axes: Record<string, number>,
  toneHistory: string[],
): Archetype {
  const entries = (Object.entries(axes) as [StatKey, number][])
    .sort((a, b) => b[1] - a[1]);
  const values = entries.map(e => e[1]);
  const keys = entries.map(e => e[0]);

  const maxVal = Math.max(...values.map(Math.abs), 1);
  const normalized = values.map(v => (v / maxVal) * 100);

  // Check Vulcao: top1 > 2x top2, top1 is vigor
  if (normalized[0] > 0 && normalized[0] > normalized[1] * 2 && keys[0] === 'vigor') {
    return ARCHETYPES.find(a => a.id === 'vulcao')!;
  }

  // Check Soberano: spread < 15%
  const spread = normalized[0] - normalized[normalized.length - 1];
  if (spread < 15 && normalized[0] > 0) {
    return ARCHETYPES.find(a => a.id === 'soberano')!;
  }

  // Top 2 axes
  const top2 = new Set([keys[0], keys[1]]);

  // Mercenario vs Rebelde disambiguation (both desapego+vigor)
  if (top2.has('desapego') && top2.has('vigor')) {
    const recent = toneHistory.slice(-20);
    const provocativo = recent.filter(t => t === 'provocativo').length;
    const pragmatico = recent.filter(t => t === 'pragmatico').length;
    if (provocativo > pragmatico) {
      return ARCHETYPES.find(a => a.id === 'rebelde')!;
    }
    return ARCHETYPES.find(a => a.id === 'mercenario')!;
  }

  // Justiceiro vs Camaleao disambiguation (both vigor+harmonia)
  if (top2.has('vigor') && top2.has('harmonia')) {
    const recent = toneHistory.slice(-20);
    const protetor = recent.filter(t => t === 'protetor').length;
    if (protetor > recent.length * 0.4) {
      return ARCHETYPES.find(a => a.id === 'justiceiro')!;
    }
    return ARCHETYPES.find(a => a.id === 'camaleao')!;
  }

  // Generic cross-match: find archetype whose axes match top2
  const match = ARCHETYPES.find(a => {
    if (a.category !== 'cruzado' || !Array.isArray(a.axes)) return false;
    const axSet = new Set(a.axes);
    return axSet.has(keys[0]) && axSet.has(keys[1]);
  });

  return match ?? ARCHETYPES.find(a => a.id === 'soberano')!;
}
