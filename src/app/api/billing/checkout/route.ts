/**
 * POST /api/billing/checkout
 *
 * Body: { tier: 'pro' | 'founder', returnUrl?: string }
 * Response: { url: string } (Stripe Checkout Session URL pra redirect)
 *
 * Cria Stripe Checkout Session pro tier solicitado:
 *   - 'pro' → subscription mensal com 7-day trial
 *   - 'founder' → one-time payment vitalício
 *
 * Aceita cartão + PIX (Stripe BR). Cliente é resolvido por
 * stripe_customer_id em `subscriptions` (cria novo se ausente).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getStripe, isStripeConfigured, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface CheckoutBody {
  tier?: 'pro' | 'founder';
  returnUrl?: string;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Billing não configurado' },
      { status: 503 },
    );
  }

  // Auth — pega user via header Authorization (cliente envia bearer)
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

  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const tier = body.tier;
  if (tier !== 'pro' && tier !== 'founder') {
    return NextResponse.json({ error: 'Tier inválido' }, { status: 400 });
  }

  const stripe = getStripe();
  const admin = getSupabaseAdmin();

  // Resolve ou cria stripe_customer_id
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        tier: 'free',
        status: 'active',
      },
      { onConflict: 'user_id' },
    );
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin;
  const successUrl = `${body.returnUrl ?? `${origin}/assinatura/sucesso`}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/assinatura?canceled=1`;

  const priceId =
    tier === 'pro' ? STRIPE_PRICE_IDS.pro() : STRIPE_PRICE_IDS.founder();
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID não configurado pra ${tier}` },
      { status: 503 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: tier === 'pro' ? 'subscription' : 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ['card', 'pix'],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.id,
    metadata: { tier, supabase_user_id: user.id },
    ...(tier === 'pro'
      ? {
          subscription_data: {
            trial_period_days: 7,
            metadata: { tier, supabase_user_id: user.id },
          },
        }
      : {}),
  });

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe não retornou URL' },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
