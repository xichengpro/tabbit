import ReactDOM from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type CustomPetAsset, type UserSettings } from '../../domain/models';
import { validateTabLimits } from '../../domain/adoption';
import {
  inspectCodexSpriteCells,
  inspectCodexSpriteDimensions,
  type CodexAnimation,
  type CodexSpriteMetadata
} from '../../domain/custom-pet';
import { clearCustomPetAsset, getCustomPetAsset, getSettings, resetOnboarding, setCustomPetAsset, setSettings } from '../../services/storage';
import { t } from '../../i18n/zh-CN';
import TabbitSprite from '../../components/TabbitSprite';
import '../../styles/theme.css';

const CUSTOM_PET_PREVIEWS: Array<{ animation: CodexAnimation; labelKey: Parameters<typeof t>[0] }> = [
  { animation: 'idle', labelKey: 'options.customPetAnimation.idle' },
  { animation: 'running-left', labelKey: 'options.customPetAnimation.runningLeft' },
  { animation: 'running-right', labelKey: 'options.customPetAnimation.runningRight' },
  { animation: 'waving', labelKey: 'options.customPetAnimation.waving' },
  { animation: 'jumping', labelKey: 'options.customPetAnimation.jumping' },
  { animation: 'failed', labelKey: 'options.customPetAnimation.failed' },
  { animation: 'waiting', labelKey: 'options.customPetAnimation.waiting' },
  { animation: 'running', labelKey: 'options.customPetAnimation.running' },
  { animation: 'review', labelKey: 'options.customPetAnimation.review' }
];

function Options() {
  const [settings, update] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingReset, setOnboardingReset] = useState(false);
  const [customPet, setCustomPet] = useState<CustomPetAsset | undefined>();
  const [previewAnimation, setPreviewAnimation] = useState<CodexAnimation>('idle');
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

  async function inspectImage(file: File): Promise<{ metadata: CodexSpriteMetadata; cellError?: string }> {
    const bitmap = await createImageBitmap(file);
    try {
      const metadata = inspectCodexSpriteDimensions(bitmap.width, bitmap.height);
      if (!metadata) throw new Error('INVALID_DIMENSIONS');
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('CANVAS_UNAVAILABLE');
      context.drawImage(bitmap, 0, 0);
      const issues = inspectCodexSpriteCells(
        context.getImageData(0, 0, bitmap.width, bitmap.height).data,
        metadata
      );
      const firstIssue = issues[0];
      return {
        metadata,
        ...(firstIssue ? {
          cellError: t(
            firstIssue.kind === 'required-empty'
              ? 'options.customPetRequiredCellEmpty'
              : 'options.customPetUnusedCellVisible',
            { row: firstIssue.row + 1, column: firstIssue.column + 1 }
          )
        } : {})
      };
    } finally {
      bitmap.close();
    }
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
      let inspection: Awaited<ReturnType<typeof inspectImage>>;
      try {
        inspection = await inspectImage(file);
      } catch (inspectionError) {
        if (inspectionError instanceof Error && inspectionError.message === 'INVALID_DIMENSIONS') {
          setError(t('options.customPetFormat'));
          return;
        }
        throw inspectionError;
      }
      if (inspection.cellError) {
        setError(inspection.cellError);
        return;
      }
      const { metadata } = inspection;
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
          <div className="customPetPreviewPanel">
            <div className="customPetPreview">
              <div className="customPetPreviewSprite"><TabbitSprite state="calm" label={customPet.name} customPet={customPet} animation={previewAnimation} /></div>
              <span>{t('options.customPetLoaded', { name: customPet.name, version: customPet.spriteVersion })}</span>
            </div>
            <div className="customPetPreviewActions" role="group" aria-label={t('options.customPetPreviewActions')}>
              {CUSTOM_PET_PREVIEWS.map(({ animation, labelKey }) => (
                <button
                  key={animation}
                  type="button"
                  className="previewAction"
                  aria-pressed={previewAnimation === animation}
                  onClick={() => setPreviewAnimation(animation)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
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
