'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const cardVariants = cva(
  'rounded-2xl border',
  {
    variants: {
      variant: {
        glass:    'bg-bg-glass border-border-subtle backdrop-blur-md',
        solid:    'bg-bg-surface-strong border-border-default',
        elevated: 'bg-bg-glass border-border-default backdrop-blur-md shadow-[0_20px_55px_rgba(6,8,24,0.32)]',
      },
      padding: {
        none: '',
        sm:   'p-2',
        md:   'p-4',
        lg:   'p-6',
      },
      glow: {
        true:  'shadow-[0_0_24px_rgba(139,92,246,0.30)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'glass',
      padding: 'md',
      glow: false,
    },
  },
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ className, variant, padding, glow, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, glow }), className)}
        {...props}
      />
    );
  },
);
