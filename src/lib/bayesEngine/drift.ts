import { BIN_COUNT, type AxisBelief, type BayesConfig } from './types';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weeksSince(iso: string, now: Date = new Date()): number {
  const past = new Date(iso).getTime();
  return (now.getTime() - past) / MS_PER_WEEK;
}

export function ageBelief(
  belief: AxisBelief,
  config: BayesConfig,
  now: Date = new Date(),
): AxisBelief {
  const w = Math.max(0, weeksSince(belief.lastUpdated, now));
  const alpha = Math.min(config.driftMax, config.driftRatePerWeek * w);
  if (alpha === 0) return belief;

  const floor = config.uniformFloor;
  const aged = belief.bins.map(p => (1 - alpha) * p + alpha * floor);
  const s = aged.reduce((a, b) => a + b, 0);
  return {
    ...belief,
    bins: s > 0 ? aged.map(p => p / s) : new Array(BIN_COUNT).fill(1 / BIN_COUNT),
  };
}
