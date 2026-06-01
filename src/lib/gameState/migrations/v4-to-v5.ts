/**
 * v4 → v5: adiciona campos de daily login + achievements.
 *
 * - dailyLoginClaimedAt: null
 * - loginStreak: 0
 * - achievements: {}
 *
 * Nao destranca achievements retroativamente — o useEffect em
 * GameContext.tsx vai avaliar e dar unlock se o jogador ja merecia
 * (ex: ja completou calibragem antes da release).
 */
export function v4ToV5(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    dailyLoginClaimedAt: r.dailyLoginClaimedAt ?? null,
    loginStreak: typeof r.loginStreak === 'number' ? r.loginStreak : 0,
    achievements: r.achievements && typeof r.achievements === 'object' ? r.achievements : {},
    schemaVersion: 5,
  };
}
