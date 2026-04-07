# Flow & Friction Improvements Design

**Date:** 2026-04-04
**Goal:** Reduce friction in navigation flow, eliminate redundancy, simplify post-game results.

---

## A. Deck Selection — Hold to Play

**Current:** Select deck → slot appears → tap "Jogar" button → game starts
**New:** Select deck → slot appears → **hold "Jogar" 1s** with visual progress → game starts

- Reuse existing `HoldButton` component (already supports configurable duration + progress bar)
- Duration: 1000ms (longer than in-game 500ms to feel deliberate)
- Shows fill progress animation on the button itself
- Prevents accidental game starts while keeping flow smooth
- Haptic feedback on completion (if enabled)

## B. Home = Pure Feed

**Current:** Home shows archetype card, precision bar, stat pills + suggestions + daily mission
**New:** Home shows ONLY feed content — zero stats/data

Keep:
- Compact hero (title + welcome back message, no archetype name)
- Daily mission card
- Suggested decks
- Premium deck teasers
- CTA button

Remove:
- Archetype card (name, tagline, precision bar)
- Stat pills (vigor, harmonia, etc.)

All data lives exclusively in Dashboard and Perfil.

## C. Resultado Simplificado

**Current:** Full archetype profile hero + featured snapshot + run history + 3 equal buttons (Dashboard, Perfil, Decks)

**New:** Clean minimal result with expandable details

### Visible by default:
- Deck completion badge (deck name + "Concluido")
- Current archetype name (large, prominent)
- Change indicator: "Arquetipo mudou!" (gold badge) or "Manteve-se" (subtle)
- One primary CTA: **"Proximo Deck"** → navigates to /decks

### Collapsed section ("Ver detalhes"):
- Tap to expand/collapse with smooth animation
- Contains: axis snapshot bars, precision/consistency, run score breakdown
- Uses existing RunReportCard or similar components

### Removed:
- 3 equal navigation buttons at bottom
- Full ArchetypeProfileHero (too heavy for results)
- Run history (that's Dashboard's job)
