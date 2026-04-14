import type { Deck } from '@/types/game';

export type DeckArtPattern =
  | 'atmosphere'
  | 'reticle'
  | 'beams'
  | 'grid'
  | 'embers'
  | 'ritual';

export interface DeckArtSpec {
  imageSrc?: string;
  kicker: string;
  caption: string;
  align?: 'left' | 'center';
  pattern: DeckArtPattern;
  palette: {
    background: string;
    glow: string;
    secondary: string;
    line: string;
    chip: string;
  };
}

const DECK_ART_BY_ID: Partial<Record<string, DeckArtSpec>> = {
  basic_01: {
    imageSrc: '/covers/basic_01.jpg',
    kicker: 'Leitura base',
    caption: 'Uma cena limpa para calibrar postura sem ruido excessivo.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #0b1220 0%, #18253a 52%, #10131e 100%)',
      glow: 'rgba(148, 163, 184, 0.42)',
      secondary: 'rgba(96, 165, 250, 0.28)',
      line: 'rgba(226, 232, 240, 0.18)',
      chip: 'rgba(15, 23, 42, 0.58)',
    },
  },
  holofote: {
    imageSrc: '/covers/holofote.jpg',
    kicker: 'Eixo em foco',
    caption: 'Presenca, alvo e leitura fina do gesto sob observacao.',
    pattern: 'reticle',
    align: 'center',
    palette: {
      background: 'linear-gradient(135deg, #04171d 0%, #0b2f36 48%, #061116 100%)',
      glow: 'rgba(34, 211, 238, 0.34)',
      secondary: 'rgba(103, 232, 249, 0.22)',
      line: 'rgba(165, 243, 252, 0.24)',
      chip: 'rgba(6, 24, 32, 0.56)',
    },
  },
  alta_tensao: {
    imageSrc: '/covers/alta_tensao.jpg',
    kicker: 'Stress test',
    caption: 'Energia comprimida, decisao curta e friccao crescente.',
    pattern: 'beams',
    palette: {
      background: 'linear-gradient(135deg, #14061c 0%, #31104b 52%, #120515 100%)',
      glow: 'rgba(192, 132, 252, 0.34)',
      secondary: 'rgba(244, 63, 94, 0.22)',
      line: 'rgba(233, 213, 255, 0.16)',
      chip: 'rgba(34, 9, 52, 0.58)',
    },
  },
  profissional: {
    imageSrc: '/covers/profissional.jpg',
    kicker: 'Validacao fria',
    caption: 'Linhas duras, reflexos contidos e julgamento sob pressao.',
    pattern: 'grid',
    palette: {
      background: 'linear-gradient(135deg, #07131d 0%, #0f2434 50%, #09131b 100%)',
      glow: 'rgba(125, 211, 252, 0.22)',
      secondary: 'rgba(56, 189, 248, 0.18)',
      line: 'rgba(186, 230, 253, 0.18)',
      chip: 'rgba(7, 25, 39, 0.56)',
    },
  },
  social: {
    imageSrc: '/covers/social.jpg',
    kicker: 'Maestria social',
    caption: 'Calor, leitura de circulo e prestigio em jogo.',
    pattern: 'embers',
    palette: {
      background: 'linear-gradient(135deg, #1a1003 0%, #3a2203 48%, #140901 100%)',
      glow: 'rgba(250, 204, 21, 0.26)',
      secondary: 'rgba(251, 191, 36, 0.2)',
      line: 'rgba(254, 240, 138, 0.18)',
      chip: 'rgba(49, 29, 6, 0.56)',
    },
  },
  livro_amaldicoado: {
    imageSrc: '/covers/livro_amaldicoado.jpg',
    kicker: 'Campanha ritual',
    caption: 'Halo antigo, calor de ouro gasto e presenca de ameaca.',
    pattern: 'ritual',
    align: 'center',
    palette: {
      background: 'linear-gradient(135deg, #060307 0%, #170915 48%, #09040c 100%)',
      glow: 'rgba(212, 175, 55, 0.24)',
      secondary: 'rgba(139, 92, 246, 0.18)',
      line: 'rgba(253, 224, 71, 0.18)',
      chip: 'rgba(22, 8, 16, 0.6)',
    },
  },
  espelho: {
    imageSrc: '/covers/espelho.jpg',
    kicker: 'Calibragem',
    caption: 'Reflexos intimos e padroes escondidos nos relacionamentos.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #0d0a14 0%, #1e1530 52%, #0f0b18 100%)',
      glow: 'rgba(167, 139, 250, 0.32)',
      secondary: 'rgba(196, 181, 253, 0.2)',
      line: 'rgba(221, 214, 254, 0.16)',
      chip: 'rgba(18, 12, 34, 0.56)',
    },
  },
  mascara: {
    imageSrc: '/covers/mascara.jpg',
    kicker: 'Calibragem',
    caption: 'A face digital e o que ela esconde de verdade.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #080c12 0%, #141e2e 52%, #0a0e16 100%)',
      glow: 'rgba(56, 189, 248, 0.28)',
      secondary: 'rgba(125, 211, 252, 0.18)',
      line: 'rgba(186, 230, 253, 0.14)',
      chip: 'rgba(10, 18, 30, 0.56)',
    },
  },
  roda: {
    imageSrc: '/covers/roda.jpg',
    kicker: 'Calibragem',
    caption: 'Circulo de confianca, lealdade e leitura de grupo.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #140d03 0%, #2e1f08 52%, #100a02 100%)',
      glow: 'rgba(251, 191, 36, 0.28)',
      secondary: 'rgba(253, 224, 71, 0.18)',
      line: 'rgba(254, 240, 138, 0.14)',
      chip: 'rgba(30, 20, 6, 0.56)',
    },
  },
  teste: {
    imageSrc: '/covers/teste.jpg',
    kicker: 'Calibragem',
    caption: 'Pressao real, tempo curto e decisao sob stress.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #0e0608 0%, #241018 52%, #10070a 100%)',
      glow: 'rgba(244, 63, 94, 0.28)',
      secondary: 'rgba(251, 113, 133, 0.18)',
      line: 'rgba(254, 205, 211, 0.14)',
      chip: 'rgba(28, 10, 16, 0.56)',
    },
  },
  limite: {
    imageSrc: '/covers/limite.jpg',
    kicker: 'Calibragem',
    caption: 'Quando o confronto chega, qual e a sua postura?',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #0c0404 0%, #221010 52%, #0e0606 100%)',
      glow: 'rgba(239, 68, 68, 0.3)',
      secondary: 'rgba(248, 113, 113, 0.2)',
      line: 'rgba(254, 202, 202, 0.14)',
      chip: 'rgba(26, 8, 8, 0.56)',
    },
  },
  escolha: {
    imageSrc: '/covers/escolha.jpg',
    kicker: 'Calibragem',
    caption: 'Dilemas morais que revelam o que voce prioriza.',
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #060a0e 0%, #121e28 52%, #080c12 100%)',
      glow: 'rgba(148, 163, 184, 0.3)',
      secondary: 'rgba(203, 213, 225, 0.18)',
      line: 'rgba(226, 232, 240, 0.14)',
      chip: 'rgba(12, 18, 26, 0.56)',
    },
  },
};

