// ============================================================================
// Selo da Season 0 — "Fundação"
// Conceito visual: pedra angular / tijolo base. Formato de brasão sóbrio,
// sem enfeite. Cor neutra cinza-metal com contorno mais escuro.
// ============================================================================

interface SealProps {
  className?: string;
  size?: number;
}

export function Season0Seal({ className, size = 24 }: SealProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Selo da Season 0 — Fundação"
    >
      {/* escudo */}
      <path
        d="M12 1.5 L21 5 L21 12 C21 17 16.5 20.5 12 22.5 C7.5 20.5 3 17 3 12 L3 5 Z"
        fill="#475569"
        stroke="#1e293b"
        strokeWidth="1"
      />
      {/* tijolo central (fundação) */}
      <rect x="8" y="9" width="8" height="5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" rx="0.5" />
      {/* risco horizontal simbolizando fundação */}
      <line x1="7" y1="15.5" x2="17" y2="15.5" stroke="#cbd5e1" strokeWidth="0.6" strokeLinecap="round" />
      {/* número 0 */}
      <text
        x="12"
        y="18.2"
        textAnchor="middle"
        fontSize="3.2"
        fontWeight="700"
        fill="#0f172a"
        fontFamily="ui-sans-serif, system-ui"
      >0</text>
    </svg>
  );
}
