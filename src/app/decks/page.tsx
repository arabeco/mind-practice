'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS, DECK_UNLOCK_ORDER } from '@/data/decks/index';
import type { Deck } from '@/types/game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeLeft(ms: number): string {
  if (ms === Infinity) return 'Complete o deck anterior';
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const levelColors: Record<Deck['level'], string> = {
  leve: 'bg-green-500/80 text-green-100',
  medio: 'bg-yellow-500/80 text-yellow-100',
  extremo: 'bg-red-500/80 text-red-100',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DecksPage() {
  const router = useRouter();
  const { state, dispatch, isDeckLocked, getTimeUntilUnlock } = useGame();

  const handleSelect = (deck: Deck) => {
    if (isDeckLocked(deck.deckId)) return;
    dispatch({ type: 'START_DECK', deck });
    router.push(`/play/${deck.deckId}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Decks</h2>
        <p className="mt-1 text-sm text-white/60">Escolha seu desafio</p>
      </div>

      {/* Deck list */}
      <div className="flex flex-col gap-4">
        {DECK_UNLOCK_ORDER.map((deckId, index) => {
          const deck = ALL_DECKS.find((d) => d.deckId === deckId);
          if (!deck) return null;

          const locked = isDeckLocked(deckId);
          const completed = deckId in state.completedDecks;
          const timeLeft = getTimeUntilUnlock(deckId);

          return (
            <motion.button
              key={deckId}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              disabled={locked}
              onClick={() => handleSelect(deck)}
              className={`glass-card-hover relative overflow-hidden rounded-2xl p-5 text-left ${
                locked ? 'cursor-not-allowed opacity-40 grayscale' : ''
              }`}
            >
              {/* Badges row */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelColors[deck.level]}`}
                >
                  {deck.level}
                </span>

                {completed && (
                  <span className="flex items-center gap-1 rounded-full bg-accent-gold/20 px-2.5 py-0.5 text-xs font-semibold text-accent-gold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Completo
                  </span>
                )}
              </div>

              {/* Name & description */}
              <h3 className="text-lg font-bold text-white">{deck.name}</h3>
              <p className="mt-1 text-sm text-white/60">{deck.description}</p>

              {/* Question count */}
              <p className="mt-3 text-xs text-white/40">
                {deck.questions.length} cenas
              </p>

              {/* Lock overlay */}
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/40">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white/70"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-white/70">
                    {formatTimeLeft(timeLeft)}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </main>
  );
}
