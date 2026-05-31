'use client';

/**
 * PoleIcon — renderiza o icone do polo dominante de um eixo, baseado no score.
 *
 * Assets em: /public/icons/<slug>.png
 *   passivo, agressivo, conflito, paz, impulsivo, calculista,
 *   invisivel, dominante, apegado, desapegado
 *
 * Convencao:
 *   value < 0  → polo negativo (Passivo, Conflito, Impulsivo, Invisivel, Apegado)
 *   value >= 0 → polo positivo (Agressivo, Paz, Calculista, Dominante, Desapegado)
 *
 * Uso:
 *   <PoleIcon axis="vigor" value={0.72} size={28} />
 *   <PoleIcon axis="vigor" value={-0.4} size={40} showLabel />
 *   <PoleIcon axis="filtro" pole="impulsivo" size={32} />   // override direto
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { STAT_COLORS, type StatKey } from '@/types/game';
import { AXIS_POLES, AXIS_POLE_SLUGS, pickPoleSlug } from '@/lib/axisPoles';

interface PoleIconProps {
  axis: StatKey;
  /** Score do eixo em [-1, +1]. Determina qual polo mostrar. Ignorado se `pole` for passado. */
  value?: number;
  /** Override: forca um polo especifico ('passivo', 'agressivo', etc). */
  pole?: string;
  /** Px (default 40). */
  size?: number;
  /** Mostra label do polo abaixo do icone. */
  showLabel?: boolean;
  /** Esmaece (pra polo "perdedor" em comparativos). */
  dimmed?: boolean;
  /** Sem halo colorido por tras (icone puro). */
  noGlow?: boolean;
  /** Classes extras pro container. */
  className?: string;
  /** Tooltip nativo. */
  title?: string;
}

function resolveSlugAndLabel(props: PoleIconProps): { slug: string; label: string } {
  if (props.pole) {
    const polesArr = AXIS_POLE_SLUGS[props.axis];
    const idx = polesArr.findIndex(s => s === props.pole);
    if (idx >= 0) return { slug: polesArr[idx], label: AXIS_POLES[props.axis][idx] };
    // Slug invalido — cai no fallback default (polo positivo).
    return { slug: polesArr[1], label: AXIS_POLES[props.axis][1] };
  }
  const v = typeof props.value === 'number' ? props.value : 0;
  const picked = pickPoleSlug(props.axis, v);
  return { slug: picked.slug, label: picked.label };
}

export default function PoleIcon(props: PoleIconProps) {
  const { axis, size = 40, showLabel, dimmed, noGlow, className, title } = props;
  const { slug, label } = resolveSlugAndLabel(props);
  const color = STAT_COLORS[axis];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`flex flex-col items-center gap-1 ${dimmed ? 'opacity-35' : 'opacity-100'} ${className ?? ''}`}
      title={title ?? label}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Halo colorido por tras (mesma cor da barra do eixo) */}
        {!noGlow && !dimmed && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${color}40 0%, ${color}10 55%, transparent 75%)`,
              filter: 'blur(2px)',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          />
        )}

        {/* Imagem do polo (com fallback) */}
        {imgError ? (
          <span
            aria-hidden
            className="relative flex items-center justify-center rounded-full font-bold uppercase"
            style={{
              width: size,
              height: size,
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}55`,
              fontSize: size * 0.42,
              letterSpacing: '0.04em',
            }}
          >
            {label.charAt(0)}
          </span>
        ) : (
          <img
            src={`/icons/${slug}.png`}
            alt={label}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="relative block rounded-full"
            style={{ width: size, height: size, objectFit: 'contain' }}
          />
        )}
      </div>

      {showLabel && (
        <span
          className="text-[8px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: dimmed ? 'rgba(255,255,255,0.35)' : color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
