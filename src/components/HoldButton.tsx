'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HOLD_DURATION_MS } from '@/types/game';

interface HoldButtonProps {
  onConfirm: () => void;
  onHoldStart?: () => void;
  onHoldCancel?: () => void;
  holdColor: string;
  durationMs?: number;
  disabled?: boolean;
  enableHaptics?: boolean;
  children: ReactNode;
  className?: string;
}

export default function HoldButton({
  onConfirm,
  onHoldStart,
  onHoldCancel,
  holdColor,
  durationMs,
  disabled = false,
  enableHaptics = true,
  children,
  className = '',
}: HoldButtonProps) {
  const holdDuration = durationMs ?? HOLD_DURATION_MS;
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const confirmedRef = useRef(false);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / holdDuration, 1);
    setProgress(pct);

    if (pct >= 1 && !confirmedRef.current) {
      confirmedRef.current = true;
      setHolding(false);
      // Haptic feedback if available
      if (enableHaptics && navigator.vibrate) navigator.vibrate(30);
      onConfirm();
      return;
    }

    if (pct < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [enableHaptics, onConfirm]);

  const handleStart = useCallback(() => {
    if (disabled) return;
    confirmedRef.current = false;
    startRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    onHoldStart?.();
    rafRef.current = requestAnimationFrame(animate);
  }, [disabled, animate, onHoldStart]);

  const handleEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const wasHolding = !confirmedRef.current;
    setHolding(false);
    setProgress(0);
    if (wasHolding) onHoldCancel?.();
  }, [onHoldCancel]);

  return (
    <button
      type="button"
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      disabled={disabled}
      className={`relative overflow-hidden touch-none select-none ${className}`}
    >
      {/* Hold progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-full"
        style={{ backgroundColor: holdColor }}
        initial={{ width: '0%' }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0 }}
      />

      {/* Glow effect when holding */}
      {holding && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: holdColor }}
        />
      )}

      {children}
    </button>
  );
}
