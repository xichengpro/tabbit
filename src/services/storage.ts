import {
  DEFAULT_REWARD_LEDGER,
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_PET_STATE,
  DEFAULT_SETTINGS,
  DEFAULT_UNLOCK_STATE,
  type OnboardingState,
  type PetState,
  type RewardLedger,
  type UnlockState,
  type UserSettings
} from '../domain/models';
import { sanitizePetName, type AdoptionInput } from '../domain/adoption';
import {
  migrateOnboardingState,
  migratePetState,
  migrateRewardLedger,
  migrateSettings,
  migrateUnlockState,
  sanitizeDiagnostics,
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
  recentOpens: 'recentTabOpensV1'
} as const;

const BACKUP_PREFIX = 'backup:';
const BACKUP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const diagnostics = new Map<StorageKind, StorageDiagnostic>();

function rememberDiagnostic(result: MigrationResult<unknown>): void {
  if (result.status === 'current' || result.status === 'migrated') return;
  diagnostics.set(result.diagnostic.key, result.diagnostic);
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
  rememberDiagnostic(migration as MigrationResult<unknown>);
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

export async function setPetState(state: PetState): Promise<void> {
  await browser.storage.local.set({ [KEYS.pet]: state });
}

export async function getSettings(): Promise<UserSettings> {
  return readMigrated('settings', DEFAULT_SETTINGS, migrateSettings);
}

export async function setSettings(settings: UserSettings): Promise<void> {
  await browser.storage.local.set({ [KEYS.settings]: settings });
}

export async function getOnboardingState(): Promise<OnboardingState> {
  return readMigrated('onboarding', DEFAULT_ONBOARDING_STATE, migrateOnboardingState);
}

export async function getRewardLedger(): Promise<RewardLedger> {
  return readMigrated('rewardLedger', DEFAULT_REWARD_LEDGER, migrateRewardLedger);
}

export async function setRewardLedger(ledger: RewardLedger): Promise<void> {
  await browser.storage.local.set({ [KEYS.rewardLedger]: ledger });
}

export async function getUnlockState(): Promise<UnlockState> {
  return readMigrated('unlock', DEFAULT_UNLOCK_STATE, migrateUnlockState);
}

export async function setUnlockState(state: UnlockState): Promise<void> {
  await browser.storage.local.set({ [KEYS.unlock]: state });
}

export async function exportStorageDiagnostics(): Promise<SanitizedDiagnostics> {
  const all = await browser.storage.local.get();
  const migrations = [
    migratePetState(all[KEYS.pet]),
    migrateSettings(all[KEYS.settings]),
    migrateOnboardingState(all[KEYS.onboarding]),
    migrateRewardLedger(all[KEYS.rewardLedger]),
    migrateUnlockState(all[KEYS.unlock])
  ];
  migrations.forEach((migration) => rememberDiagnostic(migration as MigrationResult<unknown>));
  return sanitizeDiagnostics([...diagnostics.values()]);
}

export async function completeAdoption(input: AdoptionInput): Promise<PetState> {
  const [pet, settings] = await Promise.all([getPetState(), getSettings()]);
  const nextPet: PetState = { ...pet, name: sanitizePetName(input.name), lastUpdatedAt: Date.now() };
  const nextSettings: UserSettings = {
    ...settings,
    softTabLimit: input.softTabLimit,
    hardTabLimit: input.hardTabLimit
  };
  await browser.storage.local.set({
    [KEYS.pet]: nextPet,
    [KEYS.settings]: nextSettings,
    [KEYS.onboarding]: { schemaVersion: 1, completedAt: Date.now() } satisfies OnboardingState
  });
  return nextPet;
}

export async function resetOnboarding(): Promise<void> {
  await browser.storage.local.remove(KEYS.onboarding);
}

export async function recordTabOpen(now = Date.now()): Promise<number[]> {
  const result = await browser.storage.session.get(KEYS.recentOpens);
  const previous = (result[KEYS.recentOpens] as number[] | undefined) ?? [];
  const recent = [...previous.filter((timestamp) => now - timestamp <= 600_000), now];
  await browser.storage.session.set({ [KEYS.recentOpens]: recent });
  return recent;
}

export async function getRecentTabOpens(now = Date.now()): Promise<number[]> {
  const result = await browser.storage.session.get(KEYS.recentOpens);
  return ((result[KEYS.recentOpens] as number[] | undefined) ?? []).filter(
    (timestamp) => now - timestamp <= 600_000
  );
}
