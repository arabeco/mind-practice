'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory } from '@/types/game';
import DeckCard from '@/components/DeckCard';

const TABS: { id: DeckCategory; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
];

function formatTimeLeft(ms: number): string {
  if (ms === Infinity) return 'Complete o deck anterior';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DecksPage() {
  const [activeTab, setActiveTab] = useState<DeckCategory>('essencial');
  const router = useRouter();
  const { state, dispatch, isDeckLocked, getTimeUntilUnlock } = useGame();
  const weeklyFree = getWeeklyFreeDeckIds();

  const decks = getDecksByCategory(activeTab);

  const handleSelect = (deck: Deck) => {
    const locked = isDeckLocked(deck.deckId) && !weeklyFree.includes(deck.deckId);
    if (locked) return;
    dispatch({ type: 'START_DECK', deck });
    router.push(`/play/${deck.deckId}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Decks</h2>
        <p className="mt-1 text-sm text-white/40">Escolha seu desafio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab.id
                ? 'bg-accent-purple text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deck list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {decks.map((deck, i) => {
            const isWeeklyFree = weeklyFree.includes(deck.deckId);
            const locked = isDeckLocked(deck.deckId) && !isWeeklyFree;
            const completed = deck.deckId in state.completedDecks;
            const timeLeft = getTimeUntilUnlock(deck.deckId);

            return (
              <DeckCard
                key={deck.deckId}
                deck={deck}
                index={i}
                locked={locked}
                completed={completed}
                isWeeklyFree={isWeeklyFree}
                timeLeftLabel={formatTimeLeft(timeLeft)}
                onClick={() => handleSelect(deck)}
              />
            );
          })}

          {decks.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Nenhum deck nesta categoria ainda.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
