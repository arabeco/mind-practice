'use client';

/**
 * Realtime — hooks que subscrevem ao publication `supabase_realtime`
 * pra eventos sociais (feed + friendships) em tempo real.
 *
 * Requer que `supabase/migrations/2026-04-25-f6-realtime.sql` tenha sido
 * rodada no Supabase. Se nao tiver, o subscribe simplesmente nao recebe
 * eventos — sem regressão visual (feed estatico ainda funciona).
 *
 * Padrão: cada hook abre 1 channel, faz cleanup automatico no unmount.
 */
import { useEffect, useRef } from 'react';
import { getSupabase } from './client';
import type { FeedEvent, FriendshipRow } from './social';

/**
 * Subscribe a INSERTs em `feed_events`. RLS server-side ja filtra pra
 * "self or friends" — entao o cliente recebe so o que pode ler. Nao
 * precisa de filtro adicional aqui.
 *
 * O caller é responsável por hidratar o evento (anexar `author` profile)
 * antes de mostrar — esse hook só recebe a row crua.
 *
 * `enabled=false` desabilita o channel (util pra esperar auth carregar).
 */
export function useFeedRealtime(
  enabled: boolean,
  onNewEvent: (raw: Omit<FeedEvent, 'author'>) => void,
): void {
  // Stable ref pra callback evita re-subscribe quando consumer recria a fn.
  const cbRef = useRef(onNewEvent);
  cbRef.current = onNewEvent;

  useEffect(() => {
    if (!enabled) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel('feed-events-stream')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_events',
        },
        payload => {
          cbRef.current(payload.new as Omit<FeedEvent, 'author'>);
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [enabled]);
}

/**
 * Subscribe a mudanças em `friendships` onde `addressee_id = currentUserId`.
 * Dispara `onChange(row, eventType)` em INSERTs (pedido novo), UPDATEs
 * (status muda), DELETEs (cancelamento).
 *
 * Caller decide o que fazer (toast, refetch da lista, etc).
 */
export function useFriendshipRealtime(
  currentUserId: string | null,
  onChange: (row: FriendshipRow, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
): void {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!currentUserId) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`friendships-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${currentUserId}`,
        },
        payload => {
          const row = (payload.new ?? payload.old) as FriendshipRow;
          if (!row) return;
          cbRef.current(row, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE');
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [currentUserId]);
}
