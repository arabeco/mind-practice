'use client';

import type { StatKey } from '@/types/game';
import { STAT_KEYS, STAT_COLORS } from '@/types/game';

interface MiniRadarProps {
  axes: Record<StatKey, number>;
  size?: number;
}

export default function MiniRadar({ axes, size = 120 }: MiniRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 14; // leave room for dots

  // Normalize values by max absolute value
  const maxAbs = Math.max(...STAT_KEYS.map(k => Math.abs(axes[k])), 0.01);

  // Calculate vertex positions for a pentagon (5 axes)
  const getPoint = (index: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2; // start from top
    const r = (Math.abs(value) / maxAbs) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // Background pentagon (outline)
  const bgPoints = STAT_KEYS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(' ');

  // Data polygon
  const dataPoints = STAT_KEYS.map((key, i) => {
    const [x, y] = getPoint(i, axes[key]);
    return `${x},${y}`;
  }).join(' ');

  // Vertex dots
  const dots = STAT_KEYS.map((key, i) => {
    const [x, y] = getPoint(i, axes[key]);
    return { x, y, color: STAT_COLORS[key], key };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Background pentagon */}
      <polygon
        points={bgPoints}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      {/* Axis lines from center */}
      {STAT_KEYS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + radius * Math.cos(angle)}
            y2={cy + radius * Math.sin(angle)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        );
      })}
      {/* Data area */}
      <polygon
        points={dataPoints}
        fill="rgba(103,232,249,0.08)"
        stroke="rgba(103,232,249,0.4)"
        strokeWidth={1.5}
      />
      {/* Vertex dots */}
      {dots.map(({ x, y, color, key }) => (
        <circle
          key={key}
          cx={x}
          cy={y}
          r={3.5}
          fill={color}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
