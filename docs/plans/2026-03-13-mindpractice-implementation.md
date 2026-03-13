# MindPractice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a social reactivity simulator web app with deck-based challenges, timed responses, behavior axis tracking, and archetype identification, wrapped in dark luxury glassmorphism UI.

**Architecture:** Next.js App Router, fully client-side. React Context for game state, LocalStorage for persistence. JSON files for deck data. Framer Motion for animations. Tailwind CSS for glassmorphism styling.

**Tech Stack:** Next.js (latest), React, TypeScript, Tailwind CSS, Framer Motion, LocalStorage

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: entire project scaffold via CLI

**Step 1: Create Next.js app**

Run:
```bash
cd C:/Users/Afonso/Desktop/mindpractice
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```
Expected: Project scaffolded with src/app directory, Tailwind configured, TypeScript ready.

**Step 2: Install Framer Motion**

Run:
```bash
cd C:/Users/Afonso/Desktop/mindpractice
npm install framer-motion
```

**Step 3: Verify dev server starts**

Run:
```bash
cd C:/Users/Afonso/Desktop/mindpractice
npm run dev
```
Expected: Server starts on localhost:3000 without errors.

**Step 4: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with Tailwind and Framer Motion"
```

---

### Task 2: Tailwind Theme + Global Styles (Glassmorphism Foundation)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Step 1: Configure Tailwind custom theme**

In `tailwind.config.ts`, add custom colors, glassmorphism utilities, and fonts:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: "#0a0a0f",
          purple: "#1a0a2e",
        },
        accent: {
          gold: "#d4af37",
          purple: "#8b5cf6",
          "purple-light": "#a78bfa",
        },
        glass: {
          bg: "rgba(255, 255, 255, 0.05)",
          border: "rgba(255, 255, 255, 0.1)",
          "bg-hover": "rgba(255, 255, 255, 0.08)",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "pulse-red": "pulse-red 1s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(239, 68, 68, 0.8)" },
        },
        "glow": {
          "0%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 2: Set global styles**

Replace `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --bg-dark: #0a0a0f;
  --bg-purple: #1a0a2e;
}

body {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-purple) 50%, var(--bg-dark) 100%);
  color: white;
  min-height: 100vh;
  overflow-x: hidden;
}

@layer components {
  .glass-card {
    @apply bg-[rgba(255,255,255,0.05)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.1)] rounded-2xl;
  }

  .glass-card-hover {
    @apply glass-card transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)];
  }

  .glass-nav {
    @apply bg-[rgba(10,10,15,0.8)] backdrop-blur-[30px] border-t border-[rgba(255,255,255,0.1)];
  }

  .text-gold {
    @apply text-[#d4af37];
  }

  .glow-purple {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }

  .glow-gold {
    box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
  }
}
```

**Step 3: Verify styles load**

Run: `npm run dev`
Check: Page has dark gradient background, no Tailwind errors in console.

**Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: configure dark luxury glassmorphism theme"
```

---

### Task 3: Type Definitions + Deck Data

**Files:**
- Create: `src/types/game.ts`
- Create: `src/data/decks/basic_01.json`
- Create: `src/data/decks/alta_tensao.json`
- Create: `src/data/decks/profissional.json`
- Create: `src/data/decks/social.json`
- Create: `src/data/decks/index.ts`

**Step 1: Create type definitions**

Create `src/types/game.ts`:

```typescript
export type StatKey = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';

export type QuestionType = 'NORMAL' | 'RANDOM' | 'SOCIAL' | 'TENSION';

export interface Option {
  text: string;
  weights: Partial<Record<StatKey, number>>;
  feedback: string;
}

export interface Question {
  type: QuestionType;
  context: string;
  event: string;
  options: Option[];
}

export interface Deck {
  deckId: string;
  name: string;
  description: string;
  level: 'leve' | 'medio' | 'extremo';
  questions: Question[];
}

export interface UserStats {
  vigor: number;
  harmonia: number;
  filtro: number;
  presenca: number;
  desapego: number;
}

export interface GameState {
  userStats: UserStats;
  activeDeck: Deck | null;
  currentQuestion: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
}

export interface Archetype {
  name: string;
  axes: [StatKey, StatKey];
  description: string;
}

export const ARCHETYPES: Archetype[] = [
  { name: 'Inabalavel', axes: ['desapego', 'filtro'], description: 'Voce desvia a energia do conflito para o nada. Nada te atinge.' },
  { name: 'Lider Natural', axes: ['presenca', 'filtro'], description: 'Voce domina o espaco com calculo. As pessoas seguem sua direcao.' },
  { name: 'Protetor', axes: ['harmonia', 'vigor'], description: 'Voce age com forca para manter os lacos. Defende os seus.' },
  { name: 'Racional', axes: ['filtro', 'vigor'], description: 'Logica pura move suas decisoes. Voce age com precisao cirurgica.' },
  { name: 'Conciliador', axes: ['harmonia', 'desapego'], description: 'Voce mantem a paz sem se apegar ao resultado. Equilibrio natural.' },
  { name: 'Pragmatico', axes: ['vigor', 'filtro'], description: 'Resultado acima de tudo. Voce faz o que precisa ser feito.' },
  { name: 'Espontaneo', axes: ['vigor', 'desapego'], description: 'Instinto puro. Voce age sem pensar duas vezes.' },
  { name: 'Reservado', axes: ['desapego', 'presenca'], description: 'Voce observa tudo de longe. Seu silencio e sua forca.' },
  { name: 'Diplomata', axes: ['harmonia', 'filtro'], description: 'Voce calcula cada palavra para manter a harmonia. Ninguem percebe sua estrategia.' },
  { name: 'Entusiasta', axes: ['presenca', 'vigor'], description: 'Energia pura. Voce entra e toma conta do espaco.' },
];

export const TIMER_DURATION = 6; // seconds

export const INERTIA_PENALTY: Partial<Record<StatKey, number>> = {
  vigor: -15,
  presenca: -15,
};

export const INITIAL_STATS: UserStats = {
  vigor: 0,
  harmonia: 0,
  filtro: 0,
  presenca: 0,
  desapego: 0,
};
```

**Step 2: Create basic deck (O Despertar) - 10 questions**

Create `src/data/decks/basic_01.json`:

