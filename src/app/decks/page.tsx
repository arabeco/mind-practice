'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS, getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory } from '@/types/game';
import DeckTarotCard from '@/components/DeckTarotCard';
import DeckDetailModal from '@/components/DeckDetailModal';
import { getWeeklyDiscountDeckId, getDiscountTimeRemaining } from '@/lib/weeklyDiscount';

type TabId = DeckCategory | 'loja';

const TABS: { id: TabId; label: string }[] = [
  { id: 'calibragem', label: 'Calibragem' },
  { id: 'eixo', label: 'Eixos' },
  { id: 'cenario', label: 'Cenarios' },
  { id: 'campanha', label: 'Campanhas' },
  { id: 'loja', label: 'Loja' },
];

const DECK_PRICES: Record<string, number> = {
  basic_01: 0,
  holofote: 10,
  alta_tensao: 15,
  profissional: 25,
  social: 35,
  livro_amaldicoado: 50,
};

export default function DecksPage() {
  const [activeTab, setActiveTab] = useState<TabId>('calibragem');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const router = useRouter();
  const { state, dispatch, isDeckLocked, spendFichas } = useGame();
  const weeklyFree = getWeeklyFreeDeckIds();
  const discountDeckId = getWeeklyDiscountDeckId();
  const POPULAR_DECK = 'basic_01';

  const decks = activeTab === 'loja' ? ALL_DECKS : getDecksByCategory(activeTab);

  const handlePlay = () => {
    if (!selectedDeck) return;
    dispatch({ type: 'START_DECK', deck: selectedDeck });
    setSelectedDeck(null);
    router.push(`/play/${selectedDeck.deckId}`);
  };

  const getEffectivePrice = (deckId: string): number => {
    const base = DECK_PRICES[deckId] ?? 50;
    if (deckId === discountDeckId) return Math.floor(base * 0.5);
    return base;
  };

  const handleBuy = () => {
    if (!selectedDeck) return;
    const price = getEffectivePrice(selectedDeck.deckId);
    if (price === 0) return;
    const ok = spendFichas(price, selectedDeck.deckId);
    if (ok) setSelectedDeck(null);
  };

  return (
    <main className="screen-stage mx-auto flex max-w-md flex-col px-4 pb-24 pt-5">
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-55" />
      <div className="stadium-shell" />
      <div className="stadium-side-light" />
      <div className="stadium-side-light-right" />
      <div className="stadium-horizon" />

      {/* Header */}
      <div className="mb-4">
        <div className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
          Biblioteca
        </div>
        <h2 className="mt-2 text-xl font-bold text-white/92">Decks</h2>
        <p className="mt-0.5 text-xs text-white/46">Escolha seu desafio</p>
      </div>

      {/* Tabs */}
      <div className="glass-surface mb-4 flex gap-1.5 rounded-xl p-1.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedDeck(null); }}
            className={`glass-button flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.12em] transition-all ${
              activeTab === tab.id
                ? 'glass-pill text-white shadow-[0_0_18px_rgba(103,232,249,0.16)]'
                : 'glass-pill text-white/46 hover:text-white/72'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fichas balance (loja tab) */}
      {activeTab === 'loja' && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-sm font-bold text-white/80">{state.wallet.fichas}</span>
          <span className="text-base">💎</span>
        </div>
      )}

      {/* Deck grid — tarot cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-3 gap-2"
        >
          {decks.map((deck, i) => {
            const isWeeklyFree = weeklyFree.includes(deck.deckId);
            const locked = isDeckLocked(deck.deckId) && !isWeeklyFree;
            const completed = deck.deckId in state.completedDecks;

            const badge = activeTab === 'loja'
              ? deck.deckId === discountDeckId ? 'discount' as const
              : deck.deckId === POPULAR_DECK ? 'popular' as const
              : null
              : null;

            return (
              <DeckTarotCard
                key={deck.deckId}
                deck={deck}
                index={i}
                locked={locked}
                completed={completed}
                free={isWeeklyFree}
                badge={badge}
                onClick={() => !locked && setSelectedDeck(deck)}
              />
            );
          })}

          {decks.length === 0 && (
            <p className="col-span-2 text-center text-white/30 text-sm py-8">Nenhum deck nesta categoria ainda.</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Weekly discount countdown */}
      {activeTab === 'loja' && discountDeckId && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl glass-surface px-3 py-2">
          <span className="text-amber-300 text-xs font-bold">Oferta expira em {getDiscountTimeRemaining()}</span>
        </div>
      )}

      {/* Detail modal — play action or buy action */}
      <DeckDetailModal
        deck={selectedDeck}
        open={!!selectedDeck}
        onClose={() => setSelectedDeck(null)}
        {...(activeTab === 'loja'
          ? {
              price: selectedDeck ? getEffectivePrice(selectedDeck.deckId) : 0,
              canAfford: selectedDeck
                ? state.wallet.fichas >= getEffectivePrice(selectedDeck.deckId)
                : false,
              onBuy: handleBuy,
            }
          : {
              owned: true,
              onPlay: handlePlay,
            })}
      />
    </main>
  );
}
