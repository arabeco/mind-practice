-- MindPractice Schema v1
-- Designed for Supabase (Postgres + RLS)

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Jogador' check (char_length(nickname) between 1 and 20),
  avatar_variant text not null default 'masculino' check (avatar_variant in ('masculino', 'feminino')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- WALLETS (1:1 with profile)
-- ============================================================
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  fichas integer not null default 20 check (fichas >= 0),
  last_daily_claim date,
  total_earned integer not null default 20,
  total_spent integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
create policy "Users can read own wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "Users can update own wallet" on public.wallets for update using (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS (ledger — every fichas movement)
-- ============================================================
create type public.transaction_reason as enum (
  'initial_grant',     -- 20 fichas on signup
  'daily_claim',       -- +10/day
  'purchase_deck',     -- spent on deck
  'purchase_mission',  -- spent on special mission
  'refund',            -- admin refund
  'promo',             -- promotional grant
  'iap'                -- in-app purchase (real money)
);

create table public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, -- positive = earned, negative = spent
  reason public.transaction_reason not null,
  reference_id text,       -- deck_id, mission_id, iap receipt, etc.
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_user on public.transactions(user_id, created_at desc);

alter table public.transactions enable row level security;
create policy "Users can read own transactions" on public.transactions for select using (auth.uid() = user_id);
-- inserts handled by server/edge functions only

-- ============================================================
-- PURCHASES (what user owns)
-- ============================================================
create type public.purchase_type as enum ('deck', 'mission', 'cosmetic');

create table public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type public.purchase_type not null,
  item_id text not null,          -- deck_id, mission_id, etc.
  price_paid integer not null,    -- fichas spent (0 = free)
  transaction_id bigint references public.transactions(id),
  created_at timestamptz not null default now(),
  unique(user_id, item_type, item_id) -- can't buy same item twice
);

create index idx_purchases_user on public.purchases(user_id);

alter table public.purchases enable row level security;
create policy "Users can read own purchases" on public.purchases for select using (auth.uid() = user_id);

-- ============================================================
-- CALIBRATION (game state — synced from client)
-- ============================================================
create table public.calibrations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  axes jsonb not null default '{"vigor":0,"harmonia":0,"filtro":0,"presenca":0,"desapego":0}',
  total_responses integer not null default 0,
  recent_weights jsonb not null default '{}',
  snapshots jsonb not null default '[]',
  completed_decks jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.calibrations enable row level security;
create policy "Users can read own calibration" on public.calibrations for select using (auth.uid() = user_id);
create policy "Users can update own calibration" on public.calibrations for update using (auth.uid() = user_id);

-- ============================================================
-- DECK CATALOG (admin-managed, public read)
-- ============================================================
create table public.deck_catalog (
  deck_id text primary key,
  name text not null,
  category text not null check (category in ('essencial', 'arquetipo', 'cenario')),
  tier integer not null default 1 check (tier between 1 and 5),
  price_fichas integer not null default 0, -- 0 = free
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.deck_catalog enable row level security;
create policy "Anyone can read active decks" on public.deck_catalog for select using (is_active = true);

-- Seed free decks
insert into public.deck_catalog (deck_id, name, category, tier, price_fichas) values
  ('basic_01', 'Primeiro Contato', 'essencial', 1, 0),
  ('holofote', 'Holofote', 'arquetipo', 2, 10),
  ('alta_tensao', 'Alta Tensao', 'cenario', 2, 15),
  ('profissional', 'Profissional', 'cenario', 3, 25),
  ('social', 'Social', 'cenario', 3, 35),
  ('livro_amaldicoado', 'Livro Amaldicoado', 'cenario', 5, 50);

-- ============================================================
-- HELPER: auto-create profile + wallet on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.wallets (user_id) values (new.id);
  insert into public.calibrations (user_id) values (new.id);
  insert into public.transactions (user_id, amount, reason, balance_after)
    values (new.id, 20, 'initial_grant', 20);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- HELPER: daily claim edge function support
-- ============================================================
create or replace function public.claim_daily_fichas(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
  v_last_claim date;
  v_new_balance integer;
begin
  select last_daily_claim into v_last_claim
    from public.wallets where user_id = p_user_id for update;

  if v_last_claim is not null and v_last_claim >= v_today then
    return -1; -- already claimed
  end if;

  update public.wallets
    set fichas = fichas + 10,
        last_daily_claim = v_today,
        total_earned = total_earned + 10,
        updated_at = now()
    where user_id = p_user_id
    returning fichas into v_new_balance;

  insert into public.transactions (user_id, amount, reason, balance_after)
    values (p_user_id, 10, 'daily_claim', v_new_balance);

  return v_new_balance;
end;
$$;
