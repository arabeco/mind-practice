'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Option, Question } from '@/types/game';
import {
  getScenePhaseTimings,
  OPTIONS_TIME_LIMIT_MS,
  type ScenePhase,
  type ScenePhaseTimings,
} from '@/lib/scenePresentation';

interface UseSceneDirectorParams {
  question: Question | null;
  reducedMotion?: boolean;
  onAnswerResolved: (option: Option, responseTimeMs: number) => void;
  onTimeout?: () => void;
  autoStart?: boolean;
}

export function useSceneDirector({
  question,
  reducedMotion = false,
  onAnswerResolved,
  onTimeout,
  autoStart = false,
}: UseSceneDirectorParams) {
  const [phase, setPhase] = useState<ScenePhase>(autoStart ? 'context' : 'ready');
  const [selectedFeedback, setSelectedFeedback] = useState('');
  const [canTapAdvance, setCanTapAdvance] = useState(false);
  const [timings, setTimings] = useState<ScenePhaseTimings | null>(null);
  const [optionsDeadline, setOptionsDeadline] = useState<number | null>(null);

  const timersRef = useRef<number[]>([]);
  const timingsRef = useRef<ScenePhaseTimings | null>(null);
  const onAnswerRef = useRef(onAnswerResolved);
  const onTimeoutRef = useRef(onTimeout);
  const optionsShownAtRef = useRef<number>(0);

  useEffect(() => {
    onAnswerRef.current = onAnswerResolved;
  }, [onAnswerResolved]);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timerId => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const timerId = window.setTimeout(fn, ms);
    timersRef.current.push(timerId);
  }, []);

  const handleTimeoutInternal = useCallback(() => {
    clearTimers();
    setOptionsDeadline(null);
    setSelectedFeedback('Tempo esgotado. Sem conviccao, a resposta nao conta.');
    setPhase('feedback');
    setCanTapAdvance(false);
    onTimeoutRef.current?.();
  }, [clearTimers]);

  const startOptionsPhase = useCallback(() => {
    clearTimers();
    setPhase('options');
    setCanTapAdvance(false);
    optionsShownAtRef.current = Date.now();
    setOptionsDeadline(Date.now() + OPTIONS_TIME_LIMIT_MS);
    schedule(handleTimeoutInternal, OPTIONS_TIME_LIMIT_MS);
  }, [clearTimers, handleTimeoutInternal, schedule]);

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
    setOptionsDeadline(null);
    const responseTimeMs = Date.now() - optionsShownAtRef.current;
    onAnswerRef.current(option, responseTimeMs);
    setSelectedFeedback(option.feedback);
    setPhase('feedback');
    setCanTapAdvance(false);
  }, [clearTimers]);

  const startScene = useCallback(() => {
    if (phase !== 'ready') return;
    startPhase('context');
  }, [phase, startPhase]);

  useEffect(() => {
    if (!question) {
      clearTimers();
      return;
    }

    const nextTimings = getScenePhaseTimings(question, reducedMotion);
    timingsRef.current = nextTimings;
    setTimings(nextTimings);
    setSelectedFeedback('');
    setOptionsDeadline(null);
    if (autoStart) {
      startPhase('context');
    } else {
      clearTimers();
      setPhase('ready');
      setCanTapAdvance(true);
    }

    return clearTimers;
  }, [question?.id, question, reducedMotion, autoStart, clearTimers, startPhase]);

  return {
    phase,
    selectedFeedback,
    canTapAdvance,
    timings,
    optionsDeadline,
    handleTapAdvance,
    handleAnswer,
    startScene,
  };
}
