import { describe, expect, it } from 'vitest';
import {
  migratePetState,
  migrateRewardLedger,
  migrateSettings,
  getStorageSchemaVersion,
  sanitizeDiagnostics
} from '../src/domain/storage-schema';

describe('storage schemas and migrations', () => {
  it('reports empty values without inventing a persisted record', () => {
    expect(migratePetState(undefined)).toEqual({
      status: 'missing',
      diagnostic: { key: 'pet', code: 'MISSING' }
    });
  });

  it('rejects partial current records instead of silently accepting bad fields', () => {
    expect(migrateSettings({ schemaVersion: 1, softTabLimit: 20 })).toMatchObject({
      status: 'invalid',
      diagnostic: { key: 'settings', code: 'INVALID', schemaVersion: 1 }
    });
  });

  it('rejects settings whose hard limit is not greater than the soft limit', () => {
    expect(migrateSettings({
      schemaVersion: 1,
      softTabLimit: 50,
      hardTabLimit: 50,
      staleAfterHours: 24,
      reducedMotion: false,
      notificationsEnabled: false,
      quietHoursStart: 23,
      quietHoursEnd: 8
    })).toMatchObject({ status: 'invalid' });
  });

  it('keeps valid v1 data semantically unchanged', () => {
    const value = {
      schemaVersion: 1 as const,
      softTabLimit: 20,
      hardTabLimit: 50,
      staleAfterHours: 24,
      reducedMotion: false,
      notificationsEnabled: false,
      quietHoursStart: 23,
      quietHoursEnd: 8
    };
    expect(migrateSettings(value)).toEqual({ status: 'current', value });
  });

  it('migrates a legacy record deterministically and can be retried', () => {
    const legacy = { schemaVersion: 0, focusRewards: 2, cleanupRewards: 1 };
    const first = migrateRewardLedger(legacy);
    const second = migrateRewardLedger(legacy);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: 'migrated',
      value: { schemaVersion: 1, focusRewards: 2, cleanupRewards: 1, calmRecoveryRewards: 0 }
    });
  });

  it('preserves future versions and never exposes free-text names in diagnostics', () => {
    const raw = { schemaVersion: 9, name: '我的私密宠物名字' };
    const result = migratePetState(raw);
    expect(result.status).toBe('future');
    if (result.status === 'future') expect(result.raw).toBe(raw);
    const diagnostics = sanitizeDiagnostics([
      { key: 'pet', code: 'FUTURE_VERSION', schemaVersion: 9 }
    ], 123);
    expect(diagnostics).toEqual({
      generatedAt: 123,
      items: [{ key: 'pet', code: 'FUTURE_VERSION', schemaVersion: 9 }]
    });
    expect(JSON.stringify(diagnostics)).not.toContain('私密宠物');
    expect(getStorageSchemaVersion(raw)).toBe(9);
  });
});
