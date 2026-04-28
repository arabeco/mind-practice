'use client';

/**
 * Referrals — código único por user, link de convite, atribuição
 * pós-signup, lookup de stats.
 *
 * Fluxo:
 *   1. User logado consulta `getOrCreateMyReferralCode()` → retorna seu code
 *   2. Compartilha link `/r/[code]` (preview com nick do convidador)
 *   3. Pessoa nova abre o link → /r/[code] salva no localStorage e redireciona
 *      pra /login (ou /)
 *   4. Após SIGN_UP, `attributeReferralOnSignup()` lê localStorage e cria
 *      a row `referrals` linkando referrer + referred (status='signed_up')
 *   5. Quando referred upgrade pra Pro/Founder, status muda pra 'converted'
 *      (manual via Stripe webhook ou cron — F10.3)
 *
 * Cliente faz tudo via RLS (read+insert own). Update do referred_id no
 * signup é via service role admin route.
 */
import { getSupabase } from './client';

export interface ReferralRow {
  id: number;
  referrer_id: string;
  referred_id: string | null;
  code: string;
  status: 'pending' | 'signed_up' | 'converted';
  reward_granted: boolean;
  created_at: string;
}

const REFERRAL_STORAGE_KEY = 'mindpractice_pending_referral_code';

function generateCode(): string {
  // 6 caracteres alfanuméricos amigáveis (sem 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/**
 * Pega ou cria o referral code do usuário logado. Idempotente:
 * se já existe row com referrer_id=user e referred_id=null e
 * status=pending, retorna ela. Senão cria.
 */
export async function getOrCreateMyReferralCode(): Promise<ReferralRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  // Tenta achar uma row "anchor" (sem referred_id, status pending)
  const { data: existing } = await sb
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .is('referred_id', null)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return existing as ReferralRow;

  // Cria nova com retry em colisão de code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await sb
      .from('referrals')
      .insert({ referrer_id: user.id, code, status: 'pending' })
      .select()
      .single();
    if (data) return data as ReferralRow;
    if (error?.code !== '23505') {
      // erro diferente de unique violation, aborta
      return null;
    }
    // collision, tenta de novo
  }
  return null;
}

/**
 * Lista referrals onde o user é referrer (estatísticas pro user
 * ver quantos amigos convidou).
 */
export async function listMyReferralsAsReferrer(): Promise<ReferralRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data } = await sb
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as ReferralRow[];
}

/**
 * Salva o código no localStorage. Chamado por /r/[code] na chegada.
 */
export function rememberReferralCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code.toUpperCase());
  } catch {
    /* storage bloqueado */
  }
}

export function getRememberedReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* */
  }
}

/**
 * Após signup confirmado, chama esta função pra atribuir o referral.
 * Server-side cria a linkagem via /api/referrals/attribute (admin).
 *
 * No-op se não tem code armazenado.
 */
export async function attributeReferralOnSignup(): Promise<{ ok: boolean }> {
  const code = getRememberedReferralCode();
  if (!code) return { ok: false };

  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false };

  try {
    const resp = await fetch('/api/referrals/attribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    if (resp.ok) {
      clearReferralCode();
      return { ok: true };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
