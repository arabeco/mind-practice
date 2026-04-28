'use client';

/**
 * PresenceBridge — client wrapper que conecta useAuth ao PresenceProvider.
 * Necessário porque RootLayout é server component e não pode chamar hooks.
 */
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PresenceProvider } from './presence';

export function PresenceBridge({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <PresenceProvider userId={user?.id ?? null}>{children}</PresenceProvider>;
}
