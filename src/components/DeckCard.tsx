'use client';

import { motion } from 'framer-motion';
import type { Deck, StatKey } from '@/types/game';
import { STAT_COLORS, TIER_CONFIG, type TierLevel } from '@/types/game';

interface DeckCardProps {
  deck: Deck;
  index: number;
  locked: boolean;
  completed: boolean;
  isWeeklyFree: boolean;
  timeLeftLabel: string;
  onClick: () => void;
}

/** Tier 3 (Dominio) target icon */
function TargetIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/** Tier 5 animated gradient border wrapper */
function LegendaryBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl p-[1px]">
      {/* Rotating conic gradient */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-70"
        style={{
          background: 'conic-gradient(from 0deg, #8b5cf6, #d4af37, #ef4444, #10b981, #60a5fa, #8b5cf6)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner content mask */}
      <div className="relative rounded-2xl">
        {children}
      </div>
    </div>
  );
}

export default function DeckCard({
  deck,
  index,
  locked,
  completed,
  isWeeklyFree,
  timeLeftLabel,
  onClick,
}: DeckCardProps) {
  const tier = TIER_CONFIG[deck.tier as TierLevel];
  const focusColor = deck.focusAxis ? STAT_COLORS[deck.focusAxis] : undefined;

  const cardContent = (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      disabled={locked}
      onClick={onClick}
      className={`relative w-full overflow-hidden p-5 text-left rounded-2xl backdrop-blur-[20px] transition-all duration-300 ${
        tier.cardBgClass
      } ${locked ? 'cursor-not-allowed opacity-40 grayscale' : 'hover:brightness-110'}`}
      style={{
        border: deck.tier === 5 ? 'none' : `1px solid`,
        borderColor: deck.tier === 5 ? 'transparent' : undefined,
        boxShadow: tier.cardShadow !== 'none' ? tier.cardShadow : undefined,
        ...(focusColor && !locked && deck.tier < 3
          ? { borderColor: `${focusColor}30` }
          : {}),
      }}
    >
      {/* Apply tier border color via className for non-Tier-5 */}
      {deck.tier !== 5 && (
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none ${tier.cardBorderClass}`}
          style={{ border: '1px solid', borderColor: 'inherit' }}
        />
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Tier badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tier.badgeClass}`}>
          {tier.label}
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
        {/* Tier 3: Target icon */}
        {deck.tier === 3 && (
          <div className="ml-auto">
            <TargetIcon />
          </div>
        )}
      </div>

      {/* Title */}
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
          <span className="text-xs text-white/50">{timeLeftLabel}</span>
        </div>
      )}
    </motion.button>
  );

  // Tier 5: wrap with animated gradient border
  if (deck.tier === 5) {
    return <LegendaryBorder>{cardContent}</LegendaryBorder>;
  }

  return cardContent;
}
