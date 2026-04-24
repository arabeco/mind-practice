'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PersistedGameState } from '@/lib/gameState/schema';

export type ConflictChoice = 'use-cloud' | 'use-local' | 'cancel';

interface Props {
  open: boolean;
  local: PersistedGameState | null;
  cloud: PersistedGameState | null;
  onResolve: (choice: ConflictChoice) => void;
}

function summarize(s: PersistedGameState) {
  const dominant = (() => {
    const axes = s.calibration.axes;
    let maxKey: keyof typeof axes = 'vigor';
    let maxVal = axes.vigor;
    for (const k of Object.keys(axes) as (keyof typeof axes)[]) {
      if (axes[k] > maxVal) { maxVal = axes[k]; maxKey = k; }
    }
    return maxKey;
  })();
  return {
    runs: s.calibration.totalResponses,
    decks: Object.keys(s.completedDecks).length,
    fichas: s.wallet.fichas,
    streak: s.streak,
    dominant,
    updatedAt: new Date(s.updatedAt).toLocaleString('pt-BR'),
  };
}

export default function SyncConflictModal({ open, local, cloud, onResolve }: Props) {
  if (!local || !cloud) return null;
  const L = summarize(local);
  const C = summarize(cloud);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-2">Conflito de save</h2>
            <p className="text-sm text-white/60 mb-4">
              Detectamos mudanças em dois dispositivos. Escolha qual manter:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">Este dispositivo</div>
                <div className="text-white text-sm space-y-0.5">
                  <div>{L.runs} runs · {L.decks} decks</div>
                  <div>{L.fichas} fichas · streak {L.streak}</div>
                  <div className="text-white/50 text-xs">Eixo: {L.dominant}</div>
                  <div className="text-white/50 text-xs">{L.updatedAt}</div>
                </div>
              </div>
              <div className="border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">Cloud</div>
                <div className="text-white text-sm space-y-0.5">
                  <div>{C.runs} runs · {C.decks} decks</div>
                  <div>{C.fichas} fichas · streak {C.streak}</div>
                  <div className="text-white/50 text-xs">Eixo: {C.dominant}</div>
                  <div className="text-white/50 text-xs">{C.updatedAt}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onResolve('use-cloud')}
                className="w-full py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm"
              >
                Usar cloud
              </button>
              <button
                onClick={() => onResolve('use-local')}
                className="w-full py-2 rounded-lg border border-white/20 text-white text-sm"
              >
                Usar este dispositivo (sobrescreve cloud)
              </button>
              <button
                onClick={() => onResolve('cancel')}
                className="w-full py-2 text-white/40 text-xs"
              >
                Decidir depois
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
