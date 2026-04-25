# F5a — Design Tokens + UI Primitives — Design Spec

**Status:** Approved (2026-04-25)
**Phase:** F5a (first half of roadmap Fase 5)
**Goal:** Estabelecer fonte única de verdade visual (tokens) e biblioteca enxuta de componentes base (6 primitivos), pavimentando o caminho pra F5b (telas rituais) e qualquer surface visual futura.
**Non-goal:** Telas rituais, áudio/haptic, migração total dos componentes (deferidos pra F5b).

---

## 1. Contexto

Após F4 (motor bayesiano em produção), o app está em Nível 6 com engine sólido mas ID visual em ~7.5/10. Estilos vivem inline com hex literais (`#d4af37`, `#8b5cf6`), tokens parciais espalhados (`STAT_COLORS`, `RARITY_THEMES`, `LEVEL_TIER_COLOR`), e `globals.css` mistura `:root`, `@theme inline` e ~10 keyframes em 438 linhas. Não existem componentes UI base reutilizáveis — botões, cards e modais são reescritos por surface.

F5 (roadmap) ataca isso. Esta spec cobre **F5a**: a fundação de tokens + 6 primitivos. F5b virá depois e usará os tokens pra construir telas cerimoniais.

## 2. Objetivos

1. **Fonte única de verdade**: `src/design/tokens.ts` exporta tokens tipados; trocar tema = editar 1 arquivo.
2. **API semântica para componentes**: components consomem tokens semânticos (`bg-surface-glass`, `text-accent-gold`), nunca primitivos diretos (`bg-purple-500`).
3. **6 primitivos cobertos**: Button, Card, Dialog, Badge, Pill, Ring — cada um com variants tipados via `cva`.
4. **Showcase navegável**: rota `/dev/ui` lista todos os componentes × variants pra revisão visual rápida.
5. **Prova de migração**: 3 componentes existentes (Toast, BottomNav, ProfileCardCompact) reescritos pra usar a nova UI.
6. **Acentuação correta**: passagem UTF-8 mecânica em strings em português dos `tsx`/`json`.

Sucesso = 0 erros TS, todos testes passando, build verde, `/dev/ui` mostra os 6 componentes funcionais, e os 3 surfaces migrados ficam visualmente equivalentes (ou melhores) sem hex literal.

## 3. Não-objetivos (escopo explícito)

- Reescrever componentes não listados (`MiniRadar`, `RunReportCard`, `ProfileCardCompact` exceto onde reaproveitar Card/Ring/Badge, etc).
- Mudar paleta ou identidade visual — tokens documentam o que **já existe**, com nomes melhores.
- Remover `STAT_COLORS`, `RARITY_THEMES`, `LEVEL_TIER_COLOR` de `types/game.ts` — esses são domain-specific e devem ser realinhados ao token system **em F5b** (quando rituais chegarem).
- Telas rituais (F5b).
- Storybook real (Storybook é mais infra do que precisamos; `/dev/ui` é equivalente leve).
- Dark/light theming — o app é dark-only por design narrativo.
- Tests de regressão visual (Chromatic/Percy).

## 4. Arquitetura

```
src/design/
  tokens.ts              ← objeto TOKENS tipado, imutável (as const)
  utils.ts               ← cn(...inputs) — wrapper clsx + tailwind-merge

src/components/ui/
  Button.tsx             ← cva variants
  Card.tsx
  Dialog.tsx
  Badge.tsx
  Pill.tsx
  Ring.tsx
  index.ts               ← barrel
  __tests__/
    Button.test.tsx      ← variant snapshot
    Card.test.tsx
    Dialog.test.tsx
    Badge.test.tsx
    Pill.test.tsx
    Ring.test.tsx

src/app/dev/ui/
  page.tsx               ← showcase, hidden from nav

src/app/globals.css      ← @theme inline sincronizado à mão com tokens.ts (~40 linhas alteradas)

docs/design/
  tokens.md              ← referência humana da paleta + semantic mapping
  components.md          ← API de cada componente, exemplos de uso

scripts/check-utf8.ts    ← lint que falha se encontrar substituições ASCII conhecidas
```

### 4.1. Fluxo de dados

1. `tokens.ts` é o source of truth (TS).
2. `globals.css` `@theme inline` declara as mesmas chaves como CSS custom props (sincronia manual — superfície pequena, ~40 linhas, comentário no topo de `tokens.ts` aponta o arquivo a editar junto).
3. Tailwind v4 expõe automaticamente `--color-*` como classes `bg-*`/`text-*`/`border-*`.
4. Componentes em `ui/` usam classes Tailwind. Casos onde precisa do valor numérico (animação Framer, SVG) importam `TOKENS` direto do TS.
5. `/dev/ui` consome `ui/` e mostra todas as variants.

