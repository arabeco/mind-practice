'use client';

/**
 * Root `/` — decide entre landing pública e home autenticada.
 *
 * Lógica:
 *   - Auth loading → spinner
 *   - User logado → HomeAuthed (experiência completa)
 *   - User não logado → LandingPage (waitlist + sales)
 *
 * Quando Supabase não está configurado (env vars vazias), trata como
 * "deslogado" e mostra landing pública. Permite buildar e demonstrar
 * o produto sem backend.
 */
import { useAuth } from '@/context/AuthContext';
import HomeAuthed from '@/components/home/HomeAuthed';
import LandingPage from '@/components/landing/LandingPage';

export default function RootPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <HomeAuthed />;
}
