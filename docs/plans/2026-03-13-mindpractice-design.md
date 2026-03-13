# MindPractice - Simulador de Reatividade Social

## Overview

App web (Next.js) que treina e identifica o arquetipo comportamental do usuario atraves de micro-conflitos sob pressao. Sistema baseado em Decks de cartas com timer, gamificacao e progressao por tempo.

**Tech Stack**: Next.js (App Router), React Context, Framer Motion, Tailwind CSS, LocalStorage.

**Visual**: Dark luxury glassmorphism (preto/roxo/dourado).

## Pages & Navigation

| Route | Purpose |
|-------|---------|
| `/` | Home - hero com CTA "Comecar" |
| `/decks` | Deck Selection - cards estilo RPG, lock system |
| `/play/[deckId]` | Engine de jogo (slideshow + timer + opcoes) |
| `/resultado/[deckId]` | Arquetipo provisorio pos-deck |
| `/config` | Settings (reset, info) |

**Bottom Nav** (fixo, glassmorphism blur): Home, Desafio (`/decks`), Config.

## User Flow

1. Home -> CTA -> `/decks`
2. Seleciona deck desbloqueado -> `/play/basic_01`
3. 10 perguntas sequenciais: Contexto (2-3s) -> Conflito (impacto visual) -> 3 opcoes com timer 5-7s
4. Timer esgota -> penalidade inercia (Vigor -15, Presenca -15)
5. Fim do deck -> `/resultado/basic_01` -> arquetipo provisorio
6. Volta para `/decks` -> deck completado marcado, proximo com lock 24h

## Deck System

### Decks

| Deck | Status Inicial | Unlock |
|------|---------------|--------|
| O Despertar (Basico) | Desbloqueado | Gratis |
| Alta Tensao | Locked | 24h apos completar Basico |
| Profissional | Locked | 24h apos Alta Tensao |
| Especifico (Social) | Locked | Premium/tempo |

### Question Distribution (per deck, 10 questions)

- 7x NORMAL - ruido social, micro-estresses do dia a dia
- 1x RANDOM - situacao bizarra/inesperada (teste de susto)
- 1x SOCIAL - fofoca, lealdade, dilema de grupo
- 1x TENSION - ofensa direta ou perda grave

## 5 Behavior Axes (Stats)

| Eixo | Polo Alto | Polo Baixo |
|------|-----------|------------|
| Vigor | Iniciativa, forca de acao | Passividade |
| Harmonia | Manutencao de lacos | Disrupcao, confronto |
| Filtro | Calculo racional | Reacao visceral |
| Presenca | Exposicao, dominio do espaco | Ocultamento |
| Desapego | Frieza em relacao ao resultado | Necessidade de controle |

Stats iniciam em 0 e acumulam entre decks (assinatura do usuario ao longo dos dias).

## Archetype Matrix

Baseado nos 2 eixos de maior pontuacao:

| Arquetipo | Eixo 1 | Eixo 2 |
|-----------|--------|--------|
| Inabalavel (Nonchalant) | Desapego | Filtro |
| Lider Natural | Presenca | Filtro |
| Protetor | Harmonia | Vigor |
| Racional | Filtro | Vigor |
| Conciliador | Harmonia | Desapego |
| Pragmatico | Vigor | Filtro |
| Espontaneo | Vigor | Desapego |
| Reservado | Ocultamento | Filtro |
| Diplomata | Harmonia | Filtro |
| Entusiasta | Presenca | Vigor |

## Data Structure

```typescript
// Deck JSON
interface Deck {
  deckId: string
  name: string
  description: string
  questions: Question[]
}

interface Question {
  type: 'NORMAL' | 'RANDOM' | 'SOCIAL' | 'TENSION'
  context: string
  event: string
  options: Option[]
}

interface Option {
  text: string
  weights: Partial<Record<'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego', number>>
  feedback: string
}

// Game State (Context + LocalStorage)
interface GameState {
  userStats: { vigor: number; harmonia: number; filtro: number; presenca: number; desapego: number }
  activeDeck: Deck | null
  currentQuestion: number
  unlockedDecks: string[]
  completedDecks: Record<string, string> // deckId -> ISO timestamp
  lastTrainingDate: string | null
}
```

## Timer Mechanics

- Duration: 5-7 seconds per question
- Visual: circular progress bar with purple glow
- Last 2 seconds: bar turns red, pulse animation
- Timeout penalty: `{ vigor: -15, presenca: -15 }` + feedback "Voce travou sob pressao."

## Visual Design (Dark Luxury Glassmorphism)

- **Background**: Gradient `#0a0a0f` -> `#1a0a2e` (preto -> roxo profundo)
- **Glass cards**: `rgba(255,255,255,0.05)`, `backdrop-filter: blur(20px)`, border `rgba(255,255,255,0.1)`
- **Accents**: Dourado `#d4af37` (destaques), roxo claro `#8b5cf6` (interativos)
- **Typography**: Sans-serif moderna, branco com opacidade variada
- **Locked decks**: Grayscale + icone cadeado dourado
- **Bottom nav**: Glass blur bar, icones com glow no ativo

## Animations (Framer Motion)

- Contexto slide: fade in suave
- Conflito slide: scale up + shake sutil (impacto)
- Opcoes: staggered fade in (0.1s delay entre cada)
- Timer: drain animation com glow
- Transicao entre perguntas: slide horizontal
- Resultado: stats bars animam de 0 ao valor final

## Result Screen

- Nome do arquetipo provisorio (grande, destaque dourado)
- 5 barras horizontais dos eixos (animadas)
- Feedback de uma linha
- Botao "Voltar aos Decks"

## Business Rules

1. Time-Lock: 24h entre completar um deck e desbloquear o proximo
2. Stats persistem em LocalStorage e acumulam entre sessoes
3. Penalidade de inercia aplicada automaticamente no timeout
4. Cada opcao distribui pesos positivos E negativos (nunca 100% uma coisa)
