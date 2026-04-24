/**
 * v2 → v3: introduz schemaVersion, updatedAt e devicePersistedAt.
 * Nenhuma estrutura muda — só metadados novos ganham defaults.
 */
export function v2ToV3(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    schemaVersion: 3,
    updatedAt: (r.updatedAt as string) ?? new Date().toISOString(),
    devicePersistedAt: (r.devicePersistedAt as string) ?? null,
  };
}
