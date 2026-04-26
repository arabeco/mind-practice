import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 4;

const WalletSchema = z.object({
  fichas: z.number().default(20),
  lastDailyClaim: z.string().nullable().default(null),
  totalEarned: z.number().default(20),
  totalSpent: z.number().default(0),
  runsPaidToday: z.number().int().min(0).default(0),
  runsPaidDate: z.string().nullable().default(null),
}).default({
  fichas: 20,
  lastDailyClaim: null,
  totalEarned: 20,
  totalSpent: 0,
  runsPaidToday: 0,
  runsPaidDate: null,
});

const PlusSubscriptionSchema = z.object({
  active: z.boolean().default(false),
  startedAt: z.string().nullable().default(null),
  expiresAt: z.string().nullable().default(null),
  lastPlusDailyClaim: z.string().nullable().default(null),
}).default({
  active: false,
  startedAt: null,
  expiresAt: null,
  lastPlusDailyClaim: null,
});

const CalibrationSchema = z.object({
  beliefs: z.any().optional(),
  totalResponses: z.number().int().min(0).default(0),
  toneHistory: z.array(z.string()).default([]),
  snapshots: z.array(z.any()).default([]),
}).default({
  totalResponses: 0,
  toneHistory: [],
  snapshots: [],
});

/**
 * Schema persistido do GameState. Campos transientes (activeDeck, activeRun)
 * são intencionalmente omitidos — vivem só em memória.
 *
 * .strip() descarta silenciosamente campos desconhecidos (protege contra
 * lixo de versões anteriores ou futuras).
 */
export const GameStateSchema = z.object({
  schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
  updatedAt: z.string().default(() => new Date().toISOString()),
  devicePersistedAt: z.string().nullable().default(null),

  calibration: CalibrationSchema,
  wallet: WalletSchema,
  currentQuestion: z.number().int().default(0),
  unlockedDecks: z.array(z.string()).default([]),
  completedDecks: z.record(z.string(), z.string()).default({}),
  lastTrainingDate: z.string().nullable().default(null),
  streak: z.number().int().min(0).default(0),
  lastPlayDate: z.string().nullable().default(null),
  campaigns: z.record(z.string(), z.any()).default({}),
  ownedDeckIds: z.array(z.string()).default([]),
  plusSubscription: PlusSubscriptionSchema,
  lastSeenLevel: z.number().int().min(1).max(10).default(1),
  firstFirmArchetypeSeenAt: z.string().nullable().default(null),
}).strip();

/** Tipo persistido — inclui schemaVersion + updatedAt + devicePersistedAt. */
export type PersistedGameState = z.infer<typeof GameStateSchema>;

export class VersionTooNewError extends Error {
  constructor(public fromVersion: number, public currentVersion: number) {
    super(`Save version ${fromVersion} is newer than client (${currentVersion}). Update the app.`);
    this.name = 'VersionTooNewError';
  }
}
