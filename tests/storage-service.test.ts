import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PET_STATE, DEFAULT_SETTINGS } from '../src/domain/models';

const storage = vi.hoisted(() => {
  const data: Record<string, unknown> = {};
  const get = vi.fn(async (keys?: string | string[]) => {
    if (typeof keys === 'string') return { [keys]: data[keys] };
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, data[key]]));
    }
    return { ...data };
  });
  const set = vi.fn(async (values: Record<string, unknown>) => {
    Object.assign(data, values);
  });
  const remove = vi.fn(async (keys: string | string[]) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
  });
  return { data, get, set, remove };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: { get: storage.get, set: storage.set, remove: storage.remove },
      session: { get: storage.get, set: storage.set }
    }
  }
}));

import { resetOnboarding, setPetState, setSettings } from '../src/services/storage';

describe('storage writes', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage.data)) delete storage.data[key];
    storage.get.mockClear();
    storage.set.mockClear();
    storage.remove.mockClear();
  });

  it('validates settings before persisting them', async () => {
    await expect(setSettings({
      ...DEFAULT_SETTINGS,
      softTabLimit: 50,
      hardTabLimit: 50
    })).rejects.toThrow();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('does not overwrite settings written by a future schema version', async () => {
    storage.data.settingsV1 = { schemaVersion: 2, privateFutureField: 'keep-me' };

    await expect(setSettings(DEFAULT_SETTINGS)).resolves.toBe(false);
    expect(storage.data.settingsV1).toEqual({ schemaVersion: 2, privateFutureField: 'keep-me' });
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('does not overwrite pet state written by a future schema version', async () => {
    storage.data.petStateV1 = { schemaVersion: 8, privateFutureField: 'keep-me' };

    await expect(setPetState(DEFAULT_PET_STATE)).resolves.toBe(false);
    expect(storage.data.petStateV1).toEqual({ schemaVersion: 8, privateFutureField: 'keep-me' });
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('does not remove onboarding written by a future schema version', async () => {
    storage.data.onboardingV1 = { schemaVersion: 3, privateFutureField: 'keep-me' };

    await expect(resetOnboarding()).resolves.toBe(false);
    expect(storage.data.onboardingV1).toEqual({ schemaVersion: 3, privateFutureField: 'keep-me' });
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('persists a valid current settings record', async () => {
    storage.data.settingsV1 = DEFAULT_SETTINGS;

    await expect(setSettings({ ...DEFAULT_SETTINGS, softTabLimit: 25 })).resolves.toBe(true);
    expect(storage.data.settingsV1).toMatchObject({ schemaVersion: 1, softTabLimit: 25 });
  });
});
