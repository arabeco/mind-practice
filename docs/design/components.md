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