### 4.2. Por que sincronia manual e não codegen

- `@theme inline` é declarativo, ~40 linhas. Codegen (Node script lendo `tokens.ts` → escrevendo CSS) traria 100+ linhas de infra pra benefício marginal.
- Diff de PR mostra mudanças nos dois arquivos lado a lado — fácil revisar.
- Se a sincronia derrapar, o test `tokens-sync.test.ts` (ver §7.4) pega.

## 5. Token taxonomy

### 5.1. Primitives (palette — nunca usado em componentes diretamente)

```ts
const PRIMITIVES = {
  colors: {
    purple: { 50: '#faf5ff', ..., 500: '#8b5cf6', ..., 900: '#3b0764' },
    gold:   { 50: '#fefce8', ..., 500: '#d4af37', ..., 900: '#713f12' },
    cyan:   { 500: '#67e8f9', ... },
    pink:   { 500: '#f472b6', ... },
    red:    { 500: '#ef4444', ... },
    green:  { 500: '#22c55e', ... },
    gray:   { 50: '#fafafa', ..., 950: '#0a0a0f' },
  },
  space: { 0:'0', 1:'4px', 2:'8px', 3:'12px', 4:'16px', 6:'24px', 8:'32px', 12:'48px', 16:'64px', 24:'96px' },
  radius: { sm:'4px', md:'8px', lg:'12px', xl:'16px', '2xl':'24px', full:'9999px' },
  font: {
    display: 'Inter, system-ui, sans-serif',
    body:    'Inter, system-ui, sans-serif',
    mono:    'ui-monospace, monospace',
  },
  text: { xs:'10px', sm:'12px', base:'14px', lg:'16px', xl:'18px', '2xl':'24px', '3xl':'32px', '4xl':'48px', '5xl':'64px', '6xl':'80px', '7xl':'96px' },
  motion: {
    instant: { duration: 0,   easing: 'linear' },
    fast:    { duration: 120, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    medium:  { duration: 240, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    slow:    { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    cinema:  { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
} as const;
```

### 5.2. Semantics (a API que componentes usam)

```ts
const SEMANTIC = {
  bg: {
    base:          PRIMITIVES.colors.gray[950],     // #0a0a0f
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
    onAccent:  'rgba(0,0,0,0.92)',                  // texto sobre dourado
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
    glow:    '0 0 24px rgba(139,92,246,0.30)',     // accent default
    inset:   'inset 0 1px 0 rgba(255,255,255,0.18)',
  },
};

export const TOKENS = { ...PRIMITIVES, semantic: SEMANTIC } as const;
export type DesignTokens = typeof TOKENS;
```

### 5.3. Sincronia com Tailwind v4 `@theme inline`

`globals.css` ganha um bloco com 1:1 das semantics:

```css
@theme inline {
  --color-bg-base: #0a0a0f;
  --color-bg-surface: rgba(255,255,255,0.04);
  --color-bg-surface-strong: rgba(255,255,255,0.08);
  --color-bg-glass: rgba(255,255,255,0.05);
  --color-bg-glass-strong: rgba(255,255,255,0.12);

  --color-border-subtle: rgba(255,255,255,0.08);
  --color-border-default: rgba(255,255,255,0.16);
  --color-border-strong: rgba(255,255,255,0.24);

  --color-text-primary: rgba(255,255,255,0.95);
  /* ... etc */

  --color-accent-gold: #d4af37;
  --color-accent-gold-bg: rgba(212,175,55,0.12);
  --color-accent-gold-border: rgba(212,175,55,0.30);
  /* ... etc */
}
```

Tailwind v4 expõe automaticamente `bg-bg-glass`, `text-text-secondary`, `border-accent-gold-border`, etc. Componentes consomem essas classes.

## 6. Componentes (6 primitivos)

Cada um:
- ~80-150 LOC
- TS estrito, props tipadas
- `cva` para variants
- `cn()` (clsx + tailwind-merge) pra merge correto de classes
- 1 arquivo de teste com snapshot da string de classes resultante por variant
- Documentação inline (JSDoc) e em `docs/design/components.md`

### 6.1. Button

```ts
type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;  // default 'primary'
  size?: ButtonSize;         // default 'md'
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}
```

- `primary`: fundo dourado, texto preto, glow no hover
- `secondary`: glass, borda padrão, texto primário
- `ghost`: transparente, texto secundário, hover acende glass
- Sizes: `sm` (h-8, px-3, text-xs), `md` (h-10, px-4, text-sm), `lg` (h-12, px-6, text-base)
- `loading=true`: spinner inline, disable interno

