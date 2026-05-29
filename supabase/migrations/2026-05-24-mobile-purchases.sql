-- ============================================================
-- MindPractice — Mobile purchases (IAP via Google Play / App Store)
-- ============================================================
-- Tabela de audit log + RPC pra creditar benefits após Edge Function
-- validar o token com Google Play Developer API.
--
-- Patterns defensivos (do GOL 1.006):
--   - purchase_token UNIQUE → idempotência forte
--   - security definer + search_path → previne schema spoofing
--   - for update lock → previne race condition
--   - revoke from public/authenticated → SÓ service_role chama
--   - Validação tripla: catálogo, productId, package_name
--   - Dispatcher por benefit_kind (fichas, tier-temp, tier-lifetime)
--
-- Idempotente.

-- ============================================================
-- 1. Tabela mobile_purchases (audit log)
-- ============================================================
create table if not exists public.mobile_purchases (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_code text not null,             -- código do catálogo (ex: 'fichas_100')
  product_id text not null,               -- google_play_product_id ou app_store
  purchase_token text not null unique,    -- IDEMPOTÊNCIA: chave única
  order_id text,
  package_name text not null,
  platform text not null check (platform in ('android','ios')),
  purchase_state int,                     -- 0 = purchased
  acknowledged boolean default false,
  consumed boolean default false,
  benefit_kind text not null,             -- 'fichas' | 'tier'
  benefit_amount int,                     -- fichas qtd (se kind=fichas)
  benefit_tier text,                      -- 'pro' | 'founder' (se kind=tier)
  benefit_duration_days int,              -- 30 = mensal, null = vitalício
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create index if not exists mobile_purchases_user_idx
  on public.mobile_purchases (user_id, created_at desc);

create index if not exists mobile_purchases_token_idx
  on public.mobile_purchases (purchase_token);

alter table public.mobile_purchases enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mobile_purchases'
      and policyname = 'mobile_purchases_read_own'
  ) then
    create policy mobile_purchases_read_own on public.mobile_purchases
      for select using (auth.uid() = user_id);
  end if;
  -- Sem policy de insert/update — só service_role (via Edge Function).
end $$;

-- ============================================================
-- 2. RPC grant_mobile_purchase (creditar benefit + audit log)
-- ============================================================
-- Chamada pela Edge Function APÓS validar token com Google Play.
-- Idempotente via purchase_token UNIQUE + lock.
--
-- Dispatcher por benefit_kind:
--   'fichas' → soma em game_state.state_json.wallet.fichas
--   'tier'   → upsert subscriptions.tier (com expires_at se duration_days)

