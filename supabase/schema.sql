-- ============================================================
-- MindPractice — Supabase schema
-- Rodar no SQL Editor do Supabase depois de criar o projeto.
--
-- Abordagem: blob JSON em `game_state.state_json`. Simples, sem
-- migração de banco toda vez que adicionamos feature client-side.
-- O schema do blob é definido em src/types/game.ts (GameState).
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

-- ------------------------------------------------------------
-- 2. GAME STATE (blob JSON — sincroniza cliente)
-- ------------------------------------------------------------
create table if not exists public.game_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. TRIGGERS
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

-- auto-cria profile no signup (pega nickname do metadata se existir)
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
-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.game_state enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users read own state" on public.game_state;
create policy "Users read own state" on public.game_state
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own state" on public.game_state;
create policy "Users insert own state" on public.game_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own state" on public.game_state;
create policy "Users update own state" on public.game_state
  for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Pronto. Configurar em Auth > Providers:
--   - Email (magic link)     → habilitar
--   - Google OAuth           → habilitar com client_id/secret
--
-- Depois copiar URL + anon key para .env.local:
--   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
-- ------------------------------------------------------------
