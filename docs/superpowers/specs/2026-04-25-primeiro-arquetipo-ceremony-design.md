# F5b.1 — Primeiro Arquétipo Ceremony — Design Spec

**Status:** Approved (2026-04-25)
**Phase:** F5b, peça 1 de 3 (próximas: Evolução, Season Finale)
**Goal:** Cerimônia full-screen disparada **uma única vez** quando o jogador sai do estado "descobrindo" e ganha um arquétipo dominante. Reuse máximo dos primitivos F5a.
**Non-goals:** Evolução de arquétipo (F5b.2), Season finale (F5b.3), áudio, vídeo custom, type-on animation.

---

## 1. Contexto

Após F4 (motor bayesiano), o app calcula `archetypeDisplayState(beliefs)` que retorna `{ mode, primary, secondary }` onde `mode ∈ ('discovering', 'tendency', 'firm')`. O jogador novo começa em `discovering` (confidence < 0.3). Quando sobe pra `tendency` ou `firm` pela **primeira vez**, deve ver uma cerimônia que celebra o reveal — equivalente narrativo do "primeiro arquétipo descoberto".

Hoje essa transição é silenciosa: o `/perfil` simplesmente passa a mostrar o nome do arquétipo. F5b.1 transforma esse momento num beat cerimonial.

## 2. Objetivos

1. **Trigger único, durável**: dispara 1 vez por save, mesmo cross-device.
2. **Reuse F5a**: `Dialog`, `Badge`, `Button` (`Card` opcional). Visual coeso com `LevelUpCeremony`.
3. **Showcase dos 10 traits**: a cerimônia revela o perfil completo via `AxisBars` bipolares com os labels novos.
4. **Recompensa**: +30 fichas (escala compatível com level-up).
5. **Share**: variant nova de `ShareCard` específica pro reveal.
6. **Trait rename**: aproveita a janela pra trocar os labels dos polos pra forma trait (substantivo abstrato).

## 3. Não-objetivos

- Evolução (mudança de arquétipo) — F5b.2.
- Season finale — F5b.3.
- Áudio, haptic, vídeo custom (placeholder gradient + framer motion).
- Type-on animation (frágil; usar fade simples).
- Custom imagem por arquétipo (reuse `archetypeAvatarVisual`).
- Migração retroativa de saves antigos: novo field default `null`, jogador que já passou do trigger não vê cerimônia retroativa (sem usuários em prod, aceitável).

## 4. Arquitetura

### 4.1. Estado novo

`GameState` ganha:
```ts
firstArchetypeShownAt: string | null  // ISO timestamp; null = nunca disparou
```

`PersistedGameState` (zod schema) idem, optional com default `null`.

### 4.2. Migration v4 → v5

`src/lib/gameState/migrations/v4-to-v5.ts`:
- Adiciona `firstArchetypeShownAt: null` se ausente
- Bump `schemaVersion: 5`
- Trivial; teste de migração simétrico aos existentes

### 4.3. Action nova

```ts
| { type: 'MARK_FIRST_ARCHETYPE_SEEN'; archetypeId: string; at: string }
```

**Reducer** (idempotente):
- Se `state.firstArchetypeShownAt !== null`, no-op
- Set `firstArchetypeShownAt = action.at`
- Credit `+30 fichas` em `wallet.fichas` + `wallet.totalEarned`

### 4.4. Trigger

No `GameProvider` (ou novo hook `useCeremonies`), `useEffect` watcheia:

```ts
const display = archetypeDisplayState(state.calibration.beliefs);
const shouldShow =
  state.firstArchetypeShownAt === null &&
  display.mode !== 'discovering' &&
  display.primary !== null;
```

Se `shouldShow` → renderiza `<FirstArchetypeCeremony>`. Modal manage seu próprio `open` via `shouldShow`.

### 4.5. Trait rename

`AXIS_POLES` migra de `/perfil/page.tsx` (inline) pra `src/types/game.ts` (constante exportada como source-of-truth). Labels novos:

```ts
export const AXIS_POLES: Record<StatKey, [string, string]> = {
  vigor:    ['Calma',     'Intensidade'],
  harmonia: ['Atrito',    'Concílio'],
  filtro:   ['Impulso',   'Cálculo'],
  presenca: ['Discrição', 'Imponência'],
  desapego: ['Apego',     'Desapego'],
};
```

**Mudanças em outros arquivos:**
- `/perfil/page.tsx`: remove constante local, importa de `@/types/game`
- Qualquer outro consumer (search por `AXIS_POLES` faz sweep) — aplicar import

### 4.6. Componente novo: `AxisBars`

Extrai pattern bipolar de `/perfil/page.tsx:300-345` para `src/components/AxisBars.tsx`. API:

```ts
interface AxisBarsProps {
  beliefs?: PlayerBeliefs;     // se passado, deriva valores via playerMean recentered
  axes?: Record<StatKey, number>;  // alternativa: valores prontos em [-1, 1]
  hasData?: boolean;            // controla "ativa" vs "vazia" (default: true se beliefs/axes presente)
  /** stagger reveal animation, default false (perfil) — true em ceremony */
  animated?: boolean;
  /** delay base em ms pro stagger, default 0 */
  delayMs?: number;
}
```

Render: 5 barras horizontais (uma por eixo), cada uma com:
- Labels dos 2 polos (ex: "Atrito" ← → "Concílio")
- Track horizontal `bg-bg-glass` com tick central no 0
- Fill colorido a partir do centro (cor: `STAT_COLORS[k]`)
- Indicador numérico flutuante (ex: `+0.6`)
- Quando `animated=true`: stagger 80ms entre barras, fade + width tween

