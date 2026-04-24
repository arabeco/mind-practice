'use client';

/**
 * useGameStatePersistence — hydrate inicial (local+cloud → decideHydrate)
 * + persist local (debounce 500ms) + push cloud (debounce 2s).
 *
 * Extraido de GameContext pra manter o provider focado. Retorna
 * `conflict` + `resolveConflict` para o caller renderizar o modal.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '@/types/game';
import { normalizeGameState } from '@/lib/gameState/normalize';
import { loadLocal, saveLocal } from '@/lib/gameState/persistence';
import { loadCloud, saveCloud, decideHydrate } from '@/lib/gameState/sync';
import {
  VersionTooNewError,
  CURRENT_SCHEMA_VERSION,
  type PersistedGameState,
} from '@/lib/gameState/schema';

/** PersistedGameState omite activeDeck/activeRun; recompoe ao hidratar. */
function persistedToRuntime(p: PersistedGameState): GameState {
  return {
    ...(p as unknown as Omit<GameState, 'activeDeck' | 'activeRun'>),
    activeDeck: null,
    activeRun: null,
  };
}

export interface PersistenceHookValue {
  hydrated: boolean;
  conflict: { local: PersistedGameState; cloud: PersistedGameState } | null;
  resolveConflict: (choice: 'use-cloud' | 'use-local' | 'cancel') => void;
}

export function useGameStatePersistence(
  state: GameState,
  dispatch: (action: { type: 'HYDRATE'; state: GameState }) => void,
): PersistenceHookValue {
  const hydratedRef = useRef(false);
  const lastPersistedRef = useRef<PersistedGameState | null>(null);
  const [conflict, setConflict] = useState<
    { local: PersistedGameState; cloud: PersistedGameState } | null
  >(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawLocal = loadLocal();
        const localParsed = rawLocal
          ? (normalizeGameState(rawLocal) as PersistedGameState)
          : null;

        let cloudParsed: PersistedGameState | null = null;
        try {
          const rawCloud = await loadCloud();
          if (rawCloud) cloudParsed = normalizeGameState(rawCloud) as PersistedGameState;
        } catch (err) {
          if (err instanceof VersionTooNewError) {
            console.error('[gameState] cloud save newer than client — update app');
          }
          cloudParsed = null;
        }

        if (cancelled) return;
        const decision = decideHydrate(localParsed, cloudParsed);

        switch (decision.kind) {
          case 'initial':
            lastPersistedRef.current = null;
            break;
          case 'use-local':
            dispatch({ type: 'HYDRATE', state: persistedToRuntime(decision.local) });
            lastPersistedRef.current = decision.local;
            break;
          case 'use-cloud':
            dispatch({ type: 'HYDRATE', state: persistedToRuntime(decision.cloud) });
            saveLocal(decision.cloud);
            lastPersistedRef.current = decision.cloud;
            break;
          case 'conflict':
            setConflict({ local: decision.local, cloud: decision.cloud });
            dispatch({ type: 'HYDRATE', state: persistedToRuntime(decision.local) });
            lastPersistedRef.current = decision.local;
            break;
        }
      } finally {
        hydratedRef.current = true;
        setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist local (debounce 500ms)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      const prev = lastPersistedRef.current;
      const stamped: PersistedGameState = {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        devicePersistedAt: prev?.devicePersistedAt ?? null,
      } as unknown as PersistedGameState;
      saveLocal(stamped);
      lastPersistedRef.current = stamped;
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // Push cloud (debounce 2s)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(async () => {
      const base = lastPersistedRef.current;
      const stamped: PersistedGameState = {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: base?.updatedAt ?? new Date().toISOString(),
        devicePersistedAt: base?.devicePersistedAt ?? null,
      } as unknown as PersistedGameState;
      const ok = await saveCloud(stamped);
      if (ok) {
        const clean = { ...stamped, devicePersistedAt: stamped.updatedAt };
        saveLocal(clean);
        lastPersistedRef.current = clean;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const resolveConflict = useCallback(
    (choice: 'use-cloud' | 'use-local' | 'cancel') => {
      if (!conflict) return;
      if (choice === 'use-cloud') {
        dispatch({ type: 'HYDRATE', state: persistedToRuntime(conflict.cloud) });
        saveLocal(conflict.cloud);
        lastPersistedRef.current = conflict.cloud;
      }
      // 'use-local' → state local ja aplicado; proximo push cloud sobrescreve.
      // 'cancel' → mantem tudo como esta.
      setConflict(null);
    },
    [conflict, dispatch],
  );

  return { hydrated, conflict, resolveConflict };
}