```json
{
  "deckId": "basic_01",
  "name": "O Despertar",
  "description": "Seu primeiro teste. Micro-conflitos do dia a dia.",
  "level": "leve",
  "questions": [
    {
      "type": "NORMAL",
      "context": "Fila do mercado. Sabado lotado.",
      "event": "Alguem passa na sua frente com um carrinho cheio e ignora sua presenca.",
      "options": [
        { "text": "Reclamar em voz alta para todos ouvirem.", "weights": { "vigor": 20, "presenca": 15, "harmonia": -15, "filtro": -10 }, "feedback": "Acao direta. Voce marcou posicao, mas criou tensao." },
        { "text": "Olhar o relogio, suspirar e deixar passar.", "weights": { "filtro": 15, "desapego": 10, "vigor": -10 }, "feedback": "Voce calculou que nao vale a energia. Resposta fria." },
        { "text": "Manter a calma. O tempo e seu.", "weights": { "desapego": 25, "filtro": 15 }, "feedback": "Nonchalant. A fila nao define seu dia." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Almoco com colegas de trabalho.",
      "event": "Alguem faz uma piada sobre voce que arranca risadas de todos.",
      "options": [
        { "text": "Rir junto e devolver com uma piada melhor.", "weights": { "presenca": 20, "harmonia": 10, "desapego": 15 }, "feedback": "Voce dominou o momento. Ninguem te abalou." },
        { "text": "Ficar em silencio e mudar de assunto.", "weights": { "filtro": 15, "vigor": -15, "presenca": -10 }, "feedback": "Voce evitou o confronto, mas perdeu presenca." },
        { "text": "Dizer que nao achou graca, serio.", "weights": { "vigor": 15, "harmonia": -20, "presenca": 10 }, "feedback": "Voce impôs um limite. O clima mudou." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Transito pesado. Voce esta atrasado.",
      "event": "Um motorista te fecha e ainda buzina como se voce estivesse errado.",
      "options": [
        { "text": "Buzinar de volta e gesticular.", "weights": { "vigor": 15, "presenca": 10, "filtro": -15, "harmonia": -10 }, "feedback": "Reacao visceral. O estresse do transito te consumiu." },
        { "text": "Respirar fundo e ligar o radio.", "weights": { "desapego": 20, "filtro": 20 }, "feedback": "Voce se recusou a entrar no jogo dele." },
        { "text": "Acelerar e ultrapassar ele.", "weights": { "vigor": 20, "presenca": 15, "filtro": -20, "desapego": -10 }, "feedback": "Competitividade no volante. Alto risco." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Reuniao de equipe no escritorio.",
      "event": "Seu colega apresenta sua ideia como se fosse dele. Ninguem percebe.",
      "options": [
        { "text": "Interromper e corrigir na hora.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -15 }, "feedback": "Voce reivindicou o que e seu. Direto e sem rodeios." },
        { "text": "Anotar e conversar em particular depois.", "weights": { "filtro": 25, "harmonia": 15, "desapego": 10 }, "feedback": "Estrategia diplomatica. Voce escolheu o momento certo." },
        { "text": "Deixar passar. Ideias vem e vao.", "weights": { "desapego": 30, "vigor": -15 }, "feedback": "Desapego puro. Mas cuidado com o padrao." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Mensagem no grupo de amigos.",
      "event": "Alguem posta um print de uma conversa sua fora de contexto. O grupo ri.",
      "options": [
        { "text": "Mandar audio longo explicando o contexto.", "weights": { "vigor": 10, "presenca": 10, "filtro": -10, "desapego": -15 }, "feedback": "Voce se justificou. Deu mais atencao do que merecia." },
        { "text": "Responder com um emoji e mudar de assunto.", "weights": { "desapego": 20, "filtro": 15, "presenca": 10 }, "feedback": "Leve e eficaz. Voce nao alimentou o fogo." },
        { "text": "Sair do grupo sem dizer nada.", "weights": { "vigor": 15, "harmonia": -25, "desapego": 15 }, "feedback": "Acao radical. Voce cortou o laco." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce apresenta um projeto pessoal para um amigo.",
      "event": "Ele diz: 'Legal, mas acho que nao vai dar certo.'",
      "options": [
        { "text": "Agradecer o feedback e seguir em frente.", "weights": { "desapego": 20, "filtro": 15, "vigor": 10 }, "feedback": "Maturidade. A opiniao dele nao muda seu plano." },
        { "text": "Perguntar por que ele acha isso.", "weights": { "filtro": 25, "harmonia": 10 }, "feedback": "Curiosidade racional. Voce quer entender, nao reagir." },
        { "text": "Ficar na defensiva e listar seus argumentos.", "weights": { "vigor": 15, "presenca": 10, "desapego": -20, "filtro": -10 }, "feedback": "Voce precisa de validacao. O ego falou mais alto." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Festa de aniversario de um conhecido.",
      "event": "Voce chega e ninguem te cumprimenta. Todos estao em rodinhas fechadas.",
      "options": [
        { "text": "Entrar em uma rodinha e se apresentar.", "weights": { "presenca": 25, "vigor": 15, "harmonia": 10 }, "feedback": "Voce tomou a iniciativa. Presenca dominante." },
        { "text": "Ir ao bar, pegar uma bebida e esperar.", "weights": { "filtro": 15, "desapego": 15 }, "feedback": "Calma estrategica. Voce nao forca nada." },
        { "text": "Ir embora discretamente.", "weights": { "desapego": 10, "vigor": -15, "presenca": -20 }, "feedback": "Fuga social. Voce evitou o desconforto." }
      ]
    },
    {
      "type": "RANDOM",
      "context": "Voce esta andando na rua normalmente.",
      "event": "Um desconhecido para na sua frente, te olha fixo e diz: 'Eu sei quem voce e.'",
      "options": [
        { "text": "Responder: 'Legal. E eu sei quem eu sou tambem.' e continuar andando.", "weights": { "desapego": 25, "presenca": 15, "filtro": 15 }, "feedback": "Frio absoluto. Voce nao deu poder a situacao." },
        { "text": "Parar e perguntar: 'Quem?'", "weights": { "vigor": 10, "filtro": 15, "presenca": 10 }, "feedback": "Curiosidade. Voce nao fugiu nem atacou." },
        { "text": "Acelerar o passo e sair dali.", "weights": { "vigor": -10, "presenca": -15, "filtro": 10 }, "feedback": "Instinto de sobrevivencia. Mas voce perdeu compostura." }
      ]
    },
    {
      "type": "SOCIAL",
      "context": "Dois amigos seus brigaram. Ambos te procuram separadamente.",
      "event": "Cada um pede que voce 'escolha um lado'. Voce tem que responder agora.",
      "options": [
        { "text": "Dizer que nao vai escolher lado nenhum.", "weights": { "desapego": 20, "filtro": 20, "harmonia": 10 }, "feedback": "Neutralidade calculada. Voce protegeu suas relacoes." },
        { "text": "Apoiar quem voce acha que tem razao.", "weights": { "vigor": 20, "harmonia": -10, "presenca": 15 }, "feedback": "Voce teve coragem de se posicionar. Mas perdeu um aliado." },
        { "text": "Tentar mediar a situacao entre os dois.", "weights": { "harmonia": 30, "filtro": 10, "vigor": 10 }, "feedback": "Diplomacia ativa. Voce investiu energia em resolver." }
      ]
    },
    {
      "type": "TENSION",
      "context": "Discussao sobre seu projeto de 3 semanas com o mentor.",
      "event": "Ele diz na frente de todos: 'Isso aqui e trabalho de amador. Voce nao leva nada a serio.'",
      "options": [
        { "text": "Expor a falha tecnica do mentor na frente de todos.", "weights": { "vigor": 30, "presenca": 25, "harmonia": -25, "filtro": 10, "desapego": -10 }, "feedback": "Contra-ataque devastador. Voce ganhou o momento, mas criou um inimigo." },
        { "text": "Anotar o feedback calmamente e oferecer um cafe.", "weights": { "vigor": -10, "harmonia": 10, "filtro": 25, "presenca": -5, "desapego": 35 }, "feedback": "Nonchalant. Voce nao validou a ofensa dele. Classe pura." },
        { "text": "Pedir desculpas e prometer refazer.", "weights": { "vigor": -15, "harmonia": 30, "filtro": 15, "presenca": -10, "desapego": -20 }, "feedback": "Diplomacia de sobrevivencia. Voce manteve o emprego, mas cedeu seu ego." }
      ]
    }
  ]
}
```

**Step 3: Create Alta Tensao deck**

Create `src/data/decks/alta_tensao.json`:

