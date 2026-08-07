'use client';

import { Layers3 } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { faNum, faPercent, ratio } from './format';
import s from './obs.module.css';

const LEVEL_LABEL: Record<string, string> = {
  info: 'اطلاع',
  warn: 'هشدار',
  error: 'خطا',
  fatal: 'بحرانی',
  debug: 'اشکال‌زدایی',
};

const LEVEL_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'idle'> = {
  info: 'info',
  debug: 'idle',
  warn: 'warn',
  error: 'bad',
  fatal: 'bad',
};

/** توزیع سطوح لاگ — دقیقاً همان مقادیری که در ستون level دیتابیس وجود دارد. */
export function LevelDistribution() {
  const { data } = useObs();
  if (!data) return null;

  if (data.levels.length === 0) {
    return (
      <ObsEmpty
        icon={Layers3}
        title="سطحی برای شمارش نیست"
        hint="به‌محض ثبت اولین لاگ، سهم هر سطح از کل حجم پنجره اینجا مقایسه می‌شود."
      />
    );
  }

  const max = Math.max(...data.levels.map((item) => item.count), 1);

  return (
    <ul className={s.levels}>
      {data.levels.map((item) => (
        <li key={item.level} className={s.levelRow} data-tone={LEVEL_TONE[item.level] ?? 'info'}>
          <span>{LEVEL_LABEL[item.level] ?? item.level}</span>
          <span className={s.levelBar}>
            <span className={s.levelFill} style={{ inlineSize: `${ratio(item.count, max, 2)}%` }} />
          </span>
          <span className={s.sourceMeta}>
            {faNum(item.count)} · {faPercent(item.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}
