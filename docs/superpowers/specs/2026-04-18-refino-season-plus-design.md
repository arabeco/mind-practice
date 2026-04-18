# Refino de perguntas + Season System + Plus

**Data:** 2026-04-18
**Status:** Design aprovado, aguardando spec review

## Objetivo

Elevar o core loop de MindPractice em três frentes simultâneas, amarradas num único ciclo de produto:

1. **Refino de perguntas** — reescrita guiada por princípios psicométricos (outro ambíguo) e imersão (mini-dossiê de personagem), mais uma engine de pesos contextuais que corrige o "vigor inflado" atual.
2. **Season System** — raridade de deck (comum / raro / épico / lendário / campanha), preço em fichas, padrão fixo de lançamento a cada 2 meses, tema por season.
3. **MindPractice Plus** — assinatura mensal (R$14,90) que destrava todos os decks da season atual e bônus de economia.

O artefato final é um app que (a) calibra arquétipo com precisão, (b) tem ritual de lançamento calendarizado que dá sensação de "colecionar cenas", e (c) monetiza de dois jeitos (fichas avulsas + Plus).

## Escopo

- **Incluído:** novos tipos, UI de raridade, economia ajustada, estrutura de season, engine contextual, template de cena, Plus subscription (modelo + UI + posse). Inclui refinamento da Season 0 (12 decks existentes) no novo padrão.
- **Incluído (dependente):** IAP (Stripe ou MercadoPago) pra pacotes de fichas e Plus — fase final.
- **Fora de escopo:** FCM / push nativo Capacitor (já em outro track). Multi-language. Cross-device sync além do que já existe.

## Princípios de design

### P1 — Outro ambíguo, nunca pré-julgado

Se a cena já frames o outro como "cuzão" ou "otário", a resposta vira reação a injustiça e não mede o jogador. Toda cena default deve deixar o outro com traços sem rótulo moral.

**Exceção controlada:** cenas explicitamente sobre limite moral (ex: comentário preconceituoso, abuso evidente) mantêm o outro errado, mas a medida vai pra **como** o jogador marca (voz alta / irônico / silencioso / privado depois / não marca), não se marca.

### P2 — Mini-dossiê por cena

1 slide de contexto antes do evento, descrevendo o outro (quem é, histórico, como age) em 2-4 frases neutras. Dá ao jogador espaço pra formar leitura própria antes da pergunta.

### P3 — Pesos contextuais (engine)

A mesma ação vale pesos diferentes dependendo de `relacao`, `aposta`, `pilar`, `tensao`. Corrige o bug atual onde "confronto direto" sempre dá +3 vigor, independente do contexto, inflando vigor.

### P4 — Timeout não recompensa vigor

Hoje respostas rápidas/em tempo recebem boost de vigor implícito. Remover: se o jogador estourar o tempo ou demorar muito, aquela resposta específica tem weight × 0.3 (ou 0), sem afetar vigor global.

## Modelo de dados

### Deck

```ts
type Rarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'campanha';

interface Deck {
  // ... campos existentes
  rarity: Rarity;
  seasonId: string;          // 'season-0' | 'season-1' | ...
  priceFichas: number | null; // null = grátis (calibragem, campanhas promocionais)
  plusOnly?: boolean;         // se true, só via Plus (não compra avulsa)
}
```

`tier` (1-6) continua existindo por compatibilidade mas deprecado; raridade passa a ser o eixo visível.

### GameState

```ts
interface GameState {
  // ... existente
  ownedDeckIds: string[];
  plusSubscription: {
    active: boolean;
    expiresAt: string | null; // ISO
    startedAt: string | null;
  } | null;
}
```

### Actions

- `UNLOCK_DECK { deckId, cost }` — verifica saldo, deduz fichas, adiciona a `ownedDeckIds`.
- `SET_PLUS_STATUS { active, expiresAt, startedAt }` — atualiza estado (chamado via webhook de IAP).

### Decks de calibragem

Categoria `calibragem` fica fora do sistema de raridade. São sempre grátis, sempre acessíveis, não entram na contagem de season. Servem de onboarding.

## Cores e UI

