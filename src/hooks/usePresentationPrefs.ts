'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getDefaultPresentationPrefs,
  type PresentationPrefs,
} from '@/lib/scenePresentation';

const STORAGE_KEY = 'mindpractice_presentation_prefs';

export function usePresentationPrefs() {
  const [prefs, setPrefs] = useState<PresentationPrefs>(getDefaultPresentationPrefs);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PresentationPrefs>;
        setPrefs(prev => ({
          ...prev,
          soundEnabled: parsed.soundEnabled ?? prev.soundEnabled,
          hapticsEnabled: parsed.hapticsEnabled ?? prev.hapticsEnabled,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setPrefs(prev => ({ ...prev, reducedMotion: query.matches }));
    };

    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const { soundEnabled, hapticsEnabled } = prefs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ soundEnabled, hapticsEnabled }));
    } catch {}
  }, [prefs]);

  const setSoundEnabled = useCallback((value: boolean) => {
    setPrefs(prev => ({ ...prev, soundEnabled: value }));
  }, []);

  const setHapticsEnabled = useCallback((value: boolean) => {
    setPrefs(prev => ({ ...prev, hapticsEnabled: value }));
  }, []);

  return {
    prefs,
    setSoundEnabled,
    setHapticsEnabled,
  };
}
