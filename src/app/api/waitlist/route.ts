/**
 * POST /api/waitlist
 *
 * Body: { email: string, source?: string, archetypeHint?: string }
 * Response: { ok: boolean }
 *
 * Insere email na tabela `waitlist`. RLS permite insert anônimo.
 * Idempotente — se email já existe (unique constraint), retorna ok.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

interface WaitlistBody {
  email?: string;
  source?: string;
  archetypeHint?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: 'Backend não configurado' }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as WaitlistBody;
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Email inválido' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('waitlist')
    .insert({
      email,
      source: body.source ?? null,
      archetype_hint: body.archetypeHint ?? null,
    })
    .select()
    .maybeSingle();

  // 23505 = unique violation (email já existe). Trata como sucesso silencioso.
  if (error && error.code !== '23505') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
