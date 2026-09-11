import ReactDOM from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type CustomPetAsset, type UserSettings } from '../../domain/models';
import { validateTabLimits } from '../../domain/adoption';
import { inspectCodexSpriteDimensions } from '../../domain/custom-pet';
import { clearCustomPetAsset, getCustomPetAsset, getSettings, resetOnboarding, setCustomPetAsset, setSettings } from '../../services/storage';
import { t } from '../../i18n/zh-CN';
import TabbitSprite from '../../components/TabbitSprite';
import '../../styles/theme.css';

function Options() {
  const [settings, update] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingReset, setOnboardingReset] = useState(false);
  const [customPet, setCustomPet] = useState<CustomPetAsset | undefined>();
  const uploadRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void Promise.all([getSettings(), getCustomPetAsset()])
      .then(([nextSettings, asset]) => {
        update(nextSettings);
        setCustomPet(asset);
      })
      .catch(() => setError(t('options.loadError')));
  }, []);

  async function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('READ_FAILED'));
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  async function dimensionsFor(file: File): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  async function importCustomPet(file: File | undefined) {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      if (!['image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
        setError(t('options.customPetInvalid'));
        return;
      }
      const dimensions = await dimensionsFor(file);
      const metadata = inspectCodexSpriteDimensions(dimensions.width, dimensions.height);
      if (!metadata) {
        setError(t('options.customPetFormat'));
        return;
      }
      const asset: CustomPetAsset = {
        schemaVersion: 1,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Custom pet',
        spriteVersion: metadata.spriteVersion,
        dataUrl: await readDataUrl(file),
        importedAt: Date.now()
      };
      if (!(await setCustomPetAsset(asset)) || !(await setSettings({ ...settings, customPetEnabled: true }))) {
        setError(t('options.futureVersionError'));
        return;
      }
      setCustomPet(asset);
      update({ ...settings, customPetEnabled: true });
      setSaved(true);
    } catch {
      setError(t('options.customPetInvalid'));
    } finally {
      setSaving(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  }

  async function restoreDefaultPet() {
    setSaving(true);
    setError(null);
    try {
      const nextSettings = { ...settings, customPetEnabled: false };
      if (!(await clearCustomPetAsset()) || !(await setSettings(nextSettings))) {
        setError(t('options.futureVersionError'));
        return;
      }
      setCustomPet(undefined);
      update(nextSettings);
      setSaved(true);
    } catch {
      setError(t('options.saveError'));
    } finally {
      setSaving(false);
    }
  }

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
      <section className="settingsSection">
        <h2>{t('options.roamingTitle')}</h2>
        <p className="hint">{t('options.roamingHint')}</p>
        <label className="check"><input type="checkbox" checked={settings.roamingEnabled ?? true} onChange={(e) => { update({ ...settings, roamingEnabled: e.target.checked }); setError(null); setSaved(false); }} />{t('options.roamingEnabled')}</label>
        <label className="check"><input type="checkbox" disabled={!(settings.roamingEnabled ?? true)} checked={settings.staleRemindersEnabled ?? true} onChange={(e) => { update({ ...settings, staleRemindersEnabled: e.target.checked }); setError(null); setSaved(false); }} />{t('options.staleRemindersEnabled')}</label>
        <label>
          {t('options.roamingOpacity', { value: settings.roamingOpacity ?? 100 })}
          <input type="range" min="30" max="100" step="5" disabled={!(settings.roamingEnabled ?? true)} value={settings.roamingOpacity ?? 100} onChange={(e) => { update({ ...settings, roamingOpacity: Number(e.target.value) }); setError(null); setSaved(false); }} />
        </label>
      </section>
      <section className="settingsSection">
        <h2>{t('options.customPetTitle')}</h2>
        <p className="hint">{t('options.customPetHint')}</p>
        {customPet ? (
          <div className="customPetPreview">
            <div className="customPetPreviewSprite"><TabbitSprite state="calm" label={customPet.name} reducedMotion customPet={customPet} /></div>
            <span>{t('options.customPetLoaded', { name: customPet.name, version: customPet.spriteVersion })}</span>
          </div>
        ) : <p className="hint">{t('options.customPetNone')}</p>}
        <input ref={uploadRef} className="srOnly" type="file" accept="image/png,image/webp" onChange={(event) => void importCustomPet(event.target.files?.[0])} />
        <button className="secondary" disabled={saving} onClick={() => uploadRef.current?.click()}>{t('options.customPetImport')}</button>
        {customPet && <button className="textButton" disabled={saving} onClick={() => void restoreDefaultPet()}>{t('options.customPetRestore')}</button>}
      </section>
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
