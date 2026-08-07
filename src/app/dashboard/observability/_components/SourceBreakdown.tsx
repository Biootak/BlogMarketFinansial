'use client';

import { PieChart } from 'lucide-react';

<<<<<<< HEAD
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { faNum, faPercent, ratio, relative } from './format';
import s from './obs.module.css';
=======
import { cssVars, faNum, faPercent, ratio, relative, sourceName } from './format';
import { ObsEmpty } from './ObsSection';
import { useObs } from './ObsProvider';
import h from './heat.module.css';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f

/**
 * سهم منابع از ترافیک.
 *
 * دو لایه روی یک ریل: حجم کل منبع، و سهم خطا از همان حجم. چون هر دو از یک
 * لبه شروع می‌شوند، «چه بخشی از این منبع خراب است» مستقیم خوانده می‌شود.
 */
export function SourceBreakdown() {
  const { data } = useObs();
  const sources = data?.sources ?? [];

  if (!data || sources.length === 0) {
    return (
      <ObsEmpty
        icon={PieChart}
        title="منبعی ثبت نشده"
        hint="در پنجرهٔ جاری هیچ لاگی نیامده، پس سهمی هم برای تقسیم کردن وجود ندارد."
      />
    );
  }

  const biggest = Math.max(1, sources[0]?.total ?? 1);

  return (
<<<<<<< HEAD
    <ul className={s.sources}>
      {data.sources.map((item) => (
        <li key={item.source} className={s.sourceRow}>
          <span className={s.sourceName}>{item.source}</span>
          <span className={s.sourceMeta}>
            {faNum(item.total)} · {faPercent(item.share)} · آخرین{' '}
            {relative(item.lastAt, data.generatedAt)}
          </span>
          <span className={s.sourceBar}>
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
=======
    <ol className={h.shares}>
      {sources.map((source) => (
        <li key={source.source}>
          <div className={h.share}>
            <span className={h.shareName}>
              <bdi>{sourceName(source.source)}</bdi>
            </span>
            <span className={h.shareValue}>{faPercent(source.share)}</span>

            <span
              className={h.shareTrack}
              aria-hidden="true"
              style={cssVars({
                '--fill': `${ratio(source.total, biggest, 2)}%`,
                '--fill-errors': `${ratio(source.errors, biggest, 0)}%`,
              })}
            >
              <span className={h.shareFill} />
              <span className={h.shareErrors} />
            </span>

            <span className={h.shareMeta}>
              <span>{faNum(source.total)} رویداد</span>
              <span>{faNum(source.errors)} خطا</span>
              <span>{faNum(source.warns)} هشدار</span>
              <span>آخرین {relative(source.lastAt, data.generatedAt)}</span>
            </span>
          </div>
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
        </li>
      ))}
    </ol>
  );
}
