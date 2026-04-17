'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** True when Supabase env vars are configured */
  enabled: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
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

  const signOut = useCallback(async () => {
    if (!sb) return;
    await sb.auth.signOut();
    setUser(null);
  }, [sb]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, enabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
