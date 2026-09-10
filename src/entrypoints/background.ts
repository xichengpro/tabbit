import { calculateLoad, isStaleSnapshot, selectMoodWithHysteresis } from '../domain/load-engine';
import { captureBrowserSnapshot } from '../services/browser-snapshot';
import { getPetState, getSettings, recordTabOpen, setPetState } from '../services/storage';
import { browser } from 'wxt/browser';

const REFRESH_ALARM = 'refresh-tabbit-state';
const REFRESH_DEBOUNCE_MS = 250;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshQueue: Promise<void> = Promise.resolve();

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    void refreshState();
  }, REFRESH_DEBOUNCE_MS);
}

async function refreshStateNow(): Promise<void> {
  const [settings, current] = await Promise.all([getSettings(), getPetState()]);
  const snapshot = await captureBrowserSnapshot(settings.staleAfterHours);
  if (isStaleSnapshot(snapshot.capturedAt, current.lastSnapshotAt ?? 0)) return;
  const load = calculateLoad(snapshot, settings);
  const mood = selectMoodWithHysteresis(load.score, current, snapshot.capturedAt);
  const next = {
    ...current,
    loadScore: load.score,
    loadReasons: load.reasons,
    mood: mood.mood,
    moodCandidate: mood.moodCandidate,
    moodCandidateSamples: mood.moodCandidateSamples,
    moodCandidateSince: mood.moodCandidateSince,
    lastSnapshotAt: snapshot.capturedAt,
    lastUpdatedAt: Date.now()
  };
  await setPetState(next);
  await browser.runtime.sendMessage({ type: 'TABBIT_STATE_UPDATED', payload: next }).catch(() => {});
}

function refreshState(): Promise<void> {
  const next = refreshQueue.then(() => refreshStateNow());
  refreshQueue = next.catch(() => undefined);
  return next;
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    await browser.alarms.create(REFRESH_ALARM, { periodInMinutes: 1 });
    await refreshState();
  });

  browser.runtime.onStartup.addListener(refreshState);
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REFRESH_ALARM) void refreshState();
  });
  browser.tabs.onCreated.addListener(() => {
    void recordTabOpen().then(scheduleRefresh);
  });
  browser.tabs.onRemoved.addListener((_tabId, info) => {
    if (!info.isWindowClosing) scheduleRefresh();
  });
  browser.tabs.onActivated.addListener(scheduleRefresh);

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TABBIT_REFRESH') {
      void refreshState().then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  });
});
