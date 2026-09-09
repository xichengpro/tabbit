import type { BrowserSnapshot } from '../domain/models';
import { getRecentTabOpens } from './storage';
import { browser } from 'wxt/browser';

export async function captureBrowserSnapshot(
  staleAfterHours: number,
  now = Date.now()
): Promise<BrowserSnapshot> {
  const [tabs, windows, recentOpens] = await Promise.all([
    browser.tabs.query({}),
    browser.windows.getAll(),
    getRecentTabOpens(now)
  ]);
  const staleThreshold = staleAfterHours * 60 * 60 * 1000;

  return {
    capturedAt: now,
    tabCount: tabs.length,
    windowCount: windows.length,
    audibleCount: tabs.filter((tab) => tab.audible).length,
    staleCount: tabs.filter(
      (tab) => tab.lastAccessed !== undefined && now - tab.lastAccessed > staleThreshold
    ).length,
    openedLast10Minutes: recentOpens.length
  };
}
