'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { TIMER_DURATION } from '@/types/game';

interface TimerProps {
  running: boolean;
  onTimeout: () => void;
  duration?: number;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Timer({
  running,
  onTimeout,
  duration = TIMER_DURATION,
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const startRef = useRef<number>(0);
  const onTimeoutRef = useRef(onTimeout);

  // Keep callback ref fresh to avoid stale closures
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Reset when running changes
  useEffect(() => {
    setTimeLeft(duration);
    if (running) {
      startRef.current = Date.now();
    }
  }, [running, duration]);

  // Tick interval
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeoutRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [running, duration]);

  const fraction = timeLeft / duration;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const isUrgent = timeLeft <= 2;
  const strokeColor = isUrgent ? '#ef4444' : '#8b5cf6';
  const glowColor = isUrgent
    ? 'drop-shadow(0 0 8px rgba(239,68,68,0.7))'
    : 'drop-shadow(0 0 8px rgba(139,92,246,0.5))';

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        style={{ filter: glowColor }}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke 0.3s ease' }}
        />
      </svg>
      <span className="absolute text-2xl font-bold tabular-nums">
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}
