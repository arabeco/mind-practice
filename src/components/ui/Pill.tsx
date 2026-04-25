'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const pillVariants = cva(
  'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
  {
    variants: {
      variant: {
        gold:        'border-accent-gold-border   bg-accent-gold-bg   text-accent-gold',
        purple:      'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        cyan:        'border-accent-cyan-border   bg-accent-cyan-bg   text-accent-cyan',
        pink:        'border-accent-pink-border   bg-accent-pink-bg   text-accent-pink',
        neutral:     'border-border-subtle        bg-bg-surface       text-text-secondary',
        // Tone aliases (Tone em src/types/game.ts: pragmatico/provocativo/protetor/evasivo/neutro)
        pragmatico:  'border-accent-gold-border   bg-accent-gold-bg   text-accent-gold',
        provocativo: 'border-accent-pink-border   bg-accent-pink-bg   text-accent-pink',
        protetor:    'border-accent-cyan-border   bg-accent-cyan-bg   text-accent-cyan',
        evasivo:     'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        neutro:      'border-border-subtle        bg-bg-surface       text-text-secondary',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface PillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  iconLeft?: ReactNode;
}

export const Pill = forwardRef<HTMLSpanElement, PillProps>(
  function Pill({ className, variant, iconLeft, children, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(pillVariants({ variant }), className)}
        {...props}
      >
        {iconLeft && <span className="shrink-0">{iconLeft}</span>}
        {children}
      </span>
    );
  },
);
