# MindPractice v2 — Motor de Calibragem, Cenas e Galeria de Decks

**Data:** 2026-03-13
**Status:** Aprovado

---

## 1. Resumo

Upgrade completo do MindPractice cobrindo 6 sistemas:

1. **15 Arquétipos** — de 10 pra 15, com categorias puro/cruzado/especial
2. **Galeria de Decks** — 3 abas (Essenciais, Arquétipos, Cenários) com rotação semanal free
3. **Mecânica de Jogo** — Hold to confirm, delay forçado, visual em camadas
4. **Motor de Calibragem** — Média ponderada com amortecimento, janela de 200
5. **Métrica de Veracidade** — Consistência + Precisão + Identidade Validada
6. **Pipeline de Cenas** — Template formal, validação automática, metadata expandida

---

## 2. Os 15 Arquétipos (Posturas de Guerra)

### 3 Categorias

**Puros** — eixo dominante esmagador (top1 > 2x top2):

| # | Nome | Eixo | Descrição |
|---|------|------|-----------|
| 12 | O Vulcão | Vigor Puro | Explosivo e direto. Não conhece filtro. |

**Especial** — equilíbrio (diferença top1-top5 < 15%):

| # | Nome | Condição | Descrição |
|---|------|----------|-----------|
| 1 | O Soberano | Equilíbrio Total | Domínio completo. Age apenas quando necessário. |

**Cruzados** — combinação de 2 eixos dominantes:

| # | Nome | Eixos | Descrição |
|---|------|-------|-----------|
| 2 | O Tubarão | Vigor + Presença | Conquista e poder. Intimidação natural. |
| 3 | O Fantasma | Filtro + Desapego | Oculto. Ninguém sabe o que pensa ou sente. |
| 4 | O Diplomata | Harmonia + Presença | Resolve conflitos sem disparar um tiro. |
| 5 | O Muralha | Filtro + Vigor | Absorve o golpe e contra-ataca. |
| 6 | O Estoico | Desapego + Filtro | Imperturbável. O mundo pode cair. |
| 7 | O Justiceiro | Vigor + Harmonia | Usa força para manter a ordem. |
| 8 | O Enigma | Presença + Desapego | Atrai atenção pelo silêncio. Indecifrável. |
| 9 | O Pacificador | Harmonia + Filtro | Evita o atrito antes dele nascer. |
| 10 | O Mercenário | Desapego + Vigor | Sem amarras. Faz o que precisa ser feito. |
| 11 | O Rebelde | Desapego + Vigor | Antifragilidade. Quebra regras com sorriso no rosto. |
| 13 | O Monge | Harmonia + Desapego | Em paz. Opinião alheia é ruído branco. |
| 14 | O Camaleão | Harmonia + Vigor | Adapta-se. Doce ou amargo rápido. |
| 15 | O Estrategista | Filtro + Presença | Joga xadrez com as pessoas. |

### Diferenciação Mercenário vs Rebelde

Ambos Desapego+Vigor. Diferenciados pelo campo `tone` nas opções:
- **Mercenário:** Respostas pragmáticas frias (tone: 'pragmatico')
- **Rebelde:** Respostas com sarcasmo/provocação (tone: 'provocativo')

### Algoritmo de Matching

```
1. Normaliza os 5 eixos pra 0-100%
2. Se top1 > 2x top2 E top1 é Vigor → Vulcão (puro)
3. Se diferença entre top1 e top5 < 15% → Soberano (equilíbrio)
4. Se top1+top2 = Desapego+Vigor → checa tone predominante:
   - 'pragmatico' dominante → Mercenário
   - 'provocativo' dominante → Rebelde
5. Senão → Cruza top1 + top2 → Match na tabela
```

### Type

```typescript
interface Archetype {
  id: string;
  name: string;
  category: 'puro' | 'cruzado' | 'especial';
  axes: StatKey[] | 'equilibrio';
  threshold?: 'dominant';
  description: string;
  tagline: string;
}
```

---

## 3. Galeria de Decks (3 Abas)

### Aba 1: ESSENCIAIS (Termômetros)

| Deck | Cenas | Nível | Status |
|------|-------|-------|--------|
| O Despertar | 10 | Leve | Sempre grátis |
| Retrato Semanal | 7 | Variável | Rotação free |

