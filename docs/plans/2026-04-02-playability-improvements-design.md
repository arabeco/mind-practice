# Playability Improvements Design

**Date:** 2026-04-02
**Goal:** Make the game playable for a normal human — more generous timing, no timeout punishment, silent response time tracking.

## Core Principle

Time is data, not punishment. A player who thinks longer has a different profile — not a worse one.

## Changes

### 1. Scene Text Phases (Context + Event)

Auto-advance kept, but with more generous timings:

- **Context phase:** 3-6s (was 2.2-4.2s)
  - Formula: `clamp(2200 + contextWords * 45ms, 3000, 6000)`
  - Skip allowed after 3s minimum
- **Event phase:** 2.5-5s (was 1.6-3.2s)
  - Formula: `clamp(1800 + eventWords * 38ms, 2500, 5000)`
  - Skip allowed after 3s minimum

### 2. Options Phase — No Timer

- Remove visible timer (SVG circular component)
- Remove timeout logic entirely
- Player responds when ready — no countdown, no "tempo esgotado"
- Subtle ambient indicator: background slowly evolves the longer the player takes (no numbers, no urgency)

### 3. Silent Response Time Tracking

- Record `responseTimeMs` on each `RunAnswerEvent` (time from options appearing to hold confirm)
- This data is stored for future use in archetype/profile calculations
- No gameplay impact for now — purely data collection

### 4. Hold Duration Reduced

- 500ms instead of 1000ms (less friction, faster confirm)

### 5. Remove Timeout Penalty

- Remove `TIMEOUT` action from GameContext reducer
- Remove inertia penalty logic (vigor -15, presenca -15)
- Remove timeout counter from RunSession tracking

## What Does NOT Change

- Weight/stats/calibration system
- Deck structure and questions
- Delay/suspense phase between event and options
- Archetype and scoring system
- Backdrop visuals and tension effects
- Scene presentation logic (tier colors, environment themes)

## Files to Modify

- `src/hooks/useSceneDirector.ts` — update phase timings
- `src/components/play/SceneOptionsStage.tsx` — remove Timer, add ambient indicator
- `src/components/Timer.tsx` — may be removed or kept for future use
- `src/components/HoldButton.tsx` — reduce hold to 500ms
- `src/context/GameContext.tsx` — remove TIMEOUT action, add responseTimeMs to answers
- `src/types/game.ts` — add responseTimeMs to RunAnswerEvent, remove timeout-related fields if needed
