/**
 * POST /api/billing/webhook
 *
 * Recebe events do Stripe, valida signature, e atualiza:
 *   - `subscriptions` table (tier, status, current_period_end)
 *   - `purchases` table (one-time payments tipo founder)
 *
 * Configurar no Stripe Dashboard:
 *   Endpoint: https://<seu-dominio>/api/billing/webhook
 *   Events:
 *     - checkout.session.completed
 *     - customer.subscription.created
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.paid
 *     - invoice.payment_failed
 *
 * Validação: stripe-signature header + STRIPE_WEBHOOK_SECRET.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
// Importante: Next 13+ por padrão consome o body como JSON. Stripe precisa
// do body raw pra validar signature. `dynamic = 'force-dynamic'` + leitura
// via `req.text()` resolve.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !isAdminConfigured()) {
    return NextResponse.json({ error: 'Billing não configurado' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Faltando stripe-signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature inválida';
    return NextResponse.json({ error: `Webhook signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Ignora silenciosamente events que não tratamos
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] erro processando event', event.type, err);
    return NextResponse.json({ error: 'Erro processando event' }, { status: 500 });
  }
}

// ============================================================
// Handlers
// ============================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const admin = getSupabaseAdmin();
  const userId =
    session.client_reference_id ??
    (session.metadata?.supabase_user_id as string | undefined);
  if (!userId) {
    console.warn('[webhook] checkout.session.completed sem supabase_user_id');
    return;
  }

  // Founder = one-time payment. Subscription é tratada em customer.subscription.*
  const tier = session.metadata?.tier as string | undefined;
  if (session.mode === 'payment' && tier === 'founder') {
    // Upsert subscription com tier='founder', status='active', sem period_end
    await admin.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_customer_id: session.customer as string,
        tier: 'founder',
        status: 'active',
        current_period_end: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    // Log purchase
    await admin.from('purchases').upsert(
      {
        user_id: userId,
        kind: 'founder',
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? 'brl',
        stripe_session_id: session.id,
        payload: { metadata: session.metadata ?? {} },
      },
      { onConflict: 'stripe_session_id' },
    );
  }
  // Subscriptions (Pro) são processadas via customer.subscription.created
  // logo após o checkout.session.completed.
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const admin = getSupabaseAdmin();
  const userId = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Resolve user_id por customer_id se metadata ausente
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data: existing } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    resolvedUserId = existing?.user_id ?? null;
  }
  if (!resolvedUserId) {
    console.warn('[webhook] subscription change sem user_id resolvable', sub.id);
    return;
  }

  const tier = (sub.metadata?.tier as string | undefined) ?? 'pro';
  const status = mapStripeStatusToOurs(sub.status);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await admin.from('subscriptions').upsert(
    {
      user_id: resolvedUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      tier: tier === 'founder' ? 'founder' : 'pro',
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const admin = getSupabaseAdmin();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await admin
    .from('subscriptions')
    .update({
      tier: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const admin = getSupabaseAdmin();
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await admin
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);
}

function mapStripeStatusToOurs(s: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' {
  switch (s) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return s;
    case 'incomplete_expired':
    case 'unpaid':
      return 'past_due';
    default:
      return 'incomplete';
  }
}
