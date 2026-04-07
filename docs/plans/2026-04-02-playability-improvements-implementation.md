# Playability Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove timer/timeout, increase scene text timings, reduce hold duration, track response time silently with ambient background shift.

**Architecture:** Modify timing constants, remove TIMEOUT action flow entirely, add responseTimeMs to answer events, replace Timer with subtle ambient CSS animation on options stage.

**Tech Stack:** Next.js, React, TypeScript, Framer Motion, Tailwind CSS

---

### Task 1: Update constants in game types

**Files:**
- Modify: `src/types/game.ts:242-251`

**Step 1: Update constants**

Change `HOLD_DURATION_MS` from 1000 to 500. Remove `TIMER_DURATION` and `INERTIA_PENALTY` constants.

```typescript
// Remove these lines:
// export const TIMER_DURATION = 6;
// export const INERTIA_PENALTY: Partial<Record<StatKey, number>> = {
//   vigor: -15,
//   presenca: -15,
// };

// Change:
export const HOLD_DURATION_MS = 500;
```

**Step 2: Add responseTimeMs to RunAnswerEvent**

In `RunAnswerEvent` (line 102-108), add the field and remove `timedOut`:

```typescript
export interface RunAnswerEvent {
  questionId: string;
  tone: Tone | null;
  weights: Partial<Record<StatKey, number>>;
  dominantAxis: StatKey | null;
  timedOut: boolean; // keep for backwards compat with existing snapshots
  responseTimeMs?: number; // NEW: silent tracking
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Build errors from removed constants (expected, fixed in later tasks)

**Step 4: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: update game constants — remove timer/inertia, add responseTimeMs, reduce hold to 500ms"
```

---

### Task 2: Update scene phase timings

**Files:**
- Modify: `src/lib/scenePresentation.ts:180-201`

**Step 1: Update getScenePhaseTimings**

Change the timing formulas to be more generous, and set skip minimum to 3 seconds:

```typescript
export function getScenePhaseTimings(
  question: Question,
  reducedMotion = false,
): ScenePhaseTimings {
  const contextWords = countWords(getSlideText(question, 'contexto'));
  const eventWords = countWords(getSlideText(question, 'evento'));
  const optionStaggerMs = reducedMotion ? 45 : 90;

  // More generous timings
  const contextMs = clamp(2200 + contextWords * 45, 3000, 6000);
  const eventMs = clamp(1800 + eventWords * 38, 2500, 5000);
  const delayMs = getSceneDelay(question.metadata.tensao);
  const optionsReadyMs = (reducedMotion ? 150 : 220) + optionStaggerMs * 2;

  return {
    contextMs,
    contextSkipMs: 3000, // fixed 3s minimum before skip
    eventMs,
    eventSkipMs: 3000, // fixed 3s minimum before skip
    delayMs,
    optionStaggerMs,
    optionsReadyMs,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/scenePresentation.ts
git commit -m "feat: increase scene timings — context 3-6s, event 2.5-5s, 3s skip minimum"
```

---

### Task 3: Remove TIMEOUT from GameContext

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/lib/runScoring.ts`

**Step 1: Remove TIMEOUT action and applyInertia from GameContext**

In `src/context/GameContext.tsx`:

- Remove `INERTIA_PENALTY` from imports (line 20)
- Remove `| { type: 'TIMEOUT' }` from GameAction union (line 42)
- Remove the `applyInertia` function (line 91-93)
- Remove the entire `case 'TIMEOUT'` block from the reducer (lines 189-199)

**Step 2: Update appendRunAnswer to accept responseTimeMs**

In `src/lib/runScoring.ts`, update `appendRunAnswer`:

```typescript
export function appendRunAnswer(
  session: RunSession,
  questionId: string,
  tone: Tone,
  weights: Partial<Record<StatKey, number>>,
  responseTimeMs?: number,
): RunSession {
  const event: RunAnswerEvent = {
    questionId,
    tone,
    weights,
    dominantAxis: getDominantAxisFromWeights(weights),
    timedOut: false,
    responseTimeMs,
  };

  return {
    ...session,
    answeredCount: session.answeredCount + 1,
    answers: [...session.answers, event],
  };
}
```

**Step 3: Remove appendRunTimeout function** from `src/lib/runScoring.ts` (lines 77-91) and remove its import from GameContext.

**Step 4: Commit**

```bash
git add src/context/GameContext.tsx src/lib/runScoring.ts
git commit -m "feat: remove TIMEOUT action, inertia penalty, add responseTimeMs to answers"
```

---

### Task 4: Update useSceneDirector — remove timeout, track response time

**Files:**
- Modify: `src/hooks/useSceneDirector.ts`

**Step 1: Remove timeout handling, add response time tracking**

Remove `onTimeoutResolved` from params. Add `optionsShownAt` ref to track when options appeared. Pass `responseTimeMs` through `handleAnswer`. Remove `handleTimeout` and `timerRunning` state entirely.

```typescript
interface UseSceneDirectorParams {
  question: Question | null;
  reducedMotion?: boolean;
  onAnswerResolved: (option: Option, responseTimeMs: number) => void;
  // onTimeoutResolved removed
}

