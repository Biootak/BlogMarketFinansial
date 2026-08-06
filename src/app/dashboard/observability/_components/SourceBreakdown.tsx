'use client';

import { PieChart } from 'lucide-react';

import { faNum, faPercent, ratio, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * سهم منابع از ترافیک.
 *
 * به‌جای «نمودار دایره‌ای» که مقایسهٔ قطاع‌ها را سخت می‌کند، یک **روبان** افقی
 * داریم که کل پنجره را نشان می‌دهد و بلافاصله زیرش ردیف‌های تفکیکی. روبان
 * «کل» را می‌گوید، ردیف‌ها «هرکدام چقدر و چه سهمی خطا» را.
 *
 * ریل هر ردیف دو بخش است: حجم و خطا. خطا هم‌مقیاس حجم رسم می‌شود، پس اگر
 * تقریباً همهٔ ترافیک یک منبع خطا باشد، ریل تقریباً کامل سرخ دیده می‌شود.
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
  const covered = data.sources.reduce((sum, item) => sum + item.share, 0);

  return (
    <div>
      <div className={s.ribbon} aria-hidden="true">
        {data.sources.map((item) => (
          <span
            key={item.source}
            className={s.ribbonSeg}
            data-hot={item.errors > 0}
            style={{ inlineSize: `${Math.max(1, item.share)}%` }}
            title={`${item.source} · ${faPercent(item.share)}`}
          />
        ))}
      </div>

      <p className={s.ribbonNote}>
        این {faNum(data.sources.length)} منبع {faPercent(Math.min(100, covered))} کل حجم پنجره را
        پوشش می‌دهند؛ بخش‌های تیره‌تر منابعی‌اند که خطا هم دارند.
      </p>

      <ul className={s.sources}>
        {data.sources.map((item) => (
          <li key={item.source} className={s.sourceRow} data-tone={item.errors > 0 ? 'bad' : 'idle'}>
            <span className={s.sourceName}>{item.source}</span>

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

            <span className={s.sourceMeta}>
              <b>{faNum(item.total)}</b>
              <span>{faPercent(item.share)}</span>
              <span>{item.errors > 0 ? `${faNum(item.errors)} خطا` : 'بی‌خطا'}</span>
              <span>{relative(item.lastAt, data.generatedAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
