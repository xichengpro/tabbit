import { calculateLoadScore, selectMood } from '../domain/load-engine';
import { captureBrowserSnapshot } from '../services/browser-snapshot';
import { getPetState, getSettings, recordTabOpen, setPetState } from '../services/storage';
import { browser } from 'wxt/browser';

const REFRESH_ALARM = 'refresh-tabbit-state';

async function refreshState(): Promise<void> {
  const [settings, current] = await Promise.all([getSettings(), getPetState()]);
  const snapshot = await captureBrowserSnapshot(settings.staleAfterHours);
  const loadScore = calculateLoadScore(snapshot, settings);
  const next = {
    ...current,
    loadScore,
    mood: selectMood(loadScore, current),
    lastUpdatedAt: Date.now()
  };
  await setPetState(next);
  await browser.runtime.sendMessage({ type: 'TABBIT_STATE_UPDATED', payload: next }).catch(() => {});
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
    void recordTabOpen().then(refreshState);
  });
  browser.tabs.onRemoved.addListener((_tabId, info) => {
    if (!info.isWindowClosing) void refreshState();
  });
  browser.tabs.onActivated.addListener(() => void refreshState());

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TABBIT_REFRESH') {
      void refreshState().then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  });
});
