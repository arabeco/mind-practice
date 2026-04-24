import type { Option, SceneMetadata, StatKey } from '@/types/game';
import { CONTEXT_MODIFIERS } from './contextModifiers';
import { metadataMatches } from './metadataMatches';
import { timeFactor } from './timeFactor';

export interface ResolvedWeights {
  finalWeights: Partial<Record<StatKey, number>>;
  /**
   * Debug trace. `applied` lista cada rule (pelo índice na tabela) que bateu.
   * `timeFactor` é reportado pra o reducer aplicar na etapa do pipeline —
   * NÃO é aplicado em `finalWeights`.
   */
  breakdown: {
    base: Partial<Record<StatKey, number>>;
    applied: Array<{ ruleIndex: number; delta: Partial<Record<StatKey, number>> }>;
    timeFactor: number;
  };
}

const EMPTY: Partial<Record<StatKey, number>> = {};

/**
 * Resolve os pesos finais de uma Option dada a metadata da cena.
 *
 * Contrato:
 *   - Se Option tem `intent` E `baseWeights` → soma modifiers de `CONTEXT_MODIFIERS[intent]`
 *     que casam a metadata em cima do `baseWeights`.
 *   - Se Option só tem `weights` (legacy) → retorna `weights` direto, sem modifiers.
 *   - Se Option tem `intent` sem `baseWeights` (estado inválido permitido em dev) →
 *     retorna `{}` vazio (defensive; validator de deck deve bloquear antes).
 *   - `timeFactor` é computado e reportado no breakdown mas não multiplicado
 *     em finalWeights. O reducer é quem aplica no pipeline (junto com
 *     tensionMult e intensityMult) pra manter um único ponto de aplicação.
 */
export function resolveWeights(
  option: Option,
  metadata: SceneMetadata,
  responseTimeMs?: number,
): ResolvedWeights {
  const tf = timeFactor(responseTimeMs);

  // Intent presente mas baseWeights ausente → defensive empty
  if (option.intent && !option.baseWeights) {
    return {
      finalWeights: {},
      breakdown: { base: {}, applied: [], timeFactor: tf },
    };
  }

  // Legacy path (sem intent)
  if (!option.intent) {
    const legacy = option.weights ?? EMPTY;
    return {
      finalWeights: { ...legacy },
      breakdown: {
        base: { ...legacy },
        applied: [],
        timeFactor: tf,
      },
    };
  }

  const base = option.baseWeights!;
  const final: Partial<Record<StatKey, number>> = { ...base };
  const rules = CONTEXT_MODIFIERS[option.intent] ?? [];
  const applied: ResolvedWeights['breakdown']['applied'] = [];

  rules.forEach((rule, ruleIndex) => {
    if (!metadataMatches(rule.when, metadata)) return;
    for (const [axis, delta] of Object.entries(rule.delta) as Array<[StatKey, number]>) {
      final[axis] = (final[axis] ?? 0) + delta;
    }
    applied.push({ ruleIndex, delta: { ...rule.delta } });
  });

  return {
    finalWeights: final,
    breakdown: { base: { ...base }, applied, timeFactor: tf },
  };
}
