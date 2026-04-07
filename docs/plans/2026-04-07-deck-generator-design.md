# Deck Generator — Design Doc

**Date:** 2026-04-07
**Goal:** Create a CLI-based deck generation workflow that supports flexible options (3-5 per question), shorter texts, and nuanced behavioral weights. Claude writes the JSON content directly; CLI scripts validate and register new decks.

---

## Problems Solved

1. **Only 3 options per question** — too predictable (aggressive / passive / balanced)
2. **Texts too long** — context slides up to 54 words, player loses interest before the decision
3. **No generator** — all 6 decks hand-written, no scalable way to create new content
4. **Options lack nuance** — no room for "same action, different intention" (e.g., "stay quiet but furious" vs "stay quiet and unbothered")

---

## New Content Rules

### Text Length Limits

| Field | Before | After |
|-------|--------|-------|
| Context slide (tipo: contexto) | Up to 54 words | **Max 25 words** |
| Event slide (tipo: evento) | Up to 50 words | **Max 20 words** |
| Option text | Up to 22 words | **Max 15 words** |
| Feedback text | Up to 30 words | **Max 15 words** |

### Flexible Option Count

| Question tension | Options |
|-----------------|---------|
| tensao 1-2 (low) | 3 options |
| tensao 3 (medium) | 3-4 options |
| tensao 4-5 (high) | 4-5 options |

Options may have **similar external actions but different internal intentions**. Example:
- "Não falo nada mas fico fervendo" → filtro +2, vigor -1, desapego -1
- "Não falo nada e nem ligo" → desapego +3, presenca -2

### Weight Calibration Rules

1. **Primary weight:** +2 to +3 on the dominant axis
2. **Penalty:** -1 to -2 on 1-2 opposing axes
3. **Net sum per option ≈ 0** (between -1 and +1)
4. **Each of the 5 axes** (vigor, harmonia, filtro, presenca, desapego) must appear as dominant in at least 1 option across the full deck
5. **Higher tension → larger weights** (±3), lower tension → smaller (±1 to ±2)
6. **Every option must have at least one positive and one negative weight** (trade-off rule, already enforced by validator)

### Axis Definitions (for content authoring)

| Axis | High means | Low means |
|------|-----------|-----------|
| vigor | Confrontation, assertiveness, action | Avoidance, passivity |
| harmonia | Connection, empathy, diplomacy | Coldness, selfishness |
| filtro | Self-control, strategy, restraint | Impulsiveness, transparency |
| presenca | Awareness, timing, reading the room | Distraction, oblivion |
| desapego | Letting go, acceptance, detachment | Attachment, grudges, control |

---

## CLI Scripts

### `npm run deck:validate <path>`

Validates a deck JSON file against all rules:
- 10 questions (7 NORMAL, 1 RANDOM, 1 SOCIAL, 1 TENSION)
- 3-5 options per question (relaxed from exactly 3)
- Each option has trade-off weights (positive + negative)
- Text length limits enforced (word counts)
- All required metadata fields present
- Colorized terminal output with pass/fail per check

### `npm run deck:register <deckId>`

Registers an existing deck JSON into the app:
- Adds import to `src/data/decks/index.ts`
- Adds to ALL_DECKS array
- Adds to category map
- Updates DECK_PRICES if price provided

### `npm run deck:rewrite`

Batch rewrites all existing 6 decks to comply with new rules:
- Shortens context/event texts
- Adjusts option counts based on tension
- Rebalances weights
- Validates after rewrite

---

## Deck Generation Workflow

```
User: "cria um deck sobre família, tensão média"
    ↓
Claude: writes full JSON to src/data/decks/<deckId>.json
    ↓
npm run deck:validate src/data/decks/<deckId>.json
    ↓ (passes)
npm run deck:register <deckId>
    ↓
Deck live in the app
```

---

## Code Changes Required

### 1. Update `validateDeck.ts`

- Relax option count: 3-5 instead of exactly 3
- Add word count checks for slides, options, feedback
- Export validation function for CLI use

### 2. Update `SceneOptionsStage.tsx`

- Support 4-5 options layout (currently hardcoded for 3)
- 3 options: single column (current)
- 4 options: 2x2 grid
- 5 options: 2+2+1 grid or scrollable column with smaller cards

### 3. Update `types/game.ts`

- No type changes needed — Option[] already supports any length
- Add JSDoc comments on max word counts for documentation

### 4. Create CLI scripts

- `scripts/validate-deck.ts` — standalone validator with colorized output
- `scripts/register-deck.ts` — auto-registers deck in index
- `scripts/rewrite-decks.ts` — batch rewrite helper

### 5. Rewrite existing 6 decks

- `basic_01.json` — shorten texts, keep 3 options (low tension)
- `profissional.json` — shorten texts, add 4th option on high-tension questions
- `alta_tensao.json` — shorten texts, expand to 4-5 options
- `holofote.json` — shorten texts, expand to 4-5 options
- `social.json` — shorten texts, expand to 3-4 options
- `livro_amaldicoado.json` — shorten texts, expand to 4-5 options

---

## Question Type Distribution (per deck, unchanged)

| Type | Count | Description |
|------|-------|-------------|
| NORMAL | 7 | Standard scenario |
| RANDOM | 1 | High unpredictability |
| SOCIAL | 1 | Social/group dynamics |
| TENSION | 1 | Maximum pressure |

---

## Option Tone Distribution

Each option gets a `tone` from: pragmatico, provocativo, protetor, evasivo, neutro.

With 3-5 options, tones can repeat if the nuance is different. Two options can both be "evasivo" if one is evasive-angry and the other is evasive-indifferent.

---

## Success Criteria

- [ ] `npm run deck:validate` catches all rule violations with clear messages
- [ ] `npm run deck:register` adds a deck to the app in one command
- [ ] Existing 6 decks rewritten with shorter texts and flexible option counts
- [ ] SceneOptionsStage renders 3, 4, or 5 options cleanly on mobile
- [ ] New deck can be created and playable in under 5 minutes
