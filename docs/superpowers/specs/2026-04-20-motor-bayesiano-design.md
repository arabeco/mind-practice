# Motor Bayesiano de Calibração — Design Spec

**Data:** 2026-04-20
**Status:** Aprovado para implementação
**Substitui:** Motor somatório da Fase 2 (CONTEXT_MODIFIERS + resolveWeights)

---

## Visão Geral

Migrar o motor de calibração do MindPractice de **somatório de pesos** para **atualização bayesiana de crença** (IRT — Item Response Theory). Cada resposta do jogador vira **evidência** sobre o valor latente de cada eixo, não mais um incremento acumulado.

Benefícios diretos:
- Estabilidade: 100 respostas consistentes convergem para o valor real com alta confiança; mais respostas só apertam a certeza, não inflacionam o stat
- Gaming resistance: jogador não consegue "stat up" jogando deck-alvo repetidamente
- Drift natural: quando o jogador muda comportamento, o sistema acompanha organicamente
- Transparência calibrada: app comunica quanto conhece o jogador ("te conheço bem" vs "ainda descobrindo")

---

## 1. Modelo Matemático

### Representação interna de cada eixo

Cada um dos 5 eixos (`vigor`, `harmonia`, `filtro`, `presenca`, `desapego`) é representado como uma **distribuição discreta sobre [0,1] em 10 bins**:

```ts
type AxisBelief = {
  bins: number[];        // length 10, sums to 1.0 — P(θ = bin_i)
  observations: number;  // count of evidence entries so far
  lastUpdated: string;   // ISO timestamp for decay calculations
};
```

Bins representam faixas do trait latente θ: `[0.0-0.1, 0.1-0.2, ..., 0.9-1.0]`. A crença inicial (prior) é uniforme: cada bin = 0.1.

### Evidência numa opção (schema)

Cada `Option` carrega `evidence` em vez de `baseWeights`:

```ts
type OptionEvidence = Partial<Record<StatKey, AxisEvidence>>;

type AxisEvidence = {
  min?: number;        // threshold inferior: quem escolhe isso, P(θ ≥ min) é alta
  max?: number;        // threshold superior: quem escolhe isso, P(θ ≤ max) é alta
  confidence: number;  // força da evidência [0.5, 0.99], default 0.75
};
```

Exemplo (d7_a Opt 1 — "Abre com dados, deixa números falarem"):
```json
{
  "evidence": {
    "filtro":   { "min": 0.70, "confidence": 0.85 },
    "vigor":    { "min": 0.55, "confidence": 0.70 },
    "harmonia": { "max": 0.40, "confidence": 0.75 }
  }
}
```

Semântica: "quem escolhe isso tem filtro alto (≥0.70 com 85% certeza), vigor moderado/alto (≥0.55 com 70%), e harmonia baixa (≤0.40 com 75%)."

### Regra de atualização bayesiana

Para cada eixo mencionado em `evidence`, calcular likelihood `P(resposta | θ)` por bin, e aplicar Bayes:

```
posterior(bin_i) ∝ prior(bin_i) × likelihood(resposta | θ = centro(bin_i))
```

Onde a likelihood depende dos thresholds da evidência:
- Se `min` definido: likelihood alta nos bins acima de `min`, baixa abaixo
- Se `max` definido: likelihood alta abaixo de `max`, baixa acima
- `confidence` controla quão íngreme é a transição (aka discriminação na IRT)

Depois normaliza (soma dos bins = 1) e a crença fica atualizada. Incrementa `observations`.

**Confiança do jogador num eixo** = 1 - entropia_normalizada da distribuição. Uniforme = 0, pico num bin = 1.

### Decaimento temporal (drift)

Antes de aplicar Bayes numa nova resposta, aplica-se **achatamento suave** na crença existente:

```
beliefAged(bin_i) = (1 - α) × beliefPrevious(bin_i) + α × uniform(0.1)
```

Onde α cresce com o tempo desde `lastUpdated` (exemplo: α = 0.02 por semana, até no máximo 0.5 após muitos meses sem jogar). Isso faz respostas recentes pesarem mais naturalmente, sem descartar histórico. Crenças antigas não somem, só amolecem para permitir re-estimativa.

Parâmetros (ajustáveis em config):
- `driftRatePerWeek: 0.02`
- `driftMax: 0.5`

---

## 2. Autoria de Evidência

### Como autores (IA) escrevem `evidence` em cada opção

