'use client';

import { Timer } from 'lucide-react';

import { msShort, ratio, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

const toneFor = (durationMs: number): 'ok' | 'warn' | 'bad' => {
  if (durationMs >= 1000) return 'bad';
  if (durationMs >= 300) return 'warn';
  return 'ok';
};

/**
 * کوئری‌ها و مسیرهای کند ۶ ساعت اخیر، مرتب‌شده بر اساس بدترین زمان.
 *
 * جدول واقعی مانده (semantics مهم است و ستون‌ها قابل مقایسه‌اند)، ولی ستون
 * «مدت» حالا یک ریل نسبی هم دارد: عددِ ۱٫۲ ثانیه در کنار بدترین رکورد پنجره
 * معنا پیدا می‌کند، تنها که باشد نه.
 */
export function SlowQueryTable({ limit }: { limit?: number }) {
  const { data } = useObs();
  if (!data) return null;

  if (data.slowQueries.length === 0) {
    return (
      <ObsEmpty
        icon={Timer}
        title="کوئری کندی ثبت نشده"
        hint="لاگ‌هایی که برچسب [perf] یا [slow] دارند یا الگوی duration=<ms> در پیامشان هست، اینجا با بدترین زمان بالا می‌آیند."
      />
    );
  }

  const rows =
    typeof limit === 'number' ? data.slowQueries.slice(0, limit) : data.slowQueries;
  const worst = Math.max(...data.slowQueries.map((item) => item.durationMs), 1);

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">کوئری‌های کند شش ساعت اخیر</caption>
        <thead>
          <tr>
            <th scope="col">منبع</th>
            <th scope="col">مدت</th>
            <th scope="col">پیام</th>
            <th scope="col">زمان</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} data-tone={toneFor(item.durationMs)}>
              <td>
                <span className={s.source}>{item.source}</span>
              </td>
              <td>
                <span className={s.duration}>{msShort(item.durationMs)}</span>
                <span className={s.durBar} aria-hidden="true">
                  <span style={{ inlineSize: `${ratio(item.durationMs, worst, 2)}%` }} />
                </span>
              </td>
              <td>
                <span className={s.message}>{item.message}</span>
              </td>
              <td>
                <span className={s.time}>{relative(item.timestamp, data.generatedAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
