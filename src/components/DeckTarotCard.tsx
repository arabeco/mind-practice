'use client';

import { motion } from 'framer-motion';
import type { Deck } from '@/types/game';
import { TIER_CONFIG, type TierLevel } from '@/types/game';
import { getDeckArt } from '@/lib/deckArt';

interface DeckTarotCardProps {
  deck: Deck;
  index?: number;
  selected?: boolean;
  completed?: boolean;
  locked?: boolean;
  free?: boolean;
  badge?: 'discount' | 'popular' | null;
  onClick?: () => void;
}

/** Hex to rgba helper */
function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Derive rarity colors from tier config */
function getTierRarity(color: string, tier: number) {
  const intensity = 0.2 + tier * 0.08; // higher tier = more vivid
  return {
    primary: hexRgba(color, intensity + 0.15),
    secondary: hexRgba(color, intensity * 0.6),
    glow: hexRgba(color, intensity * 0.4),
  };
}

export default function DeckTarotCard({
  deck,
  index = 0,
  selected = false,
  completed = false,
  locked = false,
  free = false,
  badge = null,
  onClick,
}: DeckTarotCardProps) {
  const tier = (deck.tier ?? 1) as TierLevel;
  const tierConfig = TIER_CONFIG[tier];
  const rarity = getTierRarity(tierConfig.color, tier);
  const art = getDeckArt(deck);
  const isLegendary = tier >= 5;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={onClick}
      disabled={locked}
      className={`group relative w-full overflow-hidden rounded-2xl text-left transition-all ${
        locked ? 'cursor-not-allowed opacity-50 grayscale-[0.3]' : 'hover:brightness-110'
      } ${selected ? 'ring-2 ring-cyan-300/50 ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
    >
      {/* Outer glow for tier 3+ */}
      {tier >= 3 && !locked && (
        <div
          className="pointer-events-none absolute -inset-1 rounded-[1.1rem] blur-md"
          style={{ backgroundColor: rarity.glow }}
        />
      )}

      {/* Animated border for tier 5+ */}
      {isLegendary && !locked && (
        <motion.div
          className="absolute -inset-[1px] rounded-2xl"
          style={{
            background: tier === 6
              ? 'conic-gradient(from 0deg, #8b5cf6, #c084fc, #a855f7, #7c3aed, #6d28d9, #8b5cf6)'
              : 'conic-gradient(from 0deg, #f97316, #fb923c, #f59e0b, #ef4444, #f97316)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Card body */}
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-2xl border"
        style={{
          borderColor: isLegendary ? 'transparent' : `${rarity.primary}`,
          boxShadow: tierConfig.cardShadow !== 'none' ? tierConfig.cardShadow : undefined,
        }}
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ background: art.palette.background }} />

        {/* SVG ornament layer — tier-based */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 180 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Corner ornaments — all tiers */}
          <path d="M0 0 L40 0 L40 4 L4 4 L4 40 L0 40 Z" fill={rarity.primary} />
          <path d="M180 0 L140 0 L140 4 L176 4 L176 40 L180 40 Z" fill={rarity.primary} />
          <path d="M0 240 L40 240 L40 236 L4 236 L4 200 L0 200 Z" fill={rarity.primary} />
          <path d="M180 240 L140 240 L140 236 L176 236 L176 200 L180 200 Z" fill={rarity.primary} />

          {/* Inner frame — tier 2+ */}
          {tier >= 2 && (
            <rect x="12" y="12" width="156" height="216" rx="8" stroke={rarity.primary} strokeWidth="0.5" fill="none" />
          )}

          {/* Center diamond — tier 3+ */}
          {tier >= 3 && (
            <>
              <path d="M90 80 L110 120 L90 160 L70 120 Z" stroke={rarity.primary} strokeWidth="0.7" fill={rarity.glow} />
              <circle cx="90" cy="120" r="12" stroke={rarity.secondary} strokeWidth="0.5" fill="none" />
            </>
          )}

          {/* Radial lines — tier 4+ */}
          {tier >= 4 && (
            <>
              <line x1="90" y1="60" x2="90" y2="80" stroke={rarity.secondary} strokeWidth="0.4" />
              <line x1="90" y1="160" x2="90" y2="180" stroke={rarity.secondary} strokeWidth="0.4" />
              <line x1="50" y1="120" x2="70" y2="120" stroke={rarity.secondary} strokeWidth="0.4" />
              <line x1="110" y1="120" x2="130" y2="120" stroke={rarity.secondary} strokeWidth="0.4" />
              {/* Small dots at endpoints */}
              <circle cx="90" cy="58" r="2" fill={rarity.primary} />
              <circle cx="90" cy="182" r="2" fill={rarity.primary} />
              <circle cx="48" cy="120" r="2" fill={rarity.primary} />
              <circle cx="132" cy="120" r="2" fill={rarity.primary} />
            </>
          )}

          {/* Tier 5: extra ritual circles */}
          {tier === 5 && (
            <>
              <circle cx="90" cy="120" r="50" stroke={rarity.primary} strokeWidth="0.3" fill="none" strokeDasharray="4 4" />
              <circle cx="90" cy="120" r="70" stroke={rarity.secondary} strokeWidth="0.2" fill="none" strokeDasharray="2 6" />
            </>
          )}
        </svg>

        {/* Glow spot */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
          style={{ backgroundColor: art.palette.glow }}
        />

        {/* Shimmer on hover */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_28%,transparent_72%,rgba(255,255,255,0.03))] opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Top: tier badge */}
        <div className="absolute left-3 top-3 z-10">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierConfig.badgeClass}`}>
            {tierConfig.label}
          </span>
        </div>

        {/* Completed check */}
        {completed && (
          <div className="absolute right-2 top-2 z-10">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-300/30 bg-green-400/16">
              <svg className="h-3 w-3 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Free badge */}
        {free && !completed && !locked && (
          <div className="absolute right-2 top-2 z-10">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
              Free
            </span>
          </div>
        )}

        {/* Discount badge */}
        {badge === 'discount' && !locked && (
          <div className="absolute right-2 top-2 z-10">
            <span className="rounded-full border border-amber-300/40 bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
              50% OFF
            </span>
          </div>
        )}

        {/* Popular badge */}
        {badge === 'popular' && !locked && (
          <div className="absolute right-2 top-2 z-10">
            <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              Popular
            </span>
          </div>
        )}

        {/* Center: deck icon area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-black tracking-tight text-white/10">
              {deck.name.charAt(0)}
            </p>
          </div>
        </div>

        {/* Bottom: name + info */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.7)_40%)] px-3.5 pb-3.5 pt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {deck.questions.length} cenas
          </p>
          <p className="mt-0.5 text-base font-bold leading-tight text-white/90">
            {deck.name}
          </p>
          {deck.tema && (
            <p className="mt-0.5 text-[11px] leading-snug text-white/55 line-clamp-2">
              {deck.tema}
            </p>
          )}
        </div>

        {/* Lock overlay — keeps bottom name visible */}
        {locked && (
          <>
            <div className="absolute inset-x-0 top-0 bottom-[40%] z-20 flex items-center justify-center bg-[rgba(4,4,8,0.45)] backdrop-blur-[2px]">
              <svg className="h-6 w-6 text-accent-gold/50" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute inset-x-0 bottom-0 top-[60%] z-20 bg-[rgba(4,4,8,0.3)]" />
          </>
        )}
      </div>
    </motion.button>
  );
}
