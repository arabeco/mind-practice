'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { usePresentationPrefs } from '@/hooks/usePresentationPrefs';
import { HAPTIC_GRAMMAR } from '@/lib/hapticGrammar';

/**
 * Dopamine loop entre perguntas.
 *
 * A cada N respostas (3 por padrão), pisca um overlay mostrando o arquétipo
 * atual se consolidando — tipo "+10 XP" do Duolingo, mas com identidade.
 *
 * Lê `state.activeRun.answers.length` para detectar o pulso; só exibe
 * quando um novo marco é batido e esconde automaticamente após ~1.6s.
 */

const PULSE_EVERY = 3;
const DISPLAY_MS = 1600;

export default function ArchetypeDriftFlash() {
  const { state, getArchetype, precision } = useGame();
  const { prefs } = usePresentationPrefs();
  const [visible, setVisible] = useState(false);
  const [frozen, setFrozen] = useState<{ name: string; pct: number } | null>(null);
  const lastPulseAtRef = useRef<number>(-1);

  const answered = state.activeRun?.answers.length ?? 0;

  useEffect(() => {
    if (answered <= 0) return;
    if (answered % PULSE_EVERY !== 0) return;
    if (lastPulseAtRef.current === answered) return;

    lastPulseAtRef.current = answered;
    const arch = getArchetype();
    setFrozen({ name: arch.name, pct: Math.round(precision) });
    setVisible(true);

    // Subtle haptic pulse to sync with the flash.
    if (prefs.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(HAPTIC_GRAMMAR.drift);
    }

    const id = window.setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [answered, getArchetype, precision, prefs.hapticsEnabled]);

  return (
    <AnimatePresence>
      {visible && frozen && (
        <motion.div
          initial={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute left-1/2 top-[14%] z-40 -translate-x-1/2 px-4"
        >
          <div
            className="flex items-center gap-3 rounded-full border border-accent-gold/40 bg-black/72 px-4 py-2 text-center shadow-[0_8px_32px_rgba(212,175,55,0.18)] backdrop-blur-xl"
            style={{
              boxShadow:
                '0 0 24px rgba(212,175,55,0.18), inset 0 0 12px rgba(212,175,55,0.06)',
            }}
          >
            <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-accent-gold/75">
              Virando
            </span>
            <span className="text-sm font-bold tracking-tight text-accent-gold">
              {frozen.name}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 tabular-nums">
              {frozen.pct}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
