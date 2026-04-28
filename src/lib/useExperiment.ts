'use client';

/**
 * useExperiment — A/B testing hook backed by PostHog feature flags.
 *
 * Retorna o variant string do flag, ou `fallback` enquanto carrega
 * (ou se PostHog não configurado).
 *
 * Setup do experimento no PostHog:
 *   1. Dashboard → Feature Flags → New
 *   2. Key: 'paywall_copy_v2' (ou qual seja)
 *   3. Set como Multivariate, define variants (control/treatment)
 *   4. Defina rollout (% por variant)
 *   5. Save
 *
 * No código:
 *   const variant = useExperiment('paywall_copy_v2', 'control');
 *   if (variant === 'urgent') return <Urgent />;
 *   return <Control />;
 *
 * PostHog rastreia exposure automaticamente quando a flag é avaliada.
 */
import { useEffect, useState } from 'react';
import { getFeatureFlag } from './analytics';

export function useExperiment<T extends string = string>(
  flagKey: string,
  fallback: T,
): T {
  const [variant, setVariant] = useState<T>(fallback);

  useEffect(() => {
    let cancelled = false;
    getFeatureFlag(flagKey).then(value => {
      if (cancelled) return;
      if (typeof value === 'string') setVariant(value as T);
    });
    return () => {
      cancelled = true;
    };
  }, [flagKey]);

  return variant;
}
