import { analyzeTabsForOrganization, type OrganizerAnalysis, type OrganizerCandidate, type OrganizerTabInput } from '../domain/organizer';
import type { OrganizerRecoverySnapshot } from '../domain/models';
import {
  clearOrganizerRecoverySnapshot,
  getOrganizerRecoverySnapshot,
  getSettings,
  setOrganizerRecoverySnapshot
} from './storage';
import { browser } from 'wxt/browser';

const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1_000;
interface BrowserTab {
  id?: number | undefined;
  windowId: number | undefined;
  index: number | undefined;
  url?: string | undefined;
  title?: string | undefined;
  lastAccessed?: number | undefined;
  active?: boolean | undefined;
  pinned?: boolean | undefined;
  audible?: boolean | undefined;
}

function toOrganizerTab(tab: BrowserTab): OrganizerTabInput | null {
  if (tab.id === undefined || tab.url === undefined || tab.windowId === undefined || tab.index === undefined) return null;
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title ?? tab.url,
    ...(tab.lastAccessed === undefined ? {} : { lastAccessed: tab.lastAccessed }),
    active: tab.active ?? false,
    pinned: tab.pinned ?? false,
    audible: tab.audible ?? false
  };
}

export async function hasOrganizerPermission(): Promise<boolean> {
  return browser.permissions.contains({ permissions: ['tabs'] });
}

export async function requestOrganizerPermission(): Promise<boolean> {
  return browser.permissions.request({ permissions: ['tabs'] });
}

export async function analyzeOpenTabs(now = Date.now()): Promise<OrganizerAnalysis> {
  const [tabs, settings] = await Promise.all([browser.tabs.query({}), getSettings()]);
  const organizerTabs = tabs.map(toOrganizerTab).filter((tab): tab is OrganizerTabInput => tab !== null);
  return analyzeTabsForOrganization(organizerTabs, settings.staleAfterHours, now);
}

export interface CloseOrganizerResult {
  closed: number;
  failed: number;
  snapshot?: OrganizerRecoverySnapshot;
}

export async function closeOrganizerCandidates(candidates: OrganizerCandidate[], now = Date.now()): Promise<CloseOrganizerResult> {
  if (candidates.length === 0) return { closed: 0, failed: 0 };
  const proposedSnapshot: OrganizerRecoverySnapshot = {
    schemaVersion: 1,
    closedAt: now,
    expiresAt: now + RECOVERY_WINDOW_MS,
    tabs: candidates.map(({ id, url, windowId, index }) => ({ id, url, windowId, index }))
  };
  if (!(await setOrganizerRecoverySnapshot(proposedSnapshot))) {
    return { closed: 0, failed: candidates.length };
  }
  const settled = await Promise.allSettled(candidates.map((candidate) => browser.tabs.remove(candidate.id)));
  const closedCandidates = candidates.filter((_, index) => settled[index]?.status === 'fulfilled');
  if (closedCandidates.length === 0) {
    await clearOrganizerRecoverySnapshot();
    return { closed: 0, failed: candidates.length };
  }
  const snapshot: OrganizerRecoverySnapshot = {
    schemaVersion: 1,
    closedAt: now,
    expiresAt: now + RECOVERY_WINDOW_MS,
    tabs: closedCandidates.map(({ id, url, windowId, index }) => ({ id, url, windowId, index }))
  };
  const saved = await setOrganizerRecoverySnapshot(snapshot);
  return {
    closed: closedCandidates.length,
    failed: candidates.length - closedCandidates.length,
    ...(saved ? { snapshot } : {})
  };
}

export interface RestoreOrganizerResult {
  restored: number;
  failed: number;
}

export async function restoreLastOrganizerBatch(now = Date.now()): Promise<RestoreOrganizerResult> {
  const snapshot = await getOrganizerRecoverySnapshot(now);
  if (!snapshot) return { restored: 0, failed: 0 };
  let newlyRestored = 0;
  const settled = await Promise.allSettled(snapshot.tabs.map(async (tab) => {
    // The pre-close snapshot is intentionally written before any destructive API call.
    // If a close partially fails, avoid opening a duplicate during recovery.
    try {
      await browser.tabs.get(tab.id);
      return;
    } catch {
      // A missing tab is the normal recovery path.
    }
    try {
      await browser.tabs.create({ url: tab.url, windowId: tab.windowId, index: tab.index, active: false });
    } catch {
      await browser.tabs.create({ url: tab.url, active: false });
    }
    newlyRestored += 1;
  }));
  const restored = newlyRestored;
  const failed = settled.length - restored;
  if (failed === 0) await clearOrganizerRecoverySnapshot();
  return { restored, failed };
}