Regra prática para a IA que escreve decks:
- **θ ≥ 0.75** = "muito alto" / "característico desse traço"
- **θ ≥ 0.60** = "alto"
- **θ ≤ 0.40** = "baixo"
- **θ ≤ 0.25** = "muito baixo"
- `confidence: 0.80` = escolha diagnóstica clara desse eixo
- `confidence: 0.70` = evidência moderada
- `confidence: 0.60` = tendência fraca (usar com parcimônia)

Cada opção deve declarar entre 1 e 3 eixos — mais que isso dilui o sinal. Uma opção sem `evidence` é válida (neutra: não atualiza nada), mas deve ser rara.

### Trade-off obrigatório permanece

Uma opção não pode declarar `evidence` só com `min` em todos os eixos (seria "você é alto em tudo"). Pelo menos uma dimensão deve ser oposta (um `min` e um `max`, ou combinação similar). Validator aplica a regra.

### Migração do conteúdo existente (decks Season 0 e 1)

22 decks já escritos em formato `baseWeights`. Migração via script + passagem de IA:

1. **Conversão automática** (`scripts/migrate-to-evidence.ts`):
   - `baseWeights: {x: +2}` → `evidence: {x: {min: 0.60, confidence: 0.70}}`
   - `baseWeights: {x: +3}` → `evidence: {x: {min: 0.75, confidence: 0.80}}`
   - `baseWeights: {x: -2}` → `evidence: {x: {max: 0.40, confidence: 0.70}}`
   - `baseWeights: {x: -3}` → `evidence: {x: {max: 0.25, confidence: 0.80}}`
   - `+1`/`-1` convertem para confidence 0.60 (sinal fraco)
2. **Passagem de IA supervisionada**: cada deck revisado por subagente que lê o texto da opção e refina a evidência pra casar com a semântica real (corrigindo bugs identificados na Fase 2: filtro overloaded, desapego com dupla semântica, d7 pesado demais)
3. Campo legado `baseWeights` removido em commit final

---

## 3. Arquétipos

### Assinatura e matching

Arquétipos mantêm o formato atual (`idealProfile: Record<StatKey, number>` com valores em [0,1]). Matching fica por distância euclidiana entre o **valor central de cada distribuição do jogador** (média dos bins ponderada) e o `idealProfile` de cada arquétipo.

```ts
function playerMean(belief: AxisBelief): number {
  return belief.bins.reduce((sum, p, i) => sum + p * (i + 0.5) / 10, 0);
}

function distanceToArchetype(player: PlayerProfile, a: Archetype): number {
  return Math.sqrt(
    STAT_KEYS.reduce((acc, key) => {
      const diff = playerMean(player.beliefs[key]) - a.idealProfile[key];
      return acc + diff * diff;
    }, 0)
  );
}
```

### Primário e secundário

- **Primário** = arquétipo com menor distância
- **Secundário** = arquétipo com segunda menor distância, **desde que a distância seja < 1.3× a do primário**. Se o secundário estiver muito longe, não exibir — só primário.
- UI separa: "Arquétipo primário: Rebelde" em destaque, "Secundário: Soberano" como linha secundária

### Gate de confiança global

Arquétipo só é exibido com nome firme quando **confiança média dos 5 eixos** ≥ 0.6 (ou seja, distribuições suficientemente concentradas). Abaixo disso:

- < 0.3: "Ainda te conhecendo..." (sem arquétipo)
- 0.3–0.6: "Começando a ver padrão — você parece tender a {top1}" (hipótese, sem commitment)
- ≥ 0.6: Arquétipo firme exibido com primário + secundário

---

## 4. UI — Comunicação da Incerteza

### Perfil do jogador (`/perfil`)

Stats exibidos como radar + barra de precisão por eixo. A barra preenche conforme a confiança daquele eixo sobe. Label qualitativo abaixo:

- Confiança < 0.3: barra vazia, label "ainda calibrando"
- Confiança 0.3-0.6: barra parcial, label "aproximando"
- Confiança > 0.6: barra cheia, label "estável"

Abaixo do radar, um texto unificado descreve o estado: "Mindpractice te conhece bem" (média de confiança alta), "Começando a entender você" (média), "Ainda descobrindo" (baixa).

### Resultado de run (`/resultado/[deckId]`)

Mostra:
- Stats do jogador antes da run
- Evidência aportada por cada resposta desta run (o que cada escolha revelou)
- Delta resultante na crença (intervalos de confiança que apertaram, shifts de arquétipo)
- Arquétipo primário + secundário atualizado (se passar do gate de confiança)

### Reaproveitamento

A barra de precisão e o radar atual (`MiniRadar.tsx`) são reusados com interpretação nova — preenchimento = confiança, não valor absoluto. Economiza trabalho de UI.