### 6.2. Card

```ts
type CardVariant = 'glass' | 'solid' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;     // default 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;            // accent purple shadow
}
```

- `glass`: backdrop-blur + bg-glass + border-subtle (visual atual)
- `solid`: bg-surface-strong, sem blur
- `elevated`: glass + shadow-default + border-default

### 6.3. Dialog

```ts
type DialogVariant = 'center' | 'sheet';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  variant?: DialogVariant;   // default 'center'
  closeOnBackdrop?: boolean;  // default true
  closeOnEsc?: boolean;        // default true
  children: ReactNode;
}
```

- `center`: modal padrão (overlay 70% + card centralizado, max-w-md)
- `sheet`: bottom sheet mobile (slide-up, full-width, rounded-t)
- Animação via Framer Motion (já é dep do projeto)
- Padrão extraído do `LevelUpCeremony` (mantém estrutura, generaliza)

### 6.4. Badge

```ts
type BadgeVariant = 'gold' | 'purple' | 'cyan' | 'pink' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;    // default 'neutral'
  children: ReactNode;
}
```

- Pill pequeno, h-5, px-2, text-[9px] uppercase tracking-wide, border + bg + fg do accent correspondente.

### 6.5. Pill

```ts
type PillVariant = 'gold' | 'purple' | 'cyan' | 'pink' | 'neutral'
                 | 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';

interface PillProps {
  variant?: PillVariant;
  iconLeft?: ReactNode;
  children: ReactNode;
}
```

- Badge maior + opcional ícone. h-7, px-3, text-xs.
- 5 variants extras para `Tone` (que existem em `types/game.ts`: pragmatico, provocativo, protetor, evasivo, neutro). Cada Tone tem cor própria em F5b — em F5a, mapeiam pra accents existentes (pragmatico→gold, provocativo→pink, protetor→cyan, evasivo→purple, neutro→neutral).

### 6.6. Ring

```ts
interface RingProps {
  value: number;             // 0-1
  size?: number;             // px, default 48
  thickness?: number;        // px, default 4
  color?: 'gold' | 'purple' | 'cyan' | 'pink';  // default 'purple'
  trackColor?: string;       // default semantic.border.subtle
  showValue?: boolean;       // mostra "%" no centro
  children?: ReactNode;      // override do conteúdo central
}
```

- SVG circular progress.
- Anima `strokeDashoffset` via `motion.medium`.
- Útil pra ProfileCard XP, calibration confidence, qualquer porcentagem visual.

## 7. Showcase em `/dev/ui`

`src/app/dev/ui/page.tsx` é uma página estática que:

- Lista os 6 componentes em seções com header + descrição
- Mostra **todas as variants × todos os sizes** lado a lado em grid
- Inclui states: hover, focus, disabled, loading (onde aplica)
- Tem um toggle "show classes" que revela as className strings para debug
- Não tem SEO, não está no `BottomNav`, não tem proteção (acesso por URL direta)

```
/dev/ui
├── Buttons    [primary | secondary | ghost] × [sm | md | lg] × [normal | loading | disabled]
├── Cards      [glass | solid | elevated] × [no glow | glow]
├── Dialogs    [open center demo button] [open sheet demo button]
├── Badges     [todas variants]
├── Pills      [todas variants + tones]
└── Rings      [valores 0%, 25%, 50%, 75%, 100%] × [4 colors]
```

## 8. Migração de 3 componentes (prova de fogo)

### 8.1. Toast (`src/components/Toast.tsx`)

Atualmente: hex literais e classes inline. Esperado: usar `Card variant="solid"` + tokens semantic. Visual idêntico, código menor.

### 8.2. BottomNav (`src/components/BottomNav.tsx`)

Atualmente: classes Tailwind raw. Esperado: borders/bgs vindos de tokens. Item ativo usa `accent.gold.fg`, inativo `text.tertiary`.

### 8.3. ProfileCardCompact (`src/components/ProfileCardCompact.tsx`)

Atualmente: já consome `archetypeAvatarVisual` (domain colors) — manter. Migrar:
- Wrapper externo → `<Card variant="glass">`
- "Lvl X" → `<Badge variant="gold">`
- XP bar → `<Ring value={xpPct/100} size={32} />` (substitui a barra retangular atual)

## 9. UTF-8 sweep

Mecânica única, no fim de F5a, antes do gate.

