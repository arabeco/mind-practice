'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';

interface WaitlistFormProps {
  /** Identifica de onde veio o signup (ex: 'hero', 'archetype-page'). */
  source?: string;
  /** Sugestão de arquétipo se a captura veio de uma página específica. */
  archetypeHint?: string;
  /** Override do CTA — default "Entrar na waitlist". */
  ctaLabel?: string;
}

export default function WaitlistForm({
  source = 'landing',
  archetypeHint,
  ctaLabel = 'Entrar na waitlist',
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg(null);

    try {
      const resp = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source,
          archetypeHint,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Erro ao salvar — tente de novo');
        setStatus('error');
        return;
      }
      setStatus('success');
      trackEvent('waitlist_joined', { source, archetype_hint: archetypeHint ?? null });
    } catch {
      setErrorMsg('Erro de rede');
      setStatus('error');
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="rounded-2xl border border-state-success-border bg-state-success-bg px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold text-state-success">Você está na lista.</p>
            <p className="mt-1 text-xs text-text-secondary">
              Vamos avisar quando o app estiver pronto.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="flex flex-col gap-2"
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="w-full rounded-full border border-border-default bg-bg-glass px-5 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold-border focus:outline-none focus:ring-2 focus:ring-accent-gold-border"
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={status === 'loading'}
            >
              {ctaLabel}
            </Button>
            {errorMsg && (
              <p className="mt-1 text-xs text-state-error">{errorMsg}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
