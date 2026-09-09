import { useState } from 'react';
import {
  ADOPTION_PRESETS,
  sanitizePetName,
  validateAdoption,
  type AdoptionInput
} from '../../domain/adoption';

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
    if (message?.startsWith('名字')) {
      setError(message);
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
      setError(message);
      return;
    }
    setSaving(true);
    try {
      await onComplete(input);
    } catch {
      setError('暂时没能记住设置，请再试一次。');
      setSaving(false);
    }
  }

  return (
    <main className="shell adoption" aria-labelledby="adoption-title">
      <div className="adoptionProgress" aria-label={`领养流程，第 ${step + 1} 步，共 3 步`}>
        <span>领养流程</span>
        <strong>{step + 1} / 3</strong>
      </div>

      {step === 0 && (
        <section className="adoptionCard">
          <div className="adoptionPet" aria-hidden="true">🐇</div>
          <p className="eyebrow">HELLO, I’M TABBIt</p>
          <h1 id="adoption-title">有只小家伙想住进你的侧边栏</h1>
          <p>它会根据标签页的整体节奏作出反应，偶尔提醒你休息或整理。</p>
          <aside className="privacyNote">
            <strong>默认只看聚合状态</strong>
            <span>它不知道你正在浏览什么：不会读取网页正文、标题、网址、表单或历史记录。</span>
          </aside>
          <button className="primary" onClick={() => setStep(1)}>认识一下</button>
        </section>
      )}

      {step === 1 && (
        <section className="adoptionCard">
          <div className="adoptionPet small" aria-hidden="true">🐰</div>
          <p className="eyebrow">STEP 2</p>
          <h1 id="adoption-title">先给它起个名字</h1>
          <p>默认叫团团。名字只保存在这台浏览器里。</p>
          <label className="fieldLabel" htmlFor="pet-name">宠物名字</label>
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
          <p id="name-help" className="hint">1–12 个可见字符；会自动移除换行和不可见控制字符。</p>
          {error && <p id="adoption-error" className="formError" role="alert">{error}</p>}
          <div className="buttonRow">
            <button className="secondary" onClick={() => setStep(0)}>上一步</button>
            <button className="primary" onClick={proceedToRhythm}>继续</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="adoptionCard">
          <div className="adoptionPet small" aria-hidden="true">🐰</div>
          <p className="eyebrow">STEP 3</p>
          <h1 id="adoption-title">让 {name || '团团'} 适应你的节奏</h1>
          <p>标签页多不等于效率低。这里只是决定它什么时候该温柔地提醒你。</p>
          <div className="presetList" aria-label="标签页节奏预设">
            {ADOPTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`preset ${presetId === preset.id ? 'selected' : ''}`}
                aria-pressed={presetId === preset.id}
                onClick={() => choosePreset(preset.id)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.softTabLimit} 舒适 · {preset.hardTabLimit} 拥挤</span>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
          <button className="textButton" onClick={() => { setPresetId('custom'); setError(null); }}>自定义数量</button>
          {presetId === 'custom' && (
            <div className="customLimits">
              <label>舒适数量<input type="number" min="5" max="300" value={softTabLimit} onChange={(event) => setSoftTabLimit(Number(event.target.value))} /></label>
              <label>拥挤数量<input type="number" min="10" max="300" value={hardTabLimit} onChange={(event) => setHardTabLimit(Number(event.target.value))} /></label>
            </div>
          )}
          {error && <p id="adoption-error" className="formError" role="alert">{error}</p>}
          <div className="buttonRow">
            <button className="secondary" disabled={saving} onClick={() => setStep(1)}>上一步</button>
            <button className="primary" disabled={saving} onClick={() => void finish()}>{saving ? '正在安顿…' : '完成领养'}</button>
          </div>
        </section>
      )}
    </main>
  );
}
