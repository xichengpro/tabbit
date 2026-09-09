import {
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_PET_STATE,
  DEFAULT_SETTINGS,
  type OnboardingState,
  type PetState,
  type UserSettings
} from '../domain/models';
import { sanitizePetName, type AdoptionInput } from '../domain/adoption';
import { browser } from 'wxt/browser';

const KEYS = {
  pet: 'petStateV1',
  settings: 'settingsV1',
  onboarding: 'onboardingV1',
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

export async function getOnboardingState(): Promise<OnboardingState> {
  const result = await browser.storage.local.get(KEYS.onboarding);
  return {
    ...DEFAULT_ONBOARDING_STATE,
    ...(result[KEYS.onboarding] as Partial<OnboardingState> | undefined)
  };
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
