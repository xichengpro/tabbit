import {
  DEFAULT_REWARD_LEDGER,
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_PET_STATE,
  DEFAULT_SETTINGS,
  DEFAULT_UNLOCK_STATE,
  type OnboardingState,
  type OrganizerRecoverySnapshot,
  type PetState,
  type RewardLedger,
  type UnlockState,
  type UserSettings
} from '../domain/models';
import { sanitizePetName, validateAdoption, type AdoptionInput } from '../domain/adoption';
import {
  getStorageSchemaVersion,
  migrateOnboardingState,
  migrateOrganizerRecovery,
  migratePetState,
  migrateRewardLedger,
  migrateSettings,
  migrateUnlockState,
  OnboardingStateV1Schema,
  OrganizerRecoverySnapshotV1Schema,
  PetStateV1Schema,
  RewardLedgerV1Schema,
  sanitizeDiagnostics,
  STORAGE_SCHEMA_VERSION,
  UnlockStateV1Schema,
  UserSettingsV1Schema,
  type MigrationResult,
  type SanitizedDiagnostics,
  type StorageDiagnostic,
  type StorageKind
} from '../domain/storage-schema';
import { browser } from 'wxt/browser';

const KEYS = {
  pet: 'petStateV1',
  settings: 'settingsV1',
  onboarding: 'onboardingV1',
  rewardLedger: 'rewardLedgerV1',
  unlock: 'unlockStateV1',
  organizerRecovery: 'organizerRecoveryV1',
  recentOpens: 'recentTabOpensV1'
} as const;

const BACKUP_PREFIX = 'backup:';
const BACKUP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const diagnostics = new Map<StorageKind, StorageDiagnostic>();

function rememberDiagnostic(key: StorageKind, result: MigrationResult<unknown>): void {
  if (result.status === 'current' || result.status === 'migrated') {
    diagnostics.delete(key);
    return;
  }
  diagnostics.set(result.diagnostic.key, result.diagnostic);
}

async function canWrite(keys: StorageKind[]): Promise<boolean> {
  const storageKeys = keys.map((key) => KEYS[key]);
  const existing = await browser.storage.local.get(storageKeys);
  let compatible = true;
  for (const key of keys) {
    const schemaVersion = getStorageSchemaVersion(existing[KEYS[key]]);
    if (schemaVersion !== undefined && schemaVersion > STORAGE_SCHEMA_VERSION) {
      diagnostics.set(key, { key, code: 'FUTURE_VERSION', schemaVersion });
      compatible = false;
    }
  }
  return compatible;
}

async function writeCurrent<T>(key: StorageKind, value: T): Promise<boolean> {
  if (!(await canWrite([key]))) return false;
  await browser.storage.local.set({ [KEYS[key]]: value });
  diagnostics.delete(key);
  return true;
}

async function cleanupBackups(now = Date.now()): Promise<void> {
  const all = await browser.storage.local.get();
  const expired = Object.keys(all).filter((key) => {
    if (!key.startsWith(BACKUP_PREFIX)) return false;
    const timestamp = Number(key.split(':').at(-1));
    return Number.isFinite(timestamp) && now - timestamp > BACKUP_RETENTION_MS;
  });
  if (expired.length > 0) await browser.storage.local.remove(expired);
}

async function backupBeforeMigration(key: StorageKind, raw: unknown, now = Date.now()): Promise<void> {
  await browser.storage.local.set({ [`${BACKUP_PREFIX}${key}:${now}`]: raw });
  await cleanupBackups(now);
}

async function readMigrated<T>(
  key: StorageKind,
  fallback: T,
  migrate: (raw: unknown) => MigrationResult<T>
): Promise<T> {
  await cleanupBackups();
  const result = await browser.storage.local.get(KEYS[key]);
  const migration = migrate(result[KEYS[key]]);
  rememberDiagnostic(key, migration as MigrationResult<unknown>);
  if (migration.status === 'current') return migration.value;
  if (migration.status === 'migrated') {
    await backupBeforeMigration(key, result[KEYS[key]]);
    await browser.storage.local.set({ [KEYS[key]]: migration.value });
    return migration.value;
  }
  return fallback;
}

export async function getPetState(): Promise<PetState> {
  return readMigrated('pet', DEFAULT_PET_STATE, migratePetState);
}

export async function setPetState(state: PetState): Promise<boolean> {
  return writeCurrent('pet', PetStateV1Schema.parse(state));
}

export async function getSettings(): Promise<UserSettings> {
  return readMigrated('settings', DEFAULT_SETTINGS, migrateSettings);
}

export async function setSettings(settings: UserSettings): Promise<boolean> {
  return writeCurrent('settings', UserSettingsV1Schema.parse(settings));
}

export async function getOnboardingState(): Promise<OnboardingState> {
  return readMigrated('onboarding', DEFAULT_ONBOARDING_STATE, migrateOnboardingState);
}

export async function getRewardLedger(): Promise<RewardLedger> {
  return readMigrated('rewardLedger', DEFAULT_REWARD_LEDGER, migrateRewardLedger);
}

