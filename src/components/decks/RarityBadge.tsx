// ============================================================================
// RarityBadge — pill visual que mostra a raridade do deck.
// Usado em DeckCard e em tela de detalhe.
// ============================================================================

import type { Rarity } from '@/types/game';
import { getRarityVisual } from '@/lib/rarity';

interface RarityBadgeProps {
  rarity: Rarity;
  /** Se true, mostra a palavra (Comum, Raro, ...). Se false, só o dot colorido. */
  showLabel?: boolean;
  className?: string;
}

export function RarityBadge({ rarity, showLabel = true, className = '' }: RarityBadgeProps) {
  const v = getRarityVisual(rarity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${v.borderClass} ${v.textClass} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: v.hex, boxShadow: `0 0 6px ${v.hex}` }}
      />
      {showLabel && v.label}
    </span>
  );
}
