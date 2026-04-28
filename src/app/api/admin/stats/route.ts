/**
 * GET /api/admin/stats
 *
 * Headers: Authorization: Bearer <access_token>
 *
 * Retorna métricas de produto. Auth: env var ADMIN_USER_ID controla
 * quem pode acessar (compare com auth.uid). Sem essa env, 503.
 *
 * Counts:
 *   - profiles_total
 *   - waitlist_total
 *   - subscriptions_by_tier { free, pro, founder }
 *   - referrals_signed_up, referrals_converted
 *   - decks_completed_total (sum over all snapshots — proxy via feed_events)
 *
 * Tudo via service role (admin client). Lê snapshot dos counts SEM
 * baixar todas as rows.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Backend não configurado' }, { status: 503 });
  }

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId) {
    return NextResponse.json(
      { error: 'ADMIN_USER_ID não configurado em .env.local' },
      { status: 503 },
    );
  }

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
  if (!user || user.id !== adminUserId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // Helper: count com erro silencioso
  const countOf = async (table: string, filter?: { col: string; val: string }) => {
    const q = admin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q.eq(filter.col, filter.val);
    const { count } = await q;
    return count ?? 0;
  };

  const [
    profilesTotal,
    waitlistTotal,
    subsActive,
    subsPro,
    subsFounder,
    referralsSignedUp,
    referralsConverted,
    feedEventsTotal,
  ] = await Promise.all([
    countOf('profiles'),
    countOf('waitlist'),
    countOf('subscriptions', { col: 'status', val: 'active' }),
    countOf('subscriptions', { col: 'tier', val: 'pro' }),
    countOf('subscriptions', { col: 'tier', val: 'founder' }),
    countOf('referrals', { col: 'status', val: 'signed_up' }),
    countOf('referrals', { col: 'status', val: 'converted' }),
    countOf('feed_events'),
  ]);

  // Deck completions = feed_events com kind='deck_completed'
  const { count: decksCompletedCount } = await admin
    .from('feed_events')
    .select('*', { count: 'exact', head: true })
    .eq('kind', 'deck_completed');

  return NextResponse.json({
    profiles_total: profilesTotal,
    waitlist_total: waitlistTotal,
    subs_active: subsActive,
    subs_pro: subsPro,
    subs_founder: subsFounder,
    referrals_signed_up: referralsSignedUp,
    referrals_converted: referralsConverted,
    feed_events_total: feedEventsTotal,
    decks_completed: decksCompletedCount ?? 0,
  });
}
