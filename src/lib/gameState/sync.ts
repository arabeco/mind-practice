import { getSupabase } from '@/lib/supabase/client';
import type { PersistedGameState } from './schema';

export type HydrateDecision =
  | { kind: 'initial' }
  | { kind: 'use-local'; local: PersistedGameState }
  | { kind: 'use-cloud'; cloud: PersistedGameState }
  | { kind: 'conflict'; local: PersistedGameState; cloud: PersistedGameState };

/**
 * Decide qual snapshot usar no hydrate.
 *
 * Regras (ordem):
 *   a) nenhum    → initial
 *   b) só local  → use-local
 *   c) só cloud  → use-cloud
 *   d) ambos:
 *      .1 updatedAt iguais                → use-local
 *      .2 cloud newer, local "limpo"      → use-cloud
 *          ("limpo" = updatedAt ≤ devicePersistedAt, ou seja, o último estado
 *           persistido no cloud já inclui todas as mudanças locais)
 *      .3 cloud newer, local "sujo"       → conflict
 *          (inclui devicePersistedAt=null por segurança)
 *      .4 local newer que cloud           → use-local
 */
export function decideHydrate(
  local: PersistedGameState | null,
  cloud: PersistedGameState | null,
): HydrateDecision {
  if (!local && !cloud) return { kind: 'initial' };
  if (!cloud) return { kind: 'use-local', local: local! };
  if (!local) return { kind: 'use-cloud', cloud };

  if (local.updatedAt === cloud.updatedAt) {
    return { kind: 'use-local', local };
  }

  const cloudIsNewer = cloud.updatedAt > local.updatedAt;
  if (!cloudIsNewer) return { kind: 'use-local', local };

  const localIsClean =
    local.devicePersistedAt !== null &&
    local.updatedAt <= local.devicePersistedAt;
  if (localIsClean) return { kind: 'use-cloud', cloud };
  return { kind: 'conflict', local, cloud };
}

/**
 * Carrega o state do cloud. Retorna unknown (não validado ainda — normalize cuida).
 * null se Supabase não configurado, não logado, ou sem row.
 */
export async function loadCloud(): Promise<unknown | null> {
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

  const raw = (data as { state_json: unknown }).state_json;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

/**
 * Salva state no cloud. state.devicePersistedAt deve ser atualizado no caller
 * APÓS resolução da promise (no sucesso). Silent se não logado/configurado.
 *
 * Retorna true se subiu, false se skip/falha.
 */
export async function saveCloud(state: PersistedGameState): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { error } = await sb.from('game_state').upsert({
    user_id: user.id,
    state_json: state as unknown as Record<string, unknown>,
  });
  return !error;
}
