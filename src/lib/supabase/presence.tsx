'use client';

/**
 * Presence — quem está online agora via Supabase Realtime presence channel.
 *
 * Stack:
 *   - Channel global 'mindpractice-presence' compartilhado.
 *   - Cada client faz `track({ user_id })` ao entrar.
 *   - Outros clients recebem eventos sync/join/leave.
 *
 * Uso:
 *   - Mount `usePresenceTracker(userId)` no GameProvider — anuncia presença.
 *   - Use `usePresence()` em qualquer componente — retorna Set<string>
 *     com user_ids online.
 *
 * Limitações:
 *   - "Online" = aba aberta do site web/app. Não captura push offline.
 *   - Channel global, todos veem todos. Privacy: só mostra user_ids,
 *     não vaza email/nick (UI hidrata via getProfile separadamente).
 */
import { useContext, useEffect, useState, createContext, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './client';

const CHANNEL_NAME = 'mindpractice-presence';

interface PresenceContextValue {
  onlineUserIds: Set<string>;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUserIds: new Set(),
});

/**
 * Provider — abre o channel e expõe set reativo de user_ids online.
 * Mount UMA vez no nível do GameProvider/AuthContext (raiz da app).
 */
export function PresenceProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setOnlineUserIds(new Set());
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      channel = sb.channel(CHANNEL_NAME, {
        config: { presence: { key: userId } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          if (!channel || cancelled) return;
          const state = channel.presenceState<{ user_id: string }>();
          const ids = new Set<string>();
          for (const key of Object.keys(state)) {
            ids.add(key);
          }
          setOnlineUserIds(ids);
        })
        .subscribe(async status => {
          if (status === 'SUBSCRIBED' && channel) {
            await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        sb.removeChannel(channel);
      }
    };
  }, [userId]);

  return (
    <PresenceContext.Provider value={{ onlineUserIds }}>
      {children}
    </PresenceContext.Provider>
  );
}

/**
 * Hook pra ler o set de user_ids online. Retorna Set vazio se Provider
 * não montado ou Supabase não configurado.
 */
export function usePresence(): Set<string> {
  return useContext(PresenceContext).onlineUserIds;
}

/**
 * Helper conveniente: true se um userId específico está online agora.
 */
export function useIsOnline(userId: string | null | undefined): boolean {
  const set = usePresence();
  return userId ? set.has(userId) : false;
}
