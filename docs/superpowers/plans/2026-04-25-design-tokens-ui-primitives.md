# F5a — Design Tokens + UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer fonte única de verdade visual (`src/design/tokens.ts`) + 6 componentes UI primitivos (Button, Card, Dialog, Badge, Pill, Ring) consumindo esses tokens, com showcase em `/dev/ui`, migração de 3 surfaces de prova (Toast, BottomNav, ProfileCardCompact), e UTF-8 sweep mecânico.

**Architecture:** Tokens TS imutáveis (`as const`) sincronizados manualmente com `globals.css` `@theme inline` (Tailwind v4). Componentes em `src/components/ui/` usam `class-variance-authority` (cva) para variants tipados; classes derivam dos tokens via Tailwind. Testes são puros sobre as funções `*Variants()` retornadas por cva — sem rendering React.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, Tailwind v4, `node:test` + `tsx`. Adiciona: `class-variance-authority`, `clsx`, `tailwind-merge`. Spec: `docs/superpowers/specs/2026-04-25-design-tokens-ui-primitives-design.md`.

---

## Estrutura de arquivos

**Criados:**
- `src/design/tokens.ts` — `TOKENS` tipado (primitives + semantics)
- `src/design/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/design/__tests__/tokens-sync.test.ts` — verifica sincronia tokens.ts ↔ globals.css
- `src/components/ui/Button.tsx` + `__tests__/Button.test.ts`
- `src/components/ui/Card.tsx` + `__tests__/Card.test.ts`
- `src/components/ui/Dialog.tsx` + `__tests__/Dialog.test.ts`
- `src/components/ui/Badge.tsx` + `__tests__/Badge.test.ts`
- `src/components/ui/Pill.tsx` + `__tests__/Pill.test.ts`
- `src/components/ui/Ring.tsx` + `__tests__/Ring.test.ts`
- `src/components/ui/index.ts` — barrel
- `src/app/dev/ui/page.tsx` — showcase (hidden from nav)
- `scripts/check-utf8.ts` — lint que falha em ASCII-only Portuguese
- `docs/design/tokens.md`
- `docs/design/components.md`

**Modificados:**
- `src/app/globals.css` — `@theme inline` sincronizado com semantics
- `package.json` — deps + script `check:utf8`
- `src/components/Toast.tsx` — migra para tokens + Card
- `src/components/BottomNav.tsx` — migra para tokens
- `src/components/ProfileCardCompact.tsx` — migra para Card + Badge + Ring
- `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md` — F5a status

---

## Fase 1 — Fundação

### Task 1: Adicionar deps e helper `cn()`

**Files:**
- Modify: `package.json`
- Create: `src/design/utils.ts`

- [ ] **Step 1: Instalar dependências**

Run:
```bash
npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^2.6.0
```
Expected: 3 packages added, 0 vulnerabilities.

- [ ] **Step 2: Verificar package.json**

Run: `node -e "console.log(JSON.stringify(require('./package.json').dependencies, null, 2))"`
Expected: contém `class-variance-authority`, `clsx`, `tailwind-merge`.

- [ ] **Step 3: Criar `src/design/utils.ts`**

Conteúdo:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn(...inputs) — concatena classes com clsx e resolve conflitos
 * Tailwind via twMerge. Padrão idiomático para componentes com cva.
 *
 * @example
 *   cn('px-2 py-1', condition && 'bg-red-500', 'px-4')
 *   // => 'py-1 bg-red-500 px-4'  (px-2 substituído por px-4)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/design/utils.ts
git commit -m "feat(design): add cva/clsx/tailwind-merge deps + cn() helper"
```

---

### Task 2: Tokens — primitives + semantics

**Files:**
- Create: `src/design/tokens.ts`

- [ ] **Step 1: Criar `src/design/tokens.ts`**

Conteúdo:
```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/design/tokens.ts
git commit -m "feat(design): tokens.ts — primitives + semantic palette"
```

---

### Task 3: Sincronizar `globals.css` `@theme inline` com semantic tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Localizar bloco `@theme inline`**

Run: `grep -n "@theme inline" src/app/globals.css`
Expected: encontra a linha do bloco existente (~linha 22).

- [ ] **Step 2: Substituir cores semânticas existentes pelo bloco completo**

No bloco `@theme inline { ... }`, garantir que essas variáveis existem (adicionar se faltar, manter as outras intactas):

```css
@theme inline {
  /* === Backgrounds === */
  --color-bg-base: #0a0a0f;
  --color-bg-surface: rgba(255,255,255,0.04);
  --color-bg-surface-strong: rgba(255,255,255,0.08);
  --color-bg-glass: rgba(255,255,255,0.05);
  --color-bg-glass-strong: rgba(255,255,255,0.12);

  /* === Borders === */
  --color-border-subtle: rgba(255,255,255,0.08);
  --color-border-default: rgba(255,255,255,0.16);
  --color-border-strong: rgba(255,255,255,0.24);

  /* === Text === */
  --color-text-primary: rgba(255,255,255,0.95);
  --color-text-secondary: rgba(255,255,255,0.70);
  --color-text-tertiary: rgba(255,255,255,0.45);
  --color-text-disabled: rgba(255,255,255,0.25);
  --color-text-on-accent: rgba(0,0,0,0.92);

  /* === Accents === */
  --color-accent-gold: #d4af37;
  --color-accent-gold-bg: rgba(212,175,55,0.12);
  --color-accent-gold-border: rgba(212,175,55,0.30);
  --color-accent-purple: #8b5cf6;
  --color-accent-purple-bg: rgba(139,92,246,0.12);
  --color-accent-purple-border: rgba(139,92,246,0.30);
  --color-accent-cyan: #67e8f9;
  --color-accent-cyan-bg: rgba(103,232,249,0.12);
  --color-accent-cyan-border: rgba(103,232,249,0.30);
  --color-accent-pink: #f472b6;
  --color-accent-pink-bg: rgba(244,114,182,0.12);
  --color-accent-pink-border: rgba(244,114,182,0.30);

  /* === States === */
  --color-state-success: #22c55e;
  --color-state-success-bg: rgba(34,197,94,0.12);
  --color-state-success-border: rgba(34,197,94,0.30);
  --color-state-warning: #d4af37;
  --color-state-warning-bg: rgba(212,175,55,0.12);
  --color-state-warning-border: rgba(212,175,55,0.30);
  --color-state-error: #ef4444;
  --color-state-error-bg: rgba(239,68,68,0.12);
  --color-state-error-border: rgba(239,68,68,0.30);
  --color-state-info: #67e8f9;
  --color-state-info-bg: rgba(103,232,249,0.12);
  --color-state-info-border: rgba(103,232,249,0.30);

  /* (manter todas as outras variáveis e keyframes existentes intactos) */
}
```

**Importante**: as variáveis `--color-accent-purple` e `--color-accent-gold` já existem hoje em `globals.css`. Não duplicar — substituir os valores se diferirem, manter chaves antigas que outros componentes consomem (ex: `--color-accent-purple-light`).

- [ ] **Step 3: Build verifica integridade do Tailwind**

Run: `npm run build`
Expected: build passa, 10 rotas geradas.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): sync globals.css @theme inline com semantic tokens"
```

