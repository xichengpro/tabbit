import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type UserSettings } from '../../domain/models';
import { getSettings, resetOnboarding, setSettings } from '../../services/storage';
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
      <h1>Tabbit 设置</h1>
      <label>舒适标签页数量<input type="number" min="5" max="100" value={settings.softTabLimit} onChange={(e) => update({ ...settings, softTabLimit: Number(e.target.value) })} /></label>
      <label>拥挤标签页数量<input type="number" min="10" max="300" value={settings.hardTabLimit} onChange={(e) => update({ ...settings, hardTabLimit: Number(e.target.value) })} /></label>
      <label className="check"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update({ ...settings, reducedMotion: e.target.checked })} />减少动画</label>
      <button className="primary" onClick={save}>{saved ? '已保存' : '保存设置'}</button>
      <section className="settingsSection">
        <h2>重新领养</h2>
        <p className="hint">不会删除名称、成长或设置；下次打开侧边栏时会重新显示领养流程。</p>
        <button className="secondary" onClick={() => void restartAdoption()}>{onboardingReset ? '已准备好' : '重新打开领养流程'}</button>
      </section>
      <p className="hint">默认只保存聚合数字，不读取网页正文，也不会把数据上传到服务器。</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Options />);
