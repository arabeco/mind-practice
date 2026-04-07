'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Option, Question } from '@/types/game';
import {
  getScenePhaseTimings,
  type ScenePhase,
  type ScenePhaseTimings,
} from '@/lib/scenePresentation';

interface UseSceneDirectorParams {
  question: Question | null;
  reducedMotion?: boolean;
  onAnswerResolved: (option: Option, responseTimeMs: number) => void;
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

    if (phase === 'context') {
      startPhase('event');
      return;
    }

    if (phase === 'event') {
      startPhase('delay');
    }
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
    if (!question) {
      clearTimers();
      return;
    }

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
  };
}
