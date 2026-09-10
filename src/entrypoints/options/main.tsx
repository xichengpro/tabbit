import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type UserSettings } from '../../domain/models';
import { validateTabLimits } from '../../domain/adoption';
import { getSettings, resetOnboarding, setSettings } from '../../services/storage';
import { t } from '../../i18n/zh-CN';
import '../../styles/theme.css';

function Options() {
  const [settings, update] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingReset, setOnboardingReset] = useState(false);
  useEffect(() => {
    void getSettings().then(update).catch(() => setError(t('options.loadError')));
  }, []);

  async function save() {
    const validation = validateTabLimits(settings.softTabLimit, settings.hardTabLimit);
    if (validation) {
      setError(t(validation));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const persisted = await setSettings(settings);
      if (!persisted) {
        setError(t('options.futureVersionError'));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError(t('options.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function restartAdoption() {
    setError(null);
    try {
      const reset = await resetOnboarding();
      if (!reset) {
        setError(t('options.futureVersionError'));
        return;
      }
      setOnboardingReset(true);
    } catch {
      setError(t('options.saveError'));
    }
  }

  return (
    <main className="options shell">
      <h1>{t('options.title')}</h1>
      <label>{t('options.softLimit')}<input type="number" min="5" max="300" value={settings.softTabLimit} onChange={(e) => { update({ ...settings, softTabLimit: Number(e.target.value) }); setError(null); setSaved(false); }} /></label>
      <label>{t('options.hardLimit')}<input type="number" min="10" max="300" value={settings.hardTabLimit} onChange={(e) => { update({ ...settings, hardTabLimit: Number(e.target.value) }); setError(null); setSaved(false); }} /></label>
      <label className="check"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => { update({ ...settings, reducedMotion: e.target.checked }); setError(null); setSaved(false); }} />{t('options.reducedMotion')}</label>
      {error && <p className="formError" role="alert">{error}</p>}
      <button className="primary" disabled={saving} onClick={() => void save()}>{saved ? t('options.saved') : saving ? t('options.saving') : t('options.save')}</button>
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
