-- ============================================================
-- MindPractice — Remove escrita de subscriptions pelo cliente
-- ============================================================
-- Reverte a migration 2026-05-17-iap-client-write.sql (removida do repo).
--
-- Aquele MVP deixava o CLIENTE escrever subscriptions.tier direto via
-- supabase-js (policies subs_insert_own / subs_update_own). Isso fura o
-- modelo: um usuário poderia se auto-conceder tier='founder' sem passar
-- pela Edge Function.
--
-- No modelo hardened (padrão GOL), só service_role escreve subscriptions:
--   - grant_mobile_purchase (security definer)  → IAP Google Play
--   - purchase_tier_with_fichas (security definer) → gasto de fichas
-- Ambos rodam com service_role e ignoram RLS, então o cliente NÃO precisa
-- de policy de insert/update. Só leitura da própria linha continua valendo.
--
-- Idempotente.

drop policy if exists subs_insert_own on public.subscriptions;
drop policy if exists subs_update_own on public.subscriptions;
