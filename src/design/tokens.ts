/**
 * Design tokens — fonte única da verdade visual.
 *
 * Sincronizado manualmente com `src/app/globals.css` `@theme inline`.
 * Quando editar `SEMANTIC` aqui, atualize o bloco `@theme inline` lá.
 * O test `src/design/__tests__/tokens-sync.test.ts` falha se derrapar.
 *
 * Componentes consomem `SEMANTIC` (via classes Tailwind tipo `bg-bg-glass`,
 * `text-text-secondary`). `PRIMITIVES` é a paleta — não usar diretamente.
 */

const PRIMITIVES = {
  colors: {
    purple: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
      400: '#c084fc', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
      800: '#5b21b6', 900: '#3b0764',
    },
    gold: {
      50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
      400: '#facc15', 500: '#d4af37', 600: '#a18415', 700: '#854d0e',
      800: '#713f12', 900: '#422006',
    },
    cyan:  { 500: '#67e8f9' },
    pink:  { 500: '#f472b6' },
    red:   { 500: '#ef4444' },
    green: { 500: '#22c55e' },
    gray: {
      50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
      400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
      800: '#27272a', 900: '#18181b', 950: '#0a0a0f',
    },
  },
  space: {
    0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px',
    6: '24px', 8: '32px', 12: '48px', 16: '64px', 24: '96px',
  },
  radius: {
    sm: '4px', md: '8px', lg: '12px', xl: '16px',
    '2xl': '24px', full: '9999px',
  },
  font: {
    display: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, monospace',
  },
  text: {
    xs: '10px', sm: '12px', base: '14px', lg: '16px', xl: '18px',
    '2xl': '24px', '3xl': '32px', '4xl': '48px', '5xl': '64px',
    '6xl': '80px', '7xl': '96px',
  },
  motion: {
    instant: { duration: 0,   easing: 'linear' },
    fast:    { duration: 120, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    medium:  { duration: 240, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    slow:    { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    cinema:  { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
} as const;

const SEMANTIC = {
  bg: {
    base:          PRIMITIVES.colors.gray[950],
    surface:       'rgba(255,255,255,0.04)',
    surfaceStrong: 'rgba(255,255,255,0.08)',
    glass:         'rgba(255,255,255,0.05)',
    glassStrong:   'rgba(255,255,255,0.12)',
  },
  border: {
    subtle:  'rgba(255,255,255,0.08)',
    default: 'rgba(255,255,255,0.16)',
    strong:  'rgba(255,255,255,0.24)',
  },
  text: {
    primary:   'rgba(255,255,255,0.95)',
    secondary: 'rgba(255,255,255,0.70)',
    tertiary:  'rgba(255,255,255,0.45)',
    disabled:  'rgba(255,255,255,0.25)',
    onAccent:  'rgba(0,0,0,0.92)',
  },
  accent: {
    gold:   { fg: PRIMITIVES.colors.gold[500],   bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.30)' },
    purple: { fg: PRIMITIVES.colors.purple[500], bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.30)' },
    cyan:   { fg: PRIMITIVES.colors.cyan[500],   bg: 'rgba(103,232,249,0.12)', border: 'rgba(103,232,249,0.30)' },
    pink:   { fg: PRIMITIVES.colors.pink[500],   bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.30)' },
  },
  state: {
    success: { fg: PRIMITIVES.colors.green[500], bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.30)' },
    warning: { fg: PRIMITIVES.colors.gold[500],  bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.30)' },
    error:   { fg: PRIMITIVES.colors.red[500],   bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)' },
    info:    { fg: PRIMITIVES.colors.cyan[500],  bg: 'rgba(103,232,249,0.12)', border: 'rgba(103,232,249,0.30)' },
  },
  shadow: {
    soft:    '0 14px 34px rgba(8,10,24,0.22)',
    default: '0 20px 55px rgba(6,8,24,0.32)',
    glow:    '0 0 24px rgba(139,92,246,0.30)',
    inset:   'inset 0 1px 0 rgba(255,255,255,0.18)',
  },
} as const;

export const TOKENS = { ...PRIMITIVES, semantic: SEMANTIC } as const;
export type DesignTokens = typeof TOKENS;
export type SemanticTokens = typeof SEMANTIC;
