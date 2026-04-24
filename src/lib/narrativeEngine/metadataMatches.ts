import type {
  SceneMetadata,
  Relacao,
  Aposta,
  Ambiente,
  Pilar,
} from '@/types/game';

/** Clausula `when` de um ModifierRule. Todas as chaves são AND. */
export interface ModifierWhen {
  relacao?: Relacao;
  aposta?: Aposta;
  ambiente?: Ambiente;
  pilar?: Pilar;
  tensaoMin?: 1 | 2 | 3 | 4 | 5;
  tensaoMax?: 1 | 2 | 3 | 4 | 5;
}

/**
 * True se TODAS as chaves presentes em `when` casam com `metadata`.
 * Chaves ausentes em `when` são ignoradas (wildcard).
 */
export function metadataMatches(when: ModifierWhen, m: SceneMetadata): boolean {
  if (when.relacao && when.relacao !== m.relacao) return false;
  if (when.aposta && when.aposta !== m.aposta) return false;
  if (when.ambiente && when.ambiente !== m.ambiente) return false;
  if (when.pilar && when.pilar !== m.pilar) return false;
  if (when.tensaoMin !== undefined && m.tensao < when.tensaoMin) return false;
  if (when.tensaoMax !== undefined && m.tensao > when.tensaoMax) return false;
  return true;
}
