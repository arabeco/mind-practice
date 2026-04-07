'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { Deck } from '@/types/game';
import { TIER_CONFIG, STAT_COLORS, type TierLevel } from '@/types/game';
import { getDeckArt } from '@/lib/deckArt';

interface DeckDetailModalProps {
  deck: Deck | null;
  open: boolean;
  onClose: () => void;
  /** Price in fichas. 0 = free. undefined = already owned / not for sale */
  price?: number;
  owned?: boolean;
  canAfford?: boolean;
  onBuy?: () => void;
  onPlay?: () => void;
}

/** Fichas emoji + number */
function FichasPrice({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <span className="text-green-300 font-semibold">Gratis</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-bold">
      <span>{amount}</span>
      <span className="text-base">💎</span>
    </span>
  );
}

export default function DeckDetailModal({
  deck,
  open,
  onClose,
  price,
  owned = false,
  canAfford = true,
  onBuy,
  onPlay,
}: DeckDetailModalProps) {
  if (!deck) return null;

  const tier = (deck.tier ?? 1) as TierLevel;
  const tierConfig = TIER_CONFIG[tier];
  const art = getDeckArt(deck);
  const focusColor = deck.focusAxis ? STAT_COLORS[deck.focusAxis] : undefined;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-x-4 top-[10%] z-[61] mx-auto max-w-sm overflow-hidden rounded-[1.8rem]"
          >
            {/* Card background */}
            <div className="relative">
              <div className="absolute inset-0" style={{ background: art.palette.background }} />
              <div
                className="pointer-events-none absolute left-1/2 top-1/4 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
                style={{ backgroundColor: art.palette.glow }}
              />

              {/* SVG ornament top */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                <path d="M0 0 L50 0 L50 3 L3 3 L3 50 L0 50 Z" fill={art.palette.line} opacity="0.5" />
                <path d="M320 0 L270 0 L270 3 L317 3 L317 50 L320 50 Z" fill={art.palette.line} opacity="0.5" />
              </svg>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/50 backdrop-blur-sm transition-colors hover:text-white/80"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header section */}
              <div className="relative px-5 pb-5 pt-6">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierConfig.badgeClass}`}>
                    {tierConfig.label}
                  </span>
                  {focusColor && (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: focusColor }} />
                      <span className="text-[10px] uppercase tracking-[0.14em] text-white/55">{deck.focusAxis}</span>
                    </div>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-bold text-white/95">{deck.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{deck.description}</p>
              </div>
            </div>

            {/* Scene preview for unpurchased decks */}
            {price !== undefined && !owned && deck.questions[0] && (
              <div className="border-t border-white/8 px-5 py-3">
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Preview da primeira cena
                </p>
                <p className="text-xs italic leading-relaxed text-white/50">
                  &ldquo;{deck.questions[0].slides[0]?.texto}&rdquo;
                </p>
              </div>
            )}

            {/* Details section */}
            <div className="glass-surface-strong border-t border-white/8 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-[11px] text-white/55">
                  <span>{deck.questions.length} cenas</span>
                  <span>Tier {tier}</span>
                  {deck.tema && <span className="truncate max-w-[120px]">{deck.tema}</span>}
                </div>
              </div>

              {/* Action area */}
              <div className="mt-4">
                {owned ? (
                  <button
                    onClick={onPlay}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-cyan-300/25 bg-cyan-300/10 py-3.5 text-sm font-bold text-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.15)] transition-all hover:bg-cyan-300/16"
                  >
                    <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Jogar
                  </button>
                ) : price !== undefined && price === 0 ? (
                  <button
                    onClick={onPlay}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-green-300/25 bg-green-300/10 py-3.5 text-sm font-bold text-green-300 shadow-[0_0_24px_rgba(74,222,128,0.12)] transition-all hover:bg-green-300/16"
                  >
                    <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Jogar — Gratis
                  </button>
                ) : price !== undefined ? (
                  <button
                    onClick={onBuy}
                    disabled={!canAfford}
                    className={`flex w-full items-center justify-center gap-2.5 rounded-xl border py-3.5 text-sm font-bold transition-all ${
                      canAfford
                        ? 'border-accent-gold/30 bg-accent-gold/10 text-accent-gold shadow-[0_0_24px_rgba(212,175,55,0.12)] hover:bg-accent-gold/16'
                        : 'border-white/8 bg-white/4 text-white/25 cursor-not-allowed'
                    }`}
                  >
                    <span>{price}</span>
                    <span className="text-base">💎</span>
                    {!canAfford && <span className="text-[10px] text-white/20 ml-1">— fichas insuficientes</span>}
                  </button>
                ) : (
                  <button
                    onClick={onPlay}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-cyan-300/25 bg-cyan-300/10 py-3.5 text-sm font-bold text-cyan-300 transition-all hover:bg-cyan-300/16"
                  >
                    <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Jogar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
