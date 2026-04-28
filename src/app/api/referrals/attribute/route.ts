/**
 * POST /api/referrals/attribute
 *
 * Body: { code: string }
 * Headers: Authorization: Bearer <access_token>
 *
 * Linka o user logado (referred_id) à row `referrals` com o código dado.
 * Idempotente: se já tem referred_id, retorna sem mudar.
 *
 * Use service role (bypassa RLS pra fazer update cross-user).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

interface Body {
  code?: string;
}

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Backend não configurado' }, { status: 503 });
  }

  // Auth: extrai user do token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Code ausente' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Acha a row anchor (referrer com esse code, sem referred_id ainda)
  const { data: row } = await admin
    .from('referrals')
    .select('*')
    .eq('code', code)
    .is('referred_id', null)
    .maybeSingle();

  if (!row) {
    // Code não existe ou já foi usado
    return NextResponse.json({ ok: false, error: 'Código inválido ou já usado' }, { status: 404 });
  }

  // Não pode auto-referir
  if (row.referrer_id === user.id) {
    return NextResponse.json({ ok: false, error: 'Não pode usar próprio código' }, { status: 400 });
  }

  // Atribui referred_id e bumpa status
  const { error } = await admin
    .from('referrals')
    .update({
      referred_id: user.id,
      status: 'signed_up',
    })
    .eq('id', row.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