| Raridade | Cor base | Card |
|---|---|---|
| Comum | `slate-300` | borda simples |
| Raro | `sky-400` | borda + glow azul suave |
| Épico | `violet-500` | borda + glow roxo animado |
| Lendário | `amber-400` | borda dourada + shimmer + particles |
| Campanha | `rose-700` | borda vinho + ícone de livro |

**Deck locked**: card em escala de cinza com botão "Desbloquear por {N} fichas". Lendário = botão dourado com shimmer.

**Deck Plus-only (sem ownership)**: card em cor da raridade com overlay + badge "Plus". Botão "Torne-se Plus".

**Deck owned**: card em cor da raridade, sem overlay, botão "Jogar".

## Economia

### Fontes (ajustadas)

| Fonte | Antes | Depois |
|---|---:|---:|
| Piso por run | 2 | **3** |
| Cap por dia | 5 runs | 5 runs |
| 1ª run do dia | +3 | **+5** |
| Streak 7 dias | — | **+20** |
| Completar deck novo (1ª vez) | — | **+15** |
| Campanha ending | +30 | **+40** |
| Friend accept | +5 | +5 |
| Skip cooldown | −10 | −10 |

Constantes em `src/types/game.ts`:
```ts
export const RUN_PISO_FICHAS = 3;
export const FIRST_RUN_BONUS = 5;
export const STREAK_7_BONUS = 20;
export const DECK_FIRST_TIME_BONUS = 15;
export const CAMPAIGN_ENDING_BONUS = 40;
```

**Grind realista:** ~20 fichas/dia em jogador diário, ~700/mês.

### Preços

| Raridade | Preço | Grind solo |
|---|---:|---|
| Comum | 60 | 3 dias |
| Raro | 150 | 8 dias |
| Épico | 350 | 18 dias |
| Lendário | 800 | 40 dias |
| Campanha | 100 (ou 0 em seasons promocionais) | ~5 dias |

**Season completa avulsa:** 3×60 + 3×150 + 2×350 + 800 + 100 = **2.430 fichas** (~4 meses solo).

## MindPractice Plus

### Preço e benefícios

**R$14,90/mês.**

Benefícios ativos enquanto a assinatura está ativa:

1. Acesso a **todos os decks da season atual + Season 0** (exceto `plusOnly` de outras seasons).
2. **+10 fichas/dia** como bônus de login (claim diário).
3. **1 skip de cooldown grátis/dia** (além disso, pago com fichas como hoje).
4. **Badge "Plus"** no perfil (visível no feed).
5. **Cena lendária mensal exclusiva** — rotativa, só assinantes jogam. Quem cancela perde acesso à próxima.
6. **Cor especial de nickname** no feed/perfil.

### Modelo de posse

- **Comprou avulso com fichas** → deck fica na conta pra sempre (`ownedDeckIds`), mesmo se cancelar Plus.
- **Plus** destrava temporariamente. Cancelou → decks não-comprados voltam a locked. Fichas acumuladas continuam.
- **Campanha** da season fica barata (100 fichas) ou grátis em seasons promocionais — garantia de que todo jogador joga a história principal.

### Racional econômico

- 1 season avulsa = 2.430 fichas ≈ R$25-30 (estimando pacotes de fichas).
- Plus = R$14,90. Quem assina 1 mês por season gasta metade vs avulso e ganha benefícios extra.
- Grind solo continua viável pra quem não quer assinar: 4 meses = 1 season completa.

## Estrutura de Season

### Padrão fixo

**10 decks por season** (fora calibragem):
- 3 Comuns
- 3 Raros
- 2 Épicos
- 1 Lendário
- 1 Campanha

### Cadência

**1 season a cada 2 meses.** Calendar-driven (ex: Season 1 fev-mar, Season 2 abr-mai).

### Tema

Cada season tem mote coeso. Ex:
- Season 0 (retrofit): temas variados dos decks existentes.
- Season 1: "Trabalho & Autoridade"
- Season 2: "Amor & Lealdade"
- Season 3: "Dinheiro & Família"

A Lendária + a Campanha da season são conectadas tematicamente.

### Season 0 (retrofit)

