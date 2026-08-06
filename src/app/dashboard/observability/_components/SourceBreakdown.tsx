'use client';

import { PieChart } from 'lucide-react';

import { faNum, faPercent, ratio, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * سهم هر منبع از حجم لاگ، با سهم خطای همان منبع روی همان ریل.
 * دو نوار روی یک ریل می‌نشینند نه دو نوار جدا: مقایسهٔ «چقدر پرحجم» با «چقدر
 * پرخطا» فقط وقتی معنا دارد که مقیاسشان یکی باشد.
 */
export function SourceBreakdown() {
  const { data } = useObs();
  if (!data) return null;

  if (data.sources.length === 0) {
    return (
      <ObsEmpty
        icon={PieChart}
        title="منبعی برای تفکیک نیست"
        hint="وقتی سرویس‌ها با source مشخص لاگ بنویسند، سهم هرکدام از کل ترافیک اینجا مقایسه می‌شود."
      />
    );
  }

  const max = Math.max(...data.sources.map((item) => item.total), 1);

  return (
    <ul className={s.sources}>
      {data.sources.map((item) => (
        <li key={item.source} className={s.sourceRow}>
          <span className={s.sourceName} title={item.source}>
            {item.source}
          </span>

          <span className={s.sourceMeta}>
            {faNum(item.total)} · {faPercent(item.share)}
            {item.errors > 0 ? ` · ${faNum(item.errors)} خطا` : ''} · آخرین{' '}
            {relative(item.lastAt, data.generatedAt)}
          </span>

          <span className={s.sourceBar} aria-hidden="true">
            <span
              className={s.sourceFill}
              style={{ inlineSize: `${ratio(item.total, max, 1)}%` }}
            />
            {item.errors > 0 ? (
              <span
                className={s.sourceErr}
                style={{ inlineSize: `${ratio(item.errors, max, 1)}%` }}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
