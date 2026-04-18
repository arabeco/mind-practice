# Fase 1 — Fundação (Refino + Season + Plus)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduzir as fundações do sistema de Season: raridade por deck, preço em fichas, ownership + Plus subscription, catalog de seasons, selos SVG, teaser na home, economia refinada. Season 0 é classificada sem gating (mantém flow atual); Season 1+ usará o paywall.

**Architecture:** Mudanças concentradas em `src/types/game.ts` (novos campos), `src/context/GameContext.tsx` (novas actions + economia), `src/data/decks/*.json` (classificação), `src/data/seasons.ts` (catalog novo), `src/components/seals/` (SVGs), `src/components/home/` (teaser), `src/app/decks/page.tsx` (UI de raridade). Sem breaking changes em quem já tem save antigo — campos novos inicializam vazios via migração leve.

**Tech Stack:** Next.js 16 + TypeScript 5 + Tailwind v4 + React 19. Sem framework de testes hoje — verificação via `tsc --noEmit`, `next build`, deck validator existente (`npx tsx scripts/validate-deck.ts`) estendido, e manual UI.

**Testing adaptado:** Em vez de TDD com vitest (não existe), cada task verifica com:
- `npx tsc --noEmit` — typecheck estrito
- `npx tsx scripts/validate-deck.ts` — quando mexe em JSON de deck
- `npm run build` — smoke final
- Manual UI nos passos visuais, com critério preciso de pass/fail

---

## Mapa de arquivos

**Criar:**
- `src/lib/rarity.ts` — cores, labels e helpers de raridade
- `src/data/seasons.ts` — catalog de seasons com metadata
- `src/components/seals/Season0Seal.tsx` — SVG "Fundação"
- `src/components/seals/Season1Seal.tsx` — SVG "Ocupando Espaço"
- `src/components/decks/RarityBadge.tsx` — pill visual de raridade
- `src/components/home/SeasonTeaserCard.tsx` — card persistente com 3 estados

**Modificar:**
- `src/types/game.ts` — `Rarity`, novos campos em `Deck`, `ownedDeckIds`, `plusSubscription`, constantes de economia
- `src/context/GameContext.tsx` — actions `UNLOCK_DECK`, `SET_PLUS_STATUS`, `CLAIM_DAILY_PLUS_BONUS`, economia ajustada, migração leve
- `src/data/decks/*.json` — todos os 12 JSONs recebem `rarity`, `seasonId`, `priceFichas`
- `scripts/validate-deck.ts` — validar novos campos
- `src/app/decks/page.tsx` — exibir raridade + seal + estado locked/owned/plus
- `src/app/page.tsx` — adicionar `<SeasonTeaserCard />`
- `src/components/DevTools.tsx` — botão "Ativar Plus" pra testes

---

## Task 1: Tipos e constantes de raridade/economia

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Adicionar tipo `Rarity` e constantes de economia no topo do arquivo**

Em `src/types/game.ts`, logo após a linha `export type DeckCategory = 'calibragem' | 'eixo' | 'cenario' | 'campanha';`, adicionar:

```ts
export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'campanha';

export const RARITY_ORDER: Rarity[] = ['comum', 'raro', 'epico', 'lendario', 'campanha'];

/** Preco default em fichas por raridade. Pode ser sobrescrito por deck (campanha especial grátis, etc). */
export const RARITY_DEFAULT_PRICE: Record<Rarity, number> = {
  comum: 60,
  raro: 150,
  epico: 350,
  lendario: 800,
  campanha: 100,
};
```

- [ ] **Step 2: Substituir constantes antigas de economia**

Localizar o bloco:
```ts
export const RUN_PISO_FICHAS = 2;
export const RUN_PISO_CAP_PER_DAY = 5;
export const CAMPAIGN_ENDING_BONUS = 30;
export const FRIEND_ACCEPT_BONUS = 5;
export const SKIP_COOLDOWN_COST = 10;
```

Substituir por:
```ts
export const RUN_PISO_FICHAS = 3;             // era 2
export const RUN_PISO_CAP_PER_DAY = 5;
export const FIRST_RUN_OF_DAY_BONUS = 5;      // era +3 inline
export const STREAK_7_BONUS = 20;             // valor explicito (era inline)
export const DECK_FIRST_TIME_BONUS = 15;      // NOVO — primeira vez completando deck
export const NO_TIMEOUT_RUN_BONUS = 5;        // mantido (era inline)
export const CAMPAIGN_ENDING_BONUS = 40;      // era 30
export const FRIEND_ACCEPT_BONUS = 5;
export const SKIP_COOLDOWN_COST = 10;
export const PLUS_DAILY_BONUS = 10;           // NOVO — claim diario Plus
```

- [ ] **Step 3: Adicionar novos campos à interface `Deck`**

Localizar a interface `Deck` (procurar por `export interface Deck`) e adicionar **antes** do fecho `}` final:

```ts
  /** Raridade do deck no sistema de season. Afeta UI (cor/glow), preço e gating. */
  rarity: Rarity;
  /** ID da season a qual o deck pertence. Ex: 'season-0', 'season-1'. */
  seasonId: string;
  /** Preço em fichas para desbloquear avulso. `null` = gratuito (calibragem, promocionais). */
  priceFichas: number | null;
  /** Se true, só acessível via assinatura Plus (sem compra avulsa). Default: false. */
  plusOnly?: boolean;
```

- [ ] **Step 4: Adicionar tipo `PlusSubscription` e expandir `GameState`**

Logo antes da interface `GameState`, adicionar:

```ts
export interface PlusSubscription {
  active: boolean;
  /** ISO timestamp de quando começou (null se nunca teve). */
  startedAt: string | null;
  /** ISO timestamp da próxima renovação / expiração. null se active=false. */
  expiresAt: string | null;
  /** ISO yyyy-mm-dd do último claim diário do bônus Plus. null se nunca claimou. */
  lastPlusDailyClaim: string | null;
}

export const INITIAL_PLUS_SUBSCRIPTION: PlusSubscription = {
  active: false,
  startedAt: null,
  expiresAt: null,
  lastPlusDailyClaim: null,
};
```

