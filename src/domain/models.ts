export type PetMood =
  | 'sleeping'
  | 'calm'
  | 'curious'
  | 'busy'
  | 'overwhelmed'
  | 'focused'
  | 'celebrating';

export interface BrowserSnapshot {
  capturedAt: number;
  tabCount: number;
  windowCount: number;
  audibleCount: number;
  staleCount: number;
  openedLast10Minutes: number;
}

export type LoadReasonCode = 'TAB_COUNT' | 'OPEN_BURST' | 'STALE_RATIO' | 'AUDIO';

export interface LoadReason {
  code: LoadReasonCode;
  contribution: number;
  messageKey: string;
}

export interface LoadResult {
  score: number;
  reasons: LoadReason[];
  ruleVersion: 'load-v1';
}

export interface PetState {
  schemaVersion: 1;
  name: string;
  mood: PetMood;
  loadScore: number;
  loadReasons: LoadReason[];
  staleTabCount?: number;
  moodCandidate?: PetMood | undefined;
  moodCandidateSamples?: number | undefined;
  moodCandidateSince?: number | undefined;
  lastSnapshotAt?: number | undefined;
  level: number;
  xp: number;
  leaves: number;
  lastUpdatedAt: number;
  focusEndsAt?: number;
  celebrationEndsAt?: number;
}

export interface UserSettings {
  schemaVersion: 1;
  softTabLimit: number;
  hardTabLimit: number;
  staleAfterHours: number;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  roamingEnabled?: boolean;
  staleRemindersEnabled?: boolean;
}

export interface OnboardingState {
  schemaVersion: 1;
  completedAt: number | null;
}

export interface RewardLedger {
  schemaVersion: 1;
  localDate: string;
  focusRewards: number;
  calmRecoveryRewards: number;
  cleanupRewards: number;
  processedEventIds: string[];
}

export interface UnlockState {
  schemaVersion: 1;
  equippedDecorationId?: string;
  unlockedDecorationIds: string[];
}

export const DEFAULT_REWARD_LEDGER: RewardLedger = {
  schemaVersion: 1,
  localDate: '1970-01-01',
  focusRewards: 0,
  calmRecoveryRewards: 0,
  cleanupRewards: 0,
  processedEventIds: []
};

export const DEFAULT_UNLOCK_STATE: UnlockState = {
  schemaVersion: 1,
  unlockedDecorationIds: []
};

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: 1,
  softTabLimit: 20,
  hardTabLimit: 50,
  staleAfterHours: 24,
  reducedMotion: false,
  notificationsEnabled: false,
  quietHoursStart: 23,
  quietHoursEnd: 8,
  roamingEnabled: true,
  staleRemindersEnabled: true
};

export const DEFAULT_PET_STATE: PetState = {
  schemaVersion: 1,
  name: '团团',
  mood: 'curious',
  loadScore: 0,
  loadReasons: [],
  staleTabCount: 0,
  level: 1,
  xp: 0,
  leaves: 0,
  lastUpdatedAt: Date.now()
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  schemaVersion: 1,
  completedAt: null
};
