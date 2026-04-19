'use client';

import { useEffect, useState } from 'react';
import { enablePush, getPushSupport } from '@/lib/push';
import { getSupabase } from '@/lib/supabase/client';
import { useGame } from '@/context/GameContext';

/**
 * Floating dev panel — só aparece em NODE_ENV !== 'production'.
 * Remover quando virar produção/tiver painel proprio.
 */
export default function DevTools() {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [busy, setBusy] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const { dispatch } = useGame();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    import('@/lib/smokeTest').then(({ runSmokeTest }) => {
      (window as any).runSmokeTest = runSmokeTest;
      console.log('🛠️  DevTools: window.runSmokeTest() disponivel');
    });

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  async function handleTestLocalNotification() {
    if (permission === 'unsupported') {
      setLastMsg('Notification API nao suportada');
      return;
    }
    let current = Notification.permission;
    if (current === 'default') {
      current = await Notification.requestPermission();
      setPermission(current);
    }
    if (current !== 'granted') {
      setLastMsg(`Permissao: ${current}`);
      return;
    }
    const n = new Notification('Nova cena destravada', {
      body: 'O livro abriu uma pagina nova. Volte pra ver o que aconteceu.',
      icon: '/icon-192.png',
      tag: 'mindpractice-local-test',
    });
    n.onclick = () => { window.focus(); n.close(); };
    setLastMsg('Notificacao local disparada');
  }

  async function handleEnablePush() {
    setBusy(true);
    setLastMsg(null);
    try {
      const sup = getPushSupport();
      if (!sup.supported) {
        setLastMsg(`Nao suportado: ${sup.reason}`);
        return;
      }
      const r = await enablePush();
      if (r.ok) setLastMsg(`Registrado (${r.transport})`);
      else setLastMsg(`Erro: ${r.error}`);
      if ('Notification' in window) setPermission(Notification.permission);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTestPush() {
    setBusy(true);
    setLastMsg(null);
    try {
      const sb = getSupabase();
      if (!sb) { setLastMsg('Supabase nao configurado'); return; }
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setLastMsg('Precisa estar logado'); return; }

      // Chama a Edge Function que manda push pro proprio user.
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-test`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Teste do servidor',
          body: 'Se voce ta lendo isso, o pipeline web-push ta funcionando.',
          url: '/',
        }),
      });
      const txt = await res.text();
      setLastMsg(res.ok ? `OK: ${txt}` : `Erro ${res.status}: ${txt}`);
    } catch (e) {
      setLastMsg(`Falha: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-3 z-[60] flex flex-col items-end gap-2 sm:bottom-4">
      {open && (
        <div className="flex w-64 flex-col gap-2 rounded-2xl border border-fuchsia-400/30 bg-black/80 p-3 shadow-[0_0_22px_rgba(217,70,239,0.2)] backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/80">
            Painel GM
          </p>

          <button
            type="button"
            onClick={handleTestLocalNotification}
            disabled={busy}
            className="w-full rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-left text-[11px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-40"
          >
            1. Notif local (teste SW)
            <span className="mt-0.5 block text-[9px] font-normal text-fuchsia-100/55">
              Permissao: {permission}
            </span>
          </button>

          <button
            type="button"
            onClick={handleEnablePush}
            disabled={busy}
            className="w-full rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-left text-[11px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-40"
          >
            2. Ativar push
            <span className="mt-0.5 block text-[9px] font-normal text-fuchsia-100/55">
              VAPID ou FCM conforme ambiente
            </span>
          </button>

          <button
            type="button"
            onClick={handleSendTestPush}
            disabled={busy}
            className="w-full rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-left text-[11px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-40"
          >
            3. Push do servidor
            <span className="mt-0.5 block text-[9px] font-normal text-fuchsia-100/55">
              Chama Edge Function send-push-test
            </span>
          </button>

          {/* --- Plus testing --- */}
          <button
            type="button"
            onClick={() => {
              const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              dispatch({ type: 'SET_PLUS_STATUS', active: true, expiresAt: expires });
              setLastMsg('Plus ATIVADO por 30 dias');
            }}
            className="w-full rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-left text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
          >
            4. Ativar Plus (30d)
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'SET_PLUS_STATUS', active: false, expiresAt: null });
              setLastMsg('Plus DESATIVADO');
            }}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-[11px] text-white/70 transition hover:bg-white/10"
          >
            5. Desativar Plus
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'CLAIM_DAILY_PLUS_BONUS' });
              setLastMsg('Bonus diario Plus claimado (+10 fichas, idempotente)');
            }}
            className="w-full rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-left text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
          >
            6. Claim diario Plus
          </button>

          {lastMsg && (
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-black/50 px-2 py-1 text-[10px] leading-relaxed text-white/70">
              {lastMsg}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Painel GM"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-400/40 bg-black/70 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.25)] transition hover:brightness-125"
      >
        <span className="text-sm font-bold">GM</span>
      </button>
    </div>
  );
}