Em `GameState`, adicionar antes do fecho final:
```ts
  /** Decks desbloqueados via compra (SPEND_FICHAS ou bundle). Persistentes mesmo após cancelar Plus. */
  ownedDeckIds: string[];
  /** Estado da assinatura Plus do usuário. */
  plusSubscription: PlusSubscription;
```

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: vários erros em `GameContext.tsx` e `data/decks/*.json` (esperado — serão resolvidos nas próximas tasks). **Não há erro "cannot redeclare" nem erro em `types/game.ts`** — esse arquivo deve compilar limpo sozinho.

Se houver erro no próprio `types/game.ts`, corrigir antes de prosseguir.

- [ ] **Step 6: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): adiciona Rarity, PlusSubscription e constantes de economia ajustadas"
```

---

## Task 2: Módulo helper de raridade

**Files:**
- Create: `src/lib/rarity.ts`

- [ ] **Step 1: Criar o arquivo com helpers de cor e label**

Criar `src/lib/rarity.ts` com o conteúdo completo abaixo:

```ts
// ============================================================================
// Rarity helpers — cor, label e preço default.
// Mapeia Rarity pra tokens visuais consumidos por componentes de card/badge.
// ============================================================================

import type { Rarity } from '@/types/game';

export interface RarityVisual {
  /** Cor principal Tailwind v4 (referenciada em classes dinâmicas — usar cn()). */
  borderClass: string;
  textClass: string;
  bgGlowClass: string;
  /** Hex pra SVGs e drop-shadows inline (não-Tailwind). */
  hex: string;
  /** Label legível em PT-BR. */
  label: string;
}

export const RARITY_VISUALS: Record<Rarity, RarityVisual> = {
  comum: {
    borderClass: 'border-slate-300/60',
    textClass: 'text-slate-200',
    bgGlowClass: 'shadow-none',
    hex: '#cbd5e1',
    label: 'Comum',
  },
  raro: {
    borderClass: 'border-sky-400/70',
    textClass: 'text-sky-200',
    bgGlowClass: 'shadow-[0_0_16px_rgba(56,189,248,0.35)]',
    hex: '#38bdf8',
    label: 'Raro',
  },
  epico: {
    borderClass: 'border-violet-500/80',
    textClass: 'text-violet-200',
    bgGlowClass: 'shadow-[0_0_22px_rgba(139,92,246,0.45)]',
    hex: '#8b5cf6',
    label: 'Épico',
  },
  lendario: {
    borderClass: 'border-amber-400/90',
    textClass: 'text-amber-200',
    bgGlowClass: 'shadow-[0_0_28px_rgba(251,191,36,0.55)]',
    hex: '#fbbf24',
    label: 'Lendário',
  },
  campanha: {
    borderClass: 'border-rose-700/80',
    textClass: 'text-rose-200',
    bgGlowClass: 'shadow-[0_0_18px_rgba(190,18,60,0.45)]',
    hex: '#be123c',
    label: 'Campanha',
  },
};

