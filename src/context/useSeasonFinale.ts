'use client';

/**
 * useSeasonFinale — detecta quando uma campaign de season chega num ending
 * (e ainda nao foi cerimoniada). Dispara o modal de Season Finale uma vez
 * por seasonId, idempotente via `progress.finaleSeenAt`.
 *
 * Gating:
 *   - hydrated (evita disparar com state inicial vazio)
 *   - existe alguma campaign com endingId !== null e finaleSeenAt === null
 *
 * Quando ha multiplas seasons fechadas pendentes, mostra a primeira pelo
 * order do Object.entries (insertion order). Apos dismiss, a proxima
 * fica pending naturalmente no proximo render.
 */
import { useEffect, useState } from 'react';
import type { GameState, CampaignEnding } from '@/types/game';
import { matchArchetypes, createPriorProfile } from '@/lib/bayesEngine';
import type { ArchetypeMatchResult } from '@/lib/bayesEngine/archetype';
import type { Season } from '@/data/seasons';
import { getSeason } from '@/data/seasons';
import { getDeckById } from '@/data/decks/index';
import type { GameAction } from './gameReducer';

export interface SeasonFinaleValue {
  pending: {
    seasonId: string;
    season: Season;
    ending: CampaignEnding;
    archetypeMatch: ArchetypeMatchResult;
    /** Total de respostas dadas na campaign (path.length). */
    answerCount: number;
    /** Decks completados pertencentes a essa season. */
    decksCompletedInSeason: number;
  } | null;
  dismiss: () => void;
}

export function useSeasonFinale(
  state: GameState,
  hydrated: boolean,
  dispatch: (action: GameAction) => void,
): SeasonFinaleValue {
  const [pending, setPending] = useState<SeasonFinaleValue['pending']>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (pending !== null) return;

    // Acha a primeira campaign que chegou em ending mas ainda nao viu cerimonia.
    const entry = Object.entries(state.campaigns).find(
      ([, prog]) => prog.endingId !== null && !prog.finaleSeenAt,
    );
    if (!entry) return;

    const [seasonId, progress] = entry;
    const season = getSeason(seasonId);
    if (!season) return;

    const deck = getDeckById(progress.deckId);
    if (!deck) return;
    const ending = deck.endings?.find(e => e.id === progress.endingId);
    if (!ending) return;

    const beliefs = state.calibration.beliefs ?? createPriorProfile();
    const archetypeMatch = matchArchetypes(beliefs);

    // Conta decks completados que pertencem a essa season.
    let decksCompletedInSeason = 0;
    for (const completedDeckId of Object.keys(state.completedDecks)) {
      const d = getDeckById(completedDeckId);
      if (d && d.seasonId === seasonId) decksCompletedInSeason++;
    }

    setPending({
      seasonId,
      season,
      ending,
      archetypeMatch,
      answerCount: progress.path.length,
      decksCompletedInSeason,
    });
  }, [hydrated, state.campaigns, state.completedDecks, state.calibration.beliefs, pending]);

  const dismiss = () => {
    if (!pending) return;
    void import('@/lib/analytics').then(({ trackEvent }) =>
      trackEvent('season_finale_seen', {
        season_id: pending.seasonId,
        ending_id: pending.ending.id,
        answers: pending.answerCount,
      }),
    );
    dispatch({ type: 'MARK_SEASON_FINALE_SEEN', seasonId: pending.seasonId });
    setPending(null);
  };

  return { pending, dismiss };
}
