/**
 * v1: tinha `userStats: Record<StatKey, number>` direto no raiz.
 * v2: virou `calibration: { axes, totalResponses, recentWeights, toneHistory, snapshots }`.
 *
 * Se o raw já tem `calibration` (não é v1), retorna inalterado.
 */
export function v1ToV2(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  if ('calibration' in r || !('userStats' in r)) return raw;

  const oldStats = r.userStats as Record<string, number>;
  const completedDecks = (r.completedDecks ?? {}) as Record<string, string>;
  const totalResponses = Object.keys(completedDecks).length * 10;

  const { userStats: _removed, ...rest } = r;
  return {
    ...rest,
    calibration: {
      axes: { ...oldStats },
      totalResponses,
      recentWeights: { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] },
      toneHistory: [],
      snapshots: [],
    },
  };
}
