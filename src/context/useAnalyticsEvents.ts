'use client';

/**
 * useAnalyticsEvents — observa o GameState e dispara eventos PostHog
 * canônicos quando snapshots/completedDecks crescem.
 *
 * - deck_completed: nova snapshot foi adicionada
 * - onboarding_complete: primeiro deck completed (FIRST snapshot)
 *
 * Eventos só dispara após hydrate (evita falsos positivos do INITIAL_STATE).
 * Idempotente via ref de "última quantidade vista".
 */
import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';
import { trackEvent } from '@/lib/analytics';

export function useAnalyticsEvents(state: GameState, hydrated: boolean): void {
  const lastSnapshotCountRef = useRef<number>(-1);

  useEffect(() => {
    if (!hydrated) return;
    const count = state.calibration.snapshots?.length ?? 0;
    const last = lastSnapshotCountRef.current;

    // Init silencioso na primeira passada após hydrate
    if (last === -1) {
      lastSnapshotCountRef.current = count;
      return;
    }

    // Cresceu? Pelo menos 1 snapshot novo.
    if (count > last) {
      const newSnapshot = state.calibration.snapshots?.[state.calibration.snapshots.length - 1];
      if (newSnapshot) {
        trackEvent('deck_completed', {
          deck_id: newSnapshot.deckId,
          archetype_at_completion: newSnapshot.archetypeAtCompletion,
          run_score: newSnapshot.runScore ?? null,
          answered_count: newSnapshot.answeredCount,
          timeout_count: newSnapshot.timeoutCount,
        });
        // Primeiro deck completo = onboarding_complete
        if (last === 0 && count === 1) {
          trackEvent('onboarding_complete', { deck_id: newSnapshot.deckId });
        }
      }
      lastSnapshotCountRef.current = count;
    }
  }, [hydrated, state.calibration.snapshots]);
}
