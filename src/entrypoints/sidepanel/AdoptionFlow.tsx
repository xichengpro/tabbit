import { useState } from 'react';
import {
  ADOPTION_PRESETS,
  sanitizePetName,
  validateAdoption,
  type AdoptionInput
} from '../../domain/adoption';
import TabbitSprite from '../../components/TabbitSprite';
import { t } from '../../i18n/zh-CN';

interface AdoptionFlowProps {
  initialName: string;
  onComplete: (input: AdoptionInput) => Promise<void>;
}

export default function AdoptionFlow({ initialName, onComplete }: AdoptionFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [presetId, setPresetId] = useState<'light' | 'daily' | 'heavy' | 'custom'>('daily');
  const [softTabLimit, setSoftTabLimit] = useState(20);
  const [hardTabLimit, setHardTabLimit] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function choosePreset(id: 'light' | 'daily' | 'heavy') {
    const preset = ADOPTION_PRESETS.find((candidate) => candidate.id === id)!;
    setPresetId(id);
    setSoftTabLimit(preset.softTabLimit);
    setHardTabLimit(preset.hardTabLimit);
    setError(null);
  }

  function proceedToRhythm() {
    const trimmed = sanitizePetName(name);
    const message = validateAdoption({ name: trimmed, softTabLimit, hardTabLimit });
    if (message === 'validation.name') {
      setError(t(message));
      return;
    }
    setName(trimmed);
    setError(null);
    setStep(2);
  }

  async function finish() {
    const input = { name: sanitizePetName(name), softTabLimit, hardTabLimit };
    const message = validateAdoption(input);
    if (message) {
      setError(t(message));
      return;
    }
    setSaving(true);
    try {
      await onComplete(input);
    } catch {
      setError(t('adoption.saveError'));
      setSaving(false);
    }
  }

  return (
    <main className="shell adoption" aria-labelledby="adoption-title">
      <div className="adoptionProgress" aria-label={t('adoption.progressAria', { step: step + 1 })}>
        <span>{t('adoption.progress')}</span>
        <strong>{step + 1} / 3</strong>
      </div>

      {step === 0 && (
        <section className="adoptionCard">
          <div className="adoptionPet"><TabbitSprite state="calm" label={t('adoption.spriteCalm')} /></div>
          <p className="eyebrow">{t('adoption.hello')}</p>
          <h1 id="adoption-title">{t('adoption.welcomeTitle')}</h1>
          <p>{t('adoption.welcomeBody')}</p>
          <aside className="privacyNote">
            <strong>{t('adoption.privacyTitle')}</strong>
            <span>{t('adoption.privacyBody')}</span>
          </aside>
          <button className="primary" onClick={() => setStep(1)}>{t('adoption.meet')}</button>
        </section>
      )}

      {step === 1 && (
        <section className="adoptionCard">
          <div className="adoptionPet small"><TabbitSprite state="curious" label={t('adoption.spriteCurious')} /></div>
          <p className="eyebrow">{t('adoption.stepTwo')}</p>
          <h1 id="adoption-title">{t('adoption.nameTitle')}</h1>
          <p>{t('adoption.nameBody')}</p>
          <label className="fieldLabel" htmlFor="pet-name">{t('adoption.nameLabel')}</label>
          <input
            id="pet-name"
            className="textInput"
            value={name}
            maxLength={24}
            autoFocus
            aria-describedby="name-help adoption-error"
            onChange={(event) => { setName(event.target.value); setError(null); }}
            onKeyDown={(event) => { if (event.key === 'Enter') proceedToRhythm(); }}
          />
          <p id="name-help" className="hint">{t('adoption.nameHelp')}</p>
          {error && <p id="adoption-error" className="formError" role="alert">{error}</p>}
          <div className="buttonRow">
            <button className="secondary" onClick={() => setStep(0)}>{t('adoption.previous')}</button>
            <button className="primary" onClick={proceedToRhythm}>{t('adoption.next')}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="adoptionCard">
          <div className="adoptionPet small"><TabbitSprite state="curious" label={t('adoption.spriteCurious')} /></div>
          <p className="eyebrow">{t('adoption.stepThree')}</p>
          <h1 id="adoption-title">{t('adoption.rhythmTitle', { name: name || t('app.defaultName') })}</h1>
          <p>{t('adoption.rhythmBody')}</p>
          <div className="presetList" aria-label={t('adoption.presetsAria')}>
            {ADOPTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`preset ${presetId === preset.id ? 'selected' : ''}`}
                aria-pressed={presetId === preset.id}
                onClick={() => choosePreset(preset.id)}
              >
                <strong>{t(preset.labelKey)}</strong>
                <span>{t('adoption.softLabel', { value: preset.softTabLimit })} · {t('adoption.hardLabel', { value: preset.hardTabLimit })}</span>
                <small>{t(preset.descriptionKey)}</small>
              </button>
            ))}
          </div>
          <button className="textButton" onClick={() => { setPresetId('custom'); setError(null); }}>{t('adoption.custom')}</button>
          {presetId === 'custom' && (
            <div className="customLimits">
              <label>{t('adoption.softLimit')}<input type="number" min="5" max="300" value={softTabLimit} onChange={(event) => setSoftTabLimit(Number(event.target.value))} /></label>
              <label>{t('adoption.hardLimit')}<input type="number" min="10" max="300" value={hardTabLimit} onChange={(event) => setHardTabLimit(Number(event.target.value))} /></label>
            </div>
          )}
          {error && <p id="adoption-error" className="formError" role="alert">{error}</p>}
          <div className="buttonRow">
            <button className="secondary" disabled={saving} onClick={() => setStep(1)}>{t('adoption.previous')}</button>
            <button className="primary" disabled={saving} onClick={() => void finish()}>{saving ? t('adoption.saving') : t('adoption.finish')}</button>
          </div>
        </section>
      )}
    </main>
  );
}