export function getRarityVisual(rarity: Rarity): RarityVisual {
  return RARITY_VISUALS[rarity];
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit src/lib/rarity.ts 2>&1 | head -10`
Expected: sem erros especificamente em `rarity.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rarity.ts
git commit -m "feat(rarity): cria src/lib/rarity.ts com cores, labels e helpers por raridade"
```

---

## Task 3: Seasons catalog

**Files:**
- Create: `src/data/seasons.ts`

- [ ] **Step 1: Criar o catálogo**

Criar `src/data/seasons.ts`:

```ts
// ============================================================================
// Seasons catalog
// Cada season tem id, título, tema, data de lançamento e referência ao selo SVG.
// Usado pelo SeasonTeaserCard (home) e pra agrupar decks na tela /decks.
// ============================================================================

import type { ComponentType } from 'react';
import { Season0Seal } from '@/components/seals/Season0Seal';
import { Season1Seal } from '@/components/seals/Season1Seal';

export interface Season {
  id: string;
  title: string;
  /** Tema curto, aparece no teaser e em /decks. */
  theme: string;
  /** ISO date yyyy-mm-dd em que a season é lançada publicamente. */
  launchDate: string;
  /** Componente SVG 24×24 do selo. Recebe `className` opcional. */
  Seal: ComponentType<{ className?: string; size?: number }>;
}

export const SEASONS: Season[] = [
  {
    id: 'season-0',
    title: 'Fundação',
    theme: 'Os primeiros decks. Calibra quem você é.',
    launchDate: '2026-01-01',
    Seal: Season0Seal,
  },
  {
    id: 'season-1',
    title: 'Ocupando Espaço',
    theme: 'Trabalho, autoridade, pertencimento. Quando você vira figura na sala.',
    launchDate: '2026-05-23',
    Seal: Season1Seal,
  },
];

export function getSeason(id: string): Season | undefined {
  return SEASONS.find(s => s.id === id);
}

/** Retorna a season "ativa no momento" para o teaser:
 *  - se alguma season ainda não lançou mas está em até 7 dias → retorna essa (pré-lançamento)
 *  - senão, a mais recente que já lançou.
 */
export function getCurrentTeaserSeason(now: Date = new Date()): {
  season: Season;
  state: 'pre-launch' | 'fresh' | 'ongoing';
} | null {
  const nowMs = now.getTime();
  const sorted = [...SEASONS].sort(
    (a, b) => Date.parse(a.launchDate) - Date.parse(b.launchDate),
  );

  // Pré-lançamento: próxima season lança em até 7 dias
  for (const s of sorted) {
    const launchMs = Date.parse(s.launchDate);
    const daysUntil = (launchMs - nowMs) / (1000 * 60 * 60 * 24);
    if (daysUntil > 0 && daysUntil <= 7) {
      return { season: s, state: 'pre-launch' };
    }
  }

  // Mais recente já lançada
  const released = sorted.filter(s => Date.parse(s.launchDate) <= nowMs);
  if (released.length === 0) return null;
  const latest = released[released.length - 1];
  const daysSinceLaunch = (nowMs - Date.parse(latest.launchDate)) / (1000 * 60 * 60 * 24);

  if (daysSinceLaunch <= 14) return { season: latest, state: 'fresh' };
  if (daysSinceLaunch <= 60) return { season: latest, state: 'ongoing' };
  return null; // entre seasons — não mostra teaser
}
```

- [ ] **Step 2: Typecheck (vai falhar — seals não existem ainda, é esperado)**

Run: `npx tsc --noEmit 2>&1 | grep "seasons.ts" | head -5`
Expected: erro de importação de `Season0Seal` e `Season1Seal` (ok, próxima task resolve).

- [ ] **Step 3: Commit**

```bash
git add src/data/seasons.ts
git commit -m "feat(seasons): cria catalog com Season 0 (Fundacao) e Season 1 (Ocupando Espaco)"
```

---

## Task 4: Selos SVG (Season 0 e Season 1)

**Files:**
- Create: `src/components/seals/Season0Seal.tsx`
- Create: `src/components/seals/Season1Seal.tsx`

- [ ] **Step 1: Criar Season0Seal (brasão sóbrio — pedra angular)**

Criar `src/components/seals/Season0Seal.tsx`:

```tsx
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
```

- [ ] **Step 2: Criar Season1Seal (brasão corporativo afiado)**

Criar `src/components/seals/Season1Seal.tsx`:

```tsx
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
```

- [ ] **Step 3: Typecheck geral**

Run: `npx tsc --noEmit 2>&1 | grep -E "Season0Seal|Season1Seal|seasons.ts" | head -10`
Expected: sem erros nessas refs (o restante pode ter erros, ok).

- [ ] **Step 4: Commit**

```bash
git add src/components/seals/
git commit -m "feat(seals): cria selos SVG de Season 0 (Fundacao) e Season 1 (Ocupando Espaco)"
```

---

## Task 5: Classificar os 12 decks com rarity/seasonId/priceFichas

**Files:**
- Modify: `src/data/decks/basic_01.json`
- Modify: `src/data/decks/espelho.json`
- Modify: `src/data/decks/escolha.json`
- Modify: `src/data/decks/limite.json`
- Modify: `src/data/decks/mascara.json`
- Modify: `src/data/decks/roda.json`
- Modify: `src/data/decks/teste.json`
- Modify: `src/data/decks/alta_tensao.json`
- Modify: `src/data/decks/profissional.json`
- Modify: `src/data/decks/holofote.json`
- Modify: `src/data/decks/social.json`
- Modify: `src/data/decks/livro_amaldicoado.json`

**Classificação (decidida):**

| Deck | Category | rarity | seasonId | priceFichas |
|---|---|---|---|---:|
| basic_01 | calibragem | `comum` | `season-0` | `null` |
| espelho | calibragem | `comum` | `season-0` | `null` |
| escolha | calibragem | `comum` | `season-0` | `null` |
| limite | calibragem | `comum` | `season-0` | `null` |
| mascara | calibragem | `comum` | `season-0` | `null` |
| roda | calibragem | `comum` | `season-0` | `null` |
| teste | calibragem | `comum` | `season-0` | `null` |
| alta_tensao | cenario (tier 2) | `raro` | `season-0` | `150` |
| profissional | cenario (tier 2) | `raro` | `season-0` | `150` |
| holofote | eixo (tier 3) | `epico` | `season-0` | `350` |
| social | cenario (tier 4) | `epico` | `season-0` | `350` |
| livro_amaldicoado | campanha (tier 6) | `campanha` | `season-0` | `100` |

**Regra:** Todos decks de calibragem/quick → `comum` + `null` (grátis). Em Season 0 o price é informativo apenas; gating real só vale pra Season 1+.

- [ ] **Step 1: Adicionar campos nos 7 decks de calibragem**

Para cada um dos arquivos `basic_01.json`, `espelho.json`, `escolha.json`, `limite.json`, `mascara.json`, `roda.json`, `teste.json`: localizar o bloco de metadata no topo (após `"difficulty": N,`) e inserir antes de `"questions": [` os três campos:

```json
  "rarity": "comum",
  "seasonId": "season-0",
  "priceFichas": null,
```

Exemplo concreto em `basic_01.json`, trecho antes:
```json
  "category": "calibragem",
  "tier": 1,
  "difficulty": 1,
  "format": "quick",
  "questions": [
```

Depois:
```json
  "category": "calibragem",
  "tier": 1,
  "difficulty": 1,
  "format": "quick",
  "rarity": "comum",
  "seasonId": "season-0",
  "priceFichas": null,
  "questions": [
```

- [ ] **Step 2: Adicionar campos nos 4 decks de experiência**

Em `alta_tensao.json` e `profissional.json`:
```json
  "rarity": "raro",
  "seasonId": "season-0",
  "priceFichas": 150,
```

Em `holofote.json` e `social.json`:
```json
  "rarity": "epico",
  "seasonId": "season-0",
  "priceFichas": 350,
```

- [ ] **Step 3: Adicionar campos em livro_amaldicoado.json**

```json
  "rarity": "campanha",
  "seasonId": "season-0",
  "priceFichas": 100,
```

- [ ] **Step 4: Verificar que todos os 12 JSONs têm os 3 campos**

Run: `grep -l '"rarity"' src/data/decks/*.json | wc -l`
Expected: `12`

Run: `grep -l '"seasonId"' src/data/decks/*.json | wc -l`
Expected: `12`

Run: `grep -l '"priceFichas"' src/data/decks/*.json | wc -l`
Expected: `12`

- [ ] **Step 5: Rodar validator atual (vai falhar pois ele não conhece os novos campos — ok, próxima task resolve)**

Run: `npx tsx scripts/validate-deck.ts 2>&1 | tail -5`
Expected: pode passar (se validator ignora campos extra) ou falhar (se validator é estrito). Anotar comportamento — task 6 ajusta.

- [ ] **Step 6: Commit**

```bash
git add src/data/decks/*.json
git commit -m "feat(decks): classifica 12 decks da Season 0 com rarity/seasonId/priceFichas"
```

---

## Task 6: Estender deck validator para novos campos

**Files:**
- Modify: `scripts/validate-deck.ts`

- [ ] **Step 1: Inspecionar validator atual**

Run: `cat scripts/validate-deck.ts | head -120`
Expected: ver como ele parseia o JSON e valida campos do `Deck`.

- [ ] **Step 2: Adicionar validação dos 3 novos campos**

Localizar a função que valida o deck top-level (procurar por `validateDeck` ou similar). Onde ele verifica `deckId`, `name`, `category`, adicionar:

```ts
// Adicionar após a declaração de VALID_AXES, por volta da linha 25:
const VALID_RARITIES = ['comum', 'raro', 'epico', 'lendario', 'campanha'] as const;

// Dentro da função que valida top-level do deck, adicionar estes 3 blocos
// junto com as outras validações de campos obrigatórios:
if (!VALID_RARITIES.includes(deck.rarity)) {
  errors.push(`rarity obrigatorio e deve ser um de: ${VALID_RARITIES.join(', ')}`);
}
if (typeof deck.seasonId !== 'string' || !deck.seasonId.startsWith('season-')) {
  errors.push(`seasonId obrigatorio e deve começar com 'season-' (ex: 'season-0')`);
}
if (deck.priceFichas !== null && (typeof deck.priceFichas !== 'number' || deck.priceFichas < 0)) {
  errors.push(`priceFichas deve ser null ou numero >= 0`);
}
```

**NOTA:** Como o validator usa tipagem inline, mantenha o padrão existente (acessar via `deck as any` ou cast se necessário — seguir o que já tem no arquivo).

- [ ] **Step 3: Rodar validator**

Run: `npx tsx scripts/validate-deck.ts 2>&1 | tail -20`
Expected: **todos os 12 decks passando** (sem erros de rarity/seasonId/priceFichas).

Se algum deck falhar, corrigir o JSON ou o validator até passar.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-deck.ts
git commit -m "feat(validator): estende validate-deck pra checar rarity/seasonId/priceFichas"
```

---

## Task 7: Atualizar `initialState` e migração no GameContext

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Importar tipos e constantes novas**

Localizar o bloco de imports em `src/types/game.ts` (topo do arquivo) e adicionar `INITIAL_PLUS_SUBSCRIPTION`, `FIRST_RUN_OF_DAY_BONUS`, `STREAK_7_BONUS`, `DECK_FIRST_TIME_BONUS`, `NO_TIMEOUT_RUN_BONUS`, `PLUS_DAILY_BONUS`.

Substituir o bloco de import `from '@/types/game'` pelo bloco estendido:

```ts
import {
  type GameState,
  type CalibrationState,
  type StatKey,
  type Tone,
  type Deck,
  type Archetype,
  type Wallet,
  type AnswerIntensity,
  type PlusSubscription,
  STAT_KEYS,
  INITIAL_CALIBRATION,
  INITIAL_WALLET,
  INITIAL_PLUS_SUBSCRIPTION,
  DAILY_FICHAS,
  CALIBRATION_WINDOW,
  CONSISTENCY_WINDOW,
  INTENSITY_MULTIPLIERS,
  RUN_PISO_FICHAS,
  RUN_PISO_CAP_PER_DAY,
  FIRST_RUN_OF_DAY_BONUS,
  STREAK_7_BONUS,
  DECK_FIRST_TIME_BONUS,
  NO_TIMEOUT_RUN_BONUS,
  CAMPAIGN_ENDING_BONUS,
  SKIP_COOLDOWN_COST,
  PLUS_DAILY_BONUS,
} from '@/types/game';
```

- [ ] **Step 2: Adicionar `ownedDeckIds` e `plusSubscription` ao initialState**

Localizar `const initialState: GameState = { ... }` (~linha 200) e adicionar duas linhas antes do fecho `}`:

```ts
  ownedDeckIds: [],
  plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
```

- [ ] **Step 3: Atualizar migrateV1 e o HYDRATE pra preencher defaults**

Localizar `function migrateV1` — ao final do retorno, adicionar os novos campos:
```ts
      ownedDeckIds: [],
      plusSubscription: { ...INITIAL_PLUS_SUBSCRIPTION },
```

Localizar `case 'HYDRATE'`. Substituir por:
```ts
    case 'HYDRATE':
      return {
        ...normalizeGameState(action.state),
        unlockedDecks: getUnlockedDecks(action.state.completedDecks),
        // migração silenciosa pra saves antigos que não tinham esses campos
        ownedDeckIds: action.state.ownedDeckIds ?? [],
        plusSubscription: action.state.plusSubscription ?? { ...INITIAL_PLUS_SUBSCRIPTION },
      };
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -10`
Expected: qualquer erro aqui deve vir de imports faltantes — revisar step 1.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(state): adiciona ownedDeckIds e plusSubscription no initialState+migracao"
```

---

## Task 8: Refatorar FINISH_DECK com economia nova

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Localizar o case `FINISH_DECK`**

Abrir `src/context/GameContext.tsx` e procurar por `case 'FINISH_DECK'` (~linha 308).

Ler o bloco inteiro até o `return` final pra contexto.

- [ ] **Step 2: Substituir cálculo de bonusFichas pelo novo**

Localizar este trecho dentro do case:
```ts
      let bonusFichas = pisoFichas;
      // First run of the calendar day → +3 on top of piso (→ total 5).
      const firstOfDay = state.lastPlayDate !== todayStr;
      if (firstOfDay) bonusFichas += 3;
      // Weekly streak bonus.
      if (newStreak > 0 && newStreak % 7 === 0) bonusFichas += 20;
      // Zero-timeout run.
      const noTimeouts = state.activeRun ? state.activeRun.timeoutCount === 0 : false;
      if (noTimeouts) bonusFichas += 5;
      // Calibragem — always rewarded (feeds profile + unlocks next).
      if (deckId && CALIBRAGEM_IDS.has(deckId)) {
        bonusFichas += CALIBRAGEM_COMPLETION_FICHAS;
      }
```

Substituir por:
```ts
      let bonusFichas = pisoFichas;
      // First run of the calendar day
      const firstOfDay = state.lastPlayDate !== todayStr;
      if (firstOfDay) bonusFichas += FIRST_RUN_OF_DAY_BONUS;
      // Weekly streak bonus (a cada 7 dias consecutivos)
      if (newStreak > 0 && newStreak % 7 === 0) bonusFichas += STREAK_7_BONUS;
      // Zero-timeout run
      const noTimeouts = state.activeRun ? state.activeRun.timeoutCount === 0 : false;
      if (noTimeouts) bonusFichas += NO_TIMEOUT_RUN_BONUS;
      // Calibragem — always rewarded (feeds profile + unlocks next)
      if (deckId && CALIBRAGEM_IDS.has(deckId)) {
        bonusFichas += CALIBRAGEM_COMPLETION_FICHAS;
      }
      // NEW: primeira vez completando este deck (não paga em completar de novo)
      const isFirstTimeDeck = deckId ? !state.completedDecks[deckId] : false;
      if (isFirstTimeDeck) bonusFichas += DECK_FIRST_TIME_BONUS;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -10`
Expected: sem erros novos nesse arquivo.

- [ ] **Step 4: Smoke manual da lógica (runtime check)**

Abrir `src/context/GameContext.tsx` e procurar o case `FINISH_DECK` inteiro. Mentalmente rodar o caso:

**Cenário A** (usuário completa deck novo, primeira run do dia, sem timeout):
- pisoFichas = 3 (RUN_PISO_FICHAS)
- firstOfDay → +5
- isFirstTimeDeck → +15
- noTimeouts → +5
- Total esperado: **28 fichas**

**Cenário B** (usuário re-joga deck já completado, 3ª run do dia):
- pisoFichas = 3
- firstOfDay = false
- isFirstTimeDeck = false
- Total: **3 fichas** (se passar noTimeouts, +5 = 8)

Se sua leitura confirma, passa. Senão, revisar step 2.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(economy): ajusta FINISH_DECK com piso 3, first-of-day 5, deck-first-time 15"
```

---

## Task 9: Atualizar CAMPAIGN_ANSWER com novo bonus de ending

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Localizar case `CAMPAIGN_ANSWER`**

Procurar `case 'CAMPAIGN_ANSWER'`. Ler o bloco até o return.

- [ ] **Step 2: Verificar onde CAMPAIGN_ENDING_BONUS é aplicado**

Procurar no arquivo: `grep -n "CAMPAIGN_ENDING_BONUS" src/context/GameContext.tsx`

O uso correto do bonus é dentro do case `CAMPAIGN_ANSWER`, quando `action.endingId` está presente (ou seja, jogador atingiu um final). O valor da constante já foi bumped de 30 → 40 na Task 1.

- [ ] **Step 3: Conferir que o bonus está sendo somado corretamente**

No case `CAMPAIGN_ANSWER`, deve haver algo como:
```ts
const isEnding = action.endingId !== null;
const endingBonus = isEnding ? CAMPAIGN_ENDING_BONUS : 0;
// ...
fichas: state.wallet.fichas + endingBonus,
```

Se não houver essa lógica, adicionar: quando `action.endingId !== null`, somar `CAMPAIGN_ENDING_BONUS` ao `wallet.fichas` e ao `wallet.totalEarned`.

Trecho concreto a inserir dentro do return do case (se ainda não existir):
```ts
        wallet: action.endingId ? {
          ...state.wallet,
          fichas: state.wallet.fichas + CAMPAIGN_ENDING_BONUS,
          totalEarned: state.wallet.totalEarned + CAMPAIGN_ENDING_BONUS,
        } : state.wallet,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -5`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(economy): bonus de campanha ending sobe pra 40 fichas"
```

---

## Task 10: Action UNLOCK_DECK

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Adicionar o tipo da action**

Localizar `type GameAction =` (por volta da linha 46). Adicionar no final, antes do `;`:

```ts
  | { type: 'UNLOCK_DECK'; deckId: string; cost: number }
```

- [ ] **Step 2: Adicionar case no reducer**

Na `function gameReducer`, adicionar antes do `default`/fim do switch:

```ts
    case 'UNLOCK_DECK': {
      // Já possui — idempotente.
      if (state.ownedDeckIds.includes(action.deckId)) return state;
      // Sem saldo — rejeita silenciosamente. UI deve ter desabilitado o botão.
      if (state.wallet.fichas < action.cost) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas - action.cost,
          totalSpent: state.wallet.totalSpent + action.cost,
        },
        ownedDeckIds: [...state.ownedDeckIds, action.deckId],
      };
    }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -5`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(actions): UNLOCK_DECK debita fichas e adiciona em ownedDeckIds"
```

---

## Task 11: Actions SET_PLUS_STATUS e CLAIM_DAILY_PLUS_BONUS

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Adicionar tipos das actions**

Na union `GameAction`, adicionar:

```ts
  | { type: 'SET_PLUS_STATUS'; active: boolean; expiresAt: string | null; startedAt?: string }
  | { type: 'CLAIM_DAILY_PLUS_BONUS' }
```

- [ ] **Step 2: Adicionar case SET_PLUS_STATUS**

No reducer, adicionar:

```ts
    case 'SET_PLUS_STATUS': {
      const now = new Date().toISOString();
      // Se está ativando e nunca esteve ativo antes, marca startedAt.
      const startedAt = action.active
        ? (state.plusSubscription.startedAt ?? action.startedAt ?? now)
        : state.plusSubscription.startedAt;
      return {
        ...state,
        plusSubscription: {
          ...state.plusSubscription,
          active: action.active,
          expiresAt: action.expiresAt,
          startedAt,
        },
      };
    }
```

- [ ] **Step 3: Adicionar case CLAIM_DAILY_PLUS_BONUS**

```ts
    case 'CLAIM_DAILY_PLUS_BONUS': {
      if (!state.plusSubscription.active) return state;
      const today = new Date().toISOString().split('T')[0];
      if (state.plusSubscription.lastPlusDailyClaim === today) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          fichas: state.wallet.fichas + PLUS_DAILY_BONUS,
          totalEarned: state.wallet.totalEarned + PLUS_DAILY_BONUS,
        },
        plusSubscription: {
          ...state.plusSubscription,
          lastPlusDailyClaim: today,
        },
      };
    }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -5`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(actions): SET_PLUS_STATUS e CLAIM_DAILY_PLUS_BONUS com bonus diario de 10 fichas"
```

---

## Task 12: Helper `isDeckPlayable`

**Files:**
- Modify: `src/context/GameContext.tsx` (exportar a função)

- [ ] **Step 1: Adicionar helper exportado no topo do arquivo (após getUnlockedDecks)**

Logo após a função `getUnlockedDecks` (~linha 171), adicionar:

```ts
/**
 * Determina se um deck pode ser jogado pelo usuário agora.
 *
 * Regras:
 *  - Se priceFichas === null → só depende de unlockedDecks (flow sequencial antigo).
 *  - Se priceFichas > 0 e seasonId === 'season-0' → só depende de unlockedDecks
 *    (Season 0 mantém flow antigo pra não quebrar quem já jogou).
 *  - Se priceFichas > 0 e seasonId !== 'season-0' → precisa estar em ownedDeckIds
 *    OU plusSubscription.active (+ não `plusOnly` com active=false).
 *
 * Fase 1 mantém Season 0 destravada pra retrocompatibilidade.
 * A partir de Season 1 o paywall entra em vigor.
 */
export function isDeckPlayable(deck: Deck, state: GameState): boolean {
  // Gating sequencial antigo ainda aplica para Season 0.
  const sequentialOk = state.unlockedDecks.includes(deck.deckId);

  // Grátis (calibragem ou promocional) → só flow sequencial
  if (deck.priceFichas === null) return sequentialOk;

  // Season 0 paga → legado: ignora ownership
  if (deck.seasonId === 'season-0') return sequentialOk;

  // Season 1+ paywall
  const owned = state.ownedDeckIds.includes(deck.deckId);
  const plusActive = state.plusSubscription.active;
  if (deck.plusOnly) return plusActive;
  return owned || plusActive;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GameContext" | head -5`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(helper): isDeckPlayable consolida gating sequencial+paywall+plus"
```

---

## Task 13: Componente RarityBadge

**Files:**
- Create: `src/components/decks/RarityBadge.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/decks/RarityBadge.tsx`:

```tsx
// ============================================================================
// RarityBadge — pill visual que mostra a raridade do deck.
// Usado em DeckCard e em tela de detalhe.
// ============================================================================

import type { Rarity } from '@/types/game';
import { getRarityVisual } from '@/lib/rarity';

interface RarityBadgeProps {
  rarity: Rarity;
  /** Se true, mostra a palavra (Comum, Raro, ...). Se false, só o dot colorido. */
  showLabel?: boolean;
  className?: string;
}

export function RarityBadge({ rarity, showLabel = true, className = '' }: RarityBadgeProps) {
  const v = getRarityVisual(rarity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${v.borderClass} ${v.textClass} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: v.hex, boxShadow: `0 0 6px ${v.hex}` }}
      />
      {showLabel && v.label}
    </span>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "RarityBadge" | head -5`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/decks/RarityBadge.tsx
git commit -m "feat(ui): RarityBadge — pill visual de raridade com dot colorido"
```

---

## Task 14: Integrar raridade + selo no DeckCard de `/decks`

**Files:**
- Modify: `src/app/decks/page.tsx`

- [ ] **Step 1: Inspecionar o arquivo**

Run: `cat src/app/decks/page.tsx | head -80`
Expected: ver como os cards de deck são renderizados hoje.

Anotar onde cada card é rendererizado (ex: um `<div>` por deck) e qual classe de borda/cor é usada.

- [ ] **Step 2: Adicionar imports**

No topo do arquivo:

```tsx
import { RarityBadge } from '@/components/decks/RarityBadge';
import { getRarityVisual } from '@/lib/rarity';
import { getSeason } from '@/data/seasons';
```

- [ ] **Step 3: Na renderização de cada card, injetar:**

Para cada card de deck (um `<Link>` ou `<div>`), aplicar a borda/glow da raridade usando `getRarityVisual(deck.rarity)`:

```tsx
// Dentro do loop/map dos decks:
const visual = getRarityVisual(deck.rarity);
const season = getSeason(deck.seasonId);
const Seal = season?.Seal;
// ...
<article
  className={`relative rounded-xl border-2 p-4 ${visual.borderClass} ${visual.bgGlowClass}`}
  // ...restante
>
  {/* Selo no canto superior direito */}
  {Seal && (
    <div className="absolute right-2 top-2 opacity-70 hover:opacity-100 transition">
      <Seal size={22} />
    </div>
  )}
  {/* ... conteúdo existente (nome, descrição, etc) ... */}
  <div className="mt-2 flex items-center gap-2">
    <RarityBadge rarity={deck.rarity} />
    {deck.priceFichas !== null && (
      <span className="text-xs text-amber-300/80">
        {deck.priceFichas} fichas
      </span>
    )}
  </div>
</article>
```

**NOTA:** adaptar os nomes das classes Tailwind à estrutura atual do arquivo. Se o card já tem `border border-white/10`, substituir pela `visual.borderClass`. Se a estrutura for outra (ex: motion.div, Card component), adaptar a aplicação do `className`.

- [ ] **Step 4: Rodar app localmente e visualizar**

Run (em outra shell): `npm run dev`

Abrir `http://localhost:3000/decks` e verificar:
- Cada card tem a cor de borda correspondente à raridade (cinza=comum, azul=raro, roxo=épico, vinho=campanha).
- O selo aparece no canto superior direito.
- Épicos têm glow roxo visível; comuns não têm glow.
- Livro Amaldiçoado mostra badge "Campanha" vermelha.

**Pass/fail:** todos os 12 cards mostram cor + selo + badge coerente.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/page.tsx
git commit -m "feat(ui): DeckCard exibe cor de raridade + selo da season + badge"
```

---

## Task 15: Fluxo de unlock (Season 1+ placeholder)

**Files:**
- Modify: `src/app/decks/page.tsx`

**Nota:** Em Fase 1, Season 0 mantém flow sequencial antigo. Esse fluxo é stub para quando Season 1 chegar na Fase 3.

- [ ] **Step 1: Usar `isDeckPlayable` pra decidir estado visual do card**

No arquivo `src/app/decks/page.tsx`, dentro do map dos decks, importar e chamar:

```tsx
import { isDeckPlayable } from '@/context/GameContext';

// Em cada card:
const playable = isDeckPlayable(deck, state); // state vem do useGameContext()
```

- [ ] **Step 2: Adicionar estado "locked" visual e botão de unlock**

Substituir o bloco do card por:

```tsx
const visual = getRarityVisual(deck.rarity);
const season = getSeason(deck.seasonId);
const Seal = season?.Seal;
const playable = isDeckPlayable(deck, state);
const owned = state.ownedDeckIds.includes(deck.deckId);
const canUnlock =
  !playable &&
  deck.priceFichas !== null &&
  deck.seasonId !== 'season-0' &&
  !deck.plusOnly &&
  state.wallet.fichas >= deck.priceFichas &&
  !owned;

return (
  <article
    className={`relative rounded-xl border-2 p-4 ${visual.borderClass} ${visual.bgGlowClass} ${
      !playable ? 'opacity-60 grayscale' : ''
    }`}
  >
    {Seal && (
      <div className="absolute right-2 top-2 opacity-70">
        <Seal size={22} />
      </div>
    )}
    {/* ... conteúdo existente ... */}
    <div className="mt-2 flex items-center gap-2">
      <RarityBadge rarity={deck.rarity} />
      {deck.priceFichas !== null && !owned && (
        <span className="text-xs text-amber-300/80">{deck.priceFichas} fichas</span>
      )}
    </div>
    {canUnlock && (
      <button
        type="button"
        onClick={() => dispatch({ type: 'UNLOCK_DECK', deckId: deck.deckId, cost: deck.priceFichas! })}
        className="mt-2 w-full rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
      >
        Desbloquear · {deck.priceFichas} fichas
      </button>
    )}
    {!playable && !canUnlock && deck.priceFichas !== null && (
      <div className="mt-2 text-xs text-white/40">
        {deck.plusOnly ? 'Exclusivo Plus' : 'Bloqueado'}
      </div>
    )}
  </article>
);
```

- [ ] **Step 3: Verificar manualmente**

Rodando `npm run dev`:
- Todos os 12 decks Season 0 devem aparecer playable (sem overlay cinza).
- Wallet atual exibe fichas normais.
- Se o jogador tentar desbloquear algo (todos de Season 0 passam pelo `isDeckPlayable` via sequential unlock), não deve aparecer botão de unlock — porque `playable === true`.

**Pass:** nenhum card de Season 0 está em estado locked injustamente. O botão de unlock só apareceria em decks de Season 1+ (que ainda não existem).

- [ ] **Step 4: Commit**

```bash
git add src/app/decks/page.tsx
git commit -m "feat(ui): fluxo de unlock com botao de desbloqueio — ativa em Season 1+"
```

---

## Task 16: SeasonTeaserCard na home

**Files:**
- Create: `src/components/home/SeasonTeaserCard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Criar componente**

Criar `src/components/home/SeasonTeaserCard.tsx`:

```tsx
'use client';

// ============================================================================
// SeasonTeaserCard — card persistente na home anunciando season atual/próxima.
// 3 estados derivados de getCurrentTeaserSeason():
//  - pre-launch: selo + "em N dias" + opt-in push
//  - fresh: selo grande + "Chegou a Season X" + CTA pra /decks
//  - ongoing: mini card só com selo + contador de decks
// ============================================================================

import Link from 'next/link';
import { getCurrentTeaserSeason } from '@/data/seasons';

export function SeasonTeaserCard() {
  const teaser = getCurrentTeaserSeason();
  if (!teaser) return null;

  const { season, state } = teaser;
  const Seal = season.Seal;

  if (state === 'pre-launch') {
    const launchMs = Date.parse(season.launchDate);
    const daysUntil = Math.max(1, Math.ceil((launchMs - Date.now()) / (1000 * 60 * 60 * 24)));
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/60 to-slate-900/40 p-4">
        <div className="flex items-center gap-3">
          <Seal size={48} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white/50">Chegando</div>
            <div className="text-base font-semibold text-white">
              Season · {season.title}
            </div>
            <div className="text-xs text-white/60">em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}</div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">{season.theme}</p>
      </div>
    );
  }

  if (state === 'fresh') {
    return (
      <Link
        href={`/decks?season=${season.id}`}
        className="block rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-900/30 to-slate-900/30 p-4 shadow-[0_0_24px_rgba(251,191,36,0.25)] transition hover:shadow-[0_0_32px_rgba(251,191,36,0.45)]"
      >
        <div className="flex items-center gap-3">
          <Seal size={56} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-amber-300/80">Nova Season</div>
            <div className="text-lg font-semibold text-white">{season.title}</div>
            <div className="text-xs text-white/70">{season.theme}</div>
          </div>
        </div>
        <div className="mt-3 text-right text-xs font-semibold text-amber-300">Ver decks novos →</div>
      </Link>
    );
  }

  // ongoing
  return (
    <Link
      href={`/decks?season=${season.id}`}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
    >
      <Seal size={18} />
      <span>{season.title} ativa</span>
    </Link>
  );
}
```

- [ ] **Step 2: Importar na home**

Em `src/app/page.tsx`, adicionar no topo:

```tsx
import { SeasonTeaserCard } from '@/components/home/SeasonTeaserCard';
```

- [ ] **Step 3: Renderizar o teaser no layout da home**

Localizar um ponto acima da lista de decks ou logo abaixo do header principal (inspecionar o arquivo). Adicionar:

```tsx
<SeasonTeaserCard />
```

**Critério:** o card deve aparecer no fluxo vertical da home, com `mt-4` ou similar pra respirar.

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev` e abrir `http://localhost:3000/`.

**Estado esperado hoje (2026-04-18):**
- Season 1 lança em 2026-05-23 → falta ~35 dias → NÃO cai em pre-launch (>7 dias).
- Season 0 lançou em 2026-01-01 → 107 dias atrás → cai em `null` (passou dos 60 dias, não mostra).

Resultado: **o teaser pode não aparecer** hoje (ok, normal entre seasons).

**Para testar pre-launch:** temporariamente mudar `launchDate` da Season 1 em `src/data/seasons.ts` pra uma data +3 dias: `'2026-04-21'`. Recarregar → teaser pré-lançamento aparece. Depois reverter.

**Para testar fresh:** mudar Season 1 pra `'2026-04-10'` (8 dias atrás → fresh state). Reverter depois.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/SeasonTeaserCard.tsx src/app/page.tsx
git commit -m "feat(home): SeasonTeaserCard com 3 estados (pre-launch, fresh, ongoing)"
```

---

## Task 17: Painel GM — botão de ativar Plus pra testes

**Files:**
- Modify: `src/components/DevTools.tsx`

- [ ] **Step 1: Inspecionar o arquivo**

Run: `cat src/components/DevTools.tsx | head -80`
Expected: ver a estrutura atual do painel (botões 1/2/3 de push).

- [ ] **Step 2: Adicionar botões de Plus testing**

Localizar o bloco de botões e adicionar depois dos 3 de push:

```tsx
{/* --- Plus testing --- */}
<button
  type="button"
  onClick={() => {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    dispatch({ type: 'SET_PLUS_STATUS', active: true, expiresAt: expires });
    setLastMsg('Plus ATIVADO por 30 dias');
  }}
  className="w-full rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
>
  4. Ativar Plus (30d)
</button>
<button
  type="button"
  onClick={() => {
    dispatch({ type: 'SET_PLUS_STATUS', active: false, expiresAt: null });
    setLastMsg('Plus DESATIVADO');
  }}
  className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
>
  5. Desativar Plus
</button>
<button
  type="button"
  onClick={() => {
    dispatch({ type: 'CLAIM_DAILY_PLUS_BONUS' });
    setLastMsg('Bonus diario Plus claimado (+10 fichas, idempotente)');
  }}
  className="w-full rounded-md border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/20"
>
  6. Claim diario Plus
</button>
```

**NOTA:** o `dispatch` já deve estar disponível via `useGameContext()` — confirmar no topo do arquivo. Se não, importar e chamar.

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`. Abrir qualquer página do app. Painel GM canto inferior direito.

- Clicar "4. Ativar Plus" → mensagem de confirmação aparece.
- Clicar "6. Claim diario Plus" → mensagem "+10 fichas". Wallet no canto deve subir 10.
- Clicar "6" de novo → mensagem "idempotente" (mas saldo não sobe).
- Clicar "5. Desativar Plus" → Plus off.
- Clicar "6" com Plus off → nada (retorna state).

**Pass:** toda a mecânica de Plus funciona via painel GM sem gateway real.

- [ ] **Step 4: Commit**

```bash
git add src/components/DevTools.tsx
git commit -m "feat(gm): botoes de ativar/desativar Plus + claim diario pra testes"
```

---

## Task 18: Smoke final — build + typecheck + validator

**Files:** nenhum (verificação)

- [ ] **Step 1: Typecheck full**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: **0 erros.** Se houver, corrigir antes de seguir.

- [ ] **Step 2: Validator de deck**

Run: `npx tsx scripts/validate-deck.ts 2>&1 | tail -10`
Expected: **12 decks passando.** Se algum falhar, checar JSON ou validator.

- [ ] **Step 3: Build de produção**

Run: `npm run build 2>&1 | tail -30`
Expected: **build passa sem erros.** Warnings de imagem/lint são aceitáveis, erros não.

- [ ] **Step 4: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: **sem erros.** Warnings existentes do codebase ok; não introduzir novos.

- [ ] **Step 5: Smoke manual no browser**

Run: `npm run dev`

Checklist:
- `/` — home carrega, teaser condicional aparece conforme data (ou some gracefully)
- `/decks` — 12 cards com cores de raridade corretas, selo da Season 0 no canto, badge de raridade
- Wallet no topo mostra fichas
- Painel GM (dev mode) — os 6 botões (3 push + 3 plus) funcionam
- Jogar um deck até o fim: completar → verificar que fichas sobem conforme spec (piso 3 + first-of-day 5 se aplicável + deck-first-time 15)
- Ativar Plus via GM → wallet não muda automaticamente, mas "6. Claim diario" credita +10

**Pass/fail:** todos os itens do checklist respondendo conforme esperado.

- [ ] **Step 6: Commit final de fase**

```bash
git add -A
git commit --allow-empty -m "chore: fase 1 (fundacao) completa — tipos, economia, raridade, selos, plus stub

Preparado pra Fase 2 (engine narrativa: intent+baseWeights+modifiers contextuais
+ retrofit dos 5 decks de experiencia da Season 0)."
```

---

## Critério de "Fase 1 pronta"

- [ ] Todos os 18 tasks acima com steps commitados
- [ ] `tsc --noEmit` limpo
- [ ] `npm run build` passa
- [ ] `validate-deck.ts` passa
- [ ] UI de `/decks` mostra cores + selos + badges corretamente
- [ ] Painel GM consegue ativar/desativar Plus e claimar diário
- [ ] Jogador que já tinha save antigo (sem `ownedDeckIds`/`plusSubscription`) hidrata sem quebrar (migração silenciosa)
- [ ] Nenhum deck da Season 0 ficou inacessível por causa do paywall (gating preserva flow antigo)

---

## O que NÃO está nesta fase (lembrete de escopo)

- **Engine narrativa** (intent + baseWeights + modifiers contextuais) → Fase 2
- **Retrofit de texto** dos 5 decks de experiência → Fase 2
- **Season 1 content** (3 Comuns + 3 Raros + 2 Épicos + 1 Lendário + 1 Campanha novos) → Fase 3
- **Timeout não-recompensa-vigor** → Fase 2 (quando mexer no applyDampenedWeights)
- **IAP / gateway de pagamento** → Fase 4
- **Cena lendária mensal Plus, badge Plus no feed, cor nickname especial** → Fase 4
- **Tela "Torne-se Plus" com comparativo** → Fase 4
