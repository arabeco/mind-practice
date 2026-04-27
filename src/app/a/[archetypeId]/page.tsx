/**
 * /a/[archetypeId] — landing pública SEO-otimizada por arquétipo.
 *
 * Static rendering com 10 paths gerados (1 por arquétipo). Cada página
 * tem:
 *   - meta title/description próprios
 *   - OG image apontando pra /api/og/archetype/[id]
 *   - description longa
 *   - waitlist form com archetypeHint
 *
 * Pessoas chegam via share link tipo "Eu sou um Tubarão. Faça o teste:
 * mindpractice.app/a/tubarao"
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ARCHETYPES } from '@/data/archetypes';
import WaitlistForm from '@/components/landing/WaitlistForm';

interface PageProps {
  params: Promise<{ archetypeId: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindpractice.app';

export function generateStaticParams() {
  return ARCHETYPES.map(a => ({ archetypeId: a.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { archetypeId } = await params;
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  if (!archetype) return {};

  const title = `${archetype.name} — MindPractice`;
  const description = `${archetype.tagline}. Faça o teste pra descobrir se você é um ${archetype.name}.`;
  const ogImage = `${SITE_URL}/api/og/archetype/${archetype.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/a/${archetype.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: archetype.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArchetypePage({ params }: PageProps) {
  const { archetypeId } = await params;
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  if (!archetype) notFound();

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(212,175,55,0.10) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(139,92,246,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-12 pt-20 text-center sm:pt-32">
        <span className="inline-block rounded-full border border-accent-gold-border bg-accent-gold-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-gold">
          Arquétipo
        </span>
        <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">
          {archetype.name}
        </h1>
        <p className="mt-4 text-lg italic text-text-secondary sm:text-xl">
          "{archetype.tagline}"
        </p>
      </section>

      {/* Description */}
      <section className="mx-auto max-w-2xl px-6 pb-12">
        <div className="rounded-2xl border border-border-default bg-bg-glass p-6 backdrop-blur-md sm:p-8">
          <p className="text-base leading-relaxed text-text-primary sm:text-lg">
            {archetype.description}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-xl px-6 pb-16 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Você é um <span className="text-accent-gold">{archetype.name}</span>?
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          Faça o teste em 8 minutos. Sem perguntas chatas — só cenas reais
          e como você reage.
        </p>
        <div className="mt-6 flex justify-center">
          <WaitlistForm
            source={`archetype-${archetype.id}`}
            archetypeHint={archetype.id}
            ctaLabel="Quero fazer o teste"
          />
        </div>
      </section>

      {/* Other archetypes nav */}
      <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          Outros arquétipos
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ARCHETYPES.filter(a => a.id !== archetype.id).map(a => (
            <Link
              key={a.id}
              href={`/a/${a.id}`}
              className="rounded-full border border-border-subtle bg-bg-glass px-4 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
            >
              {a.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl border-t border-border-subtle px-6 py-8 text-center">
        <p className="text-xs text-text-tertiary">
          <Link href="/" className="hover:text-text-secondary">
            ← Voltar
          </Link>
          {' · '}
          MindPractice
        </p>
      </footer>
    </main>
  );
}
