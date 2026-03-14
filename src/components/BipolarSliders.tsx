'use client';

import { motion } from 'framer-motion';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, type StatKey } from '@/types/game';

interface BipolarSlidersProps {
  axes: Record<StatKey, number>;
  animate?: boolean;
  delay?: number;
}

export default function BipolarSliders({ axes, animate = true, delay = 0 }: BipolarSlidersProps) {
  const maxAbs = Math.max(1, ...STAT_KEYS.map(k => Math.abs(axes[k])));

  return (
    <div className="flex flex-col gap-4 w-full">
      {STAT_KEYS.map((key, i) => {
        const value = axes[key];
        const pct = (Math.abs(value) / maxAbs) * 50; // 50% max each side
        const isPositive = value >= 0;

        return (
          <motion.div
            key={key}
            initial={animate ? { opacity: 0, x: -10 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.08, duration: 0.4 }}
          >
            {/* Label row */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white/50">{STAT_LABELS[key]}</span>
              <span
                className="text-xs font-mono font-bold"
                style={{ color: value > 0 ? STAT_COLORS[key] : value < 0 ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
              >
                {value > 0 ? '+' : ''}{value.toFixed(1)}
              </span>
            </div>

            {/* Slider bar */}
            <div className="relative h-2.5 rounded-full bg-white/5">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

              {/* Value bar */}
              <motion.div
                className="absolute top-0 h-full rounded-full"
                style={{
                  backgroundColor: isPositive ? STAT_COLORS[key] : '#ef444480',
                  ...(isPositive
                    ? { left: '50%', width: 0 }
                    : { right: '50%', width: 0 }),
                }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: delay + 0.2 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
