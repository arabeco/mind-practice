'use client';

/**
 * Icones da loja:
 *   - <PackIcon code="fichas_100" />    pilha de fichas pro pack
 *   - <TierIcon code="pro" />           emblema do tier (so 'pro' por enquanto)
 *
 * Assets esperados em /public/icons/:
 *   pack-100.png, pack-300.png, pack-700.png, tier-pro.png
 *
 * Fallback: se PNG nao existir, renderiza um disco com a inicial.
 */

import { useState } from 'react';

interface PackIconProps {
  /** Codigo IAP: 'fichas_100' | 'fichas_300' | 'fichas_700'. */
  code: 'fichas_100' | 'fichas_300' | 'fichas_700';
  /** Px (default 96). */
  size?: number;
  /** Classes extras. */
  className?: string;
}

const PACK_FILE: Record<PackIconProps['code'], string> = {
  fichas_100: 'pack-100',
  fichas_300: 'pack-300',
  fichas_700: 'pack-700',
};

export function PackIcon({ code, size = 96, className }: PackIconProps) {
  const [err, setErr] = useState(false);
  const file = PACK_FILE[code];
  if (err) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white/[0.04] text-white/40 ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span className="text-xs font-mono">{file.replace('pack-', '')}</span>
      </div>
    );
  }
  return (
    <img
      src={`/icons/${file}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setErr(true)}
      className={`block select-none ${className ?? ''}`}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

interface TierIconProps {
  /** Tier code. So 'pro' tem PNG por enquanto. */
  code: 'pro' | 'founder';
  size?: number;
  className?: string;
}

export function TierIcon({ code, size = 96, className }: TierIconProps) {
  const [err, setErr] = useState(false);
  // Founder ainda nao tem PNG — renderiza fallback elegante.
  if (code === 'founder' || err) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/8 ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold/80">
          {code === 'pro' ? 'PRO' : 'FDR'}
        </span>
      </div>
    );
  }
  return (
    <img
      src="/icons/tier-pro.png"
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setErr(true)}
      className={`block select-none ${className ?? ''}`}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
