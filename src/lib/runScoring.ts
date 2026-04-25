import { getDeckById } from '@/data/decks';
import {
  EMPTY_STAT_RECORD,
  STAT_KEYS,
  type Deck,
  type DeckSnapshot,
  type OptionEvidence,
  type RunAnswerEvent,
  type RunScoreBreakdown,
  type RunSession,
  type StatKey,
  type Tone,
} from '@/types/game';

const MAX_COMPLETION_SCORE = 30;
const MAX_DECISIVENESS_SCORE = 35;
const MAX_COHERENCE_SCORE = 35;

export function createRunSession(
  deck: Deck,
  startStats: Record<StatKey, number>,
  startArchetype: string,
): RunSession {
  return {
    deckId: deck.deckId,
    startedAt: new Date().toISOString(),
    totalQuestions: deck.questions.length,
    startStats: { ...startStats },
    startArchetype,
    answeredCount: 0,
    timeoutCount: 0,
    answers: [],
  };
}

/**
 * Eixo dominante de uma evidência: aquele com maior `confidence`. Empate →
 * primeiro do STAT_KEYS. Útil pra hold-color das opções e snapshot.dominantAxis.
 */
export function getDominantAxisFromEvidence(
  evidence: OptionEvidence | undefined,
): StatKey | null {
  if (!evidence) return null;
  let bestKey: StatKey | null = null;
  let bestScore = -Infinity;
  for (const key of STAT_KEYS) {
    const ev = evidence[key];
    if (!ev) continue;
    const score = ev.confidence ?? 0.75;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

export function appendRunAnswer(
  session: RunSession,
  questionId: string,
  tone: Tone,
  evidence: OptionEvidence | undefined,
  responseTimeMs?: number,
): RunSession {
  const event: RunAnswerEvent = {
    questionId,
    tone,
    evidence,
    dominantAxis: getDominantAxisFromEvidence(evidence),
    timedOut: false,
    responseTimeMs,
  };

  return {
    ...session,
    answeredCount: session.answeredCount + 1,
    answers: [...session.answers, event],
  };
}

export function createDeckSnapshot({
  session,
  archetypeName,
  finalStats,
}: {
  session: RunSession;
  archetypeName: string;
  finalStats: Record<StatKey, number>;
}): DeckSnapshot {
  const completedAt = new Date().toISOString();
  const deck = getDeckById(session.deckId);
  const axisDelta = getAxisDelta(session.startStats, finalStats);
  const scoreBreakdown = getRunScoreBreakdown(session);
  const runScore = Math.round(
    scoreBreakdown.completion + scoreBreakdown.decisiveness + scoreBreakdown.coherence,
  );
  const dominantAxis = getRunDominantAxis(session);
  const profileShift = getProfileShift(axisDelta);
  const focusAlignment = deck?.focusAxis
    ? getFocusAlignment(deck.focusAxis, session)
    : null;

  return {
    deckId: session.deckId,
    completedAt,
    archetypeBeforeRun: session.startArchetype,
    archetypeAtCompletion: archetypeName,
    archetypeChanged: session.startArchetype !== archetypeName,
    statsAtCompletion: { ...finalStats },
    runScore,
    scoreBreakdown,
    answeredCount: session.answeredCount,
    timeoutCount: session.timeoutCount,
    dominantAxis,
    axisDelta,
    profileShift,
    focusAlignment,
    answers: session.answers.map(a => ({
      questionId: a.questionId,
      tone: a.tone,
      evidence: a.evidence,
      dominantAxis: a.dominantAxis,
      responseTimeMs: a.responseTimeMs,
      timedOut: a.timedOut,
    })),
    legacy: false,
  };
}

// Re-export do boundary unico de persistencia. Mantido aqui por compat com
// callers externos (ex: smokeTest.ts) que importam deste caminho.
export { normalizeGameState } from '@/lib/gameState/normalize';

export function normalizeDeckSnapshot(raw: Partial<DeckSnapshot>): DeckSnapshot {
  const runScore = typeof raw.runScore === 'number' ? raw.runScore : null;
  const scoreBreakdown = raw.scoreBreakdown
    ? {
        completion: raw.scoreBreakdown.completion ?? 0,
        decisiveness: raw.scoreBreakdown.decisiveness ?? 0,
        coherence: raw.scoreBreakdown.coherence ?? 0,
      }
    : null;

  return {
    deckId: raw.deckId ?? 'unknown',
    completedAt: raw.completedAt ?? new Date(0).toISOString(),
    archetypeBeforeRun: raw.archetypeBeforeRun ?? null,
    archetypeAtCompletion: raw.archetypeAtCompletion ?? 'Perfil indisponivel',
    archetypeChanged: raw.archetypeChanged ?? false,
    statsAtCompletion: { ...EMPTY_STAT_RECORD, ...(raw.statsAtCompletion ?? {}) },
    runScore,
    scoreBreakdown,
    answeredCount: raw.answeredCount ?? 0,
    timeoutCount: raw.timeoutCount ?? 0,
    dominantAxis: raw.dominantAxis ?? null,
    axisDelta: { ...EMPTY_STAT_RECORD, ...(raw.axisDelta ?? {}) },
    profileShift: raw.profileShift ?? 0,
    focusAlignment:
      typeof raw.focusAlignment === 'number' ? raw.focusAlignment : null,
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    legacy: raw.legacy ?? runScore === null,
  };
}

export function getRunScoreLabel(score: number | null): string {
  if (score === null) return 'Legacy';
  if (score >= 85) return 'Cristalino';
  if (score >= 68) return 'Firme';
  if (score >= 45) return 'Legivel';
  return 'Difuso';
}

export function getRunScoreTint(score: number | null): string {
  if (score === null) return '#94a3b8';
  if (score >= 85) return '#d4af37';
  if (score >= 68) return '#7dd3fc';
  if (score >= 45) return '#a78bfa';
  return '#f97316';
}

export function getProfileShiftLabel(profileShift: number): string {
  if (profileShift >= 6) return 'Mudanca forte';
  if (profileShift >= 3) return 'Mudanca nitida';
  if (profileShift >= 1.25) return 'Ajuste leve';
  return 'Quase estavel';
}

function getRunScoreBreakdown(session: RunSession): RunScoreBreakdown {
  const completionRatio = session.totalQuestions > 0
    ? session.answeredCount / session.totalQuestions
    : 0;
  const decisiveAnswers = session.answers.filter(answer => !answer.timedOut);
  // Decisiveness: média da maior confidence declarada por cada answer.
  // Sem evidence → 0 (resposta não declarou pra onde aponta).
  const decisivenessRatio = decisiveAnswers.length > 0
    ? decisiveAnswers.reduce(
        (sum, answer) => sum + getStrongestEvidenceConfidence(answer.evidence),
        0,
      ) / decisiveAnswers.length
    : 0;
  const coherenceRatio = getCoherenceRatio(session);

  return {
    completion: roundScore(completionRatio * MAX_COMPLETION_SCORE),
    decisiveness: roundScore(decisivenessRatio * MAX_DECISIVENESS_SCORE),
    coherence: roundScore(coherenceRatio * MAX_COHERENCE_SCORE),
  };
}

function getAxisDelta(
  startStats: Record<StatKey, number>,
  finalStats: Record<StatKey, number>,
): Record<StatKey, number> {
  return STAT_KEYS.reduce<Record<StatKey, number>>((acc, key) => {
    acc[key] = Number((finalStats[key] - startStats[key]).toFixed(1));
    return acc;
  }, { ...EMPTY_STAT_RECORD });
}

function getProfileShift(axisDelta: Record<StatKey, number>): number {
  return Number(
    STAT_KEYS.reduce((sum, key) => sum + Math.abs(axisDelta[key]), 0).toFixed(1),
  );
}

function getFocusAlignment(focusAxis: StatKey, session: RunSession): number | null {
  const answered = session.answers.filter(answer => !answer.timedOut);
  if (answered.length === 0) return null;
  const aligned = answered.filter(answer => answer.dominantAxis === focusAxis).length;
  return Math.round((aligned / answered.length) * 100);
}

function getRunDominantAxis(session: RunSession): StatKey | null {
  const counts = STAT_KEYS.reduce<Record<StatKey, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, { ...EMPTY_STAT_RECORD });

  for (const answer of session.answers) {
    if (!answer.dominantAxis || answer.timedOut) continue;
    counts[answer.dominantAxis] += 1;
  }

  const top = STAT_KEYS
    .map(key => ({ key, count: counts[key] }))
    .sort((a, b) => b.count - a.count)[0];

  return top && top.count > 0 ? top.key : null;
}

function getCoherenceRatio(session: RunSession): number {
  const answered = session.answers.filter(
    answer => !answer.timedOut && answer.dominantAxis,
  );

  if (answered.length === 0) return 0;

  const counts = new Map<StatKey, number>();
  for (const answer of answered) {
    const axis = answer.dominantAxis as StatKey;
    counts.set(axis, (counts.get(axis) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  return maxCount / answered.length;
}

function getStrongestEvidenceConfidence(evidence: OptionEvidence | undefined): number {
  if (!evidence) return 0;
  let strongest = 0;
  for (const key of STAT_KEYS) {
    const ev = evidence[key];
    const value = ev?.confidence ?? 0;
    if (value > strongest) {
      strongest = value;
    }
  }

  return strongest;
}

function roundScore(value: number): number {
  return Number(Math.max(0, value).toFixed(1));
}
