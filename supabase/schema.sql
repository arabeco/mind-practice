-- ============================================================
-- MindPractice — Supabase schema
-- Rodar no SQL Editor do Supabase depois de criar o projeto.
--
-- Abordagem: blob JSON em `game_state.state_json`. Simples, sem
-- migração de banco toda vez que adicionamos feature client-side.
-- O schema do blob é definido em src/types/game.ts (GameState).
--
-- Social (amigos + feed) ficam em tabelas dedicadas porque precisam
-- de leitura cruzada (você lê o profile/feed do seu amigo).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES (1:1 com auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Jogador' check (char_length(nickname) between 1 and 20),
  avatar_variant text not null default 'masculino' check (avatar_variant in ('masculino', 'feminino')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- índice pra busca por nickname (case-insensitive)
create index if not exists profiles_nickname_idx on public.profiles (lower(nickname));

-- ------------------------------------------------------------
-- 2. GAME STATE (blob JSON — sincroniza cliente)
-- ------------------------------------------------------------
create table if not exists public.game_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. FRIENDSHIPS (pares ordenados com status)
-- ------------------------------------------------------------
-- Uma linha por request. requester pediu, addressee aceita/rejeita.
-- status: 'pending' (aguardando), 'accepted' (amigos), 'blocked' (futuro).
-- Garantia: no máximo uma linha por par ordenado (requester < addressee).
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

-- ------------------------------------------------------------
-- 4. FEED EVENTS (ações geradas automaticamente pelo app)
-- ------------------------------------------------------------
-- Cada usuário escreve eventos seus. Amigos leem os eventos uns dos outros.
-- kind: 'deck_completed' | 'archetype_changed' | 'level_up' | 'streak_milestone' | ...
-- payload: jsonb livre (deckId, archetype, score, etc)
create table if not exists public.feed_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feed_events_user_idx on public.feed_events (user_id, created_at desc);
create index if not exists feed_events_created_idx on public.feed_events (created_at desc);

-- ------------------------------------------------------------
-- 5. TRIGGERS
-- ------------------------------------------------------------

-- auto-atualiza updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists game_state_updated_at on public.game_state;
create trigger game_state_updated_at before update on public.game_state
  for each row execute function public.touch_updated_at();

drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at before update on public.friendships
  for each row execute function public.touch_updated_at();

-- auto-cria profile no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'Jogador'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.game_state enable row level security;
alter table public.friendships enable row level security;
alter table public.feed_events enable row level security;

-- PROFILES: qualquer autenticado lê (pra buscar amigos), só dono edita.
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Authed read profiles" on public.profiles;
create policy "Authed read profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- GAME STATE: só dono lê/escreve.
drop policy if exists "Users read own state" on public.game_state;
create policy "Users read own state" on public.game_state
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own state" on public.game_state;
create policy "Users insert own state" on public.game_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own state" on public.game_state;
create policy "Users update own state" on public.game_state
  for update using (auth.uid() = user_id);

-- FRIENDSHIPS:
-- - Ler: só quem está na linha (requester OU addressee).
-- - Criar: requester tem que ser eu (auth.uid()).
-- - Atualizar: addressee aceita/rejeita; ou qualquer um dos dois atualiza (ex: blocked).
-- - Deletar: qualquer um dos dois remove a amizade.
drop policy if exists "Friendships read involved" on public.friendships;
create policy "Friendships read involved" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Friendships insert as requester" on public.friendships;
create policy "Friendships insert as requester" on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "Friendships update involved" on public.friendships;
create policy "Friendships update involved" on public.friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Friendships delete involved" on public.friendships;
create policy "Friendships delete involved" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- FEED EVENTS:
-- - Ler: autor OU qualquer amigo aceito (bidirecional).
-- - Escrever: só o autor escreve (user_id = auth.uid()).
drop policy if exists "Feed read self or friends" on public.feed_events;
create policy "Feed read self or friends" on public.feed_events
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = feed_events.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = feed_events.user_id)
        )
    )
  );

drop policy if exists "Feed insert own" on public.feed_events;
create policy "Feed insert own" on public.feed_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "Feed delete own" on public.feed_events;
create policy "Feed delete own" on public.feed_events
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- PUSH NOTIFICATIONS (hibrido: web VAPID + FCM para Capacitor)
-- ------------------------------------------------------------

create table if not exists public.push_registrations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('web', 'fcm')),
  -- web push: campos da PushSubscription
  endpoint     text,
  p256dh       text,
  auth_key     text,
  -- fcm (Capacitor): device token
  fcm_token    text,
  user_agent   text,
  platform     text,                        -- 'web' | 'android' | 'ios'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- unicidade por canal (mesma subscription nao duplica)
create unique index if not exists push_reg_web_unique
  on public.push_registrations (user_id, endpoint) where endpoint is not null;
create unique index if not exists push_reg_fcm_unique
  on public.push_registrations (user_id, fcm_token) where fcm_token is not null;
create index if not exists push_registrations_user_idx
  on public.push_registrations(user_id);

alter table public.push_registrations enable row level security;

drop policy if exists "Push reg read own" on public.push_registrations;
create policy "Push reg read own" on public.push_registrations
  for select using (auth.uid() = user_id);

drop policy if exists "Push reg insert own" on public.push_registrations;
create policy "Push reg insert own" on public.push_registrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Push reg update own" on public.push_registrations;
create policy "Push reg update own" on public.push_registrations
  for update using (auth.uid() = user_id);

drop policy if exists "Push reg delete own" on public.push_registrations;
create policy "Push reg delete own" on public.push_registrations
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- CAMPAIGN NOTIFICATIONS (dedupe do cron scene-unlock)
-- ------------------------------------------------------------
-- Edge Function send-scene-unlock varre game_state.state_json->'campaigns'
-- e manda push quando a cena destrava (>24h desde ultimo answered). Essa
-- tabela guarda "ja avisei esse user dessa virada" pra nao spammar.
--
-- Chave: (user_id, season_id, last_answered_at) — se o user responde
-- de novo, last_answered_at muda e a gente volta a poder notificar.
create table if not exists public.campaign_notifications (
  user_id            uuid not null references auth.users(id) on delete cascade,
  season_id          text not null,
  last_answered_at   timestamptz not null,
  notified_at        timestamptz not null default now(),
  primary key (user_id, season_id, last_answered_at)
);

create index if not exists campaign_notif_user_idx
  on public.campaign_notifications(user_id, notified_at desc);

alter table public.campaign_notifications enable row level security;

-- Só service role (cron) escreve aqui. Usuário lê o próprio histórico.
drop policy if exists "Campaign notif read own" on public.campaign_notifications;
create policy "Campaign notif read own" on public.campaign_notifications
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Pronto. Configurar em Auth > Providers:
--   - Email            → habilitar (Confirm email = OFF)
--   - Google OAuth     → habilitar com client_id/secret
--
-- Depois copiar URL + publishable key para .env.local:
--   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
--   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
-- ------------------------------------------------------------
