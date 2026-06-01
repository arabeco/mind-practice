'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { attributeReferralOnSignup } from '@/lib/supabase/referrals';
import {
  getOAuthRedirectUrl,
  isCapacitorNativeRuntime,
  isNativeAuthCallbackUrl,
  parseNativeAuthCallback,
} from '@/lib/nativeAuth';

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** True when Supabase env vars are configured */
  enabled: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithPassword: async () => ({ error: 'Supabase não configurado' }),
  signUpWithPassword: async () => ({ error: 'Supabase não configurado' }),
  signOut: async () => {},
  enabled: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sb = getSupabase();
  const enabled = sb !== null;

  useEffect(() => {
    if (!sb) {
      setLoading(false);
      return;
    }

    // Get initial session
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Listen for auth changes — também rastreia analytics
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === 'SIGNED_IN' && nextUser) {
        // Best-effort referral attribution (no-op se não tem code armazenado)
        void attributeReferralOnSignup();
      }
    });

    return () => subscription.unsubscribe();
  }, [sb]);

  // Deep link OAuth de volta no app nativo: captura com.mindpractice.app://auth/callback,
  // troca o code por sessão. Sem isso, login Google/Apple não fecha no APK.
  useEffect(() => {
    if (!sb || !isCapacitorNativeRuntime()) return;

    let disposed = false;
    let removeListener: (() => void) | null = null;

    void (async () => {
      const { App } = await import('@capacitor/app');
      const { Browser } = await import('@capacitor/browser');
      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (disposed || !isNativeAuthCallbackUrl(url)) return;

        const { code, error } = parseNativeAuthCallback(url);
        try {
          await Browser.close();
        } catch {
          // noop — em alguns devices o Custom Tab já fechou
        }
        if (error || !code) return;
        await sb.auth.exchangeCodeForSession(code);
        // onAuthStateChange (acima) cuida de setUser/redirect
      });
      removeListener = () => {
        void handle.remove();
      };
      if (disposed) removeListener();
    })();

    return () => {
      disposed = true;
      if (removeListener) removeListener();
    };
  }, [sb]);

  const signInWithOAuthProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      if (!sb) return;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const native = isCapacitorNativeRuntime();

      const { data, error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectUrl(origin),
          skipBrowserRedirect: native, // no app, NÃO redireciona o WebView
        },
      });
      if (error) throw error;

      // No app: abre o login no navegador REAL (Chrome Custom Tab).
      if (native && data?.url) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: data.url });
      }
      // No web: o supabase-js já redirecionou a aba.
    },
    [sb],
  );

  const signInWithGoogle = useCallback(
    () => signInWithOAuthProvider('google'),
    [signInWithOAuthProvider],
  );

  const signInWithApple = useCallback(
    () => signInWithOAuthProvider('apple'),
    [signInWithOAuthProvider],
  );

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!sb) return { error: 'Login indisponivel — Supabase não configurado.' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      // Normalize common Supabase errors to PT-BR
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login')) return { error: 'Email ou senha incorretos.' };
      if (msg.includes('email not confirmed')) return { error: 'Email ainda não confirmado.' };
      return { error: error.message };
    }
    return { error: null };
  }, [sb]);

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!sb) return { error: 'Login indisponivel — Supabase não configurado.' };
    const { error } = await sb.auth.signUp({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return { error: 'Esse email já tem conta. Use "Entrar".' };
      }
      if (msg.includes('password') && msg.includes('6')) {
        return { error: 'Senha precisa ter no mínimo 6 caracteres.' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, [sb]);

  const signOut = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signOut();
    setUser(null);
  }, [sb]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithApple, signInWithPassword, signUpWithPassword, signOut, enabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
