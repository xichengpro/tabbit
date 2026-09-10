import { useEffect, useState } from 'react';
import { DEFAULT_PET_STATE, type LoadReasonCode, type PetState } from '../../domain/models';
import { completeAdoption, getOnboardingState, getPetState } from '../../services/storage';
import { browser } from 'wxt/browser';
import type { AdoptionInput } from '../../domain/adoption';
import AdoptionFlow from './AdoptionFlow';

const moodCopy: Record<PetState['mood'], { emoji: string; title: string; line: string }> = {
  sleeping: { emoji: '🌙', title: '睡着啦', line: '今天的标签页森林很安静。' },
  calm: { emoji: '🐰', title: '轻轻松松', line: '桌面很清爽，适合专心做一件事。' },
  curious: { emoji: '🐇', title: '正在探险', line: '我闻到了几个新标签页的味道。' },
  busy: { emoji: '🐰', title: '有点忙碌', line: '要不要先关掉几个已经看完的页面？' },
  overwhelmed: { emoji: '🙈', title: '被标签页埋住了', line: '救救我——先整理五个就很棒。' },
  focused: { emoji: '🎧', title: '专注中', line: '我替你守着门，先完成眼前这件事。' },
  celebrating: { emoji: '🎉', title: '整理成功', line: '呼！又看见桌面啦。' }
};

const reasonCopy: Record<LoadReasonCode, string> = {
  TAB_COUNT: '标签页数量是当前的主要负载',
  OPEN_BURST: '刚才连续打开了不少新标签页',
  STALE_RATIO: '有一部分标签页很久没有访问',
  AUDIO: '同时有多个标签页正在发声'
};

export default function App() {
  const [state, setState] = useState<PetState>(DEFAULT_PET_STATE);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void Promise.all([getPetState(), getOnboardingState()]).then(([pet, onboarding]) => {
      setState(pet);
      setOnboarded(onboarding.completedAt !== null);
    });
    const listener = (message: { type?: string; payload?: PetState }) => {
      if (message.type === 'TABBIT_STATE_UPDATED' && message.payload) setState(message.payload);
    };
    browser.runtime.onMessage.addListener(listener);
    void browser.runtime.sendMessage({ type: 'TABBIT_REFRESH' });
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  async function finishAdoption(input: AdoptionInput) {
    const pet = await completeAdoption(input);
    setState(pet);
    setOnboarded(true);
    await browser.runtime.sendMessage({ type: 'TABBIT_REFRESH' }).catch(() => undefined);
  }

  if (onboarded === null) return <main className="shell loading">正在准备小窝…</main>;
  if (!onboarded) return <AdoptionFlow initialName={state.name} onComplete={finishAdoption} />;

  const copy = moodCopy[state.mood];
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">TABBIT · LEVEL {state.level}</span>
          <h1>{state.name}</h1>
        </div>
        <button className="iconButton" title="设置" onClick={() => browser.runtime.openOptionsPage()}>
          ⚙
        </button>
      </header>

      <section className={`habitat mood-${state.mood}`} aria-live="polite">
        <div className="pet" role="img" aria-label={`标签兔状态：${copy.title}`}>
          {copy.emoji}
        </div>
        <div className="speech">
          <strong>{copy.title}</strong>
          <span>{copy.line}</span>
        </div>
      </section>

      <section className="card">
        <div className="metricRow">
          <span>浏览负载</span>
          <strong>{state.loadScore}</strong>
        </div>
        <div className="meter" aria-label={`浏览负载 ${state.loadScore}%`}>
          <span style={{ width: `${state.loadScore}%` }} />
        </div>
        <p className="hint">这是浏览节奏提示，不是效率评分。</p>
        <div className="reasonList" aria-label="浏览负载原因">
          {state.loadReasons.length > 0 ? (
            state.loadReasons.map((reason) => (
              <div className="reasonItem" key={reason.code}>
                <span>{reasonCopy[reason.code]}</span>
                <strong>+{reason.contribution}</strong>
              </div>
            ))
          ) : (
            <p className="hint">目前没有明显的负载因素。</p>
          )}
        </div>
      </section>

      <section className="actions">
        <button className="primary" disabled title="将在第 2 个开发任务中启用">
          开始 25 分钟专注
        </button>
        <button className="secondary" disabled title="将在获得可选 tabs 权限后启用">
          整理标签页
        </button>
      </section>

      <footer>🍃 {state.leaves} · XP {state.xp}</footer>
    </main>
  );
}
