# Sistema de Categorias, Campanhas e Calibragem — Design Doc

**Date:** 2026-04-07
**Goal:** Definir os tipos de deck, formato de campanha com branching narrativo, sistema de seasons, calibragem com multiplicador de tensão, e economia de fichas nos decks grátis.

---

## 1. Tipos de Deck

| Tipo | Propósito | Cenas | Replay | Preço |
|------|-----------|-------|--------|-------|
| **calibragem** | Mapear perfil nos 5 eixos | 10 | Sim | Grátis |
| **eixo** | Treinar 1 eixo específico | 5-6 | Sim | 10-15 fichas |
| **cenario** | Situação temática | 5-8 | Sim | 15-35 fichas |
| **campanha** | História com branching, 7 dias | 20 (vê 7) | **Não** | 40-60 fichas |

### Calibragem (grátis)

- 7 decks de calibragem × 10 cenas = 70 respostas totais
- 35% de precisão ao completar todos (70/200)
- Cobrem TODOS os 5 eixos equilibradamente
- Misturam cenários completos com perguntas diretas de calibragem
- Perguntas diretas: 1 linha, sem contexto, tipo "Alguém te ofende no jantar. Você revida ou guarda pra depois?"
- Cada deck de calibragem garante que cada eixo aparece como dominante em pelo menos 20% das opções

### Eixo (pago)

- Treina 1 eixo específico (vigor, harmonia, filtro, presença, desapego)
- 5-6 cenas focadas
- Exemplo: "Holofote" treina presença

### Cenário (pago)

- Tema específico (carreira, família, dates, etc.)
- 5-8 cenas dependendo do tema
- Multi-eixo, mede tudo

### Campanha (pago, premium)

- Ver seção 3 abaixo

---

## 2. Economia de Fichas nos Grátis

O jogador que completar todos os 7 decks de calibragem deve ter fichas suficientes para comprar 1-2 decks pagos.

| Fonte | Fichas |
|-------|--------|
| Completar 1 deck de calibragem | 5 fichas |
| Bônus primeiro deck do dia | 3 fichas |
| Bônus sem timeout | 5 fichas |
| Bônus streak semanal (7 dias) | 20 fichas |
| Claim diário | 10 fichas/dia |

**Estimativa com 7 decks + 7 dias de claims:**
- 7 decks × 5 = 35
- 7 × claim diário = 70
- 7 × bônus dia = 21
- Bônus streak = 20
- **Total: ~146 fichas**

Isso compra ~2 decks eixo (10-15) ou 1 cenário (15-35) + 1 eixo. Suficiente para experimentar conteúdo pago e querer mais.

---

## 3. Formato da Campanha

### Estrutura da Árvore (20 cenas, 7 dias, 4 finais)

```
Dia 1: [start]                                    → 1 cena
Dia 2: [ramo_a] [ramo_b]                          → 2 cenas
Dia 3: [a_deep] [mid] [b_deep]                    → 3 cenas
Dia 4: [a2] [mid_a] [b2]                          → 3 cenas
Dia 5: [r1] [r2] [r3]                             → 3 cenas
Dia 6: [pre_f1] [pre_f2] [pre_f3] [pre_f4]        → 4 cenas
Dia 7: [final_1] [final_2] [final_3] [final_4]    → 4 finais
                                                     ──────
                                                     20 cenas
```

### Regras da Campanha

- **1 cena por dia** — desbloqueia no dia seguinte (checa lastPlayedDate)
- **Sem replay** — completou, acabou. Quer outra? Próxima campanha.
- **4-5 opções por cena** — medem eixos normalmente
- **2-3 ramos de saída por cena** — múltiplas opções podem apontar pro mesmo ramo
- **4 finais** — cada um com epílogo narrativo (3-4 frases)
- **Variação temporal** — nem toda cena é "reaja agora":
  - "Dois dias passaram. Silêncio total. Aí chega uma mensagem."
  - "Você acorda e vê 14 notificações no grupo."
  - "Na segunda-feira, cruzam no corredor. Ele finge que nada aconteceu."
  - "Passaram 3 dias. Você pensou que tinha acabado."