export async function setRewardLedger(ledger: RewardLedger): Promise<boolean> {
  return writeCurrent('rewardLedger', RewardLedgerV1Schema.parse(ledger));
}

export async function getUnlockState(): Promise<UnlockState> {
  return readMigrated('unlock', DEFAULT_UNLOCK_STATE, migrateUnlockState);
}

export async function setUnlockState(state: UnlockState): Promise<boolean> {
  return writeCurrent('unlock', UnlockStateV1Schema.parse(state));
}

export async function getOrganizerRecoverySnapshot(now = Date.now()): Promise<OrganizerRecoverySnapshot | undefined> {
  const result = await browser.storage.local.get(KEYS.organizerRecovery);
  const migration = migrateOrganizerRecovery(result[KEYS.organizerRecovery]);
  rememberDiagnostic('organizerRecovery', migration as MigrationResult<unknown>);
  if (migration.status !== 'current' && migration.status !== 'migrated') return undefined;
  const snapshot = migration.value;
  if (snapshot.expiresAt > now) return snapshot;
  if (await canWrite(['organizerRecovery'])) await browser.storage.local.remove(KEYS.organizerRecovery);
  return undefined;
}

export async function setOrganizerRecoverySnapshot(snapshot: OrganizerRecoverySnapshot): Promise<boolean> {
  return writeCurrent('organizerRecovery', OrganizerRecoverySnapshotV1Schema.parse(snapshot));
}

export async function clearOrganizerRecoverySnapshot(): Promise<boolean> {
  if (!(await canWrite(['organizerRecovery']))) return false;
  await browser.storage.local.remove(KEYS.organizerRecovery);
  diagnostics.delete('organizerRecovery');
  return true;
}

export async function exportStorageDiagnostics(): Promise<SanitizedDiagnostics> {
  const all = await browser.storage.local.get();
  const migrations = [
    migratePetState(all[KEYS.pet]),
    migrateSettings(all[KEYS.settings]),
    migrateOnboardingState(all[KEYS.onboarding]),
    migrateRewardLedger(all[KEYS.rewardLedger]),
    migrateUnlockState(all[KEYS.unlock]),
    migrateOrganizerRecovery(all[KEYS.organizerRecovery])
  ];
  const keys: StorageKind[] = ['pet', 'settings', 'onboarding', 'rewardLedger', 'unlock', 'organizerRecovery'];
  migrations.forEach((migration, index) => rememberDiagnostic(keys[index]!, migration as MigrationResult<unknown>));
  return sanitizeDiagnostics([...diagnostics.values()]);
}

export async function completeAdoption(input: AdoptionInput): Promise<PetState> {
  const validation = validateAdoption(input);
  if (validation) throw new Error(validation);
  const [pet, settings] = await Promise.all([getPetState(), getSettings()]);
  const nextPet = PetStateV1Schema.parse({
    ...pet,
    name: sanitizePetName(input.name),
    lastUpdatedAt: Date.now()
  }) as PetState;
  const nextSettings = UserSettingsV1Schema.parse({
    ...settings,
    softTabLimit: input.softTabLimit,
    hardTabLimit: input.hardTabLimit
  });
  const nextOnboarding = OnboardingStateV1Schema.parse({ schemaVersion: 1, completedAt: Date.now() });
  if (!(await canWrite(['pet', 'settings', 'onboarding']))) {
    throw new Error('FUTURE_STORAGE_VERSION');
  }
  await browser.storage.local.set({
    [KEYS.pet]: nextPet,
    [KEYS.settings]: nextSettings,
    [KEYS.onboarding]: nextOnboarding
  });
  diagnostics.delete('pet');
  diagnostics.delete('settings');
  diagnostics.delete('onboarding');
  return nextPet;
}

export async function resetOnboarding(): Promise<boolean> {
  if (!(await canWrite(['onboarding']))) return false;
  await browser.storage.local.remove(KEYS.onboarding);
  diagnostics.delete('onboarding');
  return true;
}

export async function recordTabOpen(now = Date.now()): Promise<number[]> {
  const result = await browser.storage.session.get(KEYS.recentOpens);
  const raw = result[KEYS.recentOpens];
  const previous = Array.isArray(raw)
    ? raw.filter((timestamp): timestamp is number => typeof timestamp === 'number' && Number.isFinite(timestamp))
    : [];
  const recent = [...previous.filter((timestamp) => now - timestamp <= 600_000), now];
  await browser.storage.session.set({ [KEYS.recentOpens]: recent });
  return recent;
}

export async function getRecentTabOpens(now = Date.now()): Promise<number[]> {
  const result = await browser.storage.session.get(KEYS.recentOpens);
  const raw = result[KEYS.recentOpens];
  if (!Array.isArray(raw)) return [];
  return raw.filter((timestamp): timestamp is number =>
    typeof timestamp === 'number' && Number.isFinite(timestamp) &&
    now - timestamp <= 600_000
  );
}
