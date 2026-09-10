import { describe, expect, it } from 'vitest';
import { analyzeTabsForOrganization, normalizeComparableUrl } from '../src/domain/organizer';

const now = 1_000_000_000_000;

describe('tab organizer analysis', () => {
  it('suggests only safe duplicate and stale tabs', () => {
    const analysis = analyzeTabsForOrganization([
      { id: 1, windowId: 1, index: 0, url: 'https://example.com/a', title: 'Active keeper', lastAccessed: now - 3 * 86_400_000, active: true, pinned: false, audible: false },
      { id: 2, windowId: 1, index: 1, url: 'https://example.com/a#notes', title: 'Duplicate', lastAccessed: now - 2 * 3_600_000, active: false, pinned: false, audible: false },
      { id: 3, windowId: 1, index: 2, url: 'https://example.org/old', title: 'Old tab', lastAccessed: now - 48 * 3_600_000, active: false, pinned: false, audible: false },
      { id: 4, windowId: 1, index: 3, url: 'https://pinned.example/', title: 'Pinned', lastAccessed: now - 48 * 3_600_000, active: false, pinned: true, audible: false },
      { id: 5, windowId: 1, index: 4, url: 'https://recent.example/', title: 'Recent', lastAccessed: now - 5 * 60_000, active: false, pinned: false, audible: false },
      { id: 6, windowId: 1, index: 5, url: 'chrome://settings/', title: 'System', lastAccessed: now - 48 * 3_600_000, active: false, pinned: false, audible: false }
    ], 24, now);

    expect(analysis.protectedCount).toBe(3);
    expect(analysis.candidates).toEqual([
      expect.objectContaining({ id: 3, reasons: ['STALE'] }),
      expect.objectContaining({ id: 2, reasons: ['DUPLICATE'] })
    ]);
    expect(analysis.domains).toContainEqual({ domain: 'example.com', count: 2 });
  });

  it('normalizes fragments but does not treat browser pages as closable URLs', () => {
    expect(normalizeComparableUrl('https://example.com/a#section')).toBe('https://example.com/a');
    expect(normalizeComparableUrl('chrome://settings/')).toBeNull();
  });
});
