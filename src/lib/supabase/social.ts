import { getSupabase } from './client';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface PublicProfile {
  id: string;
  nickname: string;
  avatar_variant: 'masculino' | 'feminino';
}

export interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface FriendshipsBuckets {
  accepted: PublicProfile[];   // amigos confirmados
  incoming: PublicProfile[];   // pediram pra você
  outgoing: PublicProfile[];   // você pediu, aguardando
}

export type FeedEventKind =
  | 'deck_completed'
  | 'archetype_changed'
  | 'level_up'
  | 'streak_milestone';

export interface FeedEvent {
  id: number;
  user_id: string;
  kind: FeedEventKind;
  payload: Record<string, unknown>;
  created_at: string;
  /** hydrated — joined from profiles */
  author?: PublicProfile;
}

// ------------------------------------------------------------
// Profiles / search
// ------------------------------------------------------------

/**
 * Busca até 10 profiles cujo nickname contém a query (case-insensitive).
 * Exclui o próprio usuário.
 */
export async function searchUsers(query: string): Promise<PublicProfile[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const q = query.trim();
  if (q.length < 2) return [];

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from('profiles')
    .select('id, nickname, avatar_variant')
    .ilike('nickname', `%${q}%`)
    .neq('id', user.id)
    .limit(10);

  if (error || !data) return [];
  return data as PublicProfile[];
}

export async function getProfile(userId: string): Promise<PublicProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('profiles')
    .select('id, nickname, avatar_variant')
    .eq('id', userId)
    .single();
  return (data as PublicProfile) ?? null;
}

// ------------------------------------------------------------
// Friendships
// ------------------------------------------------------------

/**
 * Envia pedido de amizade (status=pending).
 * Idempotente: se já existe qualquer linha entre os dois, retorna sem criar.
 */
export async function sendFriendRequest(addresseeId: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não configurado' };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Precisa estar logado' };
  if (user.id === addresseeId) return { error: 'Não pode adicionar a si mesmo' };

  // Já existe amizade/pedido em qualquer direção?
  const { data: existing } = await sb
    .from('friendships')
    .select('status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),` +
      `and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return { error: 'Já são amigos' };
    return { error: 'Pedido já existe' };
  }

  const { error } = await sb
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' });

  return { error: error?.message ?? null };
}

/** Aceita pedido pendente onde você é o addressee. */
export async function acceptFriendRequest(requesterId: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não configurado' };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Precisa estar logado' };

  const { error } = await sb
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending');

  return { error: error?.message ?? null };
}

/** Rejeita pedido (apaga a linha). */
export async function rejectFriendRequest(requesterId: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não configurado' };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Precisa estar logado' };

  const { error } = await sb
    .from('friendships')
    .delete()
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id);

  return { error: error?.message ?? null };
}

/** Remove amizade existente (qualquer direção). */
export async function removeFriend(otherId: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não configurado' };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Precisa estar logado' };

  const { error } = await sb
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),` +
      `and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`
    );
  return { error: error?.message ?? null };
}

/** Retorna listas categorizadas de amigos do usuário atual. */
export async function listFriendships(): Promise<FriendshipsBuckets> {
  const empty: FriendshipsBuckets = { accepted: [], incoming: [], outgoing: [] };
  const sb = getSupabase();
  if (!sb) return empty;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return empty;

  const { data: rows } = await sb
    .from('friendships')
    .select('requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (!rows || rows.length === 0) return empty;

  // Colecionar ids de "o outro" em cada linha
  const otherIds = new Set<string>();
  for (const r of rows as FriendshipRow[]) {
    otherIds.add(r.requester_id === user.id ? r.addressee_id : r.requester_id);
  }

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, nickname, avatar_variant')
    .in('id', Array.from(otherIds));

  const profileMap = new Map<string, PublicProfile>();
  for (const p of (profiles ?? []) as PublicProfile[]) profileMap.set(p.id, p);

  const out: FriendshipsBuckets = { accepted: [], incoming: [], outgoing: [] };
  for (const r of rows as FriendshipRow[]) {
    const otherId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
    const p = profileMap.get(otherId);
    if (!p) continue;
    if (r.status === 'accepted') out.accepted.push(p);
    else if (r.status === 'pending') {
      if (r.requester_id === user.id) out.outgoing.push(p);
      else out.incoming.push(p);
    }
  }
  return out;
}

// ------------------------------------------------------------
// Feed
// ------------------------------------------------------------

/** Loga um evento no feed do usuário atual. Silent fail. */
export async function logFeedEvent(
  kind: FeedEventKind,
  payload: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('feed_events').insert({ user_id: user.id, kind, payload });
}

/**
 * Lista últimos eventos do usuário + amigos (RLS já filtra).
 * Faz join manual com profiles pra preencher `author`.
 */
export async function listFriendFeed(limit = 30): Promise<FeedEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data: events } = await sb
    .from('feed_events')
    .select('id, user_id, kind, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!events || events.length === 0) return [];

  const authorIds = Array.from(new Set(events.map(e => e.user_id)));
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, nickname, avatar_variant')
    .in('id', authorIds);

  const profileMap = new Map<string, PublicProfile>();
  for (const p of (profiles ?? []) as PublicProfile[]) profileMap.set(p.id, p);

  return (events as FeedEvent[]).map(ev => ({
    ...ev,
    author: profileMap.get(ev.user_id),
  }));
}
