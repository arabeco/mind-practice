-- IAP direto: cliente escreve subscriptions.tier após purchase nativo
--
-- Sem RevenueCat/Stripe webhook, o app mobile escreve direto no Supabase
-- após Apple/Google confirmarem compra. RLS allow insert/update OWN ROW
-- somente. Risco: cliente avançado poderia falsificar — pra MVP OK,
-- v2 adicionar Edge Function que valida receipt antes do upsert.
--
-- Idempotente.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
      and policyname = 'subs_insert_own'
  ) then
    create policy subs_insert_own on public.subscriptions
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
      and policyname = 'subs_update_own'
  ) then
    create policy subs_update_own on public.subscriptions
      for update using (auth.uid() = user_id);
  end if;
end $$;
