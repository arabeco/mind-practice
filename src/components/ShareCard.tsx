'use client';

import { forwardRef } from 'react';
import type { Archetype, StatKey } from '@/types/game';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';

interface ShareCardProps {
  archetype: Archetype;
  axes: Record<StatKey, number>;
  nickname: string;
}

/**
 * Hidden off-screen card (1080x1920, 9:16 story format) used as html2canvas source.
 * Uses inline styles throughout — Tailwind classes won't render in the canvas.
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ archetype, axes, nickname }, ref) => {
    const maxAbs = Math.max(1, ...STAT_KEYS.map(k => Math.abs(axes[k])));

    // Pentagon radar — 5 vertices evenly spaced, starting from top
    const cx = 540;
    const cy = 860;
    const R = 260;
    const angles = STAT_KEYS.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2);

    const outerPoints = angles.map(a => ({
      x: cx + R * Math.cos(a),
      y: cy + R * Math.sin(a),
    }));

    const dataPoints = STAT_KEYS.map((key, i) => {
      const norm = Math.min(Math.abs(axes[key]) / maxAbs, 1);
      const r = R * 0.15 + R * 0.85 * norm; // min 15% so the shape is always visible
      return {
        x: cx + r * Math.cos(angles[i]),
        y: cy + r * Math.sin(angles[i]),
      };
    });

    const outerPath = outerPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background: 'linear-gradient(170deg, #12121f 0%, #0a0a0f 40%, #0d0b18 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Subtle glow at top */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 500,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Archetype name */}
        <div
          style={{
            position: 'absolute',
            top: 260,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.02em',
              textShadow: '0 0 60px rgba(139,92,246,0.25)',
            }}
          >
            {archetype.name}
          </div>
          <div
            style={{
              fontSize: 32,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 12,
            }}
          >
            {archetype.tagline}
          </div>
        </div>

        {/* Radar SVG */}
        <svg
          width={1080}
          height={800}
          viewBox={`0 0 1080 800`}
          style={{
            position: 'absolute',
            top: 500,
            left: 0,
          }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(scale => {
            const pts = angles
              .map(a => `${cx + R * scale * Math.cos(a)},${cy - 460 + R * scale * Math.sin(a)}`)
              .join(' ');
            return (
              <polygon
                key={scale}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            );
          })}

          {/* Spoke lines */}
          {outerPoints.map((p, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy - 460}
              x2={p.x}
              y2={p.y - 460}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}

          {/* Data fill */}
          <polygon
            points={dataPoints.map(p => `${p.x},${p.y - 460}`).join(' ')}
            fill="rgba(139,92,246,0.15)"
            stroke="rgba(139,92,246,0.5)"
            strokeWidth={2}
          />

          {/* Data dots + labels */}
          {STAT_KEYS.map((key, i) => {
            const dp = dataPoints[i];
            const labelR = R + 60;
            const lx = cx + labelR * Math.cos(angles[i]);
            const ly = cy - 460 + labelR * Math.sin(angles[i]);

            return (
              <g key={key}>
                <circle
                  cx={dp.x}
                  cy={dp.y - 460}
                  r={10}
                  fill={STAT_COLORS[key]}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={STAT_COLORS[key]}
                  fontSize={26}
                  fontWeight={700}
                  letterSpacing="0.12em"
                  style={{ textTransform: 'uppercase' } as React.CSSProperties}
                >
                  {STAT_LABELS[key]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Call to action text */}
        <div
          style={{
            position: 'absolute',
            bottom: 320,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}
          >
            Eu sou <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{archetype.name}</span>. E voce?
          </div>
        </div>

        {/* Nickname */}
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.08em',
            }}
          >
            {nickname}
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
          >
            MindPractice
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;