- **Se perder um dia** — cena acumula (não reseta), mas perde bônus de streak

### Como opções viram ramos

4-5 opções → 2-3 ramos. Múltiplas opções apontam pro mesmo nó:

```
Opção A (vigor +3)     → nextNodeId: "c2_confronto"
Opção B (vigor +2)     → nextNodeId: "c2_confronto"     ← mesmo ramo
Opção C (harmonia +3)  → nextNodeId: "c2_diplomacia"
Opção D (desapego +3)  → nextNodeId: "c2_distancia"
Opção E (filtro +2)    → nextNodeId: "c2_diplomacia"     ← mesmo ramo
```

### Resultado da Campanha

Ao completar dia 7:
- Vê o final narrativo (epílogo)
- Vê o resumo do caminho percorrido (timeline dos 7 dias)
- Eixos contam pro perfil global (como qualquer deck)
- Campanha marcada como completed, nunca mais jogável

---

## 4. Modelo de Dados

### CampaignNode (novo)

```typescript
interface CampaignNode {
  id: string;                    // "c1_start", "c2_confronto", etc.
  day: number;                   // 1-7
  slides: Slide[];               // contexto + evento (mesmo formato)
  options: CampaignOption[];     // 4-5 opções
  isFinal?: boolean;             // true nos 4 nós do dia 7
  finalText?: string;            // epílogo (só dia 7)
  finalTitle?: string;           // nome do final (ex: "O Confronto")
}

interface CampaignOption extends Option {
  // herda: text, subtext, tone, weights, feedback
  nextNodeId: string;            // qual node vem depois
}
```

### CampaignDeck (extensão de Deck)

```typescript
interface CampaignDeck {
  deckId: string;
  name: string;
  description: string;
  tema: string;
  category: 'campanha';
  tier: number;
  difficulty: number;
  nodes: CampaignNode[];        // 20 nodes (árvore)
  startNodeId: string;          // "c1_start"
  totalDays: 7;
}
```

### ActiveCampaign (estado no GameContext)

```typescript
// Novo campo no GameState
activeCampaign?: {
  deckId: string;
  currentNodeId: string;         // onde está na árvore
  day: number;                   // dia atual (1-7)
  lastPlayedDate: string;        // ISO date
  pathHistory: string[];         // IDs dos nodes visitados
  completed: boolean;
};
```

### Deck normal (sem mudanças estruturais)

Os tipos calibragem, eixo e cenário continuam com `questions: Question[]` linear. A única mudança é o validator aceitar 5-10 questões em vez de fixo 10.

---

## 5. Multiplicador de Tensão na Calibragem

### Problema

Xingar alguém numa biblioteca (tensão 5) e ser assertivo numa reunião (tensão 2) hoje dão o mesmo peso "vigor +3". Mas são sinais completamente diferentes.

### Solução

Multiplicar os pesos pelo nível de tensão da cena:

```typescript
const tensionMultiplier = 0.5 + (metadata.tensao * 0.5);
// tensao 1 → 1.0x
// tensao 2 → 1.5x
// tensao 3 → 2.0x
// tensao 4 → 2.5x
// tensao 5 → 3.0x
```

Aplicado ANTES do dampening:

```typescript
// Em applyDampenedWeights, antes de aplicar:
for (const key of STAT_KEYS) {
  const w = weights[key];
  if (w !== undefined) {
    const adjustedW = w * tensionMultiplier;
    newAxes[key] = newAxes[key] + adjustedW / divisor;
  }
}
```

### Impacto

| Ação | Tensão | Peso base | Peso real |
|------|--------|-----------|-----------|
| Firme na reunião | 2 | vigor +3 | vigor +4.5 |
| Calmo com tio gritando | 4 | harmonia +3 | harmonia +7.5 |
| Xingar na biblioteca | 5 | vigor +3 | vigor +9 |
| Gentil no café | 1 | harmonia +2 | harmonia +2 |

