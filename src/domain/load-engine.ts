import type { BrowserSnapshot, PetMood, PetState, UserSettings } from './models';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function calculateLoadScore(
  snapshot: BrowserSnapshot,
  settings: UserSettings
): number {
  const tabRange = Math.max(1, settings.hardTabLimit - settings.softTabLimit / 2);
  const tabPressure = clamp01(
    (snapshot.tabCount - settings.softTabLimit / 2) / tabRange
  );
  const burstPressure = clamp01(snapshot.openedLast10Minutes / 12);
  const stalePressure = snapshot.tabCount
    ? clamp01(snapshot.staleCount / snapshot.tabCount)
    : 0;
  const audioPressure = clamp01(snapshot.audibleCount / 3);

  return Math.round(
    100 *
      (0.55 * tabPressure +
        0.25 * burstPressure +
        0.15 * stalePressure +
        0.05 * audioPressure)
  );
}

export function selectMood(
  score: number,
  state: Pick<PetState, 'focusEndsAt' | 'celebrationEndsAt'>,
  now = Date.now()
): PetMood {
  if (state.celebrationEndsAt && state.celebrationEndsAt > now) return 'celebrating';
  if (state.focusEndsAt && state.focusEndsAt > now) return 'focused';
  if (score >= 80) return 'overwhelmed';
  if (score >= 55) return 'busy';
  if (score >= 25) return 'curious';
  return 'calm';
}

export function xpRequiredForLevel(level: number): number {
  return 20 + (level - 1) * 10;
}
