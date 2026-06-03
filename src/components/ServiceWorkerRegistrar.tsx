'use client';

import { useEffect } from 'react';
import { initUiFeedback } from '@/lib/uiFeedback';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Destrava o áudio global de UI no 1º gesto (celebração no /resultado, claim, etc).
    initUiFeedback();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — offline won't work but app still runs
      });
    }
  }, []);

  return null;
}
