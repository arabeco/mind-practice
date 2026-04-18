/**
 * Browser smoke test — run via `window.runSmokeTest()` in DevTools console.
 *
 * Tests core logic (archetype matching, calibration math, deck loading,
 * run scoring) WITHOUT touching the DOM or React tree.
 * Returns a summary object { passed, failed, results }.
 */

import { STAT_KEYS, INITIAL_CALIBRATION, CALIBRATION_WINDOW, type StatKey, type Tone } from '@/types/game';
import { matchArchetype, ARCHETYPES } from '@/data/archetypes';
import { ALL_DECKS, getDeckById, DECK_UNLOCK_ORDER } from '@/data/decks/index';
import { getUnlockedDecks, getPrecision, getConsistency } from '@/context/GameContext';
import { normalizeGameState, createRunSession, appendRunAnswer, createDeckSnapshot } from '@/lib/runScoring';

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function assert(cond: boolean, detail?: string): void {
  if (!cond) throw new Error(detail ?? 'assertion failed');
}

// ---------------------------------------------------------------------------
// Individual tests
// ---------------------------------------------------------------------------

function testDecksLoad(): TestResult {
  try {
    assert(ALL_DECKS.length >= 10, `only ${ALL_DECKS.length} decks loaded`);
    for (const d of ALL_DECKS) {
      assert(!!d.deckId, `deck missing deckId`);
      assert(d.questions.length >= 3, `${d.deckId} has ${d.questions.length} questions`);
      for (const q of d.questions) {
        assert(q.options.length >= 2, `${d.deckId}/${q.id} has <2 options`);
        for (const o of q.options) {
          assert(typeof o.tone === 'string', `${d.deckId}/${q.id} option missing tone`);
          assert(typeof o.weights === 'object', `${d.deckId}/${q.id} option missing weights`);
        }
      }
    }
    return { name: 'decks-load', pass: true, detail: `${ALL_DECKS.length} decks, all valid` };
  } catch (e: unknown) {
    return { name: 'decks-load', pass: false, detail: (e as Error).message };
  }
}

function testDeckUnlockOrder(): TestResult {
  try {
    for (const id of DECK_UNLOCK_ORDER) {
      assert(!!getDeckById(id), `unlock order references missing deck: ${id}`);
    }
    // Fresh state → only first deck unlocked
    const fresh = getUnlockedDecks({});
    assert(fresh.length === 1, `fresh unlock should be 1, got ${fresh.length}`);
    assert(fresh[0] === DECK_UNLOCK_ORDER[0], `first unlocked should be ${DECK_UNLOCK_ORDER[0]}`);

    // Complete first → second unlocks (calibragem = instant)
    const afterFirst = getUnlockedDecks({ [DECK_UNLOCK_ORDER[0]]: new Date().toISOString() });
    assert(afterFirst.length >= 2, `after first deck, expected ≥2 unlocked, got ${afterFirst.length}`);
    return { name: 'deck-unlock-order', pass: true };
  } catch (e: unknown) {
    return { name: 'deck-unlock-order', pass: false, detail: (e as Error).message };
  }
}

function testArchetypeMatching(): TestResult {
  try {
    assert(ARCHETYPES.length >= 5, `only ${ARCHETYPES.length} archetypes`);

    // Neutral axes → should return some archetype
    const neutralAxes: Record<StatKey, number> = { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 };
    const neutral = matchArchetype(neutralAxes, { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] }, 0);
    assert(!!neutral.name, 'neutral match returned no name');

    // Extreme axis → should reflect dominant trait
    const extremeAxes: Record<StatKey, number> = { vigor: 50, harmonia: -50, filtro: 0, presenca: 0, desapego: 0 };
    const extreme = matchArchetype(extremeAxes, { vigor: [10, 10, 10], harmonia: [-10, -10, -10], filtro: [], presenca: [], desapego: [] }, 30);
    assert(!!extreme.name, 'extreme match returned no name');

    return { name: 'archetype-matching', pass: true, detail: `neutral→${neutral.name}, extreme→${extreme.name}` };
  } catch (e: unknown) {
    return { name: 'archetype-matching', pass: false, detail: (e as Error).message };
  }
}