export function getDeckArt(deck: Deck): DeckArtSpec {
  const art = DECK_ART_BY_ID[deck.deckId] ?? buildFallbackArt(deck);
  if (!art.imageSrc && deck.coverImage) {
    art.imageSrc = deck.coverImage;
  }
  return art;
}

function buildFallbackArt(deck: Deck): DeckArtSpec {
  if (deck.tier === 5) {
    return {
      kicker: 'Season',
      caption: deck.tema,
      align: 'center',
      pattern: 'ritual',
      palette: {
        background: 'linear-gradient(135deg, #050308 0%, #190814 48%, #09030a 100%)',
        glow: 'rgba(212, 175, 55, 0.22)',
        secondary: 'rgba(139, 92, 246, 0.18)',
        line: 'rgba(250, 204, 21, 0.18)',
        chip: 'rgba(24, 9, 20, 0.58)',
      },
    };
  }

  if (deck.category === 'eixo') {
    return {
      kicker: 'Eixo',
      caption: deck.tema,
      align: 'center',
      pattern: 'reticle',
      palette: {
        background: 'linear-gradient(135deg, #04161d 0%, #0d3138 48%, #061016 100%)',
        glow: 'rgba(34, 211, 238, 0.3)',
        secondary: 'rgba(103, 232, 249, 0.2)',
        line: 'rgba(165, 243, 252, 0.18)',
        chip: 'rgba(6, 24, 32, 0.56)',
      },
    };
  }

  if (deck.category === 'cenario') {
    return {
      kicker: 'Cenario',
      caption: deck.tema,
      pattern: 'beams',
      palette: {
        background: 'linear-gradient(135deg, #14061c 0%, #2a0f36 48%, #100512 100%)',
        glow: 'rgba(192, 132, 252, 0.28)',
        secondary: 'rgba(244, 63, 94, 0.16)',
        line: 'rgba(233, 213, 255, 0.15)',
        chip: 'rgba(29, 11, 40, 0.56)',
      },
    };
  }

  return {
    kicker: 'Essencial',
    caption: deck.tema,
    pattern: 'atmosphere',
    palette: {
      background: 'linear-gradient(135deg, #0a111a 0%, #172433 48%, #0d1118 100%)',
      glow: 'rgba(148, 163, 184, 0.34)',
      secondary: 'rgba(96, 165, 250, 0.22)',
      line: 'rgba(226, 232, 240, 0.14)',
      chip: 'rgba(12, 18, 30, 0.56)',
    },
  };
}