```json
{
  "deckId": "alta_tensao",
  "name": "Alta Tensao",
  "description": "Conflitos que testam seu limite emocional.",
  "level": "medio",
  "questions": [
    {
      "type": "NORMAL",
      "context": "Voce recebe uma ligacao do banco.",
      "event": "Dizem que houve uma movimentacao suspeita na sua conta. O atendente pede seus dados pessoais com urgencia.",
      "options": [
        { "text": "Desligar e ir ao banco pessoalmente.", "weights": { "filtro": 30, "desapego": 15, "vigor": 10 }, "feedback": "Racionalidade no auge. Voce nao caiu na pressao." },
        { "text": "Passar os dados. E urgente.", "weights": { "vigor": -10, "filtro": -25, "harmonia": 10 }, "feedback": "Voce cedeu ao medo. A pressao venceu." },
        { "text": "Questionar o atendente e pedir protocolo.", "weights": { "filtro": 25, "presenca": 15, "vigor": 10 }, "feedback": "Desconfianca saudavel. Voce manteve o controle." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Entrevista de emprego dos sonhos.",
      "event": "O entrevistador diz: 'Seu curriculo e bom, mas voce nao tem experiencia real. Me convenca em 10 segundos.'",
      "options": [
        { "text": "Falar com confianca sobre o que voce pode entregar.", "weights": { "presenca": 25, "vigor": 20, "filtro": 10 }, "feedback": "Presenca sob pressao. Voce nao travou." },
        { "text": "Pedir mais tempo para elaborar.", "weights": { "filtro": 15, "vigor": -10, "presenca": -15 }, "feedback": "Honesto, mas perdeu o momento." },
        { "text": "Dizer que experiencia se constroi e que voce esta pronto.", "weights": { "desapego": 20, "presenca": 15, "vigor": 10 }, "feedback": "Desapego do julgamento. Postura firme sem arrogancia." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Jantar de familia no domingo.",
      "event": "Um parente comeca a criticar suas escolhas de vida na frente de todos.",
      "options": [
        { "text": "Responder com calma que sua vida e sua.", "weights": { "desapego": 20, "presenca": 15, "vigor": 10 }, "feedback": "Limite saudavel. Sem drama, sem guerra." },
        { "text": "Mudar de assunto para algo leve.", "weights": { "harmonia": 20, "filtro": 15, "desapego": 10 }, "feedback": "Diplomacia familiar. Voce protegeu o almoco." },
        { "text": "Confrontar e listar as falhas dele.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -30, "filtro": -10 }, "feedback": "Contra-ataque familiar. Natal vai ser tenso." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce esta no gym treinando.",
      "event": "Alguem pega o equipamento que voce estava usando e finge que nao te viu.",
      "options": [
        { "text": "Ir ate la e dizer que voce estava usando.", "weights": { "vigor": 20, "presenca": 15, "harmonia": -5 }, "feedback": "Assertividade basica. Sem drama, sem passividade." },
        { "text": "Usar outro equipamento. Tanto faz.", "weights": { "desapego": 25, "filtro": 10 }, "feedback": "Desapego pratico. Voce nao perde tempo com isso." },
        { "text": "Ficar olhando esperando ele perceber.", "weights": { "vigor": -15, "presenca": -10, "harmonia": 10 }, "feedback": "Passivo-agressivo. Voce nao disse nada, mas ficou incomodado." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce descobre que um amigo proximo falou mal de voce.",
      "event": "A informacao chega por um terceiro. Voce nao tem certeza se e verdade.",
      "options": [
        { "text": "Confrontar o amigo diretamente.", "weights": { "vigor": 25, "presenca": 15, "harmonia": -10, "filtro": 10 }, "feedback": "Transparencia bruta. Voce nao aceita traicao silenciosa." },
        { "text": "Ignorar. Fofoca e fofoca.", "weights": { "desapego": 25, "filtro": 20 }, "feedback": "Maduro. Voce nao reage a informacao de segunda mao." },
        { "text": "Afastar-se aos poucos sem explicar.", "weights": { "desapego": 15, "harmonia": -10, "vigor": -10 }, "feedback": "Corte silencioso. Funciona, mas pode gerar mais fofoca." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce esta em um debate online sobre algo que voce domina.",
      "event": "Alguem com muitos seguidores te ridiculariza publicamente com argumentos fracos.",
      "options": [
        { "text": "Responder com dados e fontes irrefutaveis.", "weights": { "filtro": 30, "presenca": 15, "vigor": 10 }, "feedback": "Intelectualmente devastador. Voce usou logica como arma." },
        { "text": "Nao responder. O silencio fala.", "weights": { "desapego": 30, "filtro": 10, "presenca": 10 }, "feedback": "Nonchalant digital. Voce nao alimentou o engajamento dele." },
        { "text": "Atacar a credibilidade dele.", "weights": { "vigor": 20, "presenca": 15, "harmonia": -20, "filtro": -10 }, "feedback": "Ad hominem. Voce desceu ao nivel dele." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce esta em um date que esta indo bem.",
      "event": "A pessoa faz um comentario que menospreza algo que voce valoriza muito.",
      "options": [
        { "text": "Dizer com calma que aquilo e importante pra voce.", "weights": { "presenca": 15, "harmonia": 15, "vigor": 10, "filtro": 10 }, "feedback": "Autenticidade. Voce mostrou quem voce e sem atacar." },
        { "text": "Deixar passar e ver como a noite evolui.", "weights": { "harmonia": 20, "desapego": 15, "filtro": 10 }, "feedback": "Paciencia estrategica. Voce deu espaco para a pessoa." },
        { "text": "Encerrar o date educadamente.", "weights": { "vigor": 15, "desapego": 20, "harmonia": -15 }, "feedback": "Padrao alto. Voce nao tolera desrespeito, mesmo sutil." }
      ]
    },
    {
      "type": "RANDOM",
      "context": "Voce esta no elevador sozinho.",
      "event": "As luzes apagam e uma voz robotica diz: 'Sistema reiniciando. Estimativa: 45 minutos.'",
      "options": [
        { "text": "Sentar no chao e esperar tranquilamente.", "weights": { "desapego": 30, "filtro": 15 }, "feedback": "Zen absoluto. Voce transformou o problema em pausa." },
        { "text": "Apertar todos os botoes e gritar por ajuda.", "weights": { "vigor": 15, "filtro": -20, "presenca": 10, "desapego": -15 }, "feedback": "Panico. A situacao te dominou." },
        { "text": "Ligar para alguem e avisar calmamente.", "weights": { "filtro": 25, "vigor": 10, "harmonia": 10 }, "feedback": "Pratico e racional. Voce resolveu sem drama." }
      ]
    },
    {
      "type": "SOCIAL",
      "context": "Grupo de amigos planejando uma viagem.",
      "event": "Voce descobre que ja combinaram tudo sem te incluir. Alguem diz: 'Ah, achamos que voce nao ia querer ir.'",
      "options": [
        { "text": "Dizer que se sente excluido e que isso te incomodou.", "weights": { "presenca": 15, "harmonia": 15, "vigor": 10, "desapego": -10 }, "feedback": "Vulnerabilidade honesta. Voce comunicou sem atacar." },
        { "text": "Dizer 'De boa, divirtam-se' e sair da conversa.", "weights": { "desapego": 25, "vigor": -10, "harmonia": -5 }, "feedback": "Mascara de indiferenca. Voce escondeu a dor." },
        { "text": "Organizar algo melhor e convidar outras pessoas.", "weights": { "vigor": 20, "presenca": 25, "desapego": 15 }, "feedback": "Poder de reacao. Voce nao pediu permissao, criou algo melhor." }
      ]
    },
    {
      "type": "TENSION",
      "context": "Voce esta sendo demitido.",
      "event": "O gestor diz: 'Nao e pessoal, mas voce nao entrega o que a gente precisa. Seu ultimo dia e sexta.'",
      "options": [
        { "text": "Agradecer pela oportunidade e sair com classe.", "weights": { "desapego": 30, "filtro": 25, "harmonia": 10, "vigor": -5 }, "feedback": "Elegancia maxima. Voce saiu pela porta da frente." },
        { "text": "Pedir feedback detalhado para melhorar.", "weights": { "filtro": 30, "harmonia": 15, "vigor": 10 }, "feedback": "Mentalidade de crescimento. Ate na derrota voce aprende." },
        { "text": "Dizer que discorda e que a decisao e injusta.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -20, "desapego": -15 }, "feedback": "Voce lutou pelo que acredita. Mas a decisao nao mudou." }
      ]
    }
  ]
}
```

**Step 4: Create Profissional deck**

Create `src/data/decks/profissional.json`:

