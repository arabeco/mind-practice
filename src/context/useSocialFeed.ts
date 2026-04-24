'use client';

/**
 * useSocialFeed — observa o GameState e publica eventos no feed social
 * (deck_completed, archetype_changed, level_up, streak_milestone) quando
 * o usuario esta logado. Silencioso se Supabase indisponivel.
 *
 * Extraido de GameContext para manter o provider focado em state/persistencia.
 */
import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';

export function useSocialFeed(state: GameState, enabled: boolean) {
  const lastSnapshotCountRef = useRef<number | null>(null);
  const lastArchetypeRef = useRef<string | null>(null);
  const lastLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const snapshots = state.calibration.snapshots;
    const currentCount = snapshots.length;
    const currentLevel = Math.floor(state.calibration.totalResponses / 20) + 1;
    const currentArch = snapshots.length > 0
      ? snapshots[snapshots.length - 1].archetypeAtCompletion
      : null;

    // Primeira passada apos hydrate — so memoriza, nao loga historico
    if (lastSnapshotCountRef.current === null) {
      lastSnapshotCountRef.current = currentCount;
      lastArchetypeRef.current = currentArch;
      lastLevelRef.current = currentLevel;
      return;
    }

    (async () => {
      try {
        const { logFeedEvent } = await import('@/lib/supabase/social');

        if (currentCount > (lastSnapshotCountRef.current ?? 0)) {
          const latest = snapshots[snapshots.length - 1];
          if (latest) {
            const { getDeckById } = await import('@/data/decks/index');
            const deck = getDeckById(latest.deckId);
            await logFeedEvent('deck_completed', {
              deckId: latest.deckId,
              deckName: deck?.name ?? latest.deckId,
              score: latest.runScore,
              archetype: latest.archetypeAtCompletion,
            });

            if (latest.archetypeChanged && latest.archetypeBeforeRun) {
              await logFeedEvent('archetype_changed', {
                archetype: latest.archetypeAtCompletion,
                from: latest.archetypeBeforeRun,
              });
            }
          }
        }

        if (lastLevelRef.current !== null && currentLevel > lastLevelRef.current) {
          await logFeedEvent('level_up', { level: currentLevel });
        }

        if (
          state.streak > 0 &&
          state.streak % 7 === 0 &&
          lastLevelRef.current !== null &&
          currentCount > (lastSnapshotCountRef.current ?? 0)
        ) {
          await logFeedEvent('streak_milestone', { streak: state.streak });
        }
      } catch {
        // Supabase indisponivel ou deslogado — silencioso
      } finally {
        lastSnapshotCountRef.current = currentCount;
        lastArchetypeRef.current = currentArch;
        lastLevelRef.current = currentLevel;
      }
    })();
  }, [state.calibration.snapshots, state.calibration.totalResponses, state.streak, enabled]);
}
