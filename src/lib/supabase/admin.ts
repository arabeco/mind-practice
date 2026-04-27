/**
 * Server-side Supabase admin client. Usa service role key — bypassa RLS.
 * SOMENTE usar em API routes (Node runtime) pra webhooks ou tarefas
 * privilegiadas. NÃO importar em componentes client/SSR.
 *
 * Env var:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-only, NUNCA expor publicamente)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente — configure .env.local',
    );
  }
  _admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

export function isAdminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
