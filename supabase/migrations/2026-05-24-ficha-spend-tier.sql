-- ============================================================
-- MindPractice — Compra de tier (Pro/Founder) com fichas
-- ============================================================
-- Permite ao usuário trocar fichas acumuladas por Pro mensal (30d)
-- ou Founder (vitalício). Sem rede, sem Google Play — gasto interno
-- atômico no Supabase.
--
-- Idempotente. Pode rodar várias vezes.

-- ============================================================
-- 1. Tabela ficha_spend_log (audit de compras com fichas)
-- ============================================================
create table if not exists public.ficha_spend_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_code text not null check (tier_code in ('pro','founder')),
  fichas_spent int not null check (fichas_spent > 0),
  fichas_before int not null,
  fichas_after int not null,
  tier_expires_at timestamptz,  -- null = vitalício
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ficha_spend_log_user_idx
  on public.ficha_spend_log (user_id, created_at desc);

alter table public.ficha_spend_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ficha_spend_log'
      and policyname = 'ficha_spend_read_own'
  ) then
    create policy ficha_spend_read_own on public.ficha_spend_log
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- 2. RPC purchase_tier_with_fichas
-- ============================================================
-- Atomicamente:
--   1. Lê saldo de fichas do game_state.state_json->'wallet'->>'fichas'
--   2. Verifica que tem fichas suficientes
--   3. Deduz fichas no game_state
--   4. Insere/atualiza subscriptions.tier
--   5. Loga em ficha_spend_log
--
-- Tudo em uma transação. Lock no game_state evita race condition.
--
-- Catálogo hardcoded server-side (defesa: cliente NUNCA é autoridade):
--   pro     → 1000 fichas, 30 dias
--   founder → 8000 fichas, vitalício
--
-- Retorna: jsonb com success, tier, fichas_after, expires_at.

create or replace function public.purchase_tier_with_fichas(
    p_tier_code text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_user_id uuid := auth.uid();
    v_state public.game_state%rowtype;
    v_current_fichas int;
    v_price_fichas int;
    v_duration_days int;
    v_new_fichas int;
    v_expires_at timestamptz;
    v_total_earned int;
    v_total_spent int;
    v_new_state jsonb;
begin
    -- 1. Auth obrigatório
    if v_user_id is null then
        raise exception 'USER_REQUIRED' using errcode = 'P0001';
    end if;

    -- 2. Catálogo server-side (defesa em profundidade)
    case p_tier_code
        when 'pro' then
            v_price_fichas := 400;   -- economia v2 (era 1000)
            v_duration_days := 30;
        when 'founder' then
            v_price_fichas := 2500;  -- economia v2 (era 8000)
            v_duration_days := null; -- vitalício
        else
            raise exception 'UNKNOWN_TIER:%', p_tier_code using errcode = 'P0001';
    end case;

    -- 3. Lock no game_state pra evitar race condition
    select * into v_state
    from public.game_state
    where user_id = v_user_id
    for update;

    if not found then
        raise exception 'GAME_STATE_NOT_FOUND' using errcode = 'P0001';
    end if;

    -- 4. Extrai saldo atual do jsonb
    v_current_fichas := coalesce((v_state.state_json->'wallet'->>'fichas')::int, 0);
    v_total_earned   := coalesce((v_state.state_json->'wallet'->>'totalEarned')::int, 0);
    v_total_spent    := coalesce((v_state.state_json->'wallet'->>'totalSpent')::int, 0);

    -- 5. Confere saldo
    if v_current_fichas < v_price_fichas then
        raise exception 'INSUFFICIENT_FICHAS:have=%,need=%', v_current_fichas, v_price_fichas
            using errcode = 'P0001';
    end if;

    -- 6. Calcula novos valores
    v_new_fichas := v_current_fichas - v_price_fichas;
    v_expires_at := case
        when v_duration_days is null then null
        else now() + (v_duration_days || ' days')::interval
    end;

    -- 7. Atualiza wallet no game_state (atômico via jsonb_set)
    v_new_state := v_state.state_json;
    v_new_state := jsonb_set(v_new_state, '{wallet,fichas}', to_jsonb(v_new_fichas));
    v_new_state := jsonb_set(v_new_state, '{wallet,totalSpent}', to_jsonb(v_total_spent + v_price_fichas));

    update public.game_state
    set state_json = v_new_state,
        updated_at = now()
    where user_id = v_user_id;

    -- 8. Upsert tier na subscriptions
    insert into public.subscriptions (
        user_id, tier, status, current_period_end, updated_at
    ) values (
        v_user_id,
        p_tier_code,
        'active',
        v_expires_at,
        now()
    )
    on conflict (user_id) do update
    set tier = excluded.tier,
        status = 'active',
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = false,
        updated_at = now();

    -- 9. Audit log
    insert into public.ficha_spend_log (
        user_id, tier_code, fichas_spent,
        fichas_before, fichas_after, tier_expires_at,
        metadata
    ) values (
        v_user_id, p_tier_code, v_price_fichas,
        v_current_fichas, v_new_fichas, v_expires_at,
        jsonb_build_object(
            'duration_days', v_duration_days,
            'source', 'fichas'
        )
    );

    -- 10. Retorna resultado
    return jsonb_build_object(
        'success', true,
        'tier', p_tier_code,
        'fichas_spent', v_price_fichas,
        'fichas_before', v_current_fichas,
        'fichas_after', v_new_fichas,
        'tier_expires_at', v_expires_at
    );
end;
$$;

-- ============================================================
-- 3. Permissões da RPC
-- ============================================================
-- Permitido: usuário autenticado chama via auth.uid()
-- Bloqueado: anônimo
revoke all on function public.purchase_tier_with_fichas(text) from public, anon;
grant execute on function public.purchase_tier_with_fichas(text) to authenticated;