### Aba 2: ARQUÉTIPOS (Treino por Eixo)

| Deck | Eixo Foco | Cenas | Nível |
|------|-----------|-------|-------|
| Senda do Vigor | Vigor | 10 | Médio |
| Escudo de Vidro | Filtro | 10 | Médio |
| O Vazio | Desapego | 10 | Médio |
| Raiz Profunda | Harmonia | 10 | Médio |
| Holofote | Presença | 10 | Médio |

### Aba 3: CENÁRIOS (Especializações)

| Deck | Tema | Cenas | Nível |
|------|------|-------|-------|
| Alta Tensão | Pressão emocional | 10 | Médio |
| Arena Profissional | Carreira | 10 | Médio |
| Círculos Sociais | Intrigas | 10 | Extremo |
| The Shark | Negócios/poder | 10 | Extremo |
| Shadow Street | Rua/segurança | 10 | Extremo |
| Stoic Love | Relacionamentos | 10 | Extremo |

### Rotação Semanal Free

- Sempre grátis: O Despertar
- Pool semanal: 2 decks rotativos (1 Arquétipo + 1 Cenário)
- Rotação: Segunda 00:00 local, determinístico via `weekNumber % totalDecks`
- Restantes: Trancados com cadeado dourado (PREMIUM)

### Unlock System

```
Grátis permanente:  O Despertar
Pool semanal:       2 decks rotativos
Premium/XP:         Tudo mais → trancado (monetização futura)
```

### Deck Type Expandido

```typescript
type DeckCategory = 'essencial' | 'arquetipo' | 'cenario';

interface Deck {
  deckId: string;
  name: string;
  description: string;
  tema: string;
  category: DeckCategory;
  focusAxis?: StatKey;
  level: 'leve' | 'medio' | 'extremo';
  difficulty: 1 | 2 | 3 | 4 | 5;
  questions: Question[];
}
```

### Visual

- Abas no topo: pills com glass effect
- Card desbloqueado: glass card com borda na cor do eixo foco
- Card trancado: grayscale + blur + cadeado dourado
- Card pool free: brilho verde + badge "GRÁTIS ESTA SEMANA"
- Card completado: borda dourada + ícone de maestria

---

## 4. Mecânica de Jogo

### 4.1 Hold to Confirm (1 segundo)

- Touch start: barra de progresso preenche o botão na cor do eixo dominante da resposta
- Completou 1s: vibra (haptic), confirma
- Soltou antes: cancela, barra reseta
- Timer continua durante o hold

### 4.2 Delay Forçado (Simulação de Susto)

Entre evento e opções:
- Tensão 1-2: 500ms
- Tensão 3: 1000ms
- Tensão 4-5: 1500ms
- Timer NÃO começa durante o delay
- Visual: tela escurece, pulso sutil no card

### 4.3 Visual das Respostas (Leitura em Camadas)

```
┌──────────────────────────────────┐
│  "Confronto na hora."            │  ← H1: Ação principal (bold, branco)
│  Exposição direta do conflito    │  ← Subtexto (xs, white/40)
│  ████████░░░░░░░░░░░░░░░░░░░░░░  │  ← Hold bar (cor do eixo)
│                          VIG PRE │  ← Tags dos eixos (micro)
└──────────────────────────────────┘
```

### Cores dos Eixos

- Vigor: `#ef4444` (vermelho carmesim)
- Filtro: `#8b5cf6` (roxo profundo)
- Harmonia: `#10b981` (verde esmeralda)
- Presença: `#d4af37` (dourado)
- Desapego: `#60a5fa` (azul gelo)

### Option Type Final

```typescript
interface Option {
  text: string;
  subtext: string;
  tone: 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';
  weights: Partial<Record<StatKey, number>>;
  feedback: string;
}
```

---

## 5. Métricas de Veracidade + Perfil

### 5.1 Precisão (Calibragem)

```
precisao = min(totalRespostas / JANELA, 1.0) * 100
```

- < 30%: "Fase de Descoberta" (laranja)
- 30-70%: "Calibrando..." (roxo)
- > 70%: "Perfil Sólido" (dourado)
- 100%: "Blindado" (glow dourado)

### 5.2 Consistência (Desvio Padrão Móvel)

