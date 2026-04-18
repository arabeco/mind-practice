'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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
  signInWithPassword: async () => ({ error: 'Supabase nao configurado' }),
  signUpWithPassword: async () => ({ error: 'Supabase nao configurado' }),
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

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [sb]);

  const signInWithGoogle = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, [sb]);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!sb) return { error: 'Login indisponivel — Supabase nao configurado.' };
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
    if (!sb) return { error: 'Login indisponivel — Supabase nao configurado.' };
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithPassword, signUpWithPassword, signOut, enabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
