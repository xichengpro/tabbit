import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type UserSettings } from '../../domain/models';
import { getSettings, resetOnboarding, setSettings } from '../../services/storage';
import { t } from '../../i18n/zh-CN';
import '../../styles/theme.css';

function Options() {
  const [settings, update] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [onboardingReset, setOnboardingReset] = useState(false);
  useEffect(() => void getSettings().then(update), []);

  async function save() {
    await setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function restartAdoption() {
    await resetOnboarding();
    setOnboardingReset(true);
  }

  return (
    <main className="options shell">
      <h1>{t('options.title')}</h1>
      <label>{t('options.softLimit')}<input type="number" min="5" max="100" value={settings.softTabLimit} onChange={(e) => update({ ...settings, softTabLimit: Number(e.target.value) })} /></label>
      <label>{t('options.hardLimit')}<input type="number" min="10" max="300" value={settings.hardTabLimit} onChange={(e) => update({ ...settings, hardTabLimit: Number(e.target.value) })} /></label>
      <label className="check"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update({ ...settings, reducedMotion: e.target.checked })} />{t('options.reducedMotion')}</label>
      <button className="primary" onClick={save}>{saved ? t('options.saved') : t('options.save')}</button>
      <section className="settingsSection">
        <h2>{t('options.adoptionTitle')}</h2>
        <p className="hint">{t('options.adoptionHint')}</p>
        <button className="secondary" onClick={() => void restartAdoption()}>{onboardingReset ? t('options.adoptionReady') : t('options.adoptionButton')}</button>
      </section>
      <p className="hint">{t('options.privacyHint')}</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Options />);
