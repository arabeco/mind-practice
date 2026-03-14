'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS, getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory, StatKey } from '@/types/game';
import { STAT_COLORS } from '@/types/game';

const TABS: { id: DeckCategory; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
];

const levelColors: Record<Deck['level'], string> = {
  leve: 'bg-green-500/20 text-green-400',
  medio: 'bg-yellow-500/20 text-yellow-400',
  extremo: 'bg-red-500/20 text-red-400',
};

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
            const focusColor = deck.focusAxis ? STAT_COLORS[deck.focusAxis] : undefined;

            return (
              <motion.button
                key={deck.deckId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                disabled={locked}
                onClick={() => handleSelect(deck)}
                className={`glass-card-hover relative overflow-hidden p-5 text-left ${
                  locked ? 'cursor-not-allowed opacity-40 grayscale' : ''
                }`}
                style={focusColor && !locked ? { borderColor: `${focusColor}30` } : undefined}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColors[deck.level]}`}>
                    {deck.level}
                  </span>
                  {completed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">
                      Completo
                    </span>
                  )}
                  {isWeeklyFree && !completed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Gratis esta semana
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold">{deck.name}</h3>
                <p className="text-sm text-white/50 mt-1">{deck.description}</p>

                {/* Focus axis tag */}
                {deck.focusAxis && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: focusColor }} />
                    <span className="text-[10px] text-white/30 uppercase">{deck.focusAxis}</span>
                  </div>
                )}

                <p className="text-[10px] text-white/20 mt-2">{deck.questions.length} cenas</p>

                {/* Lock overlay */}
                {locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/50 backdrop-blur-sm">
                    <svg className="w-7 h-7 text-accent-gold/60" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-white/50">{formatTimeLeft(timeLeft)}</span>
                  </div>
                )}
              </motion.button>
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
