-- F6.2 — Leaderboard por season
--
-- Tabela `season_scores` guarda o score de cada (user, season). Cliente
-- recalcula localmente e faz upsert. Score é vanity (RLS write own only),
-- anti-cheat fica pra F7+ se necessário.
--
-- Idempotente.

create table if not exists public.season_scores (
  season_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null default 0,
  archetype_id text,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create index if not exists season_scores_rank_idx
  on public.season_scores (season_id, score desc, updated_at asc);

-- RLS: leitura pública (ranking visível pra todos),
-- escrita só do dono.
alter table public.season_scores enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'season_scores'
      and policyname = 'season_scores_read'
  ) then
    create policy season_scores_read on public.season_scores
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'season_scores'
      and policyname = 'season_scores_insert'
  ) then
    create policy season_scores_insert on public.season_scores
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'season_scores'
      and policyname = 'season_scores_update'
  ) then
    create policy season_scores_update on public.season_scores
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- Adiciona ao publication realtime (clientes podem subscrever às mudanças).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'season_scores'
  ) then
    alter publication supabase_realtime add table public.season_scores;
  end if;
end $$;