---

## 5. Decks de Treino

### Flag de deck

```ts
interface Deck {
  // ... existing fields
  isTraining?: boolean;      // marca deck como treino
  trainingTarget?: StatKey;  // opcional: eixo-foco do treino
}
```

### Comportamento no engine

Quando `isTraining === true`:
- Run roda normalmente, engine calcula o que seria o delta
- **Delta NÃO é aplicado ao perfil persistente**
- Tela de resultado mostra: "Nessa run você foi {percentage}% {trainingTarget}" + "Se esse fosse seu perfil base, você seria {arquétipo}" (hipotético)
- Nenhuma persistência no `PlayerProfile`. Opcional: log em histórico separado só pra mostrar "você fez N treinos de vigor este mês" (feature futura, não no MVP).

### Validação

Deck marcado `isTraining: true` deve ter pelo menos 60% das opções com evidência no `trainingTarget` (validator). Garante que o deck foca o que promete treinar.

---

## 6. Escopo Técnico

### Arquivos a criar

- `src/lib/bayesEngine/belief.ts` — tipos `AxisBelief`, `PlayerProfile` bayesiano, funções de update
- `src/lib/bayesEngine/evidence.ts` — tipo `OptionEvidence`, likelihood, Bayes update
- `src/lib/bayesEngine/drift.ts` — achatamento temporal
- `src/lib/bayesEngine/archetype.ts` — matching top-1/top-2, gate de confiança, label qualitativo
- `src/lib/bayesEngine/__tests__/` — testes unitários (prior, likelihood, update, decay, matching)
- `scripts/migrate-to-evidence.ts` — conversão mecânica dos 22 decks existentes

### Arquivos a modificar

- `src/types/game.ts` — deprecar `baseWeights`, adicionar `evidence`, `isTraining`, `AxisBelief`
- `src/data/decks/*.json` — 22 arquivos migrados (script + revisão IA)
- `src/lib/runScoring.ts` — usar Bayes update em vez de soma
- `src/lib/narrativeEngine/resolveWeights.ts` — aposentar (ou renomear para camada legado temporária)
- `src/lib/narrativeEngine/contextModifiers.ts` — aposentar; modifier passa a ser embutido na evidência
- `src/data/archetypes.ts` — sem mudança de schema, só de matching
- `src/context/GameContext.tsx` — trocar `stats` por `beliefs`
- `src/components/MiniRadar.tsx` — reinterpretar preenchimento como confiança
- `src/components/ProfileCardCompact.tsx` — label qualitativo
- `src/components/RunReportCard.tsx` — mostrar evidência por resposta
- `src/app/perfil/page.tsx` — texto unificado de confiança global
- `scripts/validate-deck.ts` — validar schema `evidence`, regra trade-off, regra training

### Arquivos a deletar

- Testes antigos de `resolveWeights` e `contextModifiers` (se não fizerem mais sentido)
- Fixtures do golden test antigo (`scripts/compare-engine-golden.ts`)

### Migração de perfis

Não há usuários em produção. Wipe total: `localStorage` do perfil antigo é descartado no primeiro carregamento pós-migração. Onboarding exibe nota: "Atualizamos como MindPractice te conhece. Vamos começar."

---

## 7. Fora de Escopo (para esta migração)

- Histórico temporal visualizável ("você há 3 meses era X, hoje é Y") — registra dados mas não expõe UI ainda
- Perfil multi-contexto (trabalho vs amor separados) — sistema único global por enquanto
- Consolidação manual de treino no perfil base ("usar essa run pra atualizar meu perfil") — treino é efêmero no MVP
- Dashboard de analytics pro autor ver distribuições reais de jogadores por arquétipo
- Arquétipos compostos com nomes próprios curados ("Rebelde-Soberano" como entidade única) — composição dinâmica é suficiente por ora

---

## 8. Critérios de Sucesso

- Jogador respondendo 50+ perguntas consistentes em um eixo: confiança daquele eixo ≥ 0.8
- Jogador que muda estilo de jogo após 100 respostas: sistema ajusta perfil em ~30-50 novas respostas (via drift + pressão bayesiana)
- Gaming test: jogar 20 decks seguidos com intent único (ex: sempre `confronto_publico`) não leva perfil além do valor real do jogador — convergência é no valor, não no caminho
- Todos os 22 decks migrados sem regressão de coerência narrativa (cada opção ainda "faz sentido" com a evidência declarada)
- Testes: ≥ 30 novos testes unitários cobrindo belief update, decay, matching, edge cases (observations=0, crença uniforme, crença colada num bin)
