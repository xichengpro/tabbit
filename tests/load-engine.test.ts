import { describe, expect, it, vi } from 'vitest';
import { calculateLoad, calculateLoadScore, isStaleSnapshot, selectMood, selectMoodWithHysteresis } from '../src/domain/load-engine';
import { DEFAULT_SETTINGS } from '../src/domain/models';
import { sanitizePetName, validateAdoption } from '../src/domain/adoption';

describe('load engine', () => {
  it('keeps a small, quiet session calm', () => {
    const score = calculateLoadScore({ capturedAt: 0, tabCount: 5, windowCount: 1, audibleCount: 0, staleCount: 0, openedLast10Minutes: 0 }, DEFAULT_SETTINGS);
    expect(score).toBe(0);
    expect(selectMood(score, {})).toBe('calm');
  });

  it('marks a large bursty session as overwhelmed', () => {
    const score = calculateLoadScore({ capturedAt: 0, tabCount: 80, windowCount: 3, audibleCount: 4, staleCount: 30, openedLast10Minutes: 14 }, DEFAULT_SETTINGS);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(selectMood(score, {})).toBe('overwhelmed');
  });

  it('returns deterministic top reasons without changing the score formula', () => {
    const snapshot = { capturedAt: 0, tabCount: 80, windowCount: 3, audibleCount: 4, staleCount: 30, openedLast10Minutes: 14 };
    const result = calculateLoad(snapshot, DEFAULT_SETTINGS);

    expect(result.score).toBe(calculateLoadScore(snapshot, DEFAULT_SETTINGS));
    expect(result.ruleVersion).toBe('load-v1');
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.map((reason) => reason.code)).toEqual(['TAB_COUNT', 'OPEN_BURST', 'STALE_RATIO']);
    expect(result.reasons[0]?.contribution).toBeGreaterThanOrEqual(result.reasons[1]?.contribution ?? 0);
  });

  it('does not emit reasons for a zero-tab quiet session', () => {
    const result = calculateLoad(
      { capturedAt: 0, tabCount: 0, windowCount: 0, audibleCount: 0, staleCount: 0, openedLast10Minutes: 0 },
      DEFAULT_SETTINGS
    );
    expect(result).toEqual({ score: 0, reasons: [], ruleVersion: 'load-v1' });
  });

  it('lets explicit focus override load mood', () => {
    expect(selectMood(100, { focusEndsAt: Date.now() + 60_000 })).toBe('focused');
  });

  it('requires two samples before upgrading mood unless load jumps by 15 points', () => {
    const first = selectMoodWithHysteresis(56, { mood: 'curious', loadScore: 54 }, 1_000);
    expect(first).toMatchObject({ mood: 'curious', moodCandidate: 'busy', moodCandidateSamples: 1 });

    const second = selectMoodWithHysteresis(57, { ...first, loadScore: 56 }, 2_000);
    expect(second.mood).toBe('busy');

    expect(selectMoodWithHysteresis(80, { mood: 'curious', loadScore: 60 }, 3_000).mood).toBe('overwhelmed');
  });

  it('requires 30 seconds of stability before calming down', () => {
    const first = selectMoodWithHysteresis(54, { mood: 'busy', loadScore: 56 }, 10_000);
    expect(first).toMatchObject({ mood: 'busy', moodCandidate: 'curious' });
    expect(selectMoodWithHysteresis(54, { ...first, loadScore: 54 }, 39_999).mood).toBe('busy');
    expect(selectMoodWithHysteresis(54, { ...first, loadScore: 54 }, 40_000).mood).toBe('curious');
  });

  it('rejects an older snapshot when a newer one has already committed', () => {
    expect(isStaleSnapshot(99, 100)).toBe(true);
    expect(isStaleSnapshot(100, 100)).toBe(false);
    expect(isStaleSnapshot(101, 100)).toBe(false);
  });

  it('supports fake-clock timing for mood stability', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const first = selectMoodWithHysteresis(20, { mood: 'curious', loadScore: 26 });
    vi.advanceTimersByTime(30_000);
    const settled = selectMoodWithHysteresis(20, { ...first, loadScore: 20 });
    expect(settled.mood).toBe('calm');
    vi.useRealTimers();
  });
});

describe('adoption input', () => {
  it('removes invisible control characters from a pet name', () => {
    expect(sanitizePetName('  团\u200b团\n')).toBe('团团');
  });

  it('requires a short visible name and coherent limits', () => {
    expect(validateAdoption({ name: '', softTabLimit: 20, hardTabLimit: 50 })).toBe('validation.name');
    expect(validateAdoption({ name: '团团', softTabLimit: 50, hardTabLimit: 20 })).toBe('validation.limitOrder');
    expect(validateAdoption({ name: '团团', softTabLimit: 20, hardTabLimit: 50 })).toBeNull();
  });
});