```json
{
  "deckId": "profissional",
  "name": "Arena Profissional",
  "description": "Conflitos do mundo corporativo e carreira.",
  "level": "medio",
  "questions": [
    {
      "type": "NORMAL",
      "context": "Reuniao com o time inteiro.",
      "event": "Voce sugere uma ideia e o silencio e constrangedor. Ninguem comenta.",
      "options": [
        { "text": "Continuar explicando com mais detalhes.", "weights": { "presenca": 20, "vigor": 15, "filtro": 10 }, "feedback": "Persistencia. Voce nao deixou o silencio te engolir." },
        { "text": "Perguntar: 'Alguma objecao ou podemos seguir?'", "weights": { "presenca": 25, "vigor": 15, "filtro": 15 }, "feedback": "Assertividade profissional. Voce forcou uma resposta." },
        { "text": "Dizer 'Ok, proxima pauta' e engolir.", "weights": { "harmonia": 10, "vigor": -20, "presenca": -15 }, "feedback": "Voce recuou. O silencio venceu." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Deadline apertado. Voce esta sobrecarregado.",
      "event": "Seu chefe adiciona mais uma tarefa 'urgente' as 18h de sexta-feira.",
      "options": [
        { "text": "Aceitar e trabalhar no fim de semana.", "weights": { "harmonia": 15, "vigor": 10, "desapego": -20, "filtro": -10 }, "feedback": "Subserviencia. Voce priorizou o chefe acima de voce." },
        { "text": "Dizer que pode fazer na segunda com qualidade.", "weights": { "filtro": 25, "presenca": 15, "vigor": 15 }, "feedback": "Limite profissional saudavel. Voce negociou sem confrontar." },
        { "text": "Recusar e dizer que ja tem demais.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -15, "desapego": 15 }, "feedback": "Coragem corporativa. Poucos dizem nao." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Avaliacao de desempenho anual.",
      "event": "Voce recebe nota media apesar de ter dado o seu melhor. O feedback e generico.",
      "options": [
        { "text": "Pedir exemplos especificos e metas claras.", "weights": { "filtro": 30, "vigor": 15, "presenca": 10 }, "feedback": "Mentalidade analitica. Voce quer dados, nao opinioes." },
        { "text": "Aceitar e seguir em frente.", "weights": { "desapego": 20, "harmonia": 15, "vigor": -10 }, "feedback": "Desapego do sistema. Voce sabe que nota nao define valor." },
        { "text": "Expressar frustacao e dizer que merecia mais.", "weights": { "vigor": 20, "presenca": 15, "harmonia": -10, "desapego": -15 }, "feedback": "Ego ferido. Voce se expos emocionalmente." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Almoco corporativo com diretoria.",
      "event": "O diretor faz uma piada machista/preconceituosa e todos riem.",
      "options": [
        { "text": "Nao rir e manter expressao neutra.", "weights": { "presenca": 15, "filtro": 15, "desapego": 20 }, "feedback": "Protesto silencioso. Sua postura falou por voce." },
        { "text": "Dizer que nao achou adequado.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -15, "filtro": 10 }, "feedback": "Coragem moral. Voce arriscou politicamente." },
        { "text": "Rir por educacao e mudar de assunto.", "weights": { "harmonia": 15, "filtro": -15, "vigor": -10 }, "feedback": "Conformismo social. Voce priorizou a harmonia sobre valores." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce descobre que ganham menos que um colega com a mesma funcao.",
      "event": "A informacao vazou por acidente num email. A diferenca e de 30%.",
      "options": [
        { "text": "Marcar reuniao com o gestor para negociar.", "weights": { "vigor": 25, "presenca": 20, "filtro": 20 }, "feedback": "Estrategia profissional. Voce usou o dado a seu favor." },
        { "text": "Comecar a buscar outro emprego em silencio.", "weights": { "filtro": 20, "desapego": 20, "vigor": 10 }, "feedback": "Pragmatismo frio. Voce ja sabe o proximo passo." },
        { "text": "Reclamar com colegas sobre a injustica.", "weights": { "vigor": 10, "harmonia": 10, "filtro": -15, "presenca": -10 }, "feedback": "Desabafo sem acao. Alivia, mas nao resolve." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Apresentacao importante para cliente.",
      "event": "No meio da sua fala, o projetor para de funcionar. Todos olham pra voce.",
      "options": [
        { "text": "Continuar a apresentacao sem slides, improvisando.", "weights": { "presenca": 30, "vigor": 20, "desapego": 15 }, "feedback": "Dominio total. Voce provou que o conteudo e voce, nao o PowerPoint." },
        { "text": "Pedir 5 minutos para resolver o problema tecnico.", "weights": { "filtro": 20, "harmonia": 10 }, "feedback": "Pratico e profissional. Sem panico." },
        { "text": "Fazer piada sobre a situacao para quebrar o gelo.", "weights": { "presenca": 15, "harmonia": 20, "desapego": 15 }, "feedback": "Carisma sob pressao. Voce transformou problema em momento." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce acabou de ser promovido.",
      "event": "Um colega que tambem queria a vaga te da os parabens com visivel amargura.",
      "options": [
        { "text": "Agradecer com sinceridade e reconhecer o merito dele.", "weights": { "harmonia": 25, "filtro": 15, "presenca": 10 }, "feedback": "Graciosidade. Voce venceu sem humilhar." },
        { "text": "Aceitar os parabens e seguir em frente.", "weights": { "desapego": 20, "filtro": 10 }, "feedback": "Neutro. Voce nao deve nada a ninguem." },
        { "text": "Ignorar a amargura e comemorar abertamente.", "weights": { "presenca": 20, "vigor": 15, "harmonia": -15, "desapego": 10 }, "feedback": "Dominancia social. Voce nao diminuiu sua vitoria." }
      ]
    },
    {
      "type": "RANDOM",
      "context": "Entrevista de emprego em uma empresa inovadora.",
      "event": "O entrevistador coloca um objeto estranho na mesa e diz: 'Venda isso para mim em 30 segundos.'",
      "options": [
        { "text": "Pegar o objeto e criar uma narrativa criativa na hora.", "weights": { "presenca": 25, "vigor": 20, "desapego": 15 }, "feedback": "Improvisacao pura. Voce nao questionou, executou." },
        { "text": "Perguntar para quem ele quer que voce venda.", "weights": { "filtro": 30, "presenca": 10 }, "feedback": "Pensamento estrategico. Voce redefiniu o problema antes de agir." },
        { "text": "Dizer que voce nao vende coisas, voce resolve problemas.", "weights": { "desapego": 25, "presenca": 20, "filtro": 10 }, "feedback": "Reframe poderoso. Voce mudou as regras do jogo." }
      ]
    },
    {
      "type": "SOCIAL",
      "context": "Happy hour da empresa.",
      "event": "Um colega bebado comeca a revelar segredos de outros colegas. Ele esta prestes a falar algo sobre voce.",
      "options": [
        { "text": "Interromper com humor e redirecionar a conversa.", "weights": { "filtro": 25, "harmonia": 15, "presenca": 15 }, "feedback": "Controle social elegante. Voce desarmou sem escalar." },
        { "text": "Sair discretamente antes que fale de voce.", "weights": { "filtro": 15, "desapego": 15, "vigor": -10 }, "feedback": "Auto-preservacao. Mas voce fugiu do momento." },
        { "text": "Dizer na frente de todos que ele esta passando dos limites.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -15 }, "feedback": "Confronto publico. Voce protegeu a todos, mas criou tensao." }
      ]
    },
    {
      "type": "TENSION",
      "context": "Reuniao tensa. O projeto esta atrasado.",
      "event": "O cliente grita: 'Voces sao incompetentes! Vou cancelar o contrato agora!'",
      "options": [
        { "text": "Esperar ele terminar, respirar, e apresentar um plano de recuperacao.", "weights": { "filtro": 30, "desapego": 25, "presenca": 15 }, "feedback": "Maestria sob pressao. Voce deixou a tempestade passar e ofereceu a solucao." },
        { "text": "Dizer que entende a frustacao e que vai resolver pessoalmente.", "weights": { "harmonia": 20, "vigor": 15, "presenca": 15, "filtro": 10 }, "feedback": "Ownership total. Voce assumiu a responsabilidade." },
        { "text": "Responder que gritar nao resolve e pedir respeito.", "weights": { "vigor": 25, "presenca": 20, "harmonia": -15, "desapego": 10 }, "feedback": "Limite claro. Voce nao aceita abuso, mesmo de cliente." }
      ]
    }
  ]
}
```

**Step 5: Create Social deck**

Create `src/data/decks/social.json`:

