import { CURRENT_SCHEMA_VERSION, VersionTooNewError } from '../schema';
import { v1ToV2 } from './v1-to-v2';
import { v2ToV3 } from './v2-to-v3';

export type Migration = (raw: unknown) => unknown;

/**
 * Registry de migrations. Key = versão DE ORIGEM, value = função que transforma
 * pra versão DE ORIGEM + 1. Adicione aqui quando bumpar CURRENT_SCHEMA_VERSION.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
};

/**
 * Roda migrations em cadeia de `fromVersion` até `CURRENT_SCHEMA_VERSION`.
 * No-op se fromVersion === CURRENT. Throw se fromVersion > CURRENT ou falta step.
 */
export function runMigrations(raw: unknown, fromVersion: number): unknown {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new VersionTooNewError(fromVersion, CURRENT_SCHEMA_VERSION);
  }
  let current = raw;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`Missing migration v${v} → v${v + 1}`);
    current = migrate(current);
  }
  return current;
}
