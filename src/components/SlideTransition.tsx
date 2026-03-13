'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface SlideTransitionProps {
  slideKey: string;
  children: ReactNode;
  type?: 'context' | 'event' | 'options';
}

const variants = {
  context: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  },
  event: {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
  },
  options: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  },
};

export default function SlideTransition({
  slideKey,
  children,
  type = 'context',
}: SlideTransitionProps) {
  const v = variants[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slideKey}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