```json
{
  "deckId": "social",
  "name": "Circulos Sociais",
  "description": "Intrigas, lealdade e dinamicas de grupo.",
  "level": "extremo",
  "questions": [
    {
      "type": "NORMAL",
      "context": "Churrasco com amigos. Clima descontraido.",
      "event": "Alguem que voce nao gosta muito chega de surpresa. O anfitriao te olha pedindo paciencia.",
      "options": [
        { "text": "Cumprimentar normalmente e manter a compostura.", "weights": { "harmonia": 20, "filtro": 15, "desapego": 15 }, "feedback": "Maturidade social. Voce priorizou o grupo." },
        { "text": "Ser educado mas manter distancia o evento todo.", "weights": { "filtro": 20, "desapego": 15, "harmonia": 5 }, "feedback": "Limite sutil. Voce controlou sua exposicao." },
        { "text": "Ir embora mais cedo sem fazer cena.", "weights": { "desapego": 10, "vigor": -10, "harmonia": -15 }, "feedback": "Fuga social. Voce priorizou seu conforto sobre o grupo." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Seu melhor amigo comeca a namorar alguem que voce nao confia.",
      "event": "Ele te pede opiniao sincera sobre a pessoa.",
      "options": [
        { "text": "Ser honesto e dizer suas preocupacoes com cuidado.", "weights": { "vigor": 15, "harmonia": 10, "filtro": 20, "presenca": 10 }, "feedback": "Amizade real. Voce arriscou a verdade por quem importa." },
        { "text": "Dizer que so quer ve-lo feliz.", "weights": { "harmonia": 25, "desapego": 15, "filtro": -10 }, "feedback": "Evitou o confronto. Diplomatico, mas evasivo." },
        { "text": "Falar mal da pessoa diretamente.", "weights": { "vigor": 20, "harmonia": -25, "filtro": -15, "presenca": 15 }, "feedback": "Sem filtro. Honestidade bruta que pode custar a amizade." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Rede social. Voce posta algo pessoal.",
      "event": "Um conhecido comenta algo maldoso de forma 'brincadeira'. Tem 50 curtidas.",
      "options": [
        { "text": "Responder com humor inteligente que inverte a piada.", "weights": { "presenca": 25, "filtro": 15, "desapego": 15 }, "feedback": "Jiu-jitsu verbal. Voce usou a energia dele contra ele." },
        { "text": "Deletar o comentario sem responder.", "weights": { "desapego": 15, "vigor": 10, "filtro": 10, "presenca": -10 }, "feedback": "Controle do espaco digital. Silencioso mas eficaz." },
        { "text": "Responder de forma agressiva.", "weights": { "vigor": 20, "presenca": 10, "harmonia": -25, "filtro": -20 }, "feedback": "Escalada publica. Voce deu munição para ele." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce empresta dinheiro para um amigo.",
      "event": "Ja faz 3 meses. Ele nao menciona a divida e posta fotos de viagem.",
      "options": [
        { "text": "Cobrar de forma direta e educada.", "weights": { "vigor": 20, "filtro": 15, "presenca": 10, "harmonia": -5 }, "feedback": "Assertividade financeira. Voce valoriza seu dinheiro e a verdade." },
        { "text": "Esquecer o dinheiro e aprender a licao.", "weights": { "desapego": 30, "filtro": 10, "vigor": -15 }, "feedback": "Desapego real. Mas voce vai emprestar de novo?" },
        { "text": "Mandar indiretas ate ele entender.", "weights": { "vigor": 5, "filtro": -15, "harmonia": -10, "presenca": -10 }, "feedback": "Passivo-agressivo. O pior dos dois mundos." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Voce descobre que esta sendo traido(a).",
      "event": "A prova e um print de mensagem que um amigo te mandou. E inegavel.",
      "options": [
        { "text": "Confrontar seu parceiro(a) calmamente com a prova.", "weights": { "vigor": 20, "filtro": 25, "presenca": 15, "desapego": 10 }, "feedback": "Frio e cirurgico. Voce nao deixou a emocao te dominar." },
        { "text": "Terminar sem explicar. Corte limpo.", "weights": { "desapego": 30, "vigor": 15, "harmonia": -20 }, "feedback": "Execucao silenciosa. Voce nao deu chance de desculpas." },
        { "text": "Chorar e pedir explicacoes.", "weights": { "harmonia": 10, "vigor": -20, "filtro": -15, "desapego": -25 }, "feedback": "Vulnerabilidade total. Humano, mas doloroso." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Casamento de um amigo. Voce e padrinho.",
      "event": "Na hora do brinde, alguem menciona seu ex na mesa e todos ficam constrangidos.",
      "options": [
        { "text": "Rir e fazer uma piada leve sobre o passado.", "weights": { "desapego": 25, "presenca": 20, "harmonia": 15 }, "feedback": "Classe. Voce transformou desconforto em leveza." },
        { "text": "Ignorar e continuar o brinde normalmente.", "weights": { "filtro": 20, "desapego": 15, "presenca": 10 }, "feedback": "Nonchalant. Voce nao deu poder ao momento." },
        { "text": "Ficar visivelmente incomodado.", "weights": { "vigor": -10, "desapego": -20, "presenca": -15, "harmonia": -5 }, "feedback": "O passado ainda te afeta. Visivel para todos." }
      ]
    },
    {
      "type": "NORMAL",
      "context": "Grupo de WhatsApp da familia.",
      "event": "Um tio compartilha fake news. Voce tem os fatos para desmentir.",
      "options": [
        { "text": "Corrigir com fontes e educacao.", "weights": { "filtro": 25, "vigor": 15, "harmonia": -5, "presenca": 10 }, "feedback": "Responsabilidade informacional. Mas prepara-se para a resistencia." },
        { "text": "Sair do grupo silenciosamente.", "weights": { "desapego": 20, "vigor": -10, "harmonia": -10 }, "feedback": "Corte digital. Voce priorizou sua saude mental." },
        { "text": "Ignorar. Nao vale o esforco.", "weights": { "desapego": 15, "filtro": 10, "harmonia": 10 }, "feedback": "Pragmatico. Voce sabe que nao vai mudar a opiniao dele." }
      ]
    },
    {
      "type": "RANDOM",
      "context": "Voce recebe uma ligacao de um numero desconhecido.",
      "event": "A pessoa diz que e um parente distante e que precisa de dinheiro urgente para uma cirurgia.",
      "options": [
        { "text": "Pedir nome completo, hospital e forma de verificar.", "weights": { "filtro": 30, "vigor": 10, "desapego": 15 }, "feedback": "Ceticismo saudavel. Voce nao cai em pressao emocional." },
        { "text": "Dizer que nao pode ajudar e desligar.", "weights": { "desapego": 25, "vigor": 15, "harmonia": -10 }, "feedback": "Corte rapido. Voce protegeu seu recurso." },
        { "text": "Transferir o dinheiro. Pode ser real.", "weights": { "harmonia": 15, "filtro": -30, "vigor": -10, "desapego": -20 }, "feedback": "Bondade perigosa. Voce agiu pela emocao sem verificar." }
      ]
    },
    {
      "type": "SOCIAL",
      "context": "Festa de formatura. Voce e o orador.",
      "event": "Antes de subir ao palco, voce descobre que seu discurso foi vazado e alguem esta zombando dele nas redes.",
      "options": [
        { "text": "Subir e fazer o discurso como planejado.", "weights": { "presenca": 25, "vigor": 20, "desapego": 20 }, "feedback": "Inabalavel. Voce nao deixou ruido externo te parar." },
        { "text": "Improvisar um discurso completamente novo.", "weights": { "presenca": 30, "vigor": 25, "desapego": 15, "filtro": -5 }, "feedback": "Coragem criativa. Voce transformou crise em oportunidade." },
        { "text": "Pedir para outra pessoa fazer o discurso.", "weights": { "vigor": -25, "presenca": -25, "harmonia": 10 }, "feedback": "Voce desistiu no momento que mais importava." }
      ]
    },
    {
      "type": "TENSION",
      "context": "Discussao acalorada com seu melhor amigo.",
      "event": "No calor do momento, ele revela um segredo seu para terceiros presentes. Algo que voce confiou so a ele.",
      "options": [
        { "text": "Parar, olhar nos olhos dele e dizer: 'Isso foi baixo.'", "weights": { "vigor": 20, "presenca": 25, "filtro": 20, "harmonia": -10, "desapego": 10 }, "feedback": "Impacto cirurgico. Uma frase que ele nunca vai esquecer." },
        { "text": "Sair sem dizer nada. A amizade acabou ali.", "weights": { "desapego": 25, "vigor": 15, "harmonia": -25, "presenca": 10 }, "feedback": "Corte definitivo. Voce nao perdoa traicao." },
        { "text": "Fingir que nao te afetou e mudar de assunto.", "weights": { "desapego": 15, "filtro": 10, "vigor": -15, "presenca": -10 }, "feedback": "Mascara. Voce escondeu a dor mas ela vai cobrar depois." }
      ]
    }
  ]
}
```

**Step 6: Create deck index**

Create `src/data/decks/index.ts`:

```typescript
import basic01 from './basic_01.json';
import altaTensao from './alta_tensao.json';
import profissional from './profissional.json';
import social from './social.json';
import type { Deck } from '@/types/game';

export const ALL_DECKS: Deck[] = [
  basic01 as Deck,
  altaTensao as Deck,
  profissional as Deck,
  social as Deck,
];

export const getDeckById = (id: string): Deck | undefined =>
  ALL_DECKS.find(d => d.deckId === id);

export const DECK_UNLOCK_ORDER = ['basic_01', 'alta_tensao', 'profissional', 'social'];
```

**Step 7: Commit**

```bash
git add src/types/ src/data/
git commit -m "feat: add type definitions and 4 deck data files (40 scenarios)"
```

---

### Task 4: GameContext + LocalStorage Persistence

**Files:**
- Create: `src/context/GameContext.tsx`
- Create: `src/lib/storage.ts`
- Create: `src/lib/archetype.ts`

**Step 1: Create storage utility**

