'use client';

import { useEffect } from 'react';

/**
 * Registers dev helpers on `window` in development mode.
 * Usage: open browser console → `window.runSmokeTest()`
 */
export default function DevTools() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    import('@/lib/smokeTest').then(({ runSmokeTest }) => {
      (window as any).runSmokeTest = runSmokeTest;
      console.log('🛠️  DevTools: window.runSmokeTest() disponivel');
    });
  }, []);

  return null;
}
