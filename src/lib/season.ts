/**
 * Season configuration.
 *
 * A "season" is a timed, free-for-all campaign. Campaigns unlock one scene per day
 * (00:00 local). When the season ends, the campaign deck becomes paid content.
 *
 * To rotate seasons later: add a new entry and update `CURRENT_SEASON_ID`.
 */

import type { CampaignProgress } from '@/types/game';

export interface SeasonConfig {
  id: string;
  label: string;
  campaignDeckId: string;
  /** Inclusive start date (ISO "YYYY-MM-DD"). Season is active from 00:00 local on this date. */
  startDate: string;
  /** Inclusive end date (ISO "YYYY-MM-DD"). Season ends at 23:59:59 local on this date. */
  endDate: string;
}

export const SEASONS: SeasonConfig[] = [
  {
    id: 'season-0',
    label: 'Temporada 0 — O Livro Amaldicoado',
    campaignDeckId: 'livro_amaldicoado',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  },
];

export const CURRENT_SEASON_ID = 'season-0';

export function getCurrentSeason(): SeasonConfig {
  const s = SEASONS.find(s => s.id === CURRENT_SEASON_ID);
  if (!s) throw new Error(`Season ${CURRENT_SEASON_ID} not configured.`);
  return s;
}

/** Returns true if the given date (default now) falls in the current season window. */
export function isSeasonActive(now: Date = new Date()): boolean {
  const season = getCurrentSeason();
  const start = new Date(`${season.startDate}T00:00:00`);
  const end = new Date(`${season.endDate}T23:59:59`);
  return now >= start && now <= end;
}

export function daysRemainingInSeason(now: Date = new Date()): number {
  const season = getCurrentSeason();
  const end = new Date(`${season.endDate}T23:59:59`);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/** Returns the next local-midnight Date. */
export function nextMidnight(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(24, 0, 0, 0);
  return d;
}

/**
 * Can the player play the next campaign scene *right now*?
 * Rule: the player hasn't answered a campaign scene yet today (local day).
 */
export function canPlayCampaignNow(progress: CampaignProgress | null, now: Date = new Date()): boolean {
  if (!progress) return true; // never started → day 1 is always playable
  if (progress.endingId) return false; // already finished
  if (!progress.lastAnsweredAt) return true; // started but haven't answered day 1 yet
  const last = new Date(progress.lastAnsweredAt);
  // Compare local calendar days.
  const lastDay = `${last.getFullYear()}-${last.getMonth()}-${last.getDate()}`;
  const nowDay = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  return lastDay !== nowDay;
}

/** Milliseconds remaining until the next campaign scene unlocks (00:00 local). */
export function msUntilNextUnlock(progress: CampaignProgress | null, now: Date = new Date()): number {
  if (canPlayCampaignNow(progress, now)) return 0;
  return nextMidnight(now).getTime() - now.getTime();
}

/** Format ms as "HHh MMm" or "MMm SSs" for short durations. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'agora';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}
