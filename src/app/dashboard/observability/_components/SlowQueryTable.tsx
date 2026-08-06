'use client';

import { Timer } from 'lucide-react';

import { msShort, relative } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

const toneFor = (durationMs: number): 'ok' | 'warn' | 'bad' => {
  if (durationMs >= 1000) return 'bad';
  if (durationMs >= 300) return 'warn';
  return 'ok';
};

/** کوئری‌ها و مسیرهای کند ۶ ساعت اخیر، مرتب‌شده بر اساس بدترین زمان. */
export function SlowQueryTable() {
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

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">کوئری‌های کند شش ساعت اخیر</caption>
        <thead>
          <tr>
            <th scope="col">مدت</th>
            <th scope="col">منبع</th>
            <th scope="col">پیام</th>
            <th scope="col">زمان</th>
          </tr>
        </thead>
        <tbody>
          {data.slowQueries.map((item) => (
            <tr key={item.id} data-tone={toneFor(item.durationMs)}>
              <td>
                <span className={s.duration}>{msShort(item.durationMs)}</span>
              </td>
              <td>
                <span className={s.source}>{item.source}</span>
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
