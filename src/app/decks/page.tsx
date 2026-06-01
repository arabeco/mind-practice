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
import { CURRENT_SEASON_ID } from '@/lib/season';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/lib/supabase/subscription';
import PaywallModal from '@/components/PaywallModal';

const FREE_SEASON_ID = 'season-0';

type TabId = DeckCategory | 'tudo' | 'loja';

const TABS: { id: TabId; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'calibragem', label: 'Calibragem' },
  { id: 'eixo', label: 'Eixos' },
  { id: 'cenario', label: 'Cenarios' },
  { id: 'campanha', label: 'Campanhas' },
  { id: 'loja', label: 'Loja' },
];

type Ownership = 'tudo' | 'meus' | 'faltantes';
const OWNERSHIP_FILTERS: { id: Ownership; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'meus', label: 'Meus' },
  { id: 'faltantes', label: 'Faltantes' },
];

export default function DecksPage() {
  const [activeTab, setActiveTab] = useState<TabId>('tudo');
  const [ownership, setOwnership] = useState<Ownership>('tudo');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [paywall, setPaywall] = useState<null | 'deck_locked'>(null);
  const router = useRouter();
  const { state, dispatch, isDeckLocked, spendFichas } = useGame();
  const { user } = useAuth();
  const { isPro } = useSubscription(user?.id ?? null);
  const weeklyFree = getWeeklyFreeDeckIds();
  const discountDeckId = getWeeklyDiscountDeckId();
  const POPULAR_DECK = 'basic_01';

  // Filtro de categoria
  const decksRaw = activeTab === 'tudo' || activeTab === 'loja'
    ? ALL_DECKS
    : getDecksByCategory(activeTab);

  // Filtro de propriedade (tem ou nao tem). Free weekly conta como "meu".
  const decks = decksRaw.filter(d => {
    if (ownership === 'tudo') return true;
    const isFree = (d.priceFichas ?? 0) === 0 || weeklyFree.includes(d.deckId);
    const isMine = !isDeckLocked(d.deckId) || isFree;
    return ownership === 'meus' ? isMine : !isMine;
  });

  // Calcula coleção (decks que tem, considerando free)
  const collectionStats = (() => {
    const total = ALL_DECKS.length;
    const owned = ALL_DECKS.filter(d => {
      const isFree = (d.priceFichas ?? 0) === 0 || weeklyFree.includes(d.deckId);
      return !isDeckLocked(d.deckId) || isFree;
    }).length;
    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
    return { total, owned, pct };
  })();

  const handlePlay = () => {
    if (!selectedDeck) return;
    // Tier gate: Season 0 free, demais exigem Pro/Founder
    if (!isPro && selectedDeck.seasonId !== FREE_SEASON_ID) {
      setSelectedDeck(null);
      setPaywall('deck_locked');
      return;
    }
    dispatch({ type: 'START_DECK', deck: selectedDeck });
    setSelectedDeck(null);
    router.push(`/play/${selectedDeck.deckId}`);
  };

  const getEffectivePrice = (deckId: string): number => {
    const deck = ALL_DECKS.find(d => d.deckId === deckId);
    const base = deck?.priceFichas ?? 0;
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-gold/80">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold shadow-[0_0_14px_rgba(212,175,55,0.85)]" />
              Biblioteca
            </div>
            <h2 className="mt-2 text-xl font-bold text-accent-gold">Decks</h2>
            <p className="mt-0.5 text-xs text-white/46">Escolha seu desafio</p>
          </div>

          {/* Coleção: X/Y · % — destaque dourado */}
          <div className="shrink-0 rounded-xl border border-accent-gold/30 bg-accent-gold/[0.06] px-3 py-2 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent-gold/70">
              Colecao
            </p>
            <p className="text-sm font-bold tabular-nums text-white/92">
              {collectionStats.owned}<span className="text-white/30"> / {collectionStats.total}</span>
              <span className="ml-1.5 text-[11px] font-mono text-accent-gold/90">{collectionStats.pct}%</span>
            </p>
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-accent-gold"
                initial={{ width: 0 }}
                animate={{ width: `${collectionStats.pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — categoria do deck (scroll horizontal se necessario) */}
      <div className="glass-surface mb-2 flex gap-1.5 overflow-x-auto rounded-xl p-1.5 scroll-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedDeck(null); }}
            className={`glass-button shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.12em] transition-all ${
              activeTab === tab.id
                ? 'glass-pill text-accent-gold shadow-[0_0_18px_rgba(212,175,55,0.22)]'
                : 'glass-pill text-white/46 hover:text-white/72'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtro de propriedade — Meus / Faltantes / Tudo */}
      <div className="mb-4 flex gap-1.5">
        {OWNERSHIP_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setOwnership(f.id)}
            className={`flex-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              ownership === f.id
                ? 'border-accent-gold/55 bg-accent-gold/14 text-accent-gold'
                : 'border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/70'
            }`}
          >
            {f.label}
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
                onClick={() => {
                  if (locked) return;
                  if (deck.category === 'campanha') {
                    router.push(`/campanha/${CURRENT_SEASON_ID}`);
                    return;
                  }
                  setSelectedDeck(deck);
                }}
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

      <PaywallModal
        open={paywall !== null}
        reason={paywall ?? 'deck_locked'}
        onClose={() => setPaywall(null)}
      />
    </main>
  );
}
