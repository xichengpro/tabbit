import { useEffect, useState } from 'react';
import { DEFAULT_PET_STATE, type LoadReasonCode, type PetState, type PetMood } from '../../domain/models';
import { completeAdoption, getOnboardingState, getPetState, getSettings } from '../../services/storage';
import { browser } from 'wxt/browser';
import type { AdoptionInput } from '../../domain/adoption';
import AdoptionFlow from './AdoptionFlow';
import TabbitSprite, { type SpriteState } from '../../components/TabbitSprite';
import { reasonMessageKey, selectMoodCopy, t, type FlavorHistory } from '../../i18n/zh-CN';

const spriteState: Record<PetMood, SpriteState> = {
  sleeping: 'calm',
  calm: 'calm',
  curious: 'curious',
  busy: 'busy',
  overwhelmed: 'overwhelmed',
  focused: 'calm',
  celebrating: 'curious'
};

export default function App() {
  const [state, setState] = useState<PetState>(DEFAULT_PET_STATE);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [flavorHistory, setFlavorHistory] = useState<FlavorHistory>({});
  const [flavorLine, setFlavorLine] = useState(() => selectMoodCopy(DEFAULT_PET_STATE.mood, undefined).lineKey);

  useEffect(() => {
    void Promise.all([getPetState(), getOnboardingState(), getSettings()]).then(([pet, onboarding, settings]) => {
      setState(pet);
      setOnboarded(onboarding.completedAt !== null);
      setReducedMotion(settings.reducedMotion);
    });
    const listener = (message: { type?: string; payload?: PetState }) => {
      if (message.type === 'TABBIT_STATE_UPDATED' && message.payload) setState(message.payload);
    };
    browser.runtime.onMessage.addListener(listener);
    void browser.runtime.sendMessage({ type: 'TABBIT_REFRESH' });
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  const primaryCause: LoadReasonCode | undefined = state.loadReasons[0]?.code;
  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    void browser.storage.session.get('tabbitFlavorHistoryV1').then((result) => {
      const history = (result.tabbitFlavorHistoryV1 as FlavorHistory | undefined) ?? flavorHistory;
      const selected = selectMoodCopy(state.mood, primaryCause, now, history);
      if (cancelled) return;
      setFlavorHistory(selected.history);
      setFlavorLine(selected.lineKey);
      void browser.storage.session.set({ tabbitFlavorHistoryV1: selected.history });
    }).catch(() => {
      const selected = selectMoodCopy(state.mood, primaryCause, now, flavorHistory);
      if (!cancelled) {
        setFlavorHistory(selected.history);
        setFlavorLine(selected.lineKey);
      }
    });
    return () => { cancelled = true; };
  }, [state.mood, primaryCause]);

  async function finishAdoption(input: AdoptionInput) {
    const pet = await completeAdoption(input);
    setState(pet);
    setOnboarded(true);
    await browser.runtime.sendMessage({ type: 'TABBIT_REFRESH' }).catch(() => undefined);
  }

  if (onboarded === null) return <main className="shell loading">{t('app.loading')}</main>;
  if (!onboarded) return <AdoptionFlow initialName={state.name} onComplete={finishAdoption} />;

  const title = t(selectMoodCopy(state.mood, primaryCause, Date.now(), flavorHistory).titleKey);
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">{t('app.level', { level: state.level })}</span>
          <h1>{state.name}</h1>
        </div>
        <button className="iconButton" title={t('app.settings')} onClick={() => browser.runtime.openOptionsPage()}>
          ⚙
        </button>
      </header>

      <section className={`habitat mood-${state.mood}`} aria-live="polite">
        <div className="pet">
          <TabbitSprite state={spriteState[state.mood]} label={t('app.spriteLabel', { title })} reducedMotion={reducedMotion} />
        </div>
        <div className="speech">
          <strong>{title}</strong>
          <span>{t(flavorLine)}</span>
        </div>
      </section>

      <section className="card">
        <div className="metricRow">
          <span>{t('app.loadLabel')}</span>
          <strong>{state.loadScore}</strong>
        </div>
        <div className="meter" aria-label={t('app.loadAria', { score: state.loadScore })}>
          <span style={{ width: `${state.loadScore}%` }} />
        </div>
        <p className="hint">{t('app.loadHint')}</p>
        <div className="reasonList" aria-label={t('app.loadReasonsAria')}>
          {state.loadReasons.length > 0 ? (
            state.loadReasons.map((reason) => (
              <div className="reasonItem" key={reason.code}>
                <span>{t(reasonMessageKey(reason.code))}</span>
                <strong>{t('app.reasonContribution', { contribution: reason.contribution })}</strong>
              </div>
            ))
          ) : (
            <p className="hint">{t('app.noLoadFactors')}</p>
          )}
        </div>
      </section>

      <section className="actions">
        <button className="primary" disabled title={t('app.focusDisabled')}>
          {t('app.focusButton')}
        </button>
        <button className="secondary" title={t('app.organizeReady')} onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/organizer.html') })}>
          {t('app.organizeButton')}
        </button>
      </section>

      <footer>{t('app.footer', { leaves: state.leaves, xp: state.xp })}</footer>
    </main>
  );
}
