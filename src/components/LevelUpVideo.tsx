'use client';

/**
 * LevelUpVideo — overlay full-screen que toca o video cerimonial de
 * scan/holografia antes do LevelUpCeremony modal abrir.
 *
 * Comportamento:
 *  - Autoplay muted + playsInline (politicas mobile/iOS).
 *  - Tap em qualquer lugar pula (chama onComplete).
 *  - onEnded → onComplete automatico.
 *  - Fallback: se o arquivo não existir ou der erro de load, pula
 *    direto pro modal sem travar a UX.
 *
 * Para trocar/atualizar: substitua `public/mind.mp4`.
 * Por enquanto o mesmo video roda pra todos os levels; pra video por
 * tier, troca `src` por `/levels/${tier}.mp4` e adiciona prop `tier`.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpVideoProps {
  open: boolean;
  src?: string;
  onComplete: () => void;
}

const DEFAULT_SRC = '/mind.mp4';

export default function LevelUpVideo({
  open,
  src = DEFAULT_SRC,
  onComplete,
}: LevelUpVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);

  // Se errou ou não carregou em 6s, pula sozinho.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const v = videoRef.current;
      // Se nem comecou a tocar (readyState < 2) → assume sem video, pula.
      if (!v || v.readyState < 2) {
        onComplete();
      }
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [open, onComplete]);

  // Erro explicito → pula imediatamente.
  useEffect(() => {
    if (errored && open) onComplete();
  }, [errored, open, onComplete]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
          onClick={onComplete}
          role="presentation"
        >
          <video
            ref={videoRef}
            src={src}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={onComplete}
            onError={() => setErrored(true)}
            className="h-full w-full object-cover"
          />

          {/* Skip hint — sutil, bottom-right */}
          <motion.button
            type="button"
            onClick={onComplete}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            whileHover={{ opacity: 0.85 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="absolute bottom-6 right-6 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md"
          >
            Pular
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
