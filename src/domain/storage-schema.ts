import { z } from 'zod';
import type {
  LoadReason,
  CustomPetAsset,
  OnboardingState,
  OrganizerRecoverySnapshot,
  PetMood,
  PetState,
  RewardLedger,
  UnlockState,
  UserSettings
} from './models';

export const STORAGE_SCHEMA_VERSION = 1 as const;

const PetMoodSchema = z.enum([
  'sleeping',
  'calm',
  'curious',
  'busy',
  'overwhelmed',
  'celebrating'
]);

const LoadReasonSchema = z.object({
  code: z.enum(['TAB_COUNT', 'OPEN_BURST', 'STALE_RATIO', 'AUDIO']),
  contribution: z.number().int().min(0).max(100),
  messageKey: z.string().min(1).max(100)
});

export const PetStateV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  name: z.string().min(1).max(40),
  mood: PetMoodSchema,
  loadScore: z.number().int().min(0).max(100),
  loadReasons: z.array(LoadReasonSchema).max(3).default([]),
  staleTabCount: z.number().int().nonnegative().optional(),
  moodCandidate: PetMoodSchema.optional(),
  moodCandidateSamples: z.number().int().min(0).max(10).optional(),
  moodCandidateSince: z.number().int().nonnegative().optional(),
  lastSnapshotAt: z.number().int().nonnegative().optional(),
  level: z.number().int().min(1).max(100),
  xp: z.number().int().nonnegative(),
  leaves: z.number().int().nonnegative(),
  lastUpdatedAt: z.number().int().nonnegative(),
  celebrationEndsAt: z.number().int().nonnegative().optional()
});

export const UserSettingsV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  softTabLimit: z.number().int().min(5).max(300),
  hardTabLimit: z.number().int().min(10).max(300),
  staleAfterHours: z.number().int().min(1).max(24 * 365),
  reducedMotion: z.boolean(),
  notificationsEnabled: z.boolean(),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
  roamingEnabled: z.boolean().optional(),
  staleRemindersEnabled: z.boolean().optional(),
  roamingOpacity: z.number().int().min(30).max(100).optional(),
  customPetEnabled: z.boolean().optional()
}).refine((settings) => settings.hardTabLimit > settings.softTabLimit, {
  message: 'hardTabLimit must be greater than softTabLimit',
  path: ['hardTabLimit']
});

export const OnboardingStateV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  completedAt: z.number().int().nonnegative().nullable()
});

export const RewardLedgerV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  calmRecoveryRewards: z.number().int().nonnegative(),
  cleanupRewards: z.number().int().nonnegative(),
  processedEventIds: z.array(z.string().min(1).max(100)).max(100)
});

export const UnlockStateV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  equippedDecorationId: z.string().min(1).max(100).optional(),
  unlockedDecorationIds: z.array(z.string().min(1).max(100)).max(200)
});

export const OrganizerRecoverySnapshotV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  closedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  tabs: z.array(z.object({
    id: z.number().int().nonnegative(),
    url: z.string().url().max(8_192),
    windowId: z.number().int().nonnegative(),
    index: z.number().int().nonnegative()
  })).min(1).max(200)
}).refine((snapshot) => snapshot.expiresAt > snapshot.closedAt, {
  message: 'recovery snapshot must expire after it was created',
  path: ['expiresAt']
});

export const CustomPetAssetV1Schema = z.object({
  schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
  name: z.string().min(1).max(40),
  spriteVersion: z.union([z.literal(1), z.literal(2)]),
  dataUrl: z.string().regex(/^data:image\/(png|webp);base64,/).max(9_000_000),
  importedAt: z.number().int().nonnegative()
});

export type StorageRecord = PetState | UserSettings | OnboardingState | RewardLedger | UnlockState | OrganizerRecoverySnapshot | CustomPetAsset;
export type StorageKind = 'pet' | 'settings' | 'onboarding' | 'rewardLedger' | 'unlock' | 'organizerRecovery' | 'customPet';

export type StorageDiagnosticCode = 'MISSING' | 'INVALID' | 'FUTURE_VERSION' | 'MIGRATION_REQUIRED';

export interface StorageDiagnostic {
  key: StorageKind;
  code: StorageDiagnosticCode;
  schemaVersion?: number;
}

export interface SanitizedDiagnostics {
  generatedAt: number;
  items: StorageDiagnostic[];
}

export type MigrationResult<T> =
  | { status: 'current'; value: T }
  | { status: 'migrated'; value: T }
  | { status: 'missing'; diagnostic: StorageDiagnostic }
  | { status: 'invalid'; diagnostic: StorageDiagnostic }
  | { status: 'future'; raw: unknown; diagnostic: StorageDiagnostic };

export function getStorageSchemaVersion(raw: unknown): number | undefined {
  if (!raw || typeof raw !== 'object' || !('schemaVersion' in raw)) return undefined;
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'number' && Number.isInteger(version) ? version : undefined;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw);
}

