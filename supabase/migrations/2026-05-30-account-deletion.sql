-- ============================================================================
-- Account deletion RPC — apaga todos os dados do usuario atual
-- ============================================================================
-- Padrao LGPD/Google Play Data Safety: usuario logado pode excluir sua conta
-- e todos os dados associados em uma chamada. A linha em auth.users e
-- apagada pela Edge Function via auth.admin.deleteUser (service role), nao
-- por este RPC (postgres role nao tem permissao em auth).
--
-- Esta RPC roda como security definer pra atravessar RLS, mas filtra TUDO
-- por auth.uid() — entao nunca apaga dado de outro usuario.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Ordem: tabelas que podem ter trigger ou referenciar profiles vem antes.
  -- Mas como nao temos FK declarado, a ordem e meramente conservadora.
  DELETE FROM public.campaign_notifications WHERE user_id = v_uid;
  DELETE FROM public.feed_events            WHERE user_id = v_uid;
  DELETE FROM public.ficha_spend_log        WHERE user_id = v_uid;
  DELETE FROM public.game_state             WHERE user_id = v_uid;
  DELETE FROM public.mobile_purchases       WHERE user_id = v_uid;
  DELETE FROM public.purchases              WHERE user_id = v_uid;
  DELETE FROM public.push_registrations     WHERE user_id = v_uid;
  DELETE FROM public.season_scores          WHERE user_id = v_uid;
  DELETE FROM public.subscriptions          WHERE user_id = v_uid;
  DELETE FROM public.friendships            WHERE requester_id = v_uid OR addressee_id = v_uid;
  DELETE FROM public.referrals              WHERE referrer_id = v_uid  OR referred_id  = v_uid;
  DELETE FROM public.profiles               WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Apaga todos os dados do usuario autenticado nas tabelas public. A linha em auth.users e apagada separadamente pela Edge Function delete-account via service role.';
