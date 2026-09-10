import { calculateLoad, isStaleSnapshot, selectMoodWithHysteresis } from '../domain/load-engine';
import { captureBrowserSnapshot } from '../services/browser-snapshot';
import { getPetState, getSettings, recordTabOpen, setPetState, setSettings } from '../services/storage';
import { browser } from 'wxt/browser';

const REFRESH_ALARM = 'refresh-tabbit-state';
const REFRESH_DEBOUNCE_MS = 250;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshQueue: Promise<void> = Promise.resolve();

function reportRefreshFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`Tabbit state refresh failed: ${message}`);
}

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    void refreshState().catch(reportRefreshFailure);
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
    staleTabCount: snapshot.staleCount,
    mood: mood.mood,
    moodCandidate: mood.moodCandidate,
    moodCandidateSamples: mood.moodCandidateSamples,
    moodCandidateSince: mood.moodCandidateSince,
    lastSnapshotAt: snapshot.capturedAt,
    lastUpdatedAt: Date.now()
  };
  const persisted = await setPetState(next);
  if (!persisted) return;
  await browser.runtime.sendMessage({ type: 'TABBIT_STATE_UPDATED', payload: next }).catch(() => {});
}

function refreshState(): Promise<void> {
  const next = refreshQueue.then(() => refreshStateNow());
  refreshQueue = next.catch(() => undefined);
  return next;
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void (async () => {
      await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      await browser.alarms.create(REFRESH_ALARM, { periodInMinutes: 1 });
      await refreshState();
    })().catch(reportRefreshFailure);
  });

  browser.runtime.onStartup.addListener(() => {
    void refreshState().catch(reportRefreshFailure);
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REFRESH_ALARM) void refreshState().catch(reportRefreshFailure);
  });
  browser.tabs.onCreated.addListener(() => {
    void recordTabOpen().then(scheduleRefresh).catch(reportRefreshFailure);
  });
  browser.tabs.onRemoved.addListener((_tabId, info) => {
    if (!info.isWindowClosing) scheduleRefresh();
  });
  browser.tabs.onActivated.addListener(scheduleRefresh);

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TABBIT_REFRESH') {
      void refreshState()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          reportRefreshFailure(error);
          sendResponse({ ok: false });
        });
      return true;
    }
    if (message?.type === 'TABBIT_UPDATE_ROAMING_SETTINGS') {
      void (async () => {
        const settings = await getSettings();
        const payload = message.payload as {
          roamingEnabled?: unknown;
          staleRemindersEnabled?: unknown;
        } | undefined;
        const next = {
          ...settings,
          ...(typeof payload?.roamingEnabled === 'boolean'
            ? { roamingEnabled: payload.roamingEnabled }
            : {}),
          ...(typeof payload?.staleRemindersEnabled === 'boolean'
            ? { staleRemindersEnabled: payload.staleRemindersEnabled }
            : {})
        };
        const persisted = await setSettings(next);
        sendResponse({ ok: persisted });
      })().catch((error) => {
        reportRefreshFailure(error);
        sendResponse({ ok: false });
      });
      return true;
    }
    if (message?.type === 'TABBIT_OPEN_OPTIONS') {
      void browser.runtime.openOptionsPage()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });
});
