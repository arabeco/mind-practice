import { getSupabase } from './client';
import type { GameState } from '@/types/game';

/**
 * Sincroniza nickname + avatar variant na tabela profiles.
 * Chamado quando usuário edita o nickname ou troca o avatar no /perfil.
 * Silently fails se Supabase não configurado ou usuário não logado.
 */
export async function saveProfileToCloud(opts: {
  nickname?: string;
  avatarVariant?: 'masculino' | 'feminino';
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const patch: Record<string, unknown> = { id: user.id };
  if (opts.nickname !== undefined) patch.nickname = opts.nickname;
  if (opts.avatarVariant !== undefined) patch.avatar_variant = opts.avatarVariant;

  // upsert pra cobrir o caso (raro) em que o trigger handle_new_user
  // ainda não rodou ou falhou — não trava o app
  await sb.from('profiles').upsert(patch);
}

/**
 * Save game state to Supabase for the logged-in user.
 * Silently fails if Supabase isn't configured or user isn't logged in.
 */
export async function saveStateToCloud(state: GameState): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  // Strip transient fields (activeDeck, activeRun) before saving
  const { activeDeck, activeRun, ...persistable } = state;

  await sb.from('game_state').upsert({
    user_id: user.id,
    state_json: persistable as unknown as Record<string, unknown>,
  });
}

/**
 * Load game state from Supabase for the logged-in user.
 * Returns null if not configured, not logged in, or no saved state.
 */
export async function loadStateFromCloud(): Promise<Partial<GameState> | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('game_state')
    .select('state_json')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  try {
    // state_json is stored as jsonb — Supabase returns it already parsed
    const raw = data.state_json;
    if (typeof raw === 'string') return JSON.parse(raw) as Partial<GameState>;
    return raw as unknown as Partial<GameState>;
  } catch {
    return null;
  }
}
