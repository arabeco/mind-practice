import { STAT_KEYS, type StatKey } from '@/types/game';
import { binCenter, normalizeBelief } from './belief';
import { ageBelief } from './drift';
import { likelihoodAt } from './likelihood';
import type {
  AxisBelief,
  AxisEvidence,
  BayesConfig,
  OptionEvidence,
  PlayerBeliefs,
} from './types';

export function updateAxis(
  prior: AxisBelief,
  ev: AxisEvidence,
  _config: BayesConfig,
  now: Date = new Date(),
): AxisBelief {
  const likelihoods = prior.bins.map((_, i) => likelihoodAt(binCenter(i), ev));
  const raw = prior.bins.map((p, i) => p * likelihoods[i]);
  const bins = normalizeBelief(raw);
  return {
    bins,
    observations: prior.observations + 1,
    lastUpdated: now.toISOString(),
  };
}

export function updateProfile(
  profile: PlayerBeliefs,
  evidence: OptionEvidence,
  config: BayesConfig,
  now: Date = new Date(),
): PlayerBeliefs {
  const out = { ...profile } as PlayerBeliefs;
  for (const key of STAT_KEYS as StatKey[]) {
    const ev = evidence[key];
    if (!ev) continue;
    const aged = ageBelief(profile[key], config, now);
    out[key] = updateAxis(aged, ev, config, now);
  }
  return out;
}
