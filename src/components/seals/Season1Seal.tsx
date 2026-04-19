// ============================================================================
// Selo da Season 1 — "Ocupando Espaço"
// Conceito visual: mesa de reunião / cadeira no topo. Cor dourada sóbria,
// contorno escuro. Sensação de poder formal.
// ============================================================================

interface SealProps {
  className?: string;
  size?: number;
}

export function Season1Seal({ className, size = 24 }: SealProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Selo da Season 1 — Ocupando Espaço"
    >
      {/* escudo */}
      <path
        d="M12 1.5 L21 5 L21 12 C21 17 16.5 20.5 12 22.5 C7.5 20.5 3 17 3 12 L3 5 Z"
        fill="#1e1b4b"
        stroke="#0a0a1a"
        strokeWidth="1"
      />
      {/* mesa retangular */}
      <rect x="6" y="13" width="12" height="1.4" fill="#c084fc" />
      {/* cadeira (topo) */}
      <rect x="11" y="8" width="2" height="4" fill="#c084fc" rx="0.4" />
      {/* 2 cadeiras menores laterais */}
      <rect x="7.5" y="10" width="1.4" height="2.5" fill="#a78bfa" rx="0.3" />
      <rect x="15.1" y="10" width="1.4" height="2.5" fill="#a78bfa" rx="0.3" />
      {/* número 1 (romano I) */}
      <text
        x="12"
        y="19.5"
        textAnchor="middle"
        fontSize="3.8"
        fontWeight="800"
        fill="#c084fc"
        fontFamily="ui-serif, Georgia"
      >I</text>
    </svg>
  );
}
