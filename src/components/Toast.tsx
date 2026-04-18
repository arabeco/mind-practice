'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastAPI {
  /** Info (neutro, cinza) */
  toast: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastAPI>({
  toast: () => {},
  success: () => {},
  error: () => {},
});

const DURATION_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, kind: ToastKind) => {
    const id = nextId.current++;
    setItems(prev => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id));
    }, DURATION_MS);
  }, []);

  const api: ToastAPI = {
    toast: useCallback((m: string) => push(m, 'info'), [push]),
    success: useCallback((m: string) => push(m, 'success'), [push]),
    error: useCallback((m: string) => push(m, 'error'), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost items={items} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastHost({ items }: { items: ToastItem[] }) {
  // Render above bottom nav (which is pb-20 / ~80px). Safe-area aware.
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
    >
      <AnimatePresence>
        {items.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto max-w-xs rounded-full border px-4 py-2 text-center text-[12px] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md ${KIND_STYLES[t.kind]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const KIND_STYLES: Record<ToastKind, string> = {
  info:    'border-white/18 bg-black/72 text-white/88',
  success: 'border-emerald-400/35 bg-emerald-500/18 text-emerald-100',
  error:   'border-red-400/35 bg-red-500/18 text-red-100',
};
