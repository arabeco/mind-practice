'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface ComputedRingDash {
  radius: number;
  circumference: number;
  dashOffset: number;
}

/**
 * Pure helper — geometry of an SVG ring progress indicator.
 * `value` clamped to [0,1]. `dashOffset` = how much of stroke is hidden.
 */
export function computeRingDash(value: number, size: number, thickness: number): ComputedRingDash {
  const v = Math.max(0, Math.min(1, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - v);
  return { radius, circumference, dashOffset };
}

export interface RingProps {
  value: number;
  size?: number;
  thickness?: number;
  color?: 'gold' | 'purple' | 'cyan' | 'pink';
  showValue?: boolean;
  children?: ReactNode;
  className?: string;
}

const COLOR_CLASS: Record<NonNullable<RingProps['color']>, string> = {
  gold:   'stroke-accent-gold',
  purple: 'stroke-accent-purple',
  cyan:   'stroke-accent-cyan',
  pink:   'stroke-accent-pink',
};

export function Ring({
  value,
  size = 48,
  thickness = 4,
  color = 'purple',
  showValue = false,
  children,
  className,
}: RingProps) {
  const { radius, circumference, dashOffset } = computeRingDash(value, size, thickness);
  const cx = size / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-border-subtle"
        />
        <motion.circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={COLOR_CLASS[color]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (showValue && (
          <span className="text-xs font-bold text-text-primary">
            {Math.round(value * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