Create `src/lib/storage.ts`:

```typescript
import type { GameState, UserStats } from '@/types/game';
import { INITIAL_STATS } from '@/types/game';

const STORAGE_KEY = 'mindpractice_state';

export interface PersistedState {
  userStats: UserStats;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
  lastTrainingDate: string | null;
}

const DEFAULT_PERSISTED: PersistedState = {
  userStats: { ...INITIAL_STATS },
  unlockedDecks: ['basic_01'],
  completedDecks: {},
  lastTrainingDate: null,
};

export function loadState(): PersistedState {
  if (typeof window === 'undefined') return DEFAULT_PERSISTED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return DEFAULT_PERSISTED;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
```

**Step 2: Create archetype calculator**

Create `src/lib/archetype.ts`:

```typescript
import type { UserStats, StatKey, Archetype } from '@/types/game';
import { ARCHETYPES } from '@/types/game';

export function getTopTwoAxes(stats: UserStats): [StatKey, StatKey] {
  const entries = Object.entries(stats) as [StatKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return [entries[0][0], entries[1][0]];
}

export function determineArchetype(stats: UserStats): Archetype {
  const [first, second] = getTopTwoAxes(stats);

  // Find archetype matching the top 2 axes (order independent)
  const match = ARCHETYPES.find(
    (a) =>
      (a.axes[0] === first && a.axes[1] === second) ||
      (a.axes[0] === second && a.axes[1] === first)
  );

  // Fallback to closest match based on first axis
  if (!match) {
    const fallback = ARCHETYPES.find(
      (a) => a.axes[0] === first || a.axes[1] === first
    );
    return fallback || ARCHETYPES[0];
  }

  return match;
}
```

**Step 3: Create GameContext**

Create `src/context/GameContext.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Deck, UserStats, StatKey, GameState } from '@/types/game';
import { INITIAL_STATS, INERTIA_PENALTY } from '@/types/game';
import { loadState, saveState, resetState as resetStorage } from '@/lib/storage';
import { DECK_UNLOCK_ORDER } from '@/data/decks';

type Action =
  | { type: 'INIT'; payload: ReturnType<typeof loadState> }
  | { type: 'START_DECK'; payload: Deck }
  | { type: 'ANSWER'; payload: Partial<Record<StatKey, number>> }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'COMPLETE_DECK' }
  | { type: 'RESET' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        userStats: action.payload.userStats,
        unlockedDecks: action.payload.unlockedDecks,
        completedDecks: action.payload.completedDecks,
        lastTrainingDate: action.payload.lastTrainingDate,
      };

    case 'START_DECK':
      return {
        ...state,
        activeDeck: action.payload,
        currentQuestion: 0,
      };

    case 'ANSWER': {
      const newStats = { ...state.userStats };
      for (const [key, value] of Object.entries(action.payload)) {
        newStats[key as StatKey] += value as number;
      }
      return { ...state, userStats: newStats };
    }

    case 'TIMEOUT': {
      const newStats = { ...state.userStats };
      for (const [key, value] of Object.entries(INERTIA_PENALTY)) {
        newStats[key as StatKey] += value as number;
      }
      return { ...state, userStats: newStats };
    }

    case 'NEXT_QUESTION':
      return { ...state, currentQuestion: state.currentQuestion + 1 };

    case 'COMPLETE_DECK': {
      if (!state.activeDeck) return state;
      const deckId = state.activeDeck.deckId;
      const now = new Date().toISOString();
      const newCompleted = { ...state.completedDecks, [deckId]: now };

      // Unlock next deck in order
      const currentIdx = DECK_UNLOCK_ORDER.indexOf(deckId);
      const nextDeckId = DECK_UNLOCK_ORDER[currentIdx + 1];
      const newUnlocked = [...state.unlockedDecks];
      if (nextDeckId && !newUnlocked.includes(nextDeckId)) {
        newUnlocked.push(nextDeckId);
      }

      return {
        ...state,
        activeDeck: null,
        currentQuestion: 0,
        completedDecks: newCompleted,
        unlockedDecks: newUnlocked,
        lastTrainingDate: now,
      };
    }

    case 'RESET':
      return {
        userStats: { ...INITIAL_STATS },
        activeDeck: null,
        currentQuestion: 0,
        unlockedDecks: ['basic_01'],
        completedDecks: {},
        lastTrainingDate: null,
      };

    default:
      return state;
  }
}

const initialState: GameState = {
  userStats: { ...INITIAL_STATS },
  activeDeck: null,
  currentQuestion: 0,
  unlockedDecks: ['basic_01'],
  completedDecks: {},
  lastTrainingDate: null,
};

interface GameContextValue {
  state: GameState;
  startDeck: (deck: Deck) => void;
  answer: (weights: Partial<Record<StatKey, number>>) => void;
  timeout: () => void;
  nextQuestion: () => void;
  completeDeck: () => void;
  resetGame: () => void;
  isDeckLocked: (deckId: string) => boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from LocalStorage on mount
  useEffect(() => {
    const persisted = loadState();
    dispatch({ type: 'INIT', payload: persisted });
  }, []);

  // Save to LocalStorage on relevant state changes
  useEffect(() => {
    saveState({
      userStats: state.userStats,
      unlockedDecks: state.unlockedDecks,
      completedDecks: state.completedDecks,
      lastTrainingDate: state.lastTrainingDate,
    });
  }, [state.userStats, state.unlockedDecks, state.completedDecks, state.lastTrainingDate]);

  const isDeckLocked = useCallback(
    (deckId: string): boolean => {
      if (!state.unlockedDecks.includes(deckId)) return true;

      // Check 24h time-lock: find the previous deck in order
      const idx = DECK_UNLOCK_ORDER.indexOf(deckId);
      if (idx <= 0) return false; // First deck is never locked
      const prevDeckId = DECK_UNLOCK_ORDER[idx - 1];
      const completedAt = state.completedDecks[prevDeckId];
      if (!completedAt) return true;

      const elapsed = Date.now() - new Date(completedAt).getTime();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return elapsed < TWENTY_FOUR_HOURS;
    },
    [state.unlockedDecks, state.completedDecks]
  );

  const value: GameContextValue = {
    state,
    startDeck: (deck) => dispatch({ type: 'START_DECK', payload: deck }),
    answer: (weights) => dispatch({ type: 'ANSWER', payload: weights }),
    timeout: () => dispatch({ type: 'TIMEOUT' }),
    nextQuestion: () => dispatch({ type: 'NEXT_QUESTION' }),
    completeDeck: () => dispatch({ type: 'COMPLETE_DECK' }),
    resetGame: () => {
      resetStorage();
      dispatch({ type: 'RESET' });
    },
    isDeckLocked,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
```

**Step 4: Commit**

```bash
git add src/context/ src/lib/
git commit -m "feat: add GameContext, LocalStorage persistence, and archetype calculator"
```

---

### Task 5: App Layout + Bottom Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/BottomNav.tsx`

**Step 1: Create BottomNav component**

Create `src/components/BottomNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/decks',
    label: 'Desafio',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    href: '/config',
    label: 'Config',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav during gameplay
  if (pathname?.startsWith('/play')) return null;

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 px-6 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around py-3">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center gap-1">
              <motion.div
                className={`transition-colors duration-200 ${isActive ? 'text-accent-purple' : 'text-white/40'}`}
                whileTap={{ scale: 0.9 }}
              >
                {tab.icon}
              </motion.div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-accent-purple' : 'text-white/40'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 h-0.5 w-6 rounded-full bg-accent-purple"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '@/context/GameContext';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'MindPractice',
  description: 'Simulador de Reatividade Social',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <GameProvider>
          <main className="min-h-screen pb-20">{children}</main>
          <BottomNav />
        </GameProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx src/components/BottomNav.tsx
git commit -m "feat: add app layout with glassmorphism bottom navigation"
```

---

### Task 6: Home Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build Home page**

