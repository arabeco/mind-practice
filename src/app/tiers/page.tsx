'use client';

import Link from 'next/link';
import DeckTarotCard from '@/components/DeckTarotCard';
import { ALL_DECKS } from '@/data/decks/index';
import { TIER_CONFIG, type TierLevel } from '@/types/game';

const TIER_ORDER: TierLevel[] = [1, 2, 3, 4, 5, 6];

const SAMPLE_DECK_IDS: Partial<Record<TierLevel, string>> = {
  1: 'basic_01',
  2: 'alta_tensao',
  3: 'holofote',
  4: 'social',
  5: 'livro_amaldicoado',
};

export default function TiersShowcasePage() {
  const sampleDecks = TIER_ORDER.map(tier => ({
    tier,
    deck: ALL_DECKS.find(item => item.deckId === SAMPLE_DECK_IDS[tier]) ?? null,
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/35">Preview</p>
          <h1 className="mt-2 text-3xl font-bold">Exemplo de Cada Tier</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/45">
            Vitrine com 1 deck real por tier para validar os estilos, badges e hierarquia visual.
          </p>
        </div>

        <Link
          href="/decks"
          className="inline-flex items-center justify-center rounded-full bg-white/6 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
        >
          Voltar aos Decks
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sampleDecks.map(({ tier, deck }, index) => {
          const config = TIER_CONFIG[tier];

          if (!deck) {
            return (
              <section
                key={tier}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-[20px]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">Tier {tier}</p>
                <h2 className="mt-2 text-xl font-bold">{config.label}</h2>
                <p className="mt-2 text-sm text-white/45">Nenhum deck cadastrado para este tier ainda.</p>
              </section>
            );
          }

          return (
            <section key={deck.deckId} className="space-y-3">
              <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Tier {tier}
                </p>
                <p className="mt-1 text-sm text-white/45">{config.subtitle}</p>
              </div>

              <DeckTarotCard
                deck={deck}
                index={index}
                locked={false}
                completed={false}
                free={false}
                onClick={() => {}}
              />
            </section>
          );
        })}
      </div>
    </main>
  );
}
