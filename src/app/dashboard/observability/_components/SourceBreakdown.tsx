'use client';

import { PieChart } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { cssVars, faNum, faPercent, ratio, relative, sourceName } from './format';
import h from './heat.module.css';

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
        </li>
      ))}
    </ol>
  );
}
