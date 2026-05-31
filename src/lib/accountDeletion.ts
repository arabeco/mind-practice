// ============================================================
// Account deletion — client side
// Chama a Edge Function delete-account que:
//   1. Apaga todas as linhas public.* desse user (RPC)
//   2. Apaga a linha em auth.users (service role)
// LGPD art. 18 + Google Play Data Safety.
// ============================================================

import { getSupabase } from '@/lib/supabase/client';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export async function deleteAccountRequest(): Promise<DeleteAccountResult> {
  const sb = getSupabase();
  if (!sb) {
    return { success: false, error: 'Supabase indisponivel' };
  }

  const { data: { session } } = await sb.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    return { success: false, error: 'Sessao expirada — faca login novamente' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL ausente' };
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      return {
        success: false,
        error: data?.error
          ? `${data.error}${data.detail ? `: ${data.detail}` : ''}`
          : `HTTP ${resp.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
