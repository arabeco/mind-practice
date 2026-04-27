-- F9 — Waitlist (captura email pré-launch)
--
-- Email-only signup pra "entrar no beta". Insert anônimo permitido
-- (RLS allow all on insert). Read restrito ao service role.
--
-- Idempotente.

create table if not exists public.waitlist (
  id bigserial primary key,
  email text not null unique,
  source text,
  archetype_hint text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_created_idx
  on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'waitlist'
      and policyname = 'waitlist_insert_anon'
  ) then
    -- Permite insert anônimo (signup público sem auth)
    create policy waitlist_insert_anon on public.waitlist
      for insert with check (true);
  end if;
  -- Sem policy de SELECT — só service role lê (admin via Supabase Studio).
end $$;
