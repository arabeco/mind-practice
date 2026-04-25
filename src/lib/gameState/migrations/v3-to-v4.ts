/**
 * v3 → v4: wipe calibration (legacy somatório → motor bayesiano).
 *
 * Pre-Bayes profiles cannot be converted into AxisBelief distributions
 * without inventing data. Sem usuários em prod, optamos por reset:
 * - calibration removida (normalizeGameState reaplica INITIAL_CALIBRATION
 *   com beliefs uniformes via createPriorProfile()).
 * - Todo o resto (wallet, streak, decks completados, campanhas) preservado.
 */
export function v3ToV4(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  // Drop calibration → defaults.ts reapplies INITIAL_CALIBRATION on normalize.
  const { calibration: _drop, ...rest } = r;
  void _drop;
  return {
    ...rest,
    schemaVersion: 4,
  };
}