Os 12 decks atuais:
- **Calibragem (fora de raridade, grátis sempre):** candidatos por `category: 'calibragem'` ou `format: 'quick'` — lista a confirmar (provavelmente basic_01, espelho, escolha, limite, mascara, roda, teste).
- **Com raridade aplicada:** os decks de experiência restantes — provavelmente `alta_tensao`, `social`, `profissional`, `holofote` (4 decks normais) + `livro_amaldicoado` (1 campanha).
- **Trabalho de retrofit:** aplicar refino (dossiê + ambiguidade + pesos contextuais) em todos os decks não-calibragem, classificar raridade individualmente por densidade narrativa atual, setar `priceFichas`.

**Nota importante:** Season 0 **não segue o padrão 3C/3R/2É/1L/1Campanha** — ela é retrofit do que já existe. Provavelmente resulta em algo como 2 Raros + 1 Épico + 1 Lendário + 1 Campanha (ou distribuição similar), dependendo da avaliação. Season 0 existe pra não jogar fora o conteúdo atual; o padrão fixo começa a valer na **Season 1**.

Durante o retrofit, decks recebem o template de slide completo (contexto/dossiê + evento + pergunta), mesmo que hoje só tenham 1 slide.

## Engine de pesos contextuais

### Problema atual

Toda opção "direta/pragmática" nos decks atuais dá `vigor: +3`, toda alternativa dá `vigor: -1` ou `-2`. Com `INTENSITY_MULTIPLIERS.alta = 1.35`, jogador que sempre escolhe direto satura vigor.

### Solução

Em vez de weights fixos, opção declara **intenção + risco**, e engine calcula weights finais aplicando modificadores contextuais baseados na `metadata` da cena.

```ts
// Na opção:
interface Option {
  text: string;
  subtext: string;
  tone: Tone;
  intent: OptionIntent;   // 'confronto_publico' | 'confronto_privado' | 'retirada' | ...
  risk: Aposta | null;    // o que você arrisca ao escolher
  baseWeights: Partial<Record<StatKey, number>>; // leve, simétrico
  feedback: string;
  aftermath?: string;
}
```

### Modifiers (exemplos)

```ts
// Tabela de modifiers: (intent, metadata) -> delta weights
const CONTEXT_MODIFIERS = {
  confronto_publico: {
    'relacao=Autoridade,aposta=Status':  { vigor: +1, filtro: -1 },
    'relacao=Par,aposta=Paz Emocional':  { vigor:  0, harmonia: -1 },
    'relacao=Desconhecido':              { vigor: -1, presenca: +1 },
  },
  retirada: {
    'tensao>=4':                         { desapego: +1, vigor: -1 },
    'aposta=Paz Emocional':              { harmonia: +1 },
  },
  // ...
};
```

Engine aplica: `finalWeights = baseWeights + modifiers[intent][metadataKey] * intensityMultiplier`.

### Migração dos decks

Decks refatorados usam `intent + baseWeights`. Decks não-refatorados continuam com `weights` fixo (compatibilidade). Helper engine trata os dois casos.

### Timeout/demora

Nova regra: se `responseTimeMs > threshold` (ex: 30s) ou `timedOut`, weight da opção é multiplicado por 0.3 (ou 0 se timedOut absoluto). Não afeta outras respostas da run.

## Template de cena refinada

```json
{
  "id": "q1",
  "type": "NORMAL",
  "sceneHook": "Reuniao com cliente, colega te corta",
  "metadata": {
    "tensao": 4,
    "ambiente": "Profissional",
    "relacao": "Par",
    "aposta": "Status",
    "pilar": "ego",
    "plateia": "cliente + equipe",
    "urgencia": "alta"
  },
  "slides": [
    {
      "tipo": "contexto",
      "texto": "Marina trabalha com voce ha 2 anos. E rapida, entrega no prazo, raramente pede ajuda. Tem opiniao sobre tudo - as vezes util, as vezes cansativa. Voce nunca soube se gosta dela ou nao."
    },
    {
      "tipo": "evento",
      "texto": "Reuniao de quinta, cliente presente. Voce apresenta uma proposta. No meio, Marina te corta: 'acho que esse caminho nao funciona'. Fala sem olhar pra voce. O cliente olha."
    }
  ],
  "options": [
    {
      "text": "Concordo com ela na hora.",
      "subtext": "Parte comigo",
      "tone": "neutro",
      "intent": "retirada",
      "risk": "Status",
      "baseWeights": { "harmonia": 2, "presenca": -1 },
      "feedback": "Voce cede o palco e segue a reuniao."
    },
    {
      "text": "Peço licenca e continuo minha linha.",
      "subtext": "Mantem o fio",
      "tone": "pragmatico",
      "intent": "confronto_publico",
      "risk": "Status",
      "baseWeights": { "vigor": 2, "filtro": 1 },
      "feedback": "Voce nao deixa a reuniao virar o ponto dela."
    },
    {
      "text": "Convido ela a conversar depois, em privado.",
      "subtext": "Resolve fora",
      "tone": "protetor",
      "intent": "confronto_privado",
      "risk": null,
      "baseWeights": { "filtro": 2, "harmonia": 1 },
      "feedback": "Voce protege o cliente e marca espaco."
    }
  ]
}
```