```
consistencia = 1 - (desvioPadrao / maxDesvioTeorico)
```

Janela das últimas 20 respostas por eixo.

- >= 0.6: Escudo cheio dourado "Estável"
- 0.3-0.6: Escudo meio "Em formação"
- < 0.3: Escudo rachado vermelho "Instável"

### 5.3 Identidade Validada

Badge especial quando Precisão >= 80% E Consistência >= 0.6:
- Badge dourado com coroa: "Identidade Confirmada"

### 5.4 Sliders Bipolares (Visualização dos Eixos)

5 barras horizontais com centro no zero:

```
              ◄── negativo  │  positivo ──►

Vigor     ████████████████──┼──██████████████████████████  +45
Harmonia  ████████──────────┼──────────────────────────── -20
Filtro    ──────────────────┼──██████████████████████████  +60
Presença  ████████████──────┼──████████████████──────────  +10
Desapego  ──────────────────┼──██████████████████████████  +55
```

- Lado direito (positivo): cor do eixo
- Lado esquerdo (negativo): vermelho escuro (red-500/40)
- Valor numérico com sinal à direita
- Animação: cresce do centro com ease-out

### 5.5 Histórico de Evolução

Mini timeline dos últimos decks completados mostrando o arquétipo provisório de cada momento.

```typescript
interface DeckSnapshot {
  deckId: string;
  completedAt: string;
  archetypeAtCompletion: string;
  statsAtCompletion: Record<StatKey, number>;
}
```

---

## 6. Motor de Calibragem (Amortecimento)

### 6.1 Fórmula

```
NovoEixo = EixoAtual + (PesoResposta / min(totalRespostas, JANELA))
```

| Constante | Valor | Propósito |
|-----------|-------|-----------|
| JANELA | 200 | Teto de memória |
| FASE_DESCOBERTA | 10 | Primeiras respostas oscilam |
| CONSISTENCY_WINDOW | 20 | Janela pro desvio padrão |

### 6.2 Comportamento por Fase

- Respostas 1-10 (Descoberta): Divisor baixo, oscilação alta
- Respostas 10-200 (Calibrando): Cada resposta move menos
- Respostas 200+ (Blindado): Divisor = 200 fixo, esquece as antigas

### 6.3 CalibrationState

```typescript
interface CalibrationState {
  axes: Record<StatKey, number>;
  totalResponses: number;
  recentWeights: Record<StatKey, number[]>;  // últimas 20 por eixo
  toneHistory: Array<'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro'>;
  snapshots: DeckSnapshot[];
}

const CALIBRATION_WINDOW = 200;
const CONSISTENCY_WINDOW = 20;
```

### 6.4 Migração

```
Se userStats antigo existe:
  → axes = userStats (convertido pra float)
  → totalResponses = completedDecks.length * 10
  → recentWeights = vazio
```

---

## 7. Pipeline de Criação de Cenas

### 7.1 Template: Trigger → Ação → Consequência

Regras obrigatórias:
1. Ofensa fere Ego, Propriedade ou Segurança
2. 3 opções cobrem Vigor, Filtro/Desapego, Harmonia
3. Toda opção tem trade-off (peso positivo E negativo)
4. Feedback neutro e descritivo, sem julgamento

### 7.2 Distribuição por Deck (10 cenas)

- 7x NORMAL
- 1x RANDOM
- 1x SOCIAL
- 1x TENSION

Regras por categoria:
- Essenciais: mix balanceado, nenhum eixo dominante >3x
- Arquétipos: 7/10 focam no eixo alvo, 3 são armadilhas
- Cenários: todas no mesmo contexto temático

### 7.3 Metadata Expandida

```typescript
interface SceneMetadata {
  tensao: 1 | 2 | 3 | 4 | 5;
  ambiente: Ambiente;
  relacao: Relacao;
  aposta: Aposta;
  pilar: 'ego' | 'propriedade' | 'seguranca';
  delayMs: number;  // 500 | 1000 | 1500
}
```

### 7.4 Validação Automática

Função `validateDeck()` checa:
- Distribuição de tipos (7/1/1/1)
- 3 opções por cena
- Weights não-vazios
- Trade-off em toda opção (positivo + negativo)
- Metadata completa (incluindo pilar)
