-- ============================================================
-- MindPractice — Supabase schema
-- Run this in the Supabase SQL editor after creating your project.
-- ============================================================

-- Profiles (one per auth user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Jogador',
  avatar_variant int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game state (serialized JSON blob — simple, no migrations needed)
create table if not exists game_state (
  user_id uuid primary key references profiles(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Jogador')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at auto-touch
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function touch_updated_at();

create trigger game_state_updated_at before update on game_state
  for each row execute function touch_updated_at();

-- RLS (Row Level Security)
alter table profiles enable row level security;
alter table game_state enable row level security;

-- Users can only read/write their own data
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users read own state" on game_state
  for select using (auth.uid() = user_id);

create policy "Users upsert own state" on game_state
  for insert with check (auth.uid() = user_id);

create policy "Users update own state" on game_state
  for update using (auth.uid() = user_id);
