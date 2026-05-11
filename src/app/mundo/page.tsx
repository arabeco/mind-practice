'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import { useToast } from '@/components/Toast';
import { FRIEND_ACCEPT_BONUS } from '@/types/game';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  listFriendships,
  listFriendFeed,
  getProfile,
  type PublicProfile,
  type FriendshipsBuckets,
  type FeedEvent,
} from '@/lib/supabase/social';
import { useFeedRealtime, useFriendshipRealtime } from '@/lib/supabase/realtime';
import { useIsOnline } from '@/lib/supabase/presence';
import SeasonLeaderboard from '@/components/SeasonLeaderboard';

type Tab = 'feed' | 'amigos' | 'ranking';

export default function MundoPage() {
  const { user, enabled, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const toast = useToast();

  // Realtime: notifica quando alguem manda pedido de amizade.
  useFriendshipRealtime(user?.id ?? null, async (row, eventType) => {
    if (eventType !== 'INSERT' || row.status !== 'pending') return;
    const requester = await getProfile(row.requester_id);
    if (!requester) return;
    toast.toast(`${requester.nickname} quer ser seu amigo`);
  });

  if (authLoading) {
    return (
      <main className="mx-auto flex max-w-md flex-col px-4 py-6">
        <div className="mt-20 text-center text-sm text-white/50">Carregando...</div>
      </main>
    );
  }

  if (!enabled || !user) {
    return (
      <main className="mx-auto flex max-w-md flex-col px-4 py-6">
        <h1 className="text-xl font-bold text-white/90">Mundo</h1>
        <div className="glass-card mt-6 rounded-2xl p-6 text-center">
          <p className="text-sm text-white/70">
            Entre com uma conta pra ver o feed e adicionar amigos.
          </p>
          <a
            href="/perfil"
            className="mt-4 inline-block rounded-full border border-accent-gold/40 bg-accent-gold/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold"
          >
            Ir pro perfil
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-5">
      <h1 className="text-2xl font-bold text-white/92">Mundo</h1>
      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">
        feed & amigos
      </p>

      {/* Sub-tabs */}
      <div className="mt-4 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
        {(['feed', 'amigos', 'ranking'] as Tab[]).map(t => {
          const active = tab === t;
          const label = t === 'feed' ? 'Feed' : t === 'amigos' ? 'Amigos' : 'Ranking';
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-[0.16em]"
            >
              {active && (
                <motion.div
                  layoutId="mundo-tab-pill"
                  className="absolute inset-0 rounded-full bg-white/12 border border-white/16"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={`relative ${active ? 'text-white' : 'text-white/50'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <AnimatePresence mode="wait">
          {tab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <FeedTab />
            </motion.div>
          )}
          {tab === 'amigos' && (
            <motion.div
              key="amigos"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <AmigosTab />
            </motion.div>
          )}
          {tab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SeasonLeaderboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ------------------------------------------------------------
// FEED
// ------------------------------------------------------------

function FeedTab() {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);

  useEffect(() => {
    listFriendFeed(40).then(setEvents);
  }, []);

  // Realtime: prepend novos eventos conforme chegam. Hidrata `author`
  // via getProfile. RLS no server filtra pra self+amigos.
  useFeedRealtime(events !== null, async raw => {
    // Evita duplicar caso o evento já apareça no fetch inicial
    setEvents(prev => {
      if (!prev) return prev;
      if (prev.some(e => e.id === raw.id)) return prev;
      // Insere imediatamente sem author; hidratacao chega async abaixo.
      return [{ ...raw, author: undefined }, ...prev];
    });
    const author = await getProfile(raw.user_id);
    if (!author) return;
    setEvents(prev => prev?.map(e => (e.id === raw.id ? { ...e, author } : e)) ?? prev);
  });

  if (events === null) {
    return <div className="mt-6 text-center text-sm text-white/50">Carregando...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="glass-card mt-4 rounded-2xl p-6 text-center">
        <p className="text-sm text-white/75">Feed vazio por enquanto.</p>
        <p className="mt-2 text-[11px] text-white/45">
          Jogue decks ou adicione amigos — as ações aparecem aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map(ev => (
        <FeedCard key={ev.id} event={ev} />
      ))}
    </div>
  );
}

function FeedCard({ event }: { event: FeedEvent }) {
  const author = event.author;
  const symbol = author?.avatar_variant === 'feminino' ? '\u2640' : '\u2642';
  const time = timeAgo(event.created_at);
  const { title, subtitle } = describeEvent(event);
  const isOnline = useIsOnline(event.user_id);

  return (
    <div className="glass-card flex items-start gap-3 rounded-xl px-3 py-2.5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-base font-bold text-white/80">
        {symbol}
        {isOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-state-success"
            style={{ boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
            aria-label="online"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-white/90">
            {author?.nickname ?? 'Anônimo'}
          </span>
          <span className="shrink-0 text-[10px] text-white/40">{time}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-white/70">{title}</p>
        {subtitle && <p className="text-[11px] text-white/45">{subtitle}</p>}
      </div>
    </div>
  );
}

function describeEvent(ev: FeedEvent): { title: string; subtitle?: string } {
  const p = ev.payload ?? {};
  switch (ev.kind) {
    case 'deck_completed':
      return {
        title: `Concluiu ${p.deckName ?? 'um deck'}`,
        subtitle: typeof p.score === 'number' ? `Score ${p.score}` : undefined,
      };
    case 'archetype_changed':
      return {
        title: `Virou ${p.archetype ?? '?'}`,
        subtitle: p.from ? `antes era ${p.from}` : undefined,
      };
    case 'level_up':
      return { title: `Subiu pro Lv ${p.level ?? '?'}` };
    case 'streak_milestone':
      return { title: `${p.streak ?? '?'} dias de streak` };
    default:
      return { title: String(ev.kind) };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ------------------------------------------------------------
// AMIGOS
// ------------------------------------------------------------

function AmigosTab() {
  const toast = useToast();
  const { dispatch } = useGame();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [buckets, setBuckets] = useState<FriendshipsBuckets>({
    accepted: [],
    incoming: [],
    outgoing: [],
  });

  const refresh = useCallback(async () => {
    const fresh = await listFriendships();
    setBuckets(fresh);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchUsers(q);
      setResults(res);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const pendingIds = new Set([
    ...buckets.outgoing.map(p => p.id),
    ...buckets.accepted.map(p => p.id),
    ...buckets.incoming.map(p => p.id),
  ]);

  const handleAdd = async (p: PublicProfile) => {
    const { error } = await sendFriendRequest(p.id);
    if (error) toast.error(error);
    else {
      toast.success(`Pedido enviado pra ${p.nickname}`);
      refresh();
    }
  };

  const handleAccept = async (p: PublicProfile) => {
    const { error } = await acceptFriendRequest(p.id);
    if (error) toast.error(error);
    else {
      dispatch({
        type: 'EARN_FICHAS',
        amount: FRIEND_ACCEPT_BONUS,
        reason: 'friend_accepted',
      });
      toast.success(`${p.nickname} agora é seu amigo (+${FRIEND_ACCEPT_BONUS} fichas)`);
      refresh();
    }
  };

  const handleReject = async (p: PublicProfile) => {
    const { error } = await rejectFriendRequest(p.id);
    if (error) toast.error(error);
    else {
      toast.toast(`Recusou ${p.nickname}`);
      refresh();
    }
  };

  const handleRemove = async (p: PublicProfile) => {
    const { error } = await removeFriend(p.id);
    if (error) toast.error(error);
    else {
      toast.toast(`${p.nickname} removido`);
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Busca */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Encontrar alguém
        </label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nickname..."
          className="mt-1.5 w-full rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/28 focus:border-accent-gold/55 focus:outline-none"
        />

        {query.trim().length >= 2 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {searching && <p className="text-center text-[11px] text-white/40">Procurando...</p>}
            {!searching && results.length === 0 && (
              <p className="text-center text-[11px] text-white/40">Ninguém encontrado.</p>
            )}
            {results.map(p => {
              const already = pendingIds.has(p.id);
              return (
                <ProfileRow
                  key={p.id}
                  profile={p}
                  action={
                    already ? (
                      <span className="text-[11px] text-white/40">já listado</span>
                    ) : (
                      <button
                        onClick={() => handleAdd(p)}
                        className="rounded-full border border-accent-gold/40 bg-accent-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-gold"
                      >
                        Adicionar
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pedidos recebidos */}
      {buckets.incoming.length > 0 && (
        <Section title={`Pedidos (${buckets.incoming.length})`}>
          {buckets.incoming.map(p => (
            <ProfileRow
              key={p.id}
              profile={p}
              action={
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAccept(p)}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-100"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleReject(p)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/60"
                  >
                    Recusar
                  </button>
                </div>
              }
            />
          ))}
        </Section>
      )}

      {/* Enviados */}
      {buckets.outgoing.length > 0 && (
        <Section title="Enviados">
          {buckets.outgoing.map(p => (
            <ProfileRow
              key={p.id}
              profile={p}
              action={<span className="text-[11px] text-white/40">aguardando</span>}
            />
          ))}
        </Section>
      )}

      {/* Amigos */}
      <Section title={`Amigos (${buckets.accepted.length})`}>
        {buckets.accepted.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-white/45">
            Nenhum amigo ainda. Busque por nickname acima.
          </p>
        ) : (
          buckets.accepted.map(p => (
            <ProfileRow
              key={p.id}
              profile={p}
              action={
                <button
                  onClick={() => handleRemove(p)}
                  className="text-[11px] text-white/35 transition-colors hover:text-red-300"
                >
                  remover
                </button>
              }
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ProfileRow({
  profile,
  action,
}: {
  profile: PublicProfile;
  action: React.ReactNode;
}) {
  const symbol = profile.avatar_variant === 'feminino' ? '\u2640' : '\u2642';
  const isOnline = useIsOnline(profile.id);
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl px-3 py-2">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-base font-bold text-white/80">
        {symbol}
        {isOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-state-success"
            style={{ boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
            aria-label="online"
          />
        )}
      </div>
      <span className="flex-1 truncate text-sm font-semibold text-white/85">
        {profile.nickname}
      </span>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