`scripts/check-utf8.ts`:
- Lê todos `*.tsx` em `src/` e `*.json` em `src/data/decks/`
- Procura strings comuns conhecidas que perderam acentos:
  - `Arquetipo` → erro (sugere `Arquétipo`)
  - `Calibracao` → `Calibração`
  - `Direcao` → `Direção`
  - `Estavel`/`Instavel` → `Estável`/`Instável`
  - `Decisao` → `Decisão`
  - `Reflexao` → `Reflexão`
  - `Atencao` → `Atenção`
  - `Inves` (antes de `de`) → `Invés`
  - `Voce` → `Você`
  - lista expandida em `docs/design/utf8-blacklist.md`
- Falha o lint com lista de arquivos + linhas
- Adicionado a `package.json` como `npm run check:utf8`
- Após sweep manual, integrado ao `npm run lint` (se já existir) ou rodado standalone

## 10. Dependências

Adicionar:
- `class-variance-authority` (~2KB) — variants tipados em Tailwind
- `clsx` (~500B) — class string composition (peer dep de cva)
- `tailwind-merge` (~5KB) — resolução de conflitos de classes Tailwind

Total: ~8KB gzipped. Padrão de mercado, idiomático para Tailwind, vai ser usado em F5b/F6 também.

## 11. Estratégia de teste

### 11.1. Unit (component)

Cada componente tem 1 arquivo de teste em `src/components/ui/__tests__/`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { Button } from '../Button';

test('Button: variant primary aplica classes corretas', () => {
  const html = renderToString(<Button variant="primary">Hi</Button>);
  assert.match(html, /accent-gold-bg|bg-accent-gold/);
  assert.match(html, /text-text-on-accent|text-black/);
});
```

Cobertura mínima: cada variant gera className contendo o token semantic esperado.

### 11.2. Integration (token sync)

`src/design/__tests__/tokens-sync.test.ts`:

```ts
test('todos os semantic tokens estão declarados em globals.css @theme inline', () => {
  const tokensSource = readFile('src/design/tokens.ts');
  const cssSource = readFile('src/app/globals.css');
  for (const tokenKey of extractSemanticKeys(tokensSource)) {
    assert.match(cssSource, new RegExp(`--color-${tokenKey.kebabCase()}`));
  }
});
```

### 11.3. Build

`npm run build` deve completar sem erros. Tailwind v4 valida classes em build-time.

### 11.4. Type

`npx tsc --noEmit` zero erros.

### 11.5. UTF-8

`npm run check:utf8` zero violações.

## 12. Critérios de pronto (gate F5a)

- [ ] `src/design/tokens.ts` existe, exporta `TOKENS as const`, com tipo `DesignTokens` extraído
- [ ] `src/app/globals.css` `@theme inline` sincronizado com semantics
- [ ] Test `tokens-sync.test.ts` passa
- [ ] 6 componentes em `src/components/ui/` com 1 teste cada — total ≥ 6 testes novos
- [ ] `cva`, `clsx`, `tailwind-merge` adicionados
- [ ] `/dev/ui` renderiza todos componentes × variants
- [ ] Toast, BottomNav, ProfileCardCompact migrados — diff mostra hex literais → classes Tailwind semantic
- [ ] `scripts/check-utf8.ts` + `npm run check:utf8` adicionado, passando
- [ ] `docs/design/tokens.md` e `docs/design/components.md` escritos
- [ ] `npx tsc --noEmit` 0 erros
- [ ] `npm test` todos passando (testes existentes + novos UI/sync)
- [ ] `npm run build` verde
- [ ] Roadmap atualizado com status F5a ✅

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Sincronia tokens.ts ↔ globals.css derrapa | `tokens-sync.test.ts` falha o build se chave faltar |
| `cva` introduz overhead de bundle | É ~2KB gzipped, e components ficam menores que reescrita inline. Net win. |
| Migração de Toast/BottomNav/Profile quebra visual existente | Comparar antes/depois em build local, mas como tokens documentam o estado atual, default é igualdade. |
| `/dev/ui` vai pra produção | Page é "static" mas sem indexação/nav. Aceitável. Se incomodar depois, gate por `NODE_ENV !== 'production'` no plan. |
| UTF-8 sweep introduz typos | Script só sugere, sweep é manual; revisão por commit pequeno. Tests de acentuação existem em validate-deck. |

## 14. Próximos passos (depois desta spec)

1. User revisa este spec
2. Aprovado → invoco `superpowers:writing-plans` pra gerar plan TDD task-by-task
3. Plan gerado → execução agêntica (subagent-driven-development)
4. F5a fechada → brainstorm separado pra **F5b — Telas Rituais** (primeiro arquétipo, evolução, season finale)
