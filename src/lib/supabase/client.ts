import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Aceita os dois nomes: `PUBLISHABLE_KEY` (formato novo do Supabase, sb_publishable_*)
// e `ANON_KEY` (formato legado, JWT eyJ...). Um dos dois basta.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (singleton).
 * Returns null when env vars aren't set — the app gracefully degrades
 * to localStorage-only mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!_client) _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}
