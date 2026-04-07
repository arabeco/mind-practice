# MindPractice UX Overhaul Design

**Date:** 2026-04-06
**Status:** Approved

## Summary

Complete UX overhaul to make MindPractice addictive, shareable, and desirable. Covers onboarding, retention loop, social features, monetization psychology, navigation simplification, and polish.

---

## A. Onboarding (first-time only)

3 fullscreen story slides shown once (persist flag in localStorage):
- Slide 1: "Situacoes reais. Reacoes suas." — visual of a scene
- Slide 2: "Cada escolha revela quem voce e." — 5 axes appearing
- Slide 3: "Descubra seu arquetipo." — CTA "Jogar agora"

"Jogar agora" skips home, goes straight to `/play/basic_01`. Home only appears AFTER first deck completion.

## B. Retention Loop

### B1. Streak counter
Days-in-a-row counter on home. Visual fire emoji. Breaking streak hurts, maintaining feels rewarding. Stored in localStorage (Supabase-ready).

### B2. Archetype change banner
When archetype changes between sessions, home shows dramatic banner: "Voce deixou de ser X. Agora e Y." Links to profile.

### B3. Daily quick challenge
1 standalone question per day (not a full deck). 30 seconds. Awards fichas on completion. Keeps daily habit without 10min commitment.

### B4. Mini radar on home
Pentagon chart of 5 axes. Updates as user plays. People love seeing graphs about themselves change.

### B5. Fichas from gameplay (not just daily)
Bonus fichas for:
- Completing deck without timeout: +5
- 7-day streak: +20
- First deck of day: +3
- Sharing result: +5

## C. Social / Sharing

### C1. Shareable archetype card
Button on result + profile generates an image (html2canvas or SVG-to-PNG):
- Archetype name + tagline
- 5-axis radar
- Tier visual
- Nickname
- "Eu sou O Fantasma. E voce?" + app link

### C2. Invite link with comparison
Share link: "Jogue e compare com [nome]". After playing same deck, shows side-by-side: "Voce: Tubarao. Amigo: Diplomata. 73% diferenca no eixo Vigor." (Future — requires Supabase)

### C3. Friend rankings
Per-deck leaderboard among friends who played the same deck. Not global. (Future — requires Supabase)

## D. Purchase Desire

### D1. Scene preview before buying
Locked deck click opens modal with first scene's context text visible (read-only, no options). User feels the scenario atmosphere, then sees "Continue por X fichas". Creates emotional investment before purchase.

### D2. Weekly discount countdown
1 deck per week at 50% off with visible timer: "23h restantes". Rotates weekly. Creates urgency.

### D3. "Most played this week" badge
Social proof badge on popular decks in shop. Simulated initially, real with Supabase later.

## E. Result Screen

### E1. Archetype reveal with shimmer/glow
Instead of instant show: brief dark moment, then name appears with a shimmer/glow effect. Simple but gives weight to the moment. No elaborate animation.

### E2. Evolution timeline
"Dia 1: Vulcao -> Dia 5: Tubarao -> Dia 12: Soberano". Shows archetype journey over time. Built from snapshots already stored.

## F. Navigation Simplification

### F1. Merge Dashboard + Profile
Combine into single "Perfil" tab: portrait on top, axes + stats + history below (scrollable). Frees one tab slot.

### F2. Loja inside Decks
Remove separate Loja tab. In /decks page, locked cards show price directly. Click opens modal with buy option. Shop becomes a filter/section within decks, not a separate destination.

### F3. Final nav: 3 tabs
Home | Decks | Perfil. Clean. Less cognitive load. Center tab = Decks (elevated).

### F4. Swipe between scenes in play
Allow horizontal swipe to advance context->event (in addition to tap). Hold-to-confirm stays on options only.

## G. Polish

### G1. Better haptics
Add subtle vibration on: archetype reveal, streak counter pulse, deck card scroll.

### G2. Ambient sound per deck theme
Different ambient loops based on deck.tema (office noise, street sounds, quiet room). Infrastructure already exists.

### G3. Shared element transitions
Tarot card flies from grid to modal to play. Premium feel. (Stretch goal)

### G4. Contrast improvement
Raise text opacity from white/30-40% to white/50-60% on informational text. Keep decorative text low.

---

## Rejected

- Personalized phrase per result (too much work for now)
- Comparison with average players (requires Supabase aggregate data)
- Elaborate archetype reveal animation (simple shimmer/glow instead)

## Implementation Priority

1. Navigation simplification (F1-F3) — foundation for everything else
2. Onboarding (A) — critical for new users
3. Home redesign with streak + radar + daily challenge (B1-B4)
4. Result screen improvements (E1-E2)
5. Scene preview for locked decks (D1)
6. Shareable archetype card (C1)
7. Fichas from gameplay (B5)
8. Purchase psychology (D2-D3)
9. Polish (G1-G4)
10. Social/comparison features (C2-C3, future)
