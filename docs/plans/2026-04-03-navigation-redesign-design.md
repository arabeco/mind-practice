# Navigation Redesign Design

**Date:** 2026-04-03
**Goal:** Redesign app navigation from 3 tabs to 5 tabs with dedicated pages for each section.

## Bottom Nav (5 tabs)

| Pos | Tab | Purpose |
|-----|-----|---------|
| 1 | **Home** | Sugestoes de decks, missao do dia, decks premium com cadeado |
| 2 | **Dashboard** | Radar stats, ultimas runs, rankings E-S por deck, atividade |
| 3 | **Decks** (centro, destaque) | Biblioteca completa, slot inferior de selecao → jogo direto |
| 4 | **Loja/Mundo** | UI bonita, desbloquear conteudo premium |
| 5 | **Perfil** | Arte 9:16 do arquetipo, nickname, precision, consistency, config |

## Page Details

### Home
- Sugestoes personalizadas baseadas no perfil
- Missao do dia (1 deck gratuito rotativo)
- Decks premium com cadeadinho
- Call-to-action principal para jogar

### Dashboard
- Radar de stats (5 eixos)
- Historico de runs recentes
- Rankings E→S por deck completado
- Metricas de atividade

### Decks (tab central)
- Biblioteca completa de todos os decks
- Ao selecionar um deck: slot central inferior bonito com preview do deck
- Clicar no slot → vai direto pro jogo
- Categorias: essenciais, arquetipos, cenarios

### Loja/Mundo
- UI bonita e imersiva
- Desbloquear decks novos
- Conteudo premium

### Perfil
- Arte vertical 9:16 do arquetipo (poster visual)
- Nickname do jogador (editavel)
- Barrinhas de precision e consistency
- Botoes de config:
  - Editar nickname
  - Settings
  - Deletar conta / reset
  - About/versao

## Flow Principal

1. Jogador abre app → Home com sugestoes
2. Quer escolher deck → Decks (centro) → seleciona → slot bonito → joga
3. Pos-jogo → resultado → volta a Home
4. Quer ver stats → Dashboard
5. Quer ver quem e → Perfil (visual, limpo)
6. Quer novo conteudo → Loja

## What Changes vs Current

- Bottom nav: 3 tabs (Home, Desafio, Config) → 5 tabs
- /config page → split into Dashboard + Perfil
- /decks → redesigned with selection slot
- New: Loja/Mundo page
- New: Dashboard page
- New: Home redesigned with suggestions

## What Does NOT Change

- /play/[deckId] gameplay
- /resultado/[deckId] post-game results
- Game engine, calibration, archetype system
- Deck data structure
