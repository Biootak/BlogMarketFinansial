'use client';

import { Layers3 } from 'lucide-react';

import { faNum, faPercent, levelLabel, levelTone, ratio } from './format';
import { MeterBar } from './MeterBar';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * توزیع سطوح لاگ — دقیقاً همان مقادیری که در ستون level دیتابیس وجود دارد.
 *
 * نوار طیف بالای فهرست، ترکیب کل پنجره را در یک خط می‌گوید؛ ردیف‌ها عدد و سهم
 * دقیق را. برچسب و تُن هر سطح از `format.ts` می‌آید نه از نقشهٔ محلی، چون سه
 * کامپوننت دیگر هم همان برچسب‌ها را لازم دارند و دو نسخه یعنی drift.
 */
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
    <div>
      <div className={s.spectrum} aria-hidden="true">
        {data.levels.map((item) => (
          <span
            key={item.level}
            className={s.spectrumSeg}
            data-tone={levelTone(item.level)}
            style={{ inlineSize: `${Math.max(1, item.share)}%` }}
          />
        ))}
      </div>

      <ul className={s.levels}>
        {data.levels.map((item) => (
          <li key={item.level} className={s.levelRow} data-tone={levelTone(item.level)}>
            <span className={s.levelKey}>{levelLabel(item.level)}</span>
            <MeterBar value={ratio(item.count, max, 2)} tone={levelTone(item.level)} />
            <span className={s.levelVal}>
              <b>{faNum(item.count)}</b>
              <span>{faPercent(item.share)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
