import {
  DEFAULT_PET_STATE,
  DEFAULT_SETTINGS,
  type PetState,
  type UserSettings
} from '../domain/models';
import { browser } from 'wxt/browser';

const KEYS = {
  pet: 'petStateV1',
  settings: 'settingsV1',
  recentOpens: 'recentTabOpensV1'
} as const;

export async function getPetState(): Promise<PetState> {
  const result = await browser.storage.local.get(KEYS.pet);
  return { ...DEFAULT_PET_STATE, ...(result[KEYS.pet] as Partial<PetState> | undefined) };
}

export async function setPetState(state: PetState): Promise<void> {
  await browser.storage.local.set({ [KEYS.pet]: state });
}

export async function getSettings(): Promise<UserSettings> {
  const result = await browser.storage.local.get(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(result[KEYS.settings] as Partial<UserSettings> | undefined) };
}

export async function setSettings(settings: UserSettings): Promise<void> {
  await browser.storage.local.set({ [KEYS.settings]: settings });
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
