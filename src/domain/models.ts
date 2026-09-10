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
}

export interface OnboardingState {
  schemaVersion: 1;
  completedAt: number | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: 1,
  softTabLimit: 20,
  hardTabLimit: 50,
  staleAfterHours: 24,
  reducedMotion: false,
  notificationsEnabled: false,
  quietHoursStart: 23,
  quietHoursEnd: 8
};

export const DEFAULT_PET_STATE: PetState = {
  schemaVersion: 1,
  name: '团团',
  mood: 'curious',
  loadScore: 0,
  loadReasons: [],
  level: 1,
  xp: 0,
  leaves: 0,
  lastUpdatedAt: Date.now()
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  schemaVersion: 1,
  completedAt: null
};
