/**
 * Leaderboard — CRUD do `season_scores`.
 * RLS: read public, write own only. Cliente recalcula score local e
 * faz upsert. Real-time channel pra atualizacoes ao vivo.
 */
import { getSupabase } from './client';
import type { PublicProfile } from './social';

export interface SeasonScoreRow {
  season_id: string;
  user_id: string;
  score: number;
  archetype_id: string | null;
  updated_at: string;
}

export interface RankedEntry extends SeasonScoreRow {
  rank: number;          // 1-based posicao no ranking
  profile?: PublicProfile;
}

/**
 * Upsert do score do usuario logado pra essa season.
 * No-op se Supabase nao configurado ou nao logado.
 */
export async function upsertSeasonScore(
  seasonId: string,
  score: number,
  archetypeId: string | null,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase nao configurado' };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Precisa estar logado' };

  const { error } = await sb.from('season_scores').upsert(
    {
      season_id: seasonId,
      user_id: user.id,
      score,
      archetype_id: archetypeId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'season_id,user_id' },
  );

  return { error: error?.message ?? null };
}

/**
 * Lista top N do ranking de uma season (ordenado por score desc, tiebreak
 * por updated_at asc — quem chegou no score primeiro fica na frente).
 * Hidrata `profile` via join manual.
 */
export async function listSeasonRanking(
  seasonId: string,
  limit = 50,
): Promise<RankedEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: rows } = await sb
    .from('season_scores')
    .select('season_id, user_id, score, archetype_id, updated_at')
    .eq('season_id', seasonId)
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  const userIds = rows.map(r => r.user_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, nickname, avatar_variant')
    .in('id', userIds);

  const profileMap = new Map<string, PublicProfile>();
  for (const p of (profiles ?? []) as PublicProfile[]) profileMap.set(p.id, p);

  return (rows as SeasonScoreRow[]).map((row, idx) => ({
    ...row,
    rank: idx + 1,
    profile: profileMap.get(row.user_id),
  }));
}

/**
 * Retorna a posicao do usuario logado nessa season.
 * Null se Supabase nao configurado, nao logado, ou usuario nao tem score
 * registrado (ainda).
 */
export async function getMyRank(
  seasonId: string,
): Promise<{ rank: number; total: number; entry: SeasonScoreRow } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  // Pega a row do user
  const { data: myRow } = await sb
    .from('season_scores')
    .select('season_id, user_id, score, archetype_id, updated_at')
    .eq('season_id', seasonId)
    .eq('user_id', user.id)
    .single();

  if (!myRow) return null;

  // Conta quantas rows tem score >= a minha. Se score igual, tiebreak
  // por updated_at asc (mais antigo na frente).
  const { count: aheadCount } = await sb
    .from('season_scores')
    .select('user_id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .or(
      `score.gt.${myRow.score},` +
        `and(score.eq.${myRow.score},updated_at.lt.${myRow.updated_at})`,
    );

  const { count: total } = await sb
    .from('season_scores')
    .select('user_id', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  return {
    rank: (aheadCount ?? 0) + 1,
    total: total ?? 0,
    entry: myRow as SeasonScoreRow,
  };
}
