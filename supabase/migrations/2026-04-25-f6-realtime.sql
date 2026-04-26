-- F6.1 — Realtime feed + friendships
--
-- Habilita o publication `supabase_realtime` para que o cliente possa
-- subscrever via Supabase Realtime aos INSERTs em `feed_events` e
-- `friendships`. As tabelas e RLS já existem em supabase/schema.sql;
-- esta migration apenas adiciona elas ao publication.
--
-- Como rodar:
--   1. Abrir Supabase Studio → SQL Editor
--   2. Cole o conteúdo abaixo e Run
--   OU
--   1. supabase db push (se usar CLI linkado)
--
-- Idempotente: se a tabela já está no publication, ALTER... ADD é no-op
-- (Postgres > 14 trata como duplicate sem erro).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'feed_events'
  ) then
    alter publication supabase_realtime add table public.feed_events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;
