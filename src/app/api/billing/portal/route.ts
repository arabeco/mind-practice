/**
 * POST /api/billing/portal
 *
 * Body: { returnUrl?: string }
 * Response: { url: string } — Stripe Customer Portal URL pra redirect.
 *
 * Permite ao usuário gerenciar a assinatura: cancelar, atualizar cartão,
 * ver invoices. Stripe nativo, zero código nosso.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface PortalBody {
  returnUrl?: string;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !isAdminConfigured()) {
    return NextResponse.json({ error: 'Billing não configurado' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const sbUserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: { user } } = await sbUserClient.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Sem assinatura ativa pra gerenciar' },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as PortalBody;
  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: body.returnUrl ?? `${origin}/assinatura`,
  });

  return NextResponse.json({ url: session.url });
}
