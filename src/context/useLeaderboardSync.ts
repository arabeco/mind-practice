'use client';

/**
 * useLeaderboardSync — recalcula scores das seasons localmente e faz
 * upsert no Supabase quando o GameState muda significativamente.
 *
 * Estrategia:
 *   - Watch state.calibration.snapshots e state.completedDecks
 *   - Para cada season conhecida, computa score local
 *   - Se mudou desde ultimo upsert, faz upsert (com debounce simples)
 *
 * Roda apenas apos hydrated (evita upsert do INITIAL_STATE).
 * No-op gracioso se Supabase nao configurado ou usuario nao logado.
 */
import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';
import { SEASONS } from '@/data/seasons';
import { computeSeasonScore } from '@/lib/seasonScore';
import { matchArchetypes, createPriorProfile } from '@/lib/bayesEngine';
import { upsertSeasonScore } from '@/lib/supabase/leaderboard';

const DEBOUNCE_MS = 1500;

export function useLeaderboardSync(state: GameState, hydrated: boolean): void {
  // Cache do ultimo score por seasonId pra evitar upserts redundantes
  const lastSyncedRef = useRef<Map<string, number>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const beliefs = state.calibration.beliefs ?? createPriorProfile();
      const archetype = matchArchetypes(beliefs).primary?.archetype ?? null;

      for (const season of SEASONS) {
        const { score } = computeSeasonScore(state, season.id);
        const last = lastSyncedRef.current.get(season.id) ?? -1;
        // Skip score=0 ate o jogador comecar a contribuir (evita poluir
        // ranking com zeros).
        if (score === 0) continue;
        if (score === last) continue;

        upsertSeasonScore(season.id, score, archetype?.id ?? null).then(({ error }) => {
          if (error) {
            // Mantem cache desatualizado pra tentar de novo no proximo trigger
            return;
          }
          lastSyncedRef.current.set(season.id, score);
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    hydrated,
    state.calibration.snapshots,
    state.completedDecks,
    state.calibration.beliefs,
  ]);
}