Reuse em:
- `/perfil/page.tsx` (substitui inline)
- `FirstArchetypeCeremony` (`animated=true`)

### 4.7. Componente novo: `FirstArchetypeCeremony`

`src/components/FirstArchetypeCeremony.tsx` (~200 LOC). API:

```ts
interface FirstArchetypeCeremonyProps {
  open: boolean;
  archetype: Archetype;
  beliefs: PlayerBeliefs;
  reward?: number;        // default 30
  onClose: () => void;
}
```

Estrutura:

```
[backdrop full-screen + blur, fade 300ms]
  ┌─ Card (variant=elevated) ─────────────┐
  │ ┌── Hero (gradient da cor archetype) ─┤
  │ │  Badge "PRIMEIRO ARQUÉTIPO"         │
  │ └─────────────────────────────────────┤
  │                                        │
  │     [Avatar archetype — glow]          │
  │                                        │
  │     ━━━━━━━━━━━━━━━                    │
  │                                        │
  │        Você é                          │
  │     {ARCHETYPE.NAME}    (text-5xl)    │
  │                                        │
  │  "{archetype.tagline}" (italic, sec.) │
  │                                        │
  │  ┌── AxisBars animated=true ─────┐    │
  │  │  Calma     ←──●────→  Intens. │    │
  │  │  Atrito    ←─────●──→  Concíl.│    │
  │  │  Impulso   ←──●─────→  Cálculo│    │
  │  │  Discrição ←──────●──→  Impon.│    │
  │  │  Apego     ←─●──────→  Desap. │    │
  │  └────────────────────────────────┘    │
  │                                        │
  │  ┌─ Reward tile pulsante ────┐        │
  │  │     +30 FICHAS             │        │
  │  └────────────────────────────┘        │
  │                                        │
  │  [ Compartilhar ]  [ Continuar ]      │
  └────────────────────────────────────────┘
```

Sequência de animação:
- 0ms: backdrop fade in (300ms)
- 100ms: card slide-in scale 0.94→1 (450ms)
- 200ms: Badge slide-down do topo (300ms)
- 400ms: avatar fade + pulse (400ms)
- 700ms: separator widens (300ms)
- 900ms: name fade in (400ms)
- 1300ms: tagline fade in (400ms)
- 1700ms: AxisBars stagger (5 × 80ms = 400ms)
- 2200ms: reward tile pulse-in (300ms)
- 2600ms: CTAs fade in (300ms)

Total: ~2.9s pré-interatividade. Esc/backdrop fecham antes.

Tons de cor: gradient hero usa `archetypeAvatarVisual(archetype).accent` + `.glow`. Reward tile cor `accent-gold`.

### 4.8. ShareCard variant nova

`src/components/ShareCard.tsx` ganha variant `firstArchetype`:

```ts
interface ShareCardProps {
  variant?: 'default' | 'firstArchetype';
  // ...
}
```

Layout firstArchetype:
- Header: "PRIMEIRO ARQUÉTIPO REVELADO" (badge gold)
- Avatar grande
- Nome do arquétipo + tagline
- Mini AxisBars (versão compacta, só 5 barras sem labels numéricos)
- Footer: "MindPractice / @{nickname}"

Geração via `html2canvas` (já é dep). `ShareButton` ganha prop `variant`.

## 5. Critérios de pronto (gate F5b.1)

- [ ] `firstArchetypeShownAt` field em `GameState` + `PersistedGameState` schema
- [ ] Migration v4 → v5 + teste
- [ ] Action `MARK_FIRST_ARCHETYPE_SEEN` + reducer + teste
- [ ] `AXIS_POLES` migrado pra `types/game.ts` com labels novos
- [ ] `/perfil` consome `AXIS_POLES` do types
- [ ] `AxisBars` componente extraído + teste de variantes
- [ ] `/perfil` usa `AxisBars`
- [ ] `FirstArchetypeCeremony` implementado
- [ ] Trigger no `GameProvider` (effect que detecta transição)
- [ ] `ShareCard` variant `firstArchetype` + `ShareButton` prop
- [ ] `npx tsc --noEmit` 0 erros
- [ ] `npm test` todos passando (testes existentes + novos)
- [ ] `npm run build` verde
- [ ] Smoke manual: limpar localStorage, jogar 1 deck até confidence ≥ 0.3, ceremony aparece. Fechar, jogar de novo, NÃO aparece.
- [ ] Roadmap atualizado

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Trigger dispara durante hydrate inicial (cloud sync) | Effect só roda após `hydrated === true` (já existe em `useGameStatePersistence`) |
| Jogador antigo (sem field) recebe ceremony retroativa | Migration v5 default `null`; comportamento aceitável até porque sem usuários em prod |
| `AxisBars` extraction quebra `/perfil` visualmente | Test de extração: snapshot antes/depois das classes; pequenos diffs de estrutura tolerados, mas valores idênticos |
| ShareCard `html2canvas` falha em variant nova | Fallback para texto plain (já existe no `ShareButton` provavelmente) |
| Trait rename quebra string-search em testes | Audit `grep -r "Conflito\|Paz\|Passivo\|Agressivo\|Calculista\|Impulsivo\|Invisivel\|Dominante\|Apegado\|Desapegado"` antes do rename, atualizar consumers |

## 7. Próximos passos (após F5b.1)

- F5b.2 — **Evolução**: detectar transição A → B de archetype.id, mostrar mini-timeline "você era X, virou Y"
- F5b.3 — **Season finale**: Spotify-Wrapped-style ao terminar season
- F5c (opcional) — refatorar `LevelUpCeremony` pra usar Card+Badge+Ring (YAGNI até precisar)