function testCalibrationMath(): TestResult {
  try {
    // Precision: 0 responses → 0%, CALIBRATION_WINDOW → 100%
    assert(getPrecision(0) === 0, 'precision(0) should be 0');
    assert(getPrecision(CALIBRATION_WINDOW) === 100, `precision(${CALIBRATION_WINDOW}) should be 100`);
    const half = CALIBRATION_WINDOW / 2;
    assert(getPrecision(half) === 50, `precision(${half}) should be 50`);

    // Consistency with no data → 0
    const empty: Record<StatKey, number[]> = { vigor: [], harmonia: [], filtro: [], presenca: [], desapego: [] };
    assert(getConsistency(empty) === 0, 'consistency(empty) should be 0');

    // Consistency with identical responses → high
    const steady: Record<StatKey, number[]> = {
      vigor: [5, 5, 5, 5, 5],
      harmonia: [3, 3, 3, 3, 3],
      filtro: [-2, -2, -2, -2, -2],
      presenca: [1, 1, 1, 1, 1],
      desapego: [0, 0, 0, 0, 0],
    };
    const c = getConsistency(steady);
    assert(c >= 0.9, `consistency(steady) should be ≥0.9, got ${c.toFixed(2)}`);

    return { name: 'calibration-math', pass: true };
  } catch (e: unknown) {
    return { name: 'calibration-math', pass: false, detail: (e as Error).message };
  }
}

function testRunScoring(): TestResult {
  try {
    const deck = ALL_DECKS[0];
    const axes: Record<StatKey, number> = { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 };
    const session = createRunSession(deck, axes, 'Escudo');
    assert(session.deckId === deck.deckId, 'session deckId mismatch');
    assert(session.answers.length === 0, 'session should start with 0 answers');

    // Simulate answering first question
    const q = deck.questions[0];
    const opt = q.options[0];
    const updated = appendRunAnswer(session, q.id, opt.tone, opt.weights, 3000);
    assert(updated.answers.length === 1, 'should have 1 answer after append');

    // Create snapshot
    const snapshot = createDeckSnapshot({
      session: updated,
      archetypeName: 'Escudo',
      finalStats: axes,
    });
    assert(snapshot.deckId === deck.deckId, 'snapshot deckId mismatch');

    return { name: 'run-scoring', pass: true };
  } catch (e: unknown) {
    return { name: 'run-scoring', pass: false, detail: (e as Error).message };
  }
}

function testNormalizeGameState(): TestResult {
  try {
    // Should fill missing fields with defaults
    const partial = { calibration: { ...INITIAL_CALIBRATION }, completedDecks: {} } as any;
    const full = normalizeGameState(partial);
    assert(full.wallet !== undefined, 'normalized state missing wallet');
    assert(full.streak !== undefined, 'normalized state missing streak');
    assert(Array.isArray(full.unlockedDecks), 'normalized state missing unlockedDecks');
    return { name: 'normalize-state', pass: true };
  } catch (e: unknown) {
    return { name: 'normalize-state', pass: false, detail: (e as Error).message };
  }
}

function testAllDecksHaveMetadata(): TestResult {
  try {
    const issues: string[] = [];
    for (const d of ALL_DECKS) {
      for (const q of d.questions) {
        if (!q.metadata) {
          issues.push(`${d.deckId}/${q.id}: missing metadata`);
        } else if (!q.metadata.tensao) {
          issues.push(`${d.deckId}/${q.id}: missing tensao`);
        }
      }
    }
    if (issues.length > 0) {
      return { name: 'deck-metadata', pass: false, detail: issues.slice(0, 5).join('; ') };
    }
    return { name: 'deck-metadata', pass: true, detail: `all questions have metadata` };
  } catch (e: unknown) {
    return { name: 'deck-metadata', pass: false, detail: (e as Error).message };
  }
}

function testOptionWeightsAreValid(): TestResult {
  try {
    const issues: string[] = [];
    for (const d of ALL_DECKS) {
      for (const q of d.questions) {
        for (let i = 0; i < q.options.length; i++) {
          const o = q.options[i];
          const keys = Object.keys(o.weights);
          for (const k of keys) {
            if (!STAT_KEYS.includes(k as StatKey)) {
              issues.push(`${d.deckId}/${q.id} opt${i}: invalid stat key "${k}"`);
            }
          }
        }
      }
    }
    if (issues.length > 0) {
      return { name: 'option-weights-valid', pass: false, detail: issues.slice(0, 5).join('; ') };
    }
    return { name: 'option-weights-valid', pass: true };
  } catch (e: unknown) {
    return { name: 'option-weights-valid', pass: false, detail: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export function runSmokeTest() {
  const tests = [
    testDecksLoad,
    testDeckUnlockOrder,
    testArchetypeMatching,
    testCalibrationMath,
    testRunScoring,
    testNormalizeGameState,
    testAllDecksHaveMetadata,
    testOptionWeightsAreValid,
  ];

  const results: TestResult[] = tests.map(fn => fn());
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  // Pretty console output
  console.log(`\n🧪 MindPractice Smoke Test — ${passed}/${results.length} passed\n`);
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    const extra = r.detail ? ` — ${r.detail}` : '';
    console.log(`  ${icon} ${r.name}${extra}`);
  }
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed`);
  } else {
    console.log(`\n🎉 All tests passed!`);
  }

  return { passed, failed, results };
}
