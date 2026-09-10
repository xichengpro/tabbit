import type {
  BrowserSnapshot,
  LoadReason,
  LoadResult,
  PetMood,
  PetState,
  UserSettings
} from './models';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const reasonDefinitions: Array<{
  code: LoadReason['code'];
  weight: number;
  messageKey: string;
}> = [
  { code: 'TAB_COUNT', weight: 0.55, messageKey: 'load.reason.tabCount' },
  { code: 'OPEN_BURST', weight: 0.25, messageKey: 'load.reason.openBurst' },
  { code: 'STALE_RATIO', weight: 0.15, messageKey: 'load.reason.staleRatio' },
  { code: 'AUDIO', weight: 0.05, messageKey: 'load.reason.audio' }
];

function calculatePressures(snapshot: BrowserSnapshot, settings: UserSettings): number[] {
  const tabRange = Math.max(1, settings.hardTabLimit - settings.softTabLimit / 2);
  const tabPressure = clamp01(
    (snapshot.tabCount - settings.softTabLimit / 2) / tabRange
  );
  const burstPressure = clamp01(snapshot.openedLast10Minutes / 12);
  const stalePressure = snapshot.tabCount
    ? clamp01(snapshot.staleCount / snapshot.tabCount)
    : 0;
  const audioPressure = clamp01(snapshot.audibleCount / 3);
  return [tabPressure, burstPressure, stalePressure, audioPressure];
}

export function calculateLoad(
  snapshot: BrowserSnapshot,
  settings: UserSettings
): LoadResult {
  const pressures = calculatePressures(snapshot, settings);
  const rawContributions = reasonDefinitions.map((definition, index) => {
    const contribution = 100 * definition.weight * (pressures[index] ?? 0);
    return { ...definition, contribution };
  });
  const score = Math.round(rawContributions.reduce((total, item) => total + item.contribution, 0));
  const reasons: LoadReason[] = rawContributions
    .filter((item) => item.contribution > 0)
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3)
    .map((item) => ({
      code: item.code,
      contribution: Math.round(item.contribution),
      messageKey: item.messageKey
    }));

  return { score, reasons, ruleVersion: 'load-v1' };
}

export function calculateLoadScore(
  snapshot: BrowserSnapshot,
  settings: UserSettings
): number {
  return calculateLoad(snapshot, settings).score;
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
