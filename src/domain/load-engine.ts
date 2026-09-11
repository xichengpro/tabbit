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

const loadMoodOrder: Record<Extract<PetMood, 'calm' | 'curious' | 'busy' | 'overwhelmed'>, number> = {
  calm: 0,
  curious: 1,
  busy: 2,
  overwhelmed: 3
};

type LoadMood = keyof typeof loadMoodOrder;

export interface MoodHysteresisState {
  mood: PetMood;
  loadScore: number;
  moodCandidate?: PetMood | undefined;
  moodCandidateSamples?: number | undefined;
  moodCandidateSince?: number | undefined;
  celebrationEndsAt?: number | undefined;
}

export interface MoodHysteresisResult {
  mood: PetMood;
  moodCandidate?: PetMood | undefined;
  moodCandidateSamples?: number | undefined;
  moodCandidateSince?: number | undefined;
}

function thresholdMood(score: number): LoadMood {
  if (score >= 80) return 'overwhelmed';
  if (score >= 55) return 'busy';
  if (score >= 25) return 'curious';
  return 'calm';
}

function isLoadMood(mood: PetMood): mood is LoadMood {
  return mood in loadMoodOrder;
}

export function selectMoodWithHysteresis(
  score: number,
  state: MoodHysteresisState,
  now = Date.now()
): MoodHysteresisResult {
  if (state.celebrationEndsAt && state.celebrationEndsAt > now) {
    return { mood: 'celebrating' };
  }
  const target = thresholdMood(score);
  const current = isLoadMood(state.mood) ? state.mood : thresholdMood(state.loadScore);
  if (target === current) return { mood: current };

  const isBusier = loadMoodOrder[target] > loadMoodOrder[current];
  const candidateSamples = state.moodCandidate === target ? state.moodCandidateSamples ?? 0 : 0;
  const candidateSince = state.moodCandidate === target ? state.moodCandidateSince : undefined;

  if (isBusier) {
    const jumped = score - state.loadScore >= 15;
    const nextSamples = candidateSamples + 1;
    if (jumped || nextSamples >= 2) return { mood: target };
    return { mood: current, moodCandidate: target, moodCandidateSamples: nextSamples, moodCandidateSince: now };
  }

  const nextSince = candidateSince ?? now;
  if (now - nextSince >= 30_000) return { mood: target };
  return { mood: current, moodCandidate: target, moodCandidateSamples: 1, moodCandidateSince: nextSince };
}

export function isStaleSnapshot(capturedAt: number, latestCapturedAt: number): boolean {
  return capturedAt < latestCapturedAt;
}

export function selectMood(
  score: number,
  state: Pick<PetState, 'celebrationEndsAt'>,
  now = Date.now()
): PetMood {
  if (state.celebrationEndsAt && state.celebrationEndsAt > now) return 'celebrating';
  return thresholdMood(score);
}

export function xpRequiredForLevel(level: number): number {
  return 20 + (level - 1) * 10;
}