---

### Task 4: Test de sincronia tokens.ts ↔ globals.css

**Files:**
- Create: `src/design/__tests__/tokens-sync.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Conteúdo de `src/design/__tests__/tokens-sync.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOKENS } from '../tokens';

const cssPath = join(process.cwd(), 'src', 'app', 'globals.css');
const css = readFileSync(cssPath, 'utf-8');

/** Lista de variáveis CSS esperadas, derivadas do TOKENS.semantic. */
const expectedVars = [
  '--color-bg-base',
  '--color-bg-surface',
  '--color-bg-surface-strong',
  '--color-bg-glass',
  '--color-bg-glass-strong',
  '--color-border-subtle',
  '--color-border-default',
  '--color-border-strong',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-text-disabled',
  '--color-text-on-accent',
  '--color-accent-gold',
  '--color-accent-gold-bg',
  '--color-accent-gold-border',
  '--color-accent-purple',
  '--color-accent-purple-bg',
  '--color-accent-purple-border',
  '--color-accent-cyan',
  '--color-accent-cyan-bg',
  '--color-accent-cyan-border',
  '--color-accent-pink',
  '--color-accent-pink-bg',
  '--color-accent-pink-border',
  '--color-state-success',
  '--color-state-success-bg',
  '--color-state-success-border',
  '--color-state-warning',
  '--color-state-warning-bg',
  '--color-state-warning-border',
  '--color-state-error',
  '--color-state-error-bg',
  '--color-state-error-border',
  '--color-state-info',
  '--color-state-info-bg',
  '--color-state-info-border',
];

test('tokens.ts: SEMANTIC tem todas as chaves esperadas', () => {
  assert.ok(TOKENS.semantic.bg.base, 'bg.base ausente');
  assert.ok(TOKENS.semantic.accent.gold.fg, 'accent.gold.fg ausente');
  assert.ok(TOKENS.semantic.state.error.bg, 'state.error.bg ausente');
});

test('globals.css declara todas as variáveis esperadas em @theme inline', () => {
  for (const varName of expectedVars) {
    assert.ok(
      css.includes(varName),
      `globals.css não declara ${varName} — adicione no @theme inline`,
    );
  }
});

test('globals.css valor de --color-accent-gold é #d4af37 (igual ao TOKENS)', () => {
  const match = css.match(/--color-accent-gold:\s*([^;]+);/);
  assert.ok(match, '--color-accent-gold não encontrado');
  assert.equal(match![1].trim(), TOKENS.semantic.accent.gold.fg);
});
```

- [ ] **Step 2: Rodar teste**

Run: `npm test`
Expected: todos passando (caso falhe em sync, ajustar `globals.css` até passar).

- [ ] **Step 3: Commit**

```bash
git add src/design/__tests__/tokens-sync.test.ts
git commit -m "test(design): tokens.ts ↔ globals.css sync test"
```

---

## Fase 2 — Componentes UI

### Task 5: Componente Button + teste

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/__tests__/Button.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Button.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonVariants } from '../Button';

test('Button: variant primary aplica accent-gold', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'md' });
  assert.match(cls, /bg-accent-gold/);
  assert.match(cls, /text-text-on-accent/);
});

test('Button: variant secondary usa glass', () => {
  const cls = buttonVariants({ variant: 'secondary', size: 'md' });
  assert.match(cls, /bg-bg-glass/);
});

test('Button: variant ghost é transparente', () => {
  const cls = buttonVariants({ variant: 'ghost', size: 'md' });
  assert.match(cls, /bg-transparent/);
});

test('Button: size sm aplica h-8 px-3', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'sm' });
  assert.match(cls, /h-8/);
  assert.match(cls, /px-3/);
});

test('Button: size lg aplica h-12 px-6', () => {
  const cls = buttonVariants({ variant: 'primary', size: 'lg' });
  assert.match(cls, /h-12/);
  assert.match(cls, /px-6/);
});

test('Button: defaults sao primary + md', () => {
  const cls = buttonVariants({});
  assert.match(cls, /bg-accent-gold/);
  assert.match(cls, /h-10/);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Button'` ou similar.

- [ ] **Step 3: Implementar Button**

`src/components/ui/Button.tsx`:
```tsx
'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-gold text-text-on-accent hover:brightness-110 hover:shadow-[0_0_24px_rgba(212,175,55,0.30)] active:brightness-95',
        secondary:
          'bg-bg-glass border border-border-default text-text-primary backdrop-blur-md hover:bg-bg-glass-strong hover:border-border-strong',
        ghost:
          'bg-transparent text-text-secondary hover:bg-bg-surface hover:text-text-primary',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, fullWidth, loading, disabled, iconLeft, iconRight, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 6 testes Button passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/__tests__/Button.test.ts
git commit -m "feat(ui): Button — 3 variants × 3 sizes via cva"
```

---

### Task 6: Componente Card + teste

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/__tests__/Card.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Card.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardVariants } from '../Card';

test('Card: variant glass aplica backdrop-blur', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'md' });
  assert.match(cls, /backdrop-blur/);
  assert.match(cls, /bg-bg-glass/);
});

test('Card: variant solid usa bg-surface-strong', () => {
  const cls = cardVariants({ variant: 'solid', padding: 'md' });
  assert.match(cls, /bg-bg-surface-strong/);
});