Replace `src/app/page.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { determineArchetype } from '@/lib/archetype';

export default function Home() {
  const { state } = useGame();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const totalAnswered = Object.keys(state.completedDecks).length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-accent-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent-purple/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center gap-8 text-center"
      >
        {/* Logo / Title */}
        <div>
          <motion.h1
            className="text-5xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-gold">Mind</span>
            <span className="text-white">Practice</span>
          </motion.h1>
          <motion.p
            className="mt-3 text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Simulador de Reatividade Social
          </motion.p>
        </div>

        {/* Tagline */}
        <motion.p
          className="max-w-xs text-lg text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Descubra como voce reage sob pressao. Treine sua mente.
        </motion.p>

        {/* Current archetype preview if has played */}
        {hasPlayed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="glass-card px-6 py-4 text-center"
          >
            <p className="text-xs uppercase tracking-widest text-white/40">Seu Arquetipo</p>
            <p className="mt-1 text-xl font-semibold text-gold">
              {determineArchetype(state.userStats).name}
            </p>
            <p className="mt-1 text-xs text-white/40">{totalAnswered} deck{totalAnswered !== 1 ? 's' : ''} completado{totalAnswered !== 1 ? 's' : ''}</p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Link href="/decks">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-accent-purple px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-shadow hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]"
            >
              {hasPlayed ? 'Continuar Treinando' : 'Iniciar Desafio'}
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Home page with glassmorphism hero and CTA"
```

---

### Task 7: Deck Selection Page

**Files:**
- Create: `src/app/decks/page.tsx`
- Create: `src/components/DeckCard.tsx`

**Step 1: Create DeckCard component**

Create `src/components/DeckCard.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { Deck } from '@/types/game';

interface DeckCardProps {
  deck: Deck;
  isLocked: boolean;
  isCompleted: boolean;
  timeRemaining?: string;
  onSelect: () => void;
}

const levelColors: Record<string, string> = {
  leve: 'text-green-400',
  medio: 'text-yellow-400',
  extremo: 'text-red-400',
};

export default function DeckCard({ deck, isLocked, isCompleted, timeRemaining, onSelect }: DeckCardProps) {
  return (
    <motion.button
      onClick={isLocked ? undefined : onSelect}
      disabled={isLocked}
      whileHover={isLocked ? {} : { scale: 1.02, y: -2 }}
      whileTap={isLocked ? {} : { scale: 0.98 }}
      className={`glass-card relative w-full overflow-hidden p-6 text-left transition-all duration-300 ${
        isLocked
          ? 'cursor-not-allowed opacity-50 grayscale'
          : 'cursor-pointer hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
      }`}
    >
      {/* Glow effect for unlocked */}
      {!isLocked && !isCompleted && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-purple/5 to-transparent" />
      )}

      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute right-4 top-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
      )}

      {/* Lock icon */}
      {isLocked && (
        <div className="absolute right-4 top-4">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      )}

      <div className="relative z-10">
        <span className={`text-xs font-medium uppercase tracking-widest ${levelColors[deck.level] || 'text-white/40'}`}>
          {deck.level}
        </span>
        <h3 className="mt-2 text-xl font-bold text-white">{deck.name}</h3>
        <p className="mt-1 text-sm text-white/50">{deck.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
          <span>{deck.questions.length} perguntas</span>
          {timeRemaining && <span className="text-gold">Desbloqueia em {timeRemaining}</span>}
        </div>
      </div>
    </motion.button>
  );
}
```

**Step 2: Create Decks page**

Create `src/app/decks/page.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ALL_DECKS } from '@/data/decks';
import DeckCard from '@/components/DeckCard';

function getTimeRemaining(completedAt: string): string | undefined {
  const elapsed = Date.now() - new Date(completedAt).getTime();
  const remaining = 24 * 60 * 60 * 1000 - elapsed;
  if (remaining <= 0) return undefined;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

export default function DecksPage() {
  const router = useRouter();
  const { state, startDeck, isDeckLocked } = useGame();

  const handleSelect = (deck: typeof ALL_DECKS[number]) => {
    startDeck(deck);
    router.push(`/play/${deck.deckId}`);
  };

  return (
    <div className="mx-auto max-w-md px-6 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white">Escolha seu Deck</h1>
        <p className="mt-1 text-sm text-white/40">Complete desafios para desbloquear novos decks</p>
      </motion.div>

      <div className="mt-8 flex flex-col gap-4">
        {ALL_DECKS.map((deck, i) => {
          const locked = isDeckLocked(deck.deckId);
          const completed = !!state.completedDecks[deck.deckId];

          // Find previous deck completion time for time remaining
          const prevIdx = ALL_DECKS.findIndex((d) => d.deckId === deck.deckId) - 1;
          const prevDeck = prevIdx >= 0 ? ALL_DECKS[prevIdx] : null;
          const prevCompletedAt = prevDeck ? state.completedDecks[prevDeck.deckId] : undefined;
          const timeRemaining = locked && prevCompletedAt ? getTimeRemaining(prevCompletedAt) : undefined;

          return (
            <motion.div
              key={deck.deckId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <DeckCard
                deck={deck}
                isLocked={locked}
                isCompleted={completed}
                timeRemaining={timeRemaining}
                onSelect={() => handleSelect(deck)}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/decks/ src/components/DeckCard.tsx
git commit -m "feat: add deck selection page with lock/unlock system"
```

---

### Task 8: Play Engine (Slideshow + Timer + Options)

**Files:**
- Create: `src/app/play/[deckId]/page.tsx`
- Create: `src/components/ContextSlide.tsx`
- Create: `src/components/EventSlide.tsx`
- Create: `src/components/OptionsSlide.tsx`
- Create: `src/components/Timer.tsx`
- Create: `src/components/FeedbackOverlay.tsx`

**Step 1: Create Timer component**

Create `src/components/Timer.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TIMER_DURATION } from '@/types/game';

interface TimerProps {
  isRunning: boolean;
  onTimeout: () => void;
}

export default function Timer({ isRunning, onTimeout }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  useEffect(() => {
    setTimeLeft(TIMER_DURATION);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 0.05));
    }, 50);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeout]);

  const progress = timeLeft / TIMER_DURATION;
  const isUrgent = timeLeft <= 2;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="60" height="60" className="-rotate-90">
        {/* Background circle */}
        <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        {/* Progress circle */}
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#8b5cf6'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 22}
          strokeDashoffset={2 * Math.PI * 22 * (1 - progress)}
          className={`transition-colors duration-300 ${isUrgent ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]'}`}
        />
      </svg>
      <motion.span
        className={`absolute text-sm font-bold ${isUrgent ? 'text-red-400' : 'text-white/70'}`}
        animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        {Math.ceil(timeLeft)}
      </motion.span>
    </div>
  );
}
```

**Step 2: Create ContextSlide**

Create `src/components/ContextSlide.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface ContextSlideProps {
  context: string;
  questionNumber: number;
  totalQuestions: number;
}

export default function ContextSlide({ context, questionNumber, totalQuestions }: ContextSlideProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
    >
      <span className="text-xs font-medium uppercase tracking-widest text-accent-purple">
        {questionNumber}/{totalQuestions}
      </span>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 max-w-sm text-xl font-light leading-relaxed text-white/80"
      >
        {context}
      </motion.p>
    </motion.div>
  );
}
```

**Step 3: Create EventSlide**

Create `src/components/EventSlide.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface EventSlideProps {
  event: string;
}

export default function EventSlide({ event }: EventSlideProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        initial={{ x: [-2, 2, -2, 0] }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card max-w-sm p-8"
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <p className="text-lg font-medium leading-relaxed text-white">{event}</p>
      </motion.div>
    </motion.div>
  );
}
```

**Step 4: Create OptionsSlide**

Create `src/components/OptionsSlide.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { Option } from '@/types/game';
import Timer from './Timer';

interface OptionsSlideProps {
  options: Option[];
  timerRunning: boolean;
  onSelect: (option: Option) => void;
  onTimeout: () => void;
}