function futureResult<T>(key: StorageKind, raw: unknown): MigrationResult<T> | null {
  const schemaVersion = getStorageSchemaVersion(raw);
  if (schemaVersion !== undefined && schemaVersion > STORAGE_SCHEMA_VERSION) {
    return {
      status: 'future',
      raw,
      diagnostic: { key, code: 'FUTURE_VERSION', schemaVersion }
    };
  }
  return null;
}

function invalidResult<T>(key: StorageKind, raw: unknown): MigrationResult<T> {
  const schemaVersion = getStorageSchemaVersion(raw);
  return { status: 'invalid', diagnostic: { key, code: 'INVALID', ...(schemaVersion === undefined ? {} : { schemaVersion }) } };
}

function parseCurrent<T>(key: StorageKind, raw: unknown, schema: z.ZodType<T>): MigrationResult<T> {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { status: 'current', value: parsed.data } : invalidResult<T>(key, raw);
}

function migrateLegacy<T>(key: StorageKind, raw: unknown, schema: z.ZodType<T>, defaults: Record<string, unknown>): MigrationResult<T> {
  const future = futureResult<T>(key, raw);
  if (future) return future;
  if (raw === undefined) return { status: 'missing', diagnostic: { key, code: 'MISSING' } };
  const current = parseCurrent(key, raw, schema);
  if (current.status === 'current') return current;
  if (!isRecord(raw)) return invalidResult<T>(key, raw);

  const version = getStorageSchemaVersion(raw);
  if (version !== undefined && version !== 0) return current;
  const migrated = schema.safeParse({ ...defaults, ...raw, schemaVersion: STORAGE_SCHEMA_VERSION });
  if (!migrated.success) return invalidResult<T>(key, raw);
  return { status: 'migrated', value: migrated.data };
}

const PET_DEFAULTS = {
  name: '团团',
  mood: 'curious' as PetMood,
  loadScore: 0,
  loadReasons: [] as LoadReason[],
  staleTabCount: 0,
  level: 1,
  xp: 0,
  leaves: 0,
  lastUpdatedAt: 0
};

const SETTINGS_DEFAULTS = {
  softTabLimit: 20,
  hardTabLimit: 50,
  staleAfterHours: 24,
  reducedMotion: false,
  notificationsEnabled: false,
  quietHoursStart: 23,
  quietHoursEnd: 8,
  roamingEnabled: true,
  staleRemindersEnabled: true,
  roamingOpacity: 100
};

const ONBOARDING_DEFAULTS = { completedAt: null };
const REWARD_DEFAULTS = {
  localDate: '1970-01-01',
  calmRecoveryRewards: 0,
  cleanupRewards: 0,
  processedEventIds: [] as string[]
};
const UNLOCK_DEFAULTS = { unlockedDecorationIds: [] as string[] };

export function migratePetState(raw: unknown): MigrationResult<PetState> {
  const normalized = isRecord(raw) && raw.mood === 'focused' ? { ...raw, mood: 'calm' } : raw;
  const migration = migrateLegacy('pet', normalized, PetStateV1Schema as z.ZodType<PetState>, PET_DEFAULTS);
  return normalized !== raw && migration.status === 'current'
    ? { status: 'migrated', value: migration.value }
    : migration;
}

export function migrateSettings(raw: unknown): MigrationResult<UserSettings> {
  return migrateLegacy('settings', raw, UserSettingsV1Schema as z.ZodType<UserSettings>, SETTINGS_DEFAULTS);
}

export function migrateOnboardingState(raw: unknown): MigrationResult<OnboardingState> {
  return migrateLegacy('onboarding', raw, OnboardingStateV1Schema as z.ZodType<OnboardingState>, ONBOARDING_DEFAULTS);
}

export function migrateRewardLedger(raw: unknown): MigrationResult<RewardLedger> {
  return migrateLegacy('rewardLedger', raw, RewardLedgerV1Schema as z.ZodType<RewardLedger>, REWARD_DEFAULTS);
}

export function migrateUnlockState(raw: unknown): MigrationResult<UnlockState> {
  return migrateLegacy('unlock', raw, UnlockStateV1Schema as z.ZodType<UnlockState>, UNLOCK_DEFAULTS);
}

export function migrateOrganizerRecovery(raw: unknown): MigrationResult<OrganizerRecoverySnapshot> {
  return migrateLegacy(
    'organizerRecovery',
    raw,
    OrganizerRecoverySnapshotV1Schema as z.ZodType<OrganizerRecoverySnapshot>,
    {}
  );
}

export function migrateCustomPetAsset(raw: unknown): MigrationResult<CustomPetAsset> {
  return migrateLegacy('customPet', raw, CustomPetAssetV1Schema as z.ZodType<CustomPetAsset>, {});
}

export function sanitizeDiagnostics(items: StorageDiagnostic[], generatedAt = Date.now()): SanitizedDiagnostics {
  return {
    generatedAt,
    items: items.map(({ key, code, schemaVersion }) => ({
      key,
      code,
      ...(schemaVersion === undefined ? {} : { schemaVersion })
    }))
  };
}
