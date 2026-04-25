'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-gold text-text-on-accent hover:brightness-110 hover:shadow-[0_0_24px_rgba(212,175,55,0.30)] active:brightness-95',
        secondary:
          'bg-bg-glass border border-border-default text-text-primary backdrop-blur-md hover:bg-bg-glass-strong hover:border-border-strong',
        ghost:
          'bg-transparent text-text-secondary hover:bg-bg-surface hover:text-text-primary',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, fullWidth, loading, disabled, iconLeft, iconRight, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);
