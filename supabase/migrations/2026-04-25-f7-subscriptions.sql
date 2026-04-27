-- F7.1 — Subscriptions + Purchases (Stripe paywall)
--
-- `subscriptions` guarda o tier ativo de cada user (1 row por user).
-- Updates só via webhook (service role); cliente lê own row via RLS.
--
-- `purchases` é log append-only de transações one-shot (runs pack,
-- founder vitalício). Idempotente via stripe_session_id unique.
--
-- Idempotente — pode rodar várias vezes.

-- ============================================================
-- subscriptions
-- ============================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free','pro','founder')),
  status text not null default 'active'
    check (status in ('active','past_due','canceled','trialing','incomplete')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
      and policyname = 'subs_read_own'
  ) then
    create policy subs_read_own on public.subscriptions
      for select using (auth.uid() = user_id);
  end if;
  -- writes só via service role (webhook). Não criamos policy de insert/update
  -- pra usuário comum — service role bypassa RLS.
end $$;

-- ============================================================
-- purchases (log append-only de one-shot purchases)
-- ============================================================
create table if not exists public.purchases (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('runs_pack','founder','deck','season_pass')),
  amount_cents int not null,
  currency text not null default 'brl',
  stripe_session_id text unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);

alter table public.purchases enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchases'
      and policyname = 'purchases_read_own'
  ) then
    create policy purchases_read_own on public.purchases
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- Realtime: cliente subscreve a mudanças no próprio tier
-- (ex: webhook upgrada Pro → UI desbloqueia em ~1s)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
