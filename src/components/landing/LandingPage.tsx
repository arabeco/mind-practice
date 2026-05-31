'use client';

import { motion } from 'framer-motion';
import WaitlistForm from './WaitlistForm';
import ArchetypeShowcase from './ArchetypeShowcase';

/**
 * Landing pública servida em `/` quando user não está logado.
 * Hero + arquétipos + waitlist + footer.
 *
 * Dois CTAs principais:
 *   1. "Entrar na waitlist" (email capture)
 *   2. "Já tenho conta" → /login
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      {/* Background ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(212,175,55,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(139,92,246,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-12 pt-20 text-center sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-block rounded-full border border-accent-gold-border bg-accent-gold-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-gold">
            Em breve
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
            Descubra quem você é<br />
            <span className="text-accent-gold">em 8 minutos</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-text-secondary sm:text-lg">
            MindPractice te coloca em cenas reais. Como você reage define seu
            arquétipo. Sem perguntas chatas, sem certo ou errado.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8"
        >
          <WaitlistForm source="hero" ctaLabel="Quero entrar no beta" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 text-xs text-text-tertiary"
        >
          Em breve no Google Play e App Store. Web preview disponível pra
          quem entrar na waitlist.
        </motion.p>
      </section>

      {/* Arquétipos */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">
            15 arquétipos possíveis
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Qual deles é você?
          </h2>
        </motion.div>
        <ArchetypeShowcase />
      </section>

      {/* CTA secundário */}
      <section className="mx-auto max-w-2xl px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-border-default bg-bg-glass p-8 backdrop-blur-md sm:p-10"
        >
          <h3 className="text-xl font-bold sm:text-2xl">
            Não é teste de personalidade. É um espelho.
          </h3>
          <p className="mt-3 text-sm text-text-secondary">
            Cada cena registra como você decide sob pressão. Em poucas runs,
            seu padrão emerge — e fica claro pra você o que sempre foi instinto.
          </p>
          <div className="mt-6 flex justify-center">
            <WaitlistForm source="cta-secondary" />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl border-t border-border-subtle px-6 py-8 text-center">
        <p className="text-xs text-text-tertiary">
          MindPractice ·{' '}
          <a href="/login" className="text-text-secondary hover:text-text-primary">
            Já tenho conta
          </a>
        </p>
      </footer>
    </main>
  );
}
