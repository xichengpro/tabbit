import { describe, expect, it } from 'vitest';
import {
  chooseFleeTarget,
  chooseMoodAction,
  chooseRoamingTarget,
  clampRoamingPoint,
  ROAMING_PADDING,
  ROAMING_PET_SIZE
} from '../src/domain/roaming';

describe('roaming pet movement', () => {
  const viewport = { width: 1_000, height: 700 };

  it('keeps the pet inside the visible viewport', () => {
    expect(clampRoamingPoint({ x: -50, y: 900 }, viewport)).toEqual({
      x: ROAMING_PADDING,
      y: viewport.height - ROAMING_PET_SIZE - ROAMING_PADDING
    });
  });

  it('chooses a deterministic roaming target within bounds', () => {
    const values = [0.8, 0.7];
    const target = chooseRoamingTarget(viewport, { x: 20, y: 20 }, () => values.shift() ?? 0.5);
    expect(target.x).toBeGreaterThan(20);
    expect(target.y).toBeGreaterThan(20);
    expect(target.x).toBeLessThanOrEqual(viewport.width - ROAMING_PET_SIZE - ROAMING_PADDING);
    expect(target.y).toBeLessThanOrEqual(viewport.height - ROAMING_PET_SIZE - ROAMING_PADDING);
  });

  it('flees toward the corner farthest from the pointer', () => {
    const target = chooseFleeTarget(viewport, { x: 10, y: 10 }, () => 0);
    expect(target).toEqual({
      x: viewport.width - ROAMING_PET_SIZE - ROAMING_PADDING,
      y: viewport.height - ROAMING_PET_SIZE - ROAMING_PADDING
    });
  });

  it('maps moods to expressive actions', () => {
    expect(chooseMoodAction('sleeping')).toBe('nap');
    expect(chooseMoodAction('curious', () => 0.9)).toBe('hop');
    expect(chooseMoodAction('overwhelmed')).toBe('alert');
    expect(chooseMoodAction('focused')).toBe('idle');
    expect(chooseMoodAction('celebrating')).toBe('hop');
  });
});
