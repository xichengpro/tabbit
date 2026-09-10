import { describe, expect, it } from 'vitest';
import { reasonMessageKey, selectMoodCopy, t } from '../src/i18n/zh-CN';

describe('zh-CN catalog', () => {
  it('formats typed messages and fails loudly for missing keys in development', () => {
    expect(t('app.level', { level: 3 })).toBe('TABBIT · 等级 3');
    expect(() => t('missing.key' as never)).toThrow('Missing i18n key');
  });

  it('uses late-night copy that does not encourage continued work', () => {
    expect(reasonMessageKey('OPEN_BURST', new Date('2026-09-10T23:30:00').getTime())).toBe('reason.OPEN_BURST.lateNight');
    const selected = selectMoodCopy('busy', 'OPEN_BURST', new Date('2026-09-10T23:30:00').getTime());
    expect(t(selected.lineKey)).toContain('今晚');
  });

  it('rotates flavor lines and avoids the same line within six hours', () => {
    const now = new Date('2026-09-10T12:00:00').getTime();
    const first = selectMoodCopy('calm', undefined, now);
    const second = selectMoodCopy('calm', undefined, now + 1_000, first.history);
    expect(second.lineKey).not.toBe(first.lineKey);

    const repeated = selectMoodCopy('calm', undefined, now + 2_000, second.history);
    expect(repeated.lineKey).toBe(first.lineKey);
  });
});
