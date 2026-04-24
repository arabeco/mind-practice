import type { StatKey } from '@/types/game';
import type { OptionIntent } from './intents';
import type { ModifierWhen } from './metadataMatches';

export interface ModifierRule {
  when: ModifierWhen;
  delta: Partial<Record<StatKey, number>>;
}

/**
 * Modificadores contextuais aplicados em cima de `Option.baseWeights`.
 *
 * Regra: pra cada Option.intent, engine avalia TODAS as rules; toda rule
 * cujo `when` casa a SceneMetadata soma seu `delta` em finalWeights.
 * Múltiplas rules no mesmo eixo acumulam.
 *
 * Seed inicial (~20 rules). Expande organicamente com Season 1 conforme
 * autor descobre padrões — edits à tabela são commits auditáveis.
 */
export const CONTEXT_MODIFIERS: Record<OptionIntent, ModifierRule[]> = {
  confronto_publico: [
    { when: { relacao: 'Autoridade', aposta: 'Status' }, delta: { vigor: +1, filtro: -1 } },
    { when: { relacao: 'Par', aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
    { when: { relacao: 'Desconhecido' }, delta: { vigor: -1, presenca: +1 } },
    { when: { tensaoMin: 4 }, delta: { vigor: +1 } },
  ],

  confronto_privado: [
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1, presenca: +1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
  ],

  retirada: [
    { when: { tensaoMin: 4 }, delta: { desapego: +1, vigor: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
    { when: { aposta: 'Status' }, delta: { presenca: -1 } },
  ],

  adesao: [
    { when: { relacao: 'Autoridade' }, delta: { harmonia: +1, presenca: -1 } },
    { when: { relacao: 'Par' }, delta: { harmonia: +1 } },
  ],

  contra_movimento: [
    { when: { tensaoMin: 3 }, delta: { filtro: +1, vigor: +1 } },
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1 } },
  ],

  investigacao: [
    { when: { tensaoMax: 2 }, delta: { filtro: +1 } },
    { when: { tensaoMin: 4 }, delta: { filtro: +1, vigor: -1 } },
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1 } },
  ],

  provocacao: [
    { when: { relacao: 'Autoridade' }, delta: { vigor: +2, harmonia: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
  ],

  protecao: [
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1, filtro: +1 } },
    { when: { relacao: 'Desconhecido' }, delta: { desapego: +1 } },
  ],
};