export function useSceneDirector({
  question,
  reducedMotion = false,
  onAnswerResolved,
}: UseSceneDirectorParams) {
  const [phase, setPhase] = useState<ScenePhase>('context');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [canTapAdvance, setCanTapAdvance] = useState(false);
  const [timings, setTimings] = useState<ScenePhaseTimings | null>(null);

  const timersRef = useRef<number[]>([]);
  const timingsRef = useRef<ScenePhaseTimings | null>(null);
  const onAnswerRef = useRef(onAnswerResolved);
  const optionsShownAtRef = useRef<number>(0);

  useEffect(() => {
    onAnswerRef.current = onAnswerResolved;
  }, [onAnswerResolved]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timerId => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const timerId = window.setTimeout(fn, ms);
    timersRef.current.push(timerId);
  }, []);

  const startOptionsPhase = useCallback(() => {
    clearTimers();
    setPhase('options');
    setCanTapAdvance(false);
    optionsShownAtRef.current = Date.now();
  }, [clearTimers]);

  const startPhase = useCallback((nextPhase: ScenePhase) => {
    const nextTimings = timingsRef.current;
    clearTimers();
    setPhase(nextPhase);
    setCanTapAdvance(false);

    if (!nextTimings) return;

    if (nextPhase === 'context') {
      schedule(() => setCanTapAdvance(true), nextTimings.contextSkipMs);
      schedule(() => startPhase('event'), nextTimings.contextMs);
      schedule(() => setCanTapAdvance(false), nextTimings.contextMs);
      return;
    }

    if (nextPhase === 'event') {
      schedule(() => setCanTapAdvance(true), nextTimings.eventSkipMs);
      schedule(() => startPhase('delay'), nextTimings.eventMs);
      schedule(() => setCanTapAdvance(false), nextTimings.eventMs);
      return;
    }

    if (nextPhase === 'delay') {
      schedule(startOptionsPhase, nextTimings.delayMs);
    }
  }, [clearTimers, schedule, startOptionsPhase]);

  const handleTapAdvance = useCallback(() => {
    if (!canTapAdvance) return;
    if (phase === 'context') { startPhase('event'); return; }
    if (phase === 'event') { startPhase('delay'); }
  }, [canTapAdvance, phase, startPhase]);

  const handleAnswer = useCallback((option: Option) => {
    clearTimers();
    const responseTimeMs = Date.now() - optionsShownAtRef.current;
    onAnswerRef.current(option, responseTimeMs);
    setSelectedFeedback(option.feedback);
    setPhase('feedback');
    setCanTapAdvance(false);
  }, [clearTimers]);

  useEffect(() => {
    if (!question) { clearTimers(); return; }
    const nextTimings = getScenePhaseTimings(question, reducedMotion);
    timingsRef.current = nextTimings;
    setTimings(nextTimings);
    setSelectedFeedback('');
    startPhase('context');
    return clearTimers;
  }, [question?.id, question, reducedMotion, clearTimers, startPhase]);

  return {
    phase,
    selectedFeedback,
    canTapAdvance,
    timings,
    handleTapAdvance,
    handleAnswer,
    // handleTimeout removed
    // timerRunning removed
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useSceneDirector.ts
git commit -m "feat: remove timeout from scene director, track responseTimeMs silently"
```

---

### Task 5: Update SceneOptionsStage — remove Timer, add ambient indicator

**Files:**
- Modify: `src/components/play/SceneOptionsStage.tsx`

**Step 1: Remove Timer, remove timeout props, add ambient background shift**

Remove `Timer` import, `timerRunning` and `onTimeout` props. Add a subtle CSS animation that slowly shifts the panel background over time (no numbers, no urgency).

```typescript
interface SceneOptionsStageProps {
  question: Question;
  onAnswer: (option: Option) => void;
  profile: ScenePresentationProfile;
  enableHaptics: boolean;
  // timerRunning removed
  // onTimeout removed
}
```

Replace the Timer section with a subtle animated border/glow that slowly evolves:

```tsx
{/* Subtle ambient indicator — background slowly shifts */}
<div className="absolute inset-0 rounded-[2rem] pointer-events-none animate-ambient-shift" />
```

Update the header text from "Decida sob pressao" to "Escolha sua reacao" and remove the timer-related subtitle.

**Step 2: Commit**

```bash
git add src/components/play/SceneOptionsStage.tsx
git commit -m "feat: remove timer from options stage, add subtle ambient indicator"
```

---

### Task 6: Update play page — wire new signatures

**Files:**
- Modify: `src/app/play/[deckId]/page.tsx`

**Step 1: Update handler signatures**

Update `handleResolvedAnswer` to accept `responseTimeMs` and pass it through to the ANSWER dispatch. The ANSWER action in GameContext needs to accept responseTimeMs and pass it to `appendRunAnswer`.

In `page.tsx`:
```typescript
const handleResolvedAnswer = useCallback((option: Option, responseTimeMs: number) => {
  dispatch({ type: 'ANSWER', weights: option.weights, tone: option.tone, responseTimeMs });
  playUiCue('hold-confirm');
  vibrate(18);
}, [dispatch, playUiCue, vibrate]);
```

Remove `handleResolvedTimeout` entirely. Remove `timerRunning` and `handleTimeout` from destructured useSceneDirector return.

Update `SceneOptionsStage` usage — remove `timerRunning` and `onTimeout` props.

**Step 2: Update ANSWER action type in GameContext**

Add `responseTimeMs` to the ANSWER action:

```typescript
| { type: 'ANSWER'; weights: Partial<Record<StatKey, number>>; tone: Tone; responseTimeMs?: number }
```

And pass it through in the reducer:
```typescript
case 'ANSWER': {
  const question = state.activeDeck?.questions[state.currentQuestion];
  return {
    ...state,
    calibration: applyDampenedWeights(state.calibration, action.weights, action.tone),
    activeRun:
      state.activeRun && question
        ? appendRunAnswer(state.activeRun, question.id, action.tone, action.weights, action.responseTimeMs)
        : state.activeRun,
  };
}
```

**Step 3: Commit**

```bash
git add src/app/play/[deckId]/page.tsx src/context/GameContext.tsx
git commit -m "feat: wire responseTimeMs through play page to game context"
```

---

### Task 7: Add ambient-shift CSS animation

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add keyframe animation**

Add a subtle ambient animation that slowly shifts opacity/color over ~30 seconds:

```css
@keyframes ambient-shift {
  0% { box-shadow: inset 0 0 60px rgba(255,255,255,0); }
  50% { box-shadow: inset 0 0 60px rgba(255,255,255,0.03); }
  100% { box-shadow: inset 0 0 60px rgba(255,255,255,0); }
}

.animate-ambient-shift {
  animation: ambient-shift 30s ease-in-out infinite;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add ambient-shift CSS animation for options stage"
```

---

### Task 8: Clean up unused imports and verify build

**Files:**
- Modify: `src/components/Timer.tsx` (keep file, remove TIMER_DURATION import if unused elsewhere)
- Verify all files compile

**Step 1: Check for remaining references to removed constants**

Run: `grep -r "TIMER_DURATION\|INERTIA_PENALTY\|appendRunTimeout\|handleTimeout\|onTimeoutResolved\|timerRunning" src/ --include="*.ts" --include="*.tsx"`

Fix any remaining references.

**Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up unused timeout references, verify build"
```

---

### Task 9: Manual smoke test

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Verify gameplay flow**

- Navigate to `/decks`, select a deck
- Verify context phase shows for ~3-6 seconds, can skip after 3s
- Verify event phase shows for ~2.5-5 seconds, can skip after 3s
- Verify options appear with NO timer, NO countdown
- Verify hold confirms at ~500ms (feels snappy)
- Verify subtle ambient glow on options panel
- Verify feedback shows after answering
- Complete deck, verify resultado page works

**Step 3: Commit any fixes if needed**