create or replace function public.grant_mobile_purchase(
    p_user_id uuid,
    p_product_code text,
    p_product_id text,
    p_purchase_token text,
    p_order_id text,
    p_package_name text,
    p_platform text default 'android',
    p_benefit_kind text default null,
    p_benefit_amount int default null,
    p_benefit_tier text default null,
    p_benefit_duration_days int default null,
    p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_existing public.mobile_purchases%rowtype;
    v_purchase_id bigint;
    v_state public.game_state%rowtype;
    v_current_fichas int;
    v_total_earned int;
    v_new_fichas int;
    v_new_state jsonb;
    v_expires_at timestamptz;
begin
    -- 1. Validações de input
    if p_user_id is null then
        raise exception 'USER_REQUIRED' using errcode = 'P0001';
    end if;
    if nullif(trim(coalesce(p_purchase_token, '')), '') is null then
        raise exception 'TOKEN_REQUIRED' using errcode = 'P0001';
    end if;
    if nullif(trim(coalesce(p_product_code, '')), '') is null then
        raise exception 'PRODUCT_CODE_REQUIRED' using errcode = 'P0001';
    end if;
    if nullif(trim(coalesce(p_product_id, '')), '') is null then
        raise exception 'PRODUCT_ID_REQUIRED' using errcode = 'P0001';
    end if;
    if p_benefit_kind not in ('fichas', 'tier') then
        raise exception 'UNKNOWN_BENEFIT_KIND:%', p_benefit_kind using errcode = 'P0001';
    end if;

    -- 2. Idempotência: já processado?
    select * into v_existing
    from public.mobile_purchases
    where purchase_token = p_purchase_token
    for update;

    if found then
        if v_existing.user_id <> p_user_id then
            raise exception 'TOKEN_ALREADY_USED' using errcode = 'P0001';
        end if;
        return jsonb_build_object(
            'success', true,
            'duplicate', true,
            'purchase_id', v_existing.id,
            'benefit_kind', v_existing.benefit_kind
        );
    end if;

    -- 3. Insere audit log
    insert into public.mobile_purchases (
        user_id, product_code, product_id, purchase_token,
        order_id, package_name, platform,
        benefit_kind, benefit_amount, benefit_tier, benefit_duration_days,
        metadata, validated_at
    ) values (
        p_user_id, p_product_code, p_product_id, p_purchase_token,
        p_order_id, p_package_name, p_platform,
        p_benefit_kind, p_benefit_amount, p_benefit_tier, p_benefit_duration_days,
        p_metadata, now()
    )
    returning id into v_purchase_id;

    -- 4. Dispatcher por benefit_kind
    case p_benefit_kind

        -- ============================================================
        -- FICHAS: soma no wallet.fichas do game_state
        -- ============================================================
        when 'fichas' then
            if p_benefit_amount is null or p_benefit_amount <= 0 then
                raise exception 'INVALID_FICHAS_AMOUNT:%', p_benefit_amount using errcode = 'P0001';
            end if;

            -- Lock no game_state pra evitar race com purchase_tier_with_fichas
            select * into v_state
            from public.game_state
            where user_id = p_user_id
            for update;

            if not found then
                raise exception 'GAME_STATE_NOT_FOUND' using errcode = 'P0001';
            end if;

            v_current_fichas := coalesce((v_state.state_json->'wallet'->>'fichas')::int, 0);
            v_total_earned   := coalesce((v_state.state_json->'wallet'->>'totalEarned')::int, 0);
            v_new_fichas := v_current_fichas + p_benefit_amount;

            v_new_state := v_state.state_json;
            v_new_state := jsonb_set(v_new_state, '{wallet,fichas}', to_jsonb(v_new_fichas));
            v_new_state := jsonb_set(v_new_state, '{wallet,totalEarned}', to_jsonb(v_total_earned + p_benefit_amount));

            update public.game_state
            set state_json = v_new_state,
                updated_at = now()
            where user_id = p_user_id;

            return jsonb_build_object(
                'success', true,
                'duplicate', false,
                'purchase_id', v_purchase_id,
                'benefit_kind', 'fichas',
                'fichas_added', p_benefit_amount,
                'fichas_before', v_current_fichas,
                'fichas_after', v_new_fichas
            );

        -- ============================================================
        -- TIER: upsert subscriptions
        -- ============================================================
        when 'tier' then
            if p_benefit_tier not in ('pro', 'founder') then
                raise exception 'INVALID_TIER:%', p_benefit_tier using errcode = 'P0001';
            end if;

            v_expires_at := case
                when p_benefit_duration_days is null then null
                else now() + (p_benefit_duration_days || ' days')::interval
            end;

            insert into public.subscriptions (
                user_id, tier, status, current_period_end, updated_at
            ) values (
                p_user_id,
                p_benefit_tier,
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

            return jsonb_build_object(
                'success', true,
                'duplicate', false,
                'purchase_id', v_purchase_id,
                'benefit_kind', 'tier',
                'tier', p_benefit_tier,
                'tier_expires_at', v_expires_at
            );

        else
            raise exception 'UNHANDLED_BENEFIT_KIND:%', p_benefit_kind using errcode = 'P0001';
    end case;
end;
$$;

-- ============================================================
-- 3. Permissões
-- ============================================================
-- APENAS service_role chama (Edge Function via service_role key).
-- Cliente comum não tem permissão — força fluxo via Edge Function.
revoke all on function public.grant_mobile_purchase(
    uuid, text, text, text, text, text, text, text, int, text, int, jsonb
) from public, anon, authenticated;

grant execute on function public.grant_mobile_purchase(
    uuid, text, text, text, text, text, text, text, int, text, int, jsonb
) to service_role;
