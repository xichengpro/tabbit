import { describe, expect, it } from 'vitest';
import { calculateLoadScore, selectMood } from '../src/domain/load-engine';
import { DEFAULT_SETTINGS } from '../src/domain/models';

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

  it('lets explicit focus override load mood', () => {
    expect(selectMood(100, { focusEndsAt: Date.now() + 60_000 })).toBe('focused');
  });
});
