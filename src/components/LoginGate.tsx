'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const LOGIN_SEEN_KEY = 'mindpractice_login_seen';

type Stage = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Gate mostrado na PRIMEIRA visita ao app (antes do onboarding).
 * Dá 3 opções: Google, magic link, ou jogar sem conta.
 *
 * Depois da primeira interação (login OU skip), nunca mais aparece
 * — a flag `mindpractice_login_seen` fica em localStorage.
 *
 * Se o usuário quiser logar depois, usa o botão "Entrar — salvar na nuvem"
 * no /perfil (sempre visível).
 */
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, enabled, loading, signInWithGoogle, signInWithEmail } = useAuth();
  const [checked, setChecked] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decide se precisa mostrar gate
  useEffect(() => {
    if (loading) return;
    const seen = typeof window !== 'undefined' && localStorage.getItem(LOGIN_SEEN_KEY) === '1';
    const needs = enabled && !user && !seen;
    setNeedsLogin(needs);
    setChecked(true);
  }, [loading, enabled, user]);

  // Já logado → marca como visto pra não perguntar de novo
  useEffect(() => {
    if (user) {
      localStorage.setItem(LOGIN_SEEN_KEY, '1');
    }
  }, [user]);

  const markSeen = () => {
    localStorage.setItem(LOGIN_SEEN_KEY, '1');
    setNeedsLogin(false);
  };

  const handleSkip = () => {
    markSeen();
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setErrorMsg('Digite um email valido');
      setStage('error');
      return;
    }
    setStage('sending');
    setErrorMsg(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMsg(error);
      setStage('error');
      return;
    }
    setStage('sent');
  };

  const handleGoogle = () => {
    // Não marcamos seen aqui — o redirect do Google sai da app.
    // Quando voltar autenticado, o useEffect do user seta a flag.
    signInWithGoogle();
  };

  if (!checked) return null;
  if (!needsLogin) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-gold/75">
            MindPractice
          </p>
          <h1 className="mt-3 text-2xl font-bold text-white/92">Como quer começar?</h1>
          <p className="mt-2 text-sm text-white/55">
            Com conta, seu progresso sincroniza entre dispositivos.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/18 bg-white/8 py-3 text-sm font-semibold text-white/92 transition hover:bg-white/15"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.2C41.4 35.3 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/30">
            <div className="h-px flex-1 bg-white/12" />
            ou
            <div className="h-px flex-1 bg-white/12" />
          </div>

          {/* Email magic link */}
          <form onSubmit={handleEmail} className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Email
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                disabled={stage === 'sending' || stage === 'sent'}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (stage === 'error') setStage('idle');
                }}
                placeholder="voce@email.com"
                className="mt-1.5 w-full rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/28 focus:border-accent-gold/55 focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={stage === 'sending' || stage === 'sent'}
              className="w-full rounded-full bg-accent-gold/90 py-3 text-sm font-bold text-black transition hover:bg-accent-gold disabled:opacity-60"
            >
              {stage === 'sending' ? 'Enviando...' :
               stage === 'sent' ? 'Link enviado ✓' :
               'Receber link mágico'}
            </button>
          </form>

          {stage === 'sent' && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center text-xs text-emerald-300/90"
            >
              Cheque seu email e clique no link.
            </motion.p>
          )}
          {stage === 'error' && errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center text-xs text-red-300/90"
            >
              {errorMsg}
            </motion.p>
          )}
        </div>

        {/* Jogar sem conta */}
        <button
          type="button"
          onClick={handleSkip}
          className="mt-5 w-full text-center text-[11px] uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white/80"
        >
          Jogar sem conta →
        </button>
        <p className="mt-2 text-center text-[10px] text-white/25">
          Progresso fica só neste dispositivo.
        </p>
      </motion.div>
    </div>
  );
}
