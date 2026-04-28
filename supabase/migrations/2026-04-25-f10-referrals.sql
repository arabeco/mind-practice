-- F10.2 — Referrals + admin reads
--
-- Cada user pode ter UM código (1 row, criada lazy).
-- Quando alguém se inscreve via link `/r/[code]`, criamos referral row
-- linkando referrer e referred. Reward é manual no MVP — webhook futuro
-- vai detectar status='converted' e dar 7d Pro grátis.
--
-- Idempotente.

-- ============================================================
-- referrals (1 row por convite)
-- ============================================================
create table if not exists public.referrals (
  id bigserial primary key,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete set null,
  code text not null unique,
  status text not null default 'pending'
    check (status in ('pending','signed_up','converted')),
  reward_granted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id);

create index if not exists referrals_code_idx
  on public.referrals (code);

alter table public.referrals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'referrals'
      and policyname = 'refs_read_own'
  ) then
    -- User só lê os próprios referrals (como referrer ou referred)
    create policy refs_read_own on public.referrals
      for select using (
        auth.uid() = referrer_id or auth.uid() = referred_id
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'referrals'
      and policyname = 'refs_insert_own'
  ) then
    -- User pode criar o próprio referral code
    create policy refs_insert_own on public.referrals
      for insert with check (auth.uid() = referrer_id);
  end if;

  -- Update via service role (atribui referred_id quando alguém se inscreve)
end $$;

-- ============================================================
-- Realtime: opcional pra rewards aparecerem ao vivo
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'referrals'
  ) then
    alter publication supabase_realtime add table public.referrals;
  end if;
end $$;
