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
