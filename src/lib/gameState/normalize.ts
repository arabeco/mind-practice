import { GameStateSchema, VersionTooNewError, type PersistedGameState } from './schema';
import { runMigrations } from './migrations';
import { INITIAL_STATE } from './defaults';

const CORRUPTED_KEY = 'mindpractice_state_corrupted';

function snapshotCorrupted(raw: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CORRUPTED_KEY,
      JSON.stringify({ at: new Date().toISOString(), raw }),
    );
  } catch {
    /* ignore — storage pode estar cheio ou bloqueado */
  }
}

/**
 * Boundary único de entrada de dados no sistema.
 *
 * 1. Raw não-objeto → INITIAL_STATE.
 * 2. Descobre versão (schemaVersion ?? 1).
 * 3. Roda migrations encadeadas até CURRENT_SCHEMA_VERSION.
 *    - VersionTooNewError → propaga (chamador mostra UI "atualize o app").
 * 4. Zod safeParse. Falhou → snapshot corrupted + INITIAL_STATE.
 *
 * Nunca crash. O único erro que sobe é VersionTooNewError.
 */
export function normalizeGameState(raw: unknown): PersistedGameState {
  if (!raw || typeof raw !== 'object') {
    return buildInitial();
  }
  const version = typeof (raw as any).schemaVersion === 'number'
    ? (raw as any).schemaVersion
    : 1;

  let migrated: unknown;
  try {
    migrated = runMigrations(raw, version);
  } catch (err) {
    if (err instanceof VersionTooNewError) throw err;
    console.error('[gameState] migration failed', err);
    snapshotCorrupted(raw);
    return buildInitial();
  }

  const parsed = GameStateSchema.safeParse(migrated);
  if (!parsed.success) {
    console.error('[gameState] schema parse failed', parsed.error.errors);
    snapshotCorrupted(raw);
    return buildInitial();
  }
  return parsed.data;
}

function buildInitial(): PersistedGameState {
  const r = GameStateSchema.safeParse(INITIAL_STATE);
  if (!r.success) throw new Error('INITIAL_STATE invalido — bug de schema');
  return r.data;
}