Escolhas extremas em contextos extremos geram sinais fortes. Escolhas normais em contextos normais geram sinais suaves. **Aproxima-se da verdade mais rápido.**

### Onde aplicar

Na função `applyDampenedWeights` do GameContext. Precisa receber o `tensao` da questão como parâmetro.

---

## 6. Sistema de Seasons

### Estrutura

Cada season lança ~5 decks com mix de tipos:

| Componente | Qtd | Exemplo Season 1 "Relações" |
|------------|-----|------|
| Eixo | 1-2 | "O Fio" (harmonia), "O Vento" (desapego) |
| Cenário | 1-2 | "Primeiro Encontro" (dates), "Mesa de Família" |
| Campanha | 1 | "A Separação" (7 dias, branching) |

### Base atual (pré-seasons)

| Deck | Tipo (novo) | Status |
|------|-------------|--------|
| O Despertar | calibragem | ✅ existente (converter) |
| Holofote | eixo | ✅ existente (converter) |
| Arena Profissional | cenário | ✅ existente |
| Alta Tensão | cenário | ✅ existente |
| Círculos Sociais | cenário | ✅ existente |
| O Livro Amaldiçoado | campanha | ✅ existente (converter pra branching) |
| + 6 novos de calibragem | calibragem | 🆕 criar |

### Geração de conteúdo

Usa o deck generator CLI (já criado):
1. Claude escreve o JSON (linear ou campanha)
2. `npm run deck:validate` checa regras
3. `npm run deck:register` registra no app

Para campanhas, o validator adicional checa:
- 20 nodes no total
- 1 startNodeId válido
- Todos os nextNodeId apontam pra nodes existentes
- Exatamente 4 nodes com isFinal=true
- Cada dia tem o número correto de nodes (1,2,3,3,3,4,4)
- Sem nodes órfãos (todos alcançáveis a partir do start)

---

## 7. Mudanças no Validator

### Decks lineares (calibragem, eixo, cenário)

- Aceitar 5-10 questões (em vez de fixo 10)
- Remover regra de distribuição de tipos (7N+1R+1S+1T) — todas NORMAL
- Manter regras de word count e trade-off de pesos

### Calibragem específico

- Checar que cada eixo aparece como dominante em pelo menos 20% das opções

### Decks campanha

- 20 nodes
- Grafo válido (sem ciclos, sem órfãos)
- 4 finais com finalText
- Cada opção tem nextNodeId válido
- Dias 1-7 com distribuição correta (1,2,3,3,3,4,4)

---

## 8. Mudanças no App (UI/UX)

### Aba Decks

- Novo filtro/tab por tipo: Calibragem | Eixo | Cenário | Campanha | Loja
- Campanhas mostram "7 dias" badge e "Sem replay" warning

### Play screen (campanha)

- Mesmo SceneTextStage + SceneOptionsStage
- Ao completar cena do dia: "Próxima cena amanhã" (bloqueio temporal)
- Progress bar mostra dia X/7
- Se já jogou hoje: mostra "Volte amanhã" com countdown

### Resultado (campanha)

- Mostra qual final alcançou (título + epílogo)
- Timeline dos 7 dias com nodes visitados
- Badge especial do final no perfil

### Home

- Campanha ativa aparece como card prioritário: "Dia 3/7 — Continue sua história"

---

## Resumo de Implementação

| Mudança | Impacto | Prioridade |
|---------|---------|------------|
| Multiplicador de tensão | 1 linha no reducer | Alta (melhora calibragem imediatamente) |
| Validator: 5-10 questões | Pequena mudança | Alta |
| Tipo `category` expandido | Tipo + UI | Média |
| Modelo CampaignNode | Novo tipo + reducer | Média |
| Play screen campanha | Nova lógica de bloqueio temporal | Média |
| Criar 6 decks de calibragem novos | Conteúdo | Alta |
| Converter Livro Amaldiçoado pra campanha | Conteúdo | Baixa (pode ser Season 1) |
