'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const badgeVariants = cva(
  'inline-flex h-5 items-center rounded-full border px-2 text-[9px] font-bold uppercase tracking-[0.14em]',
  {
    variants: {
      variant: {
        gold:    'border-accent-gold-border bg-accent-gold-bg text-accent-gold',
        purple:  'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        cyan:    'border-accent-cyan-border bg-accent-cyan-bg text-accent-cyan',
        pink:    'border-accent-pink-border bg-accent-pink-bg text-accent-pink',
        neutral: 'border-border-subtle bg-bg-surface text-text-secondary',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
