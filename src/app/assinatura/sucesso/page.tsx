'use client';

/**
 * /assinatura/sucesso — landing pós-checkout.
 *
 * Faz polling a cada 1.5s na subscription até o webhook ter persistido
 * tier='pro' ou 'founder'. Após confirmar, mostra success state.
 *
 * Timeout: 20s (depois sugere refresh manual). Webhook tipicamente
 * chega em <5s; PIX pode demorar mais (assíncrono).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/lib/supabase/subscription';
import { Button, Card, Badge } from '@/components/ui';

export default function SucessoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPro, tier, refresh } = useSubscription(user?.id ?? null);
  const [waitedSeconds, setWaitedSeconds] = useState(0);

  // Polling até confirmar Pro/Founder ou timeout
  useEffect(() => {
    if (!user || isPro) return;
    const interval = setInterval(() => {
      refresh();
      setWaitedSeconds(s => s + 1.5);
    }, 1500);
    return () => clearInterval(interval);
  }, [user, isPro, refresh]);

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <p className="text-sm text-text-tertiary">Carregando...</p>
      </main>
    );
  }

  if (isPro) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
        <Card variant="elevated" padding="lg" glow className="w-full text-center">
          <Badge variant="gold">{tier === 'founder' ? 'Founder' : 'Pro'} ativado</Badge>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">Bem-vindo</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sua assinatura está ativa. Aproveite o catálogo completo.
          </p>
          <Button
            variant="primary"
            fullWidth
            className="mt-6"
            onClick={() => router.push('/decks')}
          >
            Ver decks
          </Button>
        </Card>
      </main>
    );
  }

  if (waitedSeconds >= 20) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
        <Card variant="glass" padding="lg" className="w-full text-center">
          <h1 className="text-xl font-bold text-text-primary">Pagamento processando</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Recebemos seu pagamento mas o sistema ainda está confirmando. Pode levar
            alguns minutos (especialmente PIX).
          </p>
          <Button
            variant="secondary"
            fullWidth
            className="mt-6"
            onClick={() => {
              setWaitedSeconds(0);
              refresh();
            }}
          >
            Verificar novamente
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="mt-2"
            onClick={() => router.push('/assinatura')}
          >
            Voltar
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
      <Card variant="glass" padding="lg" className="w-full text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
        <h1 className="mt-5 text-xl font-bold text-text-primary">Confirmando pagamento</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Estamos ativando sua assinatura. Aguarde alguns segundos.
        </p>
      </Card>
    </main>
  );
}
