import type { PersistedGameState } from './schema';

export const STORAGE_KEY = 'mindpractice_state';

/**
 * Lê o blob do localStorage. SSR-safe (retorna null no servidor).
 * Nunca throw — JSON inválido ou absence vira null.
 */
export function loadLocal(): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Escreve o state. SSR-safe. Swallow de erros de quota.
 * O chamador deve ter validado com GameStateSchema antes.
 */
export function saveLocal(state: PersistedGameState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota cheia ou storage bloqueado — silencia */
  }
}