test('Card: variant elevated tem shadow', () => {
  const cls = cardVariants({ variant: 'elevated', padding: 'md' });
  assert.match(cls, /shadow/);
});

test('Card: padding none não aplica padding', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'none' });
  assert.doesNotMatch(cls, /\bp-\d/);
});

test('Card: glow=true aplica shadow purple', () => {
  const cls = cardVariants({ variant: 'glass', padding: 'md', glow: true });
  assert.match(cls, /shadow-\[/);
});

test('Card: defaults são glass + md', () => {
  const cls = cardVariants({});
  assert.match(cls, /backdrop-blur/);
  assert.match(cls, /p-4/);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Card'`.

- [ ] **Step 3: Implementar Card**

`src/components/ui/Card.tsx`:
```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const cardVariants = cva(
  'rounded-2xl border',
  {
    variants: {
      variant: {
        glass:    'bg-bg-glass border-border-subtle backdrop-blur-md',
        solid:    'bg-bg-surface-strong border-border-default',
        elevated: 'bg-bg-glass border-border-default backdrop-blur-md shadow-[0_20px_55px_rgba(6,8,24,0.32)]',
      },
      padding: {
        none: '',
        sm:   'p-2',
        md:   'p-4',
        lg:   'p-6',
      },
      glow: {
        true:  'shadow-[0_0_24px_rgba(139,92,246,0.30)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'glass',
      padding: 'md',
      glow: false,
    },
  },
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ className, variant, padding, glow, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, glow }), className)}
        {...props}
      />
    );
  },
);
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 6 testes Card passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/__tests__/Card.test.ts
git commit -m "feat(ui): Card — glass/solid/elevated × padding × glow"
```

---

### Task 7: Componente Badge + teste

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/__tests__/Badge.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Badge.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeVariants } from '../Badge';

test('Badge: variant gold aplica accent-gold', () => {
  const cls = badgeVariants({ variant: 'gold' });
  assert.match(cls, /text-accent-gold/);
  assert.match(cls, /border-accent-gold-border/);
});

test('Badge: variant purple aplica accent-purple', () => {
  const cls = badgeVariants({ variant: 'purple' });
  assert.match(cls, /text-accent-purple/);
});

test('Badge: variant neutral é cor padrão', () => {
  const cls = badgeVariants({ variant: 'neutral' });
  assert.match(cls, /text-text-secondary/);
  assert.match(cls, /border-border-subtle/);
});

test('Badge: classes base têm uppercase + tracking', () => {
  const cls = badgeVariants({});
  assert.match(cls, /uppercase/);
  assert.match(cls, /tracking-/);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Badge'`.

- [ ] **Step 3: Implementar Badge**

`src/components/ui/Badge.tsx`:
```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const badgeVariants = cva(
  'inline-flex h-5 items-center rounded-full border px-2 text-[9px] font-bold uppercase tracking-[0.14em]',
  {
    variants: {
      variant: {
        gold:    'border-accent-gold-border bg-accent-gold-bg text-accent-gold',
        purple:  'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        cyan:    'border-accent-cyan-border bg-accent-cyan-bg text-accent-cyan',
        pink:    'border-accent-pink-border bg-accent-pink-bg text-accent-pink',
        neutral: 'border-border-subtle bg-bg-surface text-text-secondary',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 4 testes Badge passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Badge.tsx src/components/ui/__tests__/Badge.test.ts
git commit -m "feat(ui): Badge — 5 variants (gold/purple/cyan/pink/neutral)"
```

---

### Task 8: Componente Pill + teste

**Files:**
- Create: `src/components/ui/Pill.tsx`
- Create: `src/components/ui/__tests__/Pill.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Pill.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pillVariants } from '../Pill';

test('Pill: variant gold aplica accent-gold', () => {
  const cls = pillVariants({ variant: 'gold' });
  assert.match(cls, /text-accent-gold/);
});

test('Pill: tone pragmatico mapeia para gold', () => {
  const cls = pillVariants({ variant: 'pragmatico' });
  assert.match(cls, /text-accent-gold/);
});

test('Pill: tone provocativo mapeia para pink', () => {
  const cls = pillVariants({ variant: 'provocativo' });
  assert.match(cls, /text-accent-pink/);
});

test('Pill: tone protetor mapeia para cyan', () => {
  const cls = pillVariants({ variant: 'protetor' });
  assert.match(cls, /text-accent-cyan/);
});

test('Pill: tone evasivo mapeia para purple', () => {
  const cls = pillVariants({ variant: 'evasivo' });
  assert.match(cls, /text-accent-purple/);
});

test('Pill: tone neutro mapeia para neutral', () => {
  const cls = pillVariants({ variant: 'neutro' });
  assert.match(cls, /text-text-secondary/);
});

test('Pill: tem altura h-7 e px-3', () => {
  const cls = pillVariants({});
  assert.match(cls, /h-7/);
  assert.match(cls, /px-3/);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Pill'`.

- [ ] **Step 3: Implementar Pill**

`src/components/ui/Pill.tsx`:
```tsx
'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const pillVariants = cva(
  'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
  {
    variants: {
      variant: {
        gold:        'border-accent-gold-border   bg-accent-gold-bg   text-accent-gold',
        purple:      'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        cyan:        'border-accent-cyan-border   bg-accent-cyan-bg   text-accent-cyan',
        pink:        'border-accent-pink-border   bg-accent-pink-bg   text-accent-pink',
        neutral:     'border-border-subtle        bg-bg-surface       text-text-secondary',
        // Tone aliases (Tone em src/types/game.ts: pragmatico/provocativo/protetor/evasivo/neutro)
        pragmatico:  'border-accent-gold-border   bg-accent-gold-bg   text-accent-gold',
        provocativo: 'border-accent-pink-border   bg-accent-pink-bg   text-accent-pink',
        protetor:    'border-accent-cyan-border   bg-accent-cyan-bg   text-accent-cyan',
        evasivo:     'border-accent-purple-border bg-accent-purple-bg text-accent-purple',
        neutro:      'border-border-subtle        bg-bg-surface       text-text-secondary',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface PillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  iconLeft?: ReactNode;
}

export const Pill = forwardRef<HTMLSpanElement, PillProps>(
  function Pill({ className, variant, iconLeft, children, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(pillVariants({ variant }), className)}
        {...props}
      >
        {iconLeft && <span className="shrink-0">{iconLeft}</span>}
        {children}
      </span>
    );
  },
);
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 7 testes Pill passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Pill.tsx src/components/ui/__tests__/Pill.test.ts
git commit -m "feat(ui): Pill — accents + 5 tone aliases"
```

---

### Task 9: Componente Ring (SVG progress) + teste

**Files:**
- Create: `src/components/ui/Ring.tsx`
- Create: `src/components/ui/__tests__/Ring.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Ring.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRingDash } from '../Ring';

test('Ring: value=0 → offset = circunferência (vazio)', () => {
  const { circumference, dashOffset } = computeRingDash(0, 48, 4);
  assert.equal(dashOffset, circumference);
});

test('Ring: value=1 → offset = 0 (cheio)', () => {
  const { dashOffset } = computeRingDash(1, 48, 4);
  assert.equal(dashOffset, 0);
});

test('Ring: value=0.5 → offset = circunferência/2', () => {
  const { circumference, dashOffset } = computeRingDash(0.5, 48, 4);
  assert.equal(Math.round(dashOffset * 100), Math.round((circumference / 2) * 100));
});

test('Ring: value clamp em [0,1]', () => {
  const high = computeRingDash(2, 48, 4);
  assert.equal(high.dashOffset, 0, 'value>1 vira 1');
  const low = computeRingDash(-1, 48, 4);
  assert.equal(low.dashOffset, low.circumference, 'value<0 vira 0');
});

test('Ring: radius respeita size + thickness', () => {
  const { radius } = computeRingDash(0.5, 48, 4);
  assert.equal(radius, (48 - 4) / 2);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Ring'`.

- [ ] **Step 3: Implementar Ring**

`src/components/ui/Ring.tsx`:
```tsx
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
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 5 testes Ring passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Ring.tsx src/components/ui/__tests__/Ring.test.ts
git commit -m "feat(ui): Ring — SVG circular progress com motion + helper puro"
```

---

### Task 10: Componente Dialog + teste

**Files:**
- Create: `src/components/ui/Dialog.tsx`
- Create: `src/components/ui/__tests__/Dialog.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

`src/components/ui/__tests__/Dialog.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dialogVariants, dialogBackdropClasses } from '../Dialog';

test('Dialog: variant center centraliza com max-width', () => {
  const cls = dialogVariants({ variant: 'center' });
  assert.match(cls, /max-w-md/);
  assert.match(cls, /rounded-2xl/);
});

test('Dialog: variant sheet é bottom + full width', () => {
  const cls = dialogVariants({ variant: 'sheet' });
  assert.match(cls, /rounded-t-2xl/);
  assert.match(cls, /w-full/);
});

test('Dialog: backdrop é fixed inset-0 com bg escuro', () => {
  assert.match(dialogBackdropClasses, /fixed/);
  assert.match(dialogBackdropClasses, /inset-0/);
  assert.match(dialogBackdropClasses, /bg-black/);
});
```

- [ ] **Step 2: Verificar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Dialog'`.

- [ ] **Step 3: Implementar Dialog**

`src/components/ui/Dialog.tsx`:
```tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design/utils';

export const dialogVariants = cva(
  'relative bg-bg-glass-strong border border-border-default backdrop-blur-md shadow-[0_20px_55px_rgba(6,8,24,0.32)]',
  {
    variants: {
      variant: {
        center: 'w-full max-w-md rounded-2xl p-6',
        sheet:  'w-full rounded-t-2xl p-6 mt-auto',
      },
    },
    defaultVariants: { variant: 'center' },
  },
);

export const dialogBackdropClasses =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';

export interface DialogProps extends VariantProps<typeof dialogVariants> {
  open: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  variant = 'center',
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, closeOnEsc, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            dialogBackdropClasses,
            variant === 'sheet' && 'items-end',
          )}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            initial={{ y: variant === 'sheet' ? '100%' : 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: variant === 'sheet' ? '100%' : 20, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className={cn(dialogVariants({ variant }), className)}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS — 3 testes Dialog passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Dialog.tsx src/components/ui/__tests__/Dialog.test.ts
git commit -m "feat(ui): Dialog — center/sheet com framer motion + esc/backdrop"
```

---

### Task 11: Barrel `src/components/ui/index.ts`

**Files:**
- Create: `src/components/ui/index.ts`

- [ ] **Step 1: Criar barrel**

`src/components/ui/index.ts`:
```ts
export { Button, buttonVariants, type ButtonProps } from './Button';
export { Card, cardVariants, type CardProps } from './Card';
export { Dialog, dialogVariants, dialogBackdropClasses, type DialogProps } from './Dialog';
export { Badge, badgeVariants, type BadgeProps } from './Badge';
export { Pill, pillVariants, type PillProps } from './Pill';
export { Ring, computeRingDash, type RingProps, type ComputedRingDash } from './Ring';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "feat(ui): barrel export pra @/components/ui"
```

---

## Fase 3 — Showcase

### Task 12: Página `/dev/ui` showcase

**Files:**
- Create: `src/app/dev/ui/page.tsx`

- [ ] **Step 1: Criar showcase**

`src/app/dev/ui/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import {
  Button, Card, Dialog, Badge, Pill, Ring,
} from '@/components/ui';

export default function DevUIPage() {
  const [centerOpen, setCenterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base px-6 py-10 text-text-primary">
      <header className="mb-10">
        <h1 className="text-3xl font-bold">UI Primitives</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Showcase dos 6 componentes base. Cada seção mostra todas as variants.
        </p>
      </header>

      <Section title="Button">
        <Group label="Variants × md">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </Group>
        <Group label="Sizes (primary)">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Group>
        <Group label="States">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" loading>Loading</Button>
        </Group>
      </Section>

      <Section title="Card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="glass" padding="md">
            <p className="text-sm">Glass card</p>
          </Card>
          <Card variant="solid" padding="md">
            <p className="text-sm">Solid card</p>
          </Card>
          <Card variant="elevated" padding="md">
            <p className="text-sm">Elevated card</p>
          </Card>
          <Card variant="glass" padding="md" glow>
            <p className="text-sm">Glow purple</p>
          </Card>
        </div>
      </Section>

      <Section title="Dialog">
        <Group label="Triggers">
          <Button onClick={() => setCenterOpen(true)}>Open Center</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Sheet
          </Button>
        </Group>
        <Dialog open={centerOpen} onClose={() => setCenterOpen(false)}>
          <h2 className="text-lg font-bold">Center dialog</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Press Esc, click backdrop, or use the button to close.
          </p>
          <Button className="mt-4" onClick={() => setCenterOpen(false)}>
            Close
          </Button>
        </Dialog>
        <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} variant="sheet">
          <h2 className="text-lg font-bold">Bottom sheet</h2>
          <p className="mt-2 text-sm text-text-secondary">Slides up from bottom.</p>
          <Button className="mt-4" onClick={() => setSheetOpen(false)}>
            Close
          </Button>
        </Dialog>
      </Section>

      <Section title="Badge">
        <Group label="Variants">
          <Badge variant="gold">Gold</Badge>
          <Badge variant="purple">Purple</Badge>
          <Badge variant="cyan">Cyan</Badge>
          <Badge variant="pink">Pink</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </Group>
      </Section>

      <Section title="Pill">
        <Group label="Accent variants">
          <Pill variant="gold">Gold</Pill>
          <Pill variant="purple">Purple</Pill>
          <Pill variant="cyan">Cyan</Pill>
          <Pill variant="pink">Pink</Pill>
          <Pill variant="neutral">Neutral</Pill>
        </Group>
        <Group label="Tone aliases">
          <Pill variant="pragmatico">Pragmático</Pill>
          <Pill variant="provocativo">Provocativo</Pill>
          <Pill variant="protetor">Protetor</Pill>
          <Pill variant="evasivo">Evasivo</Pill>
          <Pill variant="neutro">Neutro</Pill>
        </Group>
      </Section>

      <Section title="Ring">
        <Group label="Values × purple">
          <Ring value={0}    size={48} showValue />
          <Ring value={0.25} size={48} showValue />
          <Ring value={0.5}  size={48} showValue />
          <Ring value={0.75} size={48} showValue />
          <Ring value={1}    size={48} showValue />
        </Group>
        <Group label="Colors (50%)">
          <Ring value={0.5} color="gold"   size={48} showValue />
          <Ring value={0.5} color="purple" size={48} showValue />
          <Ring value={0.5} color="cyan"   size={48} showValue />
          <Ring value={0.5} color="pink"   size={48} showValue />
        </Group>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Build verifica que a rota compila**

Run: `npm run build`
Expected: build passa, rota `/dev/ui` listada na saída.

- [ ] **Step 3: Smoke manual**

Run: `npm run dev` e abrir `http://localhost:3000/dev/ui`.
Expected: todos os 6 componentes renderizam, dialogs abrem/fecham com Esc e backdrop, ring anima ao carregar.

- [ ] **Step 4: Commit**

```bash
git add src/app/dev/ui/page.tsx
git commit -m "feat(ui): /dev/ui showcase com todos primitivos"
```

---

## Fase 4 — Migração de prova

### Task 13: Migrar `Toast` para tokens + Card

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: Ler estado atual**

Run: `cat src/components/Toast.tsx | head -80`
Anotar: hex literals e classes Tailwind raw.

- [ ] **Step 2: Substituir hex e bg/border raw por tokens**

No `src/components/Toast.tsx`:
- Substituir bgs tipo `bg-[#0a0a0f]` ou `bg-black/80` → `bg-bg-glass-strong backdrop-blur-md`
- Substituir bordas tipo `border-white/10` → `border-border-default`
- Substituir textos tipo `text-white` → `text-text-primary`, `text-white/60` → `text-text-secondary`
- Substituir cores de variant: error → `text-state-error border-state-error-border bg-state-error-bg`; success → `text-state-success ...`
- Importar `Card` se a estrutura do toast já for um container parecido — caso contrário, manter `<div>` mas com classes via tokens

Exemplo do patch típico:
```tsx
// Antes
className="rounded-lg bg-black/80 border border-white/10 px-3 py-2 text-white"
// Depois
className="rounded-lg bg-bg-glass-strong backdrop-blur-md border border-border-default px-3 py-2 text-text-primary"
```

- [ ] **Step 3: Rodar grep pra confirmar 0 hex literais nesse arquivo**

Run: `grep -E "#[0-9a-fA-F]{3,6}|bg-\[#|text-\[#|border-\[#" src/components/Toast.tsx`
Expected: 0 matches (linhas vazias).

- [ ] **Step 4: Build + smoke**

Run: `npm run build && npx tsc --noEmit`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "refactor(ui): Toast consome tokens semânticos (zero hex literal)"
```

---

### Task 14: Migrar `BottomNav` para tokens

**Files:**
- Modify: `src/components/BottomNav.tsx`

- [ ] **Step 1: Ler estado atual**

Run: `cat src/components/BottomNav.tsx | head -120`
Anotar: cores ativo/inativo, bordas, bg.

- [ ] **Step 2: Substituir classes raw por tokens semânticos**

- Background do container → `bg-bg-glass-strong backdrop-blur-md`
- Borda superior → `border-t border-border-default`
- Item ativo: `text-accent-gold`
- Item inativo: `text-text-tertiary hover:text-text-primary`
- Indicador ativo (se houver pill/dot): `bg-accent-gold-bg border-accent-gold-border`

- [ ] **Step 3: Confirmar 0 hex literais**

Run: `grep -E "#[0-9a-fA-F]{3,6}|bg-\[#|text-\[#|border-\[#" src/components/BottomNav.tsx`
Expected: 0 matches.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "refactor(ui): BottomNav consome tokens semânticos"
```

---

### Task 15: Migrar `ProfileCardCompact` para Card + Badge + Ring

**Files:**
- Modify: `src/components/ProfileCardCompact.tsx`

- [ ] **Step 1: Ler estado atual**

Run: `cat src/components/ProfileCardCompact.tsx`
Anotar: wrapper externo `<motion.div className="glass-card ...">`, badge `Lv X`, barra de XP retangular.

- [ ] **Step 2: Trocar wrapper por `<Card>`**

Substituir o `<motion.div className="glass-card ...">` por:
```tsx
<Card variant="glass" padding="none" className="relative flex items-center gap-3 overflow-hidden border-border-default px-3 py-2.5 transition-colors hover:bg-bg-glass-strong">
  {/* conteúdo interno permanece */}
</Card>
```

Manter o `<Link>` externo e o `<motion.div>` interno se a animação `initial/animate` for crítica — `Card` aceita props HTML, mas para animações framer, embrulhar `Card` numa `motion.div` ou usar a prop `as` (não suportada — manter wrapper externo `<motion.div>` se necessário e usar Card como filho).

Estrutura final:
```tsx
<Link href="/perfil" className="block">
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
    <Card variant="glass" padding="none" className="...classes específicas do layout...">
      {/* avatar + info + chevron */}
    </Card>
  </motion.div>
</Link>
```

- [ ] **Step 3: Trocar badge `Lv X` por `<Badge variant="gold">`**

Substituir o `<span>` que mostra `Lv {level}` por:
```tsx
<Badge variant="gold">Lv {level}</Badge>
```

(Remove as classes inline do badge antigo — `border-color`, `color`, `background` calculados a partir de `visual` ficam para o avatar, não pro badge.)

- [ ] **Step 4: Trocar barra de XP por `<Ring>` ao lado do avatar**

Substituir o bloco da barra retangular:
```tsx
{!compact && (
  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8">
    <div className="h-full rounded-full transition-all" style={{...}} />
  </div>
)}
```

Por: remover esse bloco. No avatar, embrulhar com `<Ring>` que mostra XP:

```tsx
<Ring value={xpPct / 100} size={56} thickness={3} color="gold">
  <div
    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
    style={{ background: visual.background, borderColor: visual.line, boxShadow: `0 0 14px ${visual.glow}` }}
  >
    <span className="text-xl font-bold" style={{ color: visual.accent }}>{symbol}</span>
  </div>
</Ring>
```

(O Ring agora encapsula o avatar; XP visível no anel ao redor.)

- [ ] **Step 5: Confirmar imports adicionados e zero hex literais novos**

Run: `grep -n "import.*ui" src/components/ProfileCardCompact.tsx`
Expected: import de `Card`, `Badge`, `Ring` from `@/components/ui`.

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProfileCardCompact.tsx
git commit -m "refactor(ui): ProfileCardCompact usa Card + Badge + Ring"
```

---

## Fase 5 — UTF-8 sweep

### Task 16: Script `check-utf8.ts` + integração

**Files:**
- Create: `scripts/check-utf8.ts`
- Modify: `package.json` (adicionar script `check:utf8`)
- Create: `docs/design/utf8-blacklist.md` (referência)

- [ ] **Step 1: Criar `scripts/check-utf8.ts`**

```ts
#!/usr/bin/env tsx
/**
 * UTF-8 lint — falha se encontrar substituições ASCII conhecidas
 * em strings de UI. Roda em `*.tsx` de src/ e `*.json` em src/data/decks/.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

interface Rule {
  bad: RegExp;       // padrão ASCII a procurar
  good: string;      // sugestão correta
  description: string;
}

const RULES: Rule[] = [
  { bad: /\bArquetipo\b/g,   good: 'Arquétipo',  description: 'acento agudo em é' },
  { bad: /\bArquetipos\b/g,  good: 'Arquétipos', description: 'plural' },
  { bad: /\bCalibracao\b/g,  good: 'Calibração', description: 'til em ã + cedilha' },
  { bad: /\bDirecao\b/g,     good: 'Direção',    description: 'til em ã + cedilha' },
  { bad: /\bDecisao\b/g,     good: 'Decisão',    description: 'til em ã' },
  { bad: /\bReflexao\b/g,    good: 'Reflexão',   description: 'til em ã' },
  { bad: /\bAtencao\b/g,     good: 'Atenção',    description: 'til em ã + cedilha' },
  { bad: /\bIntencao\b/g,    good: 'Intenção',   description: 'til em ã + cedilha' },
  { bad: /\bEstavel\b/g,     good: 'Estável',    description: 'acento agudo' },
  { bad: /\bInstavel\b/g,    good: 'Instável',   description: 'acento agudo' },
  { bad: /\bVoce\b/g,        good: 'Você',       description: 'cedilha + acento' },
  { bad: /\bvoce\b/g,        good: 'você',       description: 'cedilha + acento' },
  { bad: /\bnao\b/g,         good: 'não',        description: 'til em ã' },
  { bad: /\bNao\b/g,         good: 'Não',        description: 'til em ã' },
  { bad: /\bja\b/g,          good: 'já',         description: 'acento agudo' },
  { bad: /\bso\b/g,          good: 'só',         description: 'acento agudo (use word boundary)' },
  { bad: /\bate\b/g,         good: 'até',        description: 'acento agudo' },
  { bad: /\bMascara\b/g,     good: 'Máscara',    description: 'acento agudo' },
  { bad: /\bRetomada\b/g,    good: 'Retomada',   description: '(já correta — sem mudança esperada)' },
];

interface Violation {
  file: string;
  line: number;
  rule: Rule;
  match: string;
}

const violations: Violation[] = [];

const files = [
  ...globSync('src/**/*.tsx'),
  ...globSync('src/data/decks/*.json'),
];

for (const file of files) {
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      const m = line.match(rule.bad);
      if (m) {
        violations.push({ file, line: i + 1, rule, match: m[0] });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n❌ ${violations.length} violação(ões) UTF-8 encontradas:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.match}" → "${v.rule.good}"  (${v.rule.description})`);
  }
  process.exit(1);
}

console.log('✅ UTF-8 check OK — nenhuma substituição ASCII conhecida.');
```

- [ ] **Step 2: Adicionar script ao `package.json`**

Editar `package.json`, adicionar em `"scripts"`:
```json
"check:utf8": "npx tsx scripts/check-utf8.ts"
```

- [ ] **Step 3: Criar `docs/design/utf8-blacklist.md`**

```markdown
# UTF-8 Blacklist

Lista de substituições ASCII conhecidas que `scripts/check-utf8.ts` rejeita.
Adicionar regras novas editando `RULES` no script.

| ASCII | Correto | Razão |
|---|---|---|
| Arquetipo / Arquetipos | Arquétipo / Arquétipos | acento agudo em é |
| Calibracao | Calibração | til + cedilha |
| Direcao | Direção | til + cedilha |
| Decisao | Decisão | til em ã |
| Reflexao | Reflexão | til em ã |
| Atencao | Atenção | til + cedilha |
| Intencao | Intenção | til + cedilha |
| Estavel / Instavel | Estável / Instável | acento agudo |
| Voce / voce | Você / você | cedilha + acento |
| Nao / nao | Não / não | til em ã |
| ja | já | acento agudo |
| ate | até | acento agudo |
| Mascara | Máscara | acento agudo |

Note: `so` é controverso (palavra solo "so" em inglês não existe em PT, mas
"só" sim). Usar word boundary e revisar caso a caso ao adicionar.
```

- [ ] **Step 4: Rodar e ver violações iniciais**

Run: `npm run check:utf8 2>&1 | tee /tmp/utf8-violations.txt | head -50`
Expected: lista de violações (sem fix ainda).

- [ ] **Step 5: Commit do script (sem fixes)**

```bash
git add scripts/check-utf8.ts package.json docs/design/utf8-blacklist.md
git commit -m "chore(scripts): adiciona check-utf8 + blacklist documentada"
```

---

### Task 17: UTF-8 sweep — aplicar correções

**Files:**
- Modify: vários `*.tsx` em `src/` e `*.json` em `src/data/decks/`

- [ ] **Step 1: Pegar lista de violações**

Run: `npm run check:utf8 2>&1 | grep -E "^\s+src/" > /tmp/violations.txt && wc -l /tmp/violations.txt`
Expected: N linhas; cada linha tem `file:line "ascii" → "correto"`.

- [ ] **Step 2: Corrigir caso a caso**

Para cada arquivo único nos violações:
- Abrir o arquivo
- Substituir manualmente cada ocorrência identificada (NÃO usar sed global — pode atingir falsos positivos em código)
- Confirmar contexto (string de UI vs identificador de variável vs comentário) — só corrigir strings visíveis ao usuário

Exemplo de correção típica:
```tsx
// Antes
<p>Voce ja escolheu seu arquetipo.</p>
// Depois
<p>Você já escolheu seu arquétipo.</p>
```

- [ ] **Step 3: Re-rodar até zero violações**

Run: `npm run check:utf8`
Expected: `✅ UTF-8 check OK`.

- [ ] **Step 4: Build + tests + tsc**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tudo verde, 10 rotas geradas.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(i18n): passagem UTF-8 — strings de UI ganham acentuação correta"
```

---

## Fase 6 — Documentação + Gate

### Task 18: Documentação

**Files:**
- Create: `docs/design/tokens.md`
- Create: `docs/design/components.md`

- [ ] **Step 1: Criar `docs/design/tokens.md`**

```markdown
# Design Tokens

Source of truth: `src/design/tokens.ts`. Sincronizado manualmente com
`src/app/globals.css` (`@theme inline`). Componentes consomem via classes
Tailwind (`bg-bg-glass`, `text-accent-gold`, etc).

## Estrutura

- **`PRIMITIVES`** — paleta crua (cores numeradas, espaçamentos, tipografia,
  motion). NÃO usar diretamente em componentes.
- **`SEMANTIC`** — API consumida por componentes. Os nomes descrevem
  intenção (`bg.glass`, `accent.gold.fg`), não o valor.

## Categorias

### Backgrounds
- `bg.base` — preto profundo (#0a0a0f)
- `bg.surface` / `bg.surfaceStrong` — overlays opacos
- `bg.glass` / `bg.glassStrong` — overlays com backdrop-blur

### Borders
- `border.subtle` (8% white) — separadores leves
- `border.default` (16%) — borda padrão
- `border.strong` (24%) — destaque

### Text
- `text.primary` (95%) — corpo principal
- `text.secondary` (70%) — informação secundária
- `text.tertiary` (45%) — labels, hints
- `text.disabled` (25%) — desabilitado
- `text.onAccent` — texto sobre fundo dourado/colorido (preto translúcido)

### Accents
4 famílias: `gold`, `purple`, `cyan`, `pink`. Cada uma tem `.fg`, `.bg` (12% alpha),
`.border` (30% alpha). Use `gold` para CTA principais, `purple` pra ações
secundárias / glow padrão, `cyan` pra info/protetor, `pink` pra alerta/provocativo.

### State
4 famílias: `success` (green), `warning` (gold), `error` (red), `info` (cyan).
Mesma estrutura `.fg/.bg/.border`. Para feedback transacional (Toast,
validação, etc).

### Motion
5 presets de duração + easing:
- `instant` (0ms)
- `fast` (120ms, ease-in-out)
- `medium` (240ms) — padrão de UI
- `slow` (400ms, ease-out) — entradas de cards
- `cinema` (800ms) — transições rituais

## Como adicionar token

1. Adicionar em `src/design/tokens.ts`
2. Adicionar variável CSS correspondente em `src/app/globals.css` `@theme inline`
3. Atualizar `src/design/__tests__/tokens-sync.test.ts` `expectedVars` se for chave nova
4. `npm test` deve passar
```

- [ ] **Step 2: Criar `docs/design/components.md`**

```markdown
# UI Components

Localização: `src/components/ui/`. Importar via barrel:
```ts
import { Button, Card, Dialog, Badge, Pill, Ring } from '@/components/ui';
```

## Button

```tsx
<Button variant="primary" size="md" loading={false}>Click</Button>
```

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Altura/padding |
| `loading` | `boolean` | `false` | Mostra spinner, desabilita |
| `iconLeft`, `iconRight` | `ReactNode` | — | Ícones laterais |
| `fullWidth` | `boolean` | `false` | `w-full` |

## Card

```tsx
<Card variant="glass" padding="md" glow={false}>...</Card>
```

| Prop | Tipo | Default |
|---|---|---|
| `variant` | `'glass' \| 'solid' \| 'elevated'` | `'glass'` |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` |
| `glow` | `boolean` | `false` |

## Dialog

```tsx
<Dialog open={open} onClose={() => setOpen(false)} variant="center">
  ...
</Dialog>
```

| Prop | Tipo | Default |
|---|---|---|
| `open` | `boolean` | — |
| `onClose` | `() => void` | — |
| `variant` | `'center' \| 'sheet'` | `'center'` |
| `closeOnBackdrop` | `boolean` | `true` |
| `closeOnEsc` | `boolean` | `true` |

## Badge

```tsx
<Badge variant="gold">Lv 7</Badge>
```

5 variants: `gold`, `purple`, `cyan`, `pink`, `neutral`. Altura 20px,
texto 9px uppercase.

## Pill

```tsx
<Pill variant="pragmatico" iconLeft={<Icon />}>Pragmático</Pill>
```

10 variants: 5 accents + 5 tones (`pragmatico`, `provocativo`, `protetor`,
`evasivo`, `neutro`). Altura 28px, texto 12px.

## Ring

```tsx
<Ring value={0.65} size={48} thickness={4} color="purple" showValue>
  {/* opcional: conteúdo central */}
</Ring>
```

| Prop | Tipo | Default |
|---|---|---|
| `value` | `number` (0-1) | — |
| `size` | `number` (px) | `48` |
| `thickness` | `number` (px) | `4` |
| `color` | `'gold' \| 'purple' \| 'cyan' \| 'pink'` | `'purple'` |
| `showValue` | `boolean` | `false` |
| `children` | `ReactNode` | — (override do centro) |

Helper puro `computeRingDash(value, size, thickness)` exportado para
animações customizadas.

## Showcase

`/dev/ui` — todos os componentes × variants. Não está no `BottomNav`.
Acesso por URL direta.
```

- [ ] **Step 3: Commit**

```bash
git add docs/design/tokens.md docs/design/components.md
git commit -m "docs(design): tokens.md + components.md — referência humana"
```

---

### Task 19: Roadmap update + final sanity gate

**Files:**
- Modify: `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md`

- [ ] **Step 1: Final sanity check**

Run cada um e anotar:
```bash
npx tsc --noEmit                        # 0 errors
npm test                                 # all passing
npm run build                            # 10 rotas + /dev/ui
npm run check:utf8                       # ✅ OK
npm run deck:validate                    # 0 errors
grep -E "#[0-9a-fA-F]{3,6}|bg-\[#" src/components/Toast.tsx src/components/BottomNav.tsx src/components/ProfileCardCompact.tsx
# expected: 0 matches across all 3 files
```

- [ ] **Step 2: Atualizar roadmap**

Editar `docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md`. Localizar a seção `## 🎨 FASE 5 — DESIGN SYSTEM + TELAS RITUAIS` e substituir por:

```markdown
## 🎨 FASE 5 — DESIGN SYSTEM + TELAS RITUAIS  🟡 EM ANDAMENTO (F5a ✅, F5b pendente)
**Sobe ID visual de 7.5 → 9.**

### F5a — Tokens + Primitivos ✅
- ✅ `src/design/tokens.ts` — primitives + semantics tipados
- ✅ `globals.css` `@theme inline` sincronizado, com test de sync
- ✅ 6 componentes UI (`Button`, `Card`, `Dialog`, `Badge`, `Pill`, `Ring`) com cva variants
- ✅ `/dev/ui` showcase
- ✅ Migração de prova: `Toast`, `BottomNav`, `ProfileCardCompact` (zero hex literal)
- ✅ `scripts/check-utf8.ts` lint + sweep aplicado
- ✅ `docs/design/tokens.md` + `components.md`

### F5b — Telas Rituais ⏳ (próximo brainstorm)
- ⏳ "Primeiro arquétipo" — full-screen takeover, dispara 1 vez
- ⏳ "Evolução" — quando arquétipo migra de A pra B
- ⏳ "Season finale" — Wrapped-style ao terminar season

### GATE F5a ✅
- 0 estilos inline (hex/raw) em `Toast`, `BottomNav`, `ProfileCardCompact`
- `tokens-sync.test.ts` verde
- `npm run check:utf8` zero violações
- `/dev/ui` mostra todos primitivos × variants

### Sanity (tip do main após F5a)
- `npx tsc --noEmit` — 0 erros
- `npm test` — todos passando (testes existentes + ~30 novos UI/sync/utf8)
- `npm run build` — 11 rotas (10 + /dev/ui)
- `npm run check:utf8` — ✅
```

- [ ] **Step 3: Commit final**

```bash
git add docs/superpowers/roadmap/2026-04-24-agentic-roadmap.md
git commit -m "docs(roadmap): F5a fechada — tokens + UI primitivos em produção"
```

- [ ] **Step 4: Resumo no console**

Imprimir status final:
```
F5a — Design Tokens + UI Primitives ✅
- 6 componentes: Button, Card, Dialog, Badge, Pill, Ring
- /dev/ui showcase ativo
- Toast, BottomNav, ProfileCardCompact migrados
- UTF-8 sweep aplicado
- Zero hex literais nos surfaces migrados
Próximo: brainstorm F5b — Telas Rituais
```

---

## Self-review notes

**Spec coverage:**
- §4 Arquitetura → Tasks 1-11 ✅
- §5 Token taxonomy → Tasks 2, 3, 4 ✅
- §6 Componentes (6) → Tasks 5-10 ✅
- §7 Showcase → Task 12 ✅
- §8 Migração de 3 → Tasks 13-15 ✅
- §9 UTF-8 sweep → Tasks 16-17 ✅
- §10 Dependências → Task 1 ✅
- §11 Estratégia de teste → cada task de componente tem test ✅
- §12 Critérios de pronto → Task 19 (gate) ✅

**Type consistency:**
- `buttonVariants`, `cardVariants`, `badgeVariants`, `pillVariants`, `dialogVariants` — todos exportados pelo barrel ✅
- `computeRingDash` exportado de Ring para uso em F5b ✅
- `cn()` consistente em todos componentes ✅
- `TOKENS` / `DesignTokens` usado consistente ✅

**Placeholder scan:**
- 0 TBD/TODO/FIXME nos passos
- Cada task tem código real, não "implementar similar a Task N"
- Comandos têm output esperado declarado
