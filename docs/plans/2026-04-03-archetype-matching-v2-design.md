# Archetype Matching v2 Design

**Date:** 2026-04-03
**Goal:** Replace lookup-table archetype matching with distance-based matching using ideal profiles, axis confidence weighting, and change inertia.

## Core Principle

Each archetype has an ideal behavioral profile (5-axis vector). The system measures how close the player is to each profile, weighted by how reliable each axis's data is. Archetypes only change when there's strong evidence.

## Ideal Profiles

Each archetype is defined by a 5-axis vector (0.0 to 1.0):

| Arquétipo | vigor | harmonia | filtro | presenca | desapego | category |
|-----------|-------|----------|--------|----------|----------|----------|
| Soberano | 0.55 | 0.55 | 0.55 | 0.55 | 0.55 | especial |
| Vulcao | 0.95 | 0.10 | 0.10 | 0.50 | 0.20 | puro |
| Tubarao | 0.85 | 0.10 | 0.30 | 0.80 | 0.35 | cruzado |
| Fantasma | 0.10 | 0.25 | 0.90 | 0.10 | 0.85 | cruzado |
| Diplomata | 0.15 | 0.85 | 0.40 | 0.75 | 0.30 | cruzado |
| Muralha | 0.75 | 0.20 | 0.85 | 0.35 | 0.30 | cruzado |
| Estoico | 0.20 | 0.35 | 0.80 | 0.25 | 0.90 | cruzado |
| Justiceiro | 0.80 | 0.70 | 0.30 | 0.45 | 0.15 | cruzado |
| Enigma | 0.20 | 0.30 | 0.45 | 0.80 | 0.75 | cruzado |
| Pacificador | 0.15 | 0.80 | 0.75 | 0.30 | 0.40 | cruzado |
| Mercenario | 0.75 | 0.10 | 0.40 | 0.30 | 0.85 | cruzado |
| Rebelde | 0.70 | 0.10 | 0.20 | 0.50 | 0.85 | cruzado |
| Monge | 0.10 | 0.80 | 0.35 | 0.20 | 0.85 | cruzado |
| Camaleao | 0.70 | 0.75 | 0.35 | 0.50 | 0.30 | cruzado |
| Estrategista | 0.30 | 0.25 | 0.85 | 0.75 | 0.40 | cruzado |

### Profile Design Logic

- Primary axes (from existing `axes` field): 0.75-0.95
- Secondary axes that fit the personality: 0.30-0.50
- Opposing axes: 0.10-0.25
- Mercenario vs Rebelde: same dominant axes but Rebelde has low filtro (0.20) vs Mercenario (0.40) — Rebelde doesn't filter himself
- Justiceiro vs Camaleao: Justiceiro has very low desapego (0.15) because he cares deeply; Camaleao is more balanced

## Matching Algorithm

```
function matchArchetype(axes, recentWeights, totalResponses, currentArchetypeId):

  1. Normalize player axes to 0-1 range
     normalized[key] = (axes[key] - min) / (max - min)
     (if all values equal, all become 0.5)

  2. Calculate per-axis confidence (how consistent the data is)
     For each axis:
       confidence[key] = clamp(1 - (stddev(recentWeights[key]) / 30), 0.1, 1.0)
     Axes with contradictory data → low confidence → less weight in matching

  3. Score each archetype
     For each archetype profile:
       score = sum over all 5 axes of:
         confidence[key] * (1 - abs(normalized[key] - profile[key]))
       score = score / 5  (normalize to 0-1 range)

  4. Apply change inertia
     If totalResponses >= 20 AND currentArchetypeId exists:
       Current archetype gets 15% bonus: current.score *= 1.15
     If totalResponses < 20:
       No bonus (discovery phase, free to change)

  5. Return archetype with highest score
```

## What Changes vs Current System

- All 5 axes matter (not just top 2)
- Weak/contradictory axes automatically weighted less via confidence
- 15% inertia margin to change archetype = stability without rigidity
- Discovery phase (< 20 responses) = changes freely
- Tone history no longer used in matching (profiles differentiate via axis values)
- `matchArchetype` signature changes: adds `recentWeights`, `totalResponses`, `currentArchetypeId`

## What Does NOT Change

- List of 15 archetypes (names, descriptions, taglines)
- CalibrationState structure
- Dampened weights system
- Run scoring (completion, decisiveness, coherence)
- Archetype interface (just add `idealProfile` field)

## Files to Modify

- `src/data/archetypes.ts` — add idealProfile to each archetype, rewrite matchArchetype
- `src/types/game.ts` — add `idealProfile` to Archetype interface
- `src/context/GameContext.tsx` — update matchArchetype calls to pass new params
- `src/app/play/[deckId]/page.tsx` — no changes needed (uses GameContext)
