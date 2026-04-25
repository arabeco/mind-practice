'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const dialogVariants = cva(
  'relative bg-bg-glass-strong border border-border-default backdrop-blur-md shadow-[0_20px_55px_rgba(6,8,24,0.32)]',
  {
    variants: {
      variant: {
        center: 'w-full max-w-md rounded-2xl p-6',
        sheet:  'w-full rounded-t-2xl p-6 mt-auto',
      },
    },
    defaultVariants: { variant: 'center' },
  },
);

export const dialogBackdropClasses =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';

export interface DialogProps extends VariantProps<typeof dialogVariants> {
  open: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  variant = 'center',
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, closeOnEsc, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            dialogBackdropClasses,
            variant === 'sheet' && 'items-end',
          )}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            initial={{ y: variant === 'sheet' ? '100%' : 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: variant === 'sheet' ? '100%' : 20, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className={cn(dialogVariants({ variant }), className)}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