export default function OptionsSlide({ options, timerRunning, onSelect, onTimeout }: OptionsSlideProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6"
    >
      <Timer isRunning={timerRunning} onTimeout={onTimeout} />

      <div className="flex w-full max-w-sm flex-col gap-3">
        {options.map((option, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(option)}
            className="glass-card-hover p-4 text-left text-sm text-white/80 transition-all"
          >
            <span className="mr-2 text-accent-purple font-bold">{String.fromCharCode(65 + i)}.</span>
            {option.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
```

**Step 5: Create FeedbackOverlay**

Create `src/components/FeedbackOverlay.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface FeedbackOverlayProps {
  feedback: string;
  isTimeout?: boolean;
  onContinue: () => void;
}

export default function FeedbackOverlay({ feedback, isTimeout, onContinue }: FeedbackOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={onContinue}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-card max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isTimeout && (
          <div className="mb-3 text-xs font-medium uppercase tracking-widest text-red-400">
            Tempo esgotado
          </div>
        )}
        <p className="text-sm leading-relaxed text-white/70">{feedback}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="mt-5 rounded-lg bg-accent-purple/20 px-6 py-2 text-sm font-medium text-accent-purple transition-colors hover:bg-accent-purple/30"
        >
          Continuar
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
```

**Step 6: Create Play page (the engine)**

Create `src/app/play/[deckId]/page.tsx`:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks';
import type { Option } from '@/types/game';
import ContextSlide from '@/components/ContextSlide';
import EventSlide from '@/components/EventSlide';
import OptionsSlide from '@/components/OptionsSlide';
import FeedbackOverlay from '@/components/FeedbackOverlay';

type Phase = 'context' | 'event' | 'options' | 'feedback';

export default function PlayPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;
  const { state, startDeck, answer, timeout, nextQuestion, completeDeck } = useGame();

  const [phase, setPhase] = useState<Phase>('context');
  const [feedback, setFeedback] = useState('');
  const [isTimeout, setIsTimeout] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);

  // Load deck on mount
  useEffect(() => {
    const deck = getDeckById(deckId);
    if (!deck) {
      router.replace('/decks');
      return;
    }
    if (!state.activeDeck || state.activeDeck.deckId !== deckId) {
      startDeck(deck);
    }
  }, [deckId]);

  const currentDeck = state.activeDeck;
  const currentQ = currentDeck?.questions[state.currentQuestion];

  // Auto-advance from context -> event -> options
  useEffect(() => {
    if (phase === 'context') {
      const timer = setTimeout(() => setPhase('event'), 2500);
      return () => clearTimeout(timer);
    }
    if (phase === 'event') {
      const timer = setTimeout(() => {
        setPhase('options');
        setTimerRunning(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleSelect = useCallback(
    (option: Option) => {
      setTimerRunning(false);
      answer(option.weights);
      setFeedback(option.feedback);
      setIsTimeout(false);
      setPhase('feedback');
    },
    [answer]
  );

  const handleTimeout = useCallback(() => {
    setTimerRunning(false);
    timeout();
    setFeedback('Voce travou sob pressao. Inercia aplicada.');
    setIsTimeout(true);
    setPhase('feedback');
  }, [timeout]);

  const handleContinue = useCallback(() => {
    if (!currentDeck) return;
    const nextIdx = state.currentQuestion + 1;
    if (nextIdx >= currentDeck.questions.length) {
      completeDeck();
      router.push(`/resultado/${deckId}`);
    } else {
      nextQuestion();
      setPhase('context');
    }
  }, [state.currentQuestion, currentDeck, deckId, completeDeck, nextQuestion, router]);

  if (!currentDeck || !currentQ) return null;

  return (
    <div className="relative min-h-screen">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-white/5">
        <div
          className="h-full bg-accent-purple transition-all duration-500"
          style={{ width: `${((state.currentQuestion + (phase === 'feedback' ? 1 : 0)) / currentDeck.questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'context' && (
          <ContextSlide
            key={`context-${state.currentQuestion}`}
            context={currentQ.context}
            questionNumber={state.currentQuestion + 1}
            totalQuestions={currentDeck.questions.length}
          />
        )}
        {phase === 'event' && (
          <EventSlide key={`event-${state.currentQuestion}`} event={currentQ.event} />
        )}
        {phase === 'options' && (
          <OptionsSlide
            key={`options-${state.currentQuestion}`}
            options={currentQ.options}
            timerRunning={timerRunning}
            onSelect={handleSelect}
            onTimeout={handleTimeout}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'feedback' && (
          <FeedbackOverlay
            feedback={feedback}
            isTimeout={isTimeout}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add src/app/play/ src/components/Timer.tsx src/components/ContextSlide.tsx src/components/EventSlide.tsx src/components/OptionsSlide.tsx src/components/FeedbackOverlay.tsx
git commit -m "feat: add play engine with slideshow, timer, and feedback system"
```

---

### Task 9: Result Page

**Files:**
- Create: `src/app/resultado/[deckId]/page.tsx`
- Create: `src/components/StatBar.tsx`

**Step 1: Create StatBar component**

Create `src/components/StatBar.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { StatKey } from '@/types/game';

interface StatBarProps {
  label: string;
  statKey: StatKey;
  value: number;
  maxValue: number;
  delay?: number;
}

const statColors: Record<StatKey, string> = {
  vigor: '#ef4444',
  harmonia: '#22c55e',
  filtro: '#3b82f6',
  presenca: '#f59e0b',
  desapego: '#8b5cf6',
};

export default function StatBar({ label, statKey, value, maxValue, delay = 0 }: StatBarProps) {
  const percentage = maxValue > 0 ? Math.max(0, Math.min(100, (value / maxValue) * 100)) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-right text-xs font-medium text-white/50">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: statColors[statKey] }}
        />
      </div>
      <span className="w-10 text-xs font-medium text-white/40">{value}</span>
    </div>
  );
}
```

**Step 2: Create Result page**

Create `src/app/resultado/[deckId]/page.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { determineArchetype } from '@/lib/archetype';
import StatBar from '@/components/StatBar';
import type { StatKey } from '@/types/game';

const statLabels: Record<StatKey, string> = {
  vigor: 'Vigor',
  harmonia: 'Harmonia',
  filtro: 'Filtro',
  presenca: 'Presenca',
  desapego: 'Desapego',
};

export default function ResultadoPage() {
  const { state } = useGame();
  const archetype = determineArchetype(state.userStats);

  const values = Object.values(state.userStats);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      {/* Background effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-accent-purple/10 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full text-center"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-medium uppercase tracking-[0.2em] text-white/40"
        >
          Seu Arquetipo Provisorio
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="mt-4 text-4xl font-bold text-gold"
        >
          {archetype.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-3 text-sm text-white/50"
        >
          {archetype.description}
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="glass-card mt-8 space-y-3 p-6"
        >
          {(Object.keys(statLabels) as StatKey[]).map((key, i) => (
            <StatBar
              key={key}
              label={statLabels[key]}
              statKey={key}
              value={state.userStats[key]}
              maxValue={maxValue}
              delay={1.4 + i * 0.15}
            />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="mt-8"
        >
          <Link href="/decks">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-white/5 px-8 py-3 text-sm font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Voltar aos Decks
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/resultado/ src/components/StatBar.tsx
git commit -m "feat: add result page with archetype display and animated stat bars"
```

---

### Task 10: Config Page

**Files:**
- Create: `src/app/config/page.tsx`

**Step 1: Create Config page**

Create `src/app/config/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';

export default function ConfigPage() {
  const { state, resetGame } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const totalCompleted = Object.keys(state.completedDecks).length;

  return (
    <div className="mx-auto max-w-md px-6 pt-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
        <p className="mt-1 text-sm text-white/40">Gerencie seu progresso</p>
      </motion.div>

      <div className="mt-8 space-y-4">
        {/* Stats summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-medium text-white/60">Progresso</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/30">Decks completados</p>
              <p className="text-lg font-bold text-white">{totalCompleted}</p>
            </div>
            <div>
              <p className="text-white/30">Perguntas respondidas</p>
              <p className="text-lg font-bold text-white">{totalCompleted * 10}</p>
            </div>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-medium text-white/60">Sobre</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/40">
            MindPractice e um simulador de reatividade social que identifica seu arquetipo
            comportamental atraves de micro-conflitos sob pressao. Seus resultados acumulam
            ao longo dos dias para criar sua assinatura comportamental unica.
          </p>
        </motion.div>

        {/* Reset */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-medium text-white/60">Resetar Progresso</h3>
          <p className="mt-1 text-xs text-white/30">Apaga todos os stats e desbloqueia apenas o deck basico.</p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="mt-3 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              Resetar Tudo
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  resetGame();
                  setShowConfirm(false);
                }}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-medium text-red-400"
              >
                Confirmar Reset
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white/40"
              >
                Cancelar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/config/
git commit -m "feat: add config page with progress summary and reset"
```

---

### Task 11: Final Verification + Polish

**Step 1: Run dev server and verify all routes**

Run: `npm run dev`
Check:
- `/` - Home page loads with CTA
- `/decks` - Shows 4 deck cards, only basic unlocked
- `/play/basic_01` - Game engine works (context -> event -> options -> feedback loop)
- `/resultado/basic_01` - Shows archetype and stats
- `/config` - Settings page with reset
- Bottom nav works on all pages except `/play/*`

**Step 2: Run build to check for errors**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: address build issues and polish"
```