## Fases de implementação

### Fase 1 — Fundação (3-4 dias)

- Tipos novos (`rarity`, `seasonId`, `priceFichas`, `plusOnly`, `ownedDeckIds`, `plusSubscription`)
- Constantes de economia atualizadas
- Actions `UNLOCK_DECK`, `SET_PLUS_STATUS`, `CLAIM_DAILY_PLUS_BONUS`
- UI de raridade (cores, glow, estados locked/owned/plusOnly)
- Tela de detalhe de deck com preço e botão contextual
- Classificar Season 0 (separar calibragem, aplicar raridade e preço nos de experiência)

### Fase 2 — Engine narrativa (3-4 dias)

- Estrutura de `Option` com `intent + baseWeights`
- Tabela `CONTEXT_MODIFIERS`
- Helper `resolveWeights(option, sceneMetadata, intensity, responseTimeMs)`
- Timeout penalty
- Template de 2 slides (contexto/dossiê + evento) em decks refatorados
- Refino dos 5 decks de experiência da Season 0 (retrofit): ambiguidade + dossiê + pesos contextuais

### Fase 3 — Season 1 (5-7 dias)

- Definir tema (sugestao: "Trabalho & Autoridade")
- Escrever 3 Comuns + 3 Raros + 2 Épicos + 1 Lendário + 1 Campanha no padrão novo
- Tela "Nova Season!" no `/decks` (destaque da campanha e da lendária)
- Push opt-in pra lançamento (aproveita infra existente)

### Fase 4 — Plus + IAP (4-5 dias)

- Integração IAP (Mercado Pago com Pix preferido pelo BR)
- Edge Function `process-payment-webhook` que credita fichas ou ativa Plus
- UI "Torne-se Plus" + comparativo visual
- Tela de pacotes de fichas (4 tiers)
- Claim diário Plus (+10 fichas)
- Badge Plus no perfil e feed

## Riscos e mitigações

- **Refatorar engine de pesos quebra decks existentes** → manter helper que aceita tanto `weights` fixo quanto `intent + baseWeights`, migrar deck a deck.
- **Preços muito duros frustram free user** → já ajustado pra "generoso", monitorar taxa de desbloqueio pós-lançamento.
- **Plus canibaliza compra avulsa** → posse permanente de compra avulsa garante valor distinto.
- **Escrever 10 decks refinados é muito trabalho** → pipeline pode ser colaborativo: brainstorming de cenas + escrita guiada por template + revisão em par. Dá pra usar Season 1 como lançamento staged (primeiro os raros, depois lendária/campanha).

## Critério de sucesso

- Engine contextual: opção "confronto direto" não gera mais vigor saturado em runs variadas (testar com 3 perfis de jogador).
- Plus: ≥30% dos jogadores ativos assinam dentro de 2 seasons.
- Retenção D7 sobe ≥10% após Season 1 vs baseline atual.
- Share rate de ending cards sobe (indicador de qualidade narrativa).

## Decisões pendentes

1. Nomes oficiais da Season 1 (tema, título, nome da lendária e da campanha).
2. Gateway de pagamento definitivo (MercadoPago com Pix vs Stripe).
3. Validação de quais decks da Season 0 são calibragem (critério atual: `format: 'quick'` + `category: 'calibragem'`).
4. Se tela "Nova Season!" é modal obrigatório ou só destaque no /decks.
