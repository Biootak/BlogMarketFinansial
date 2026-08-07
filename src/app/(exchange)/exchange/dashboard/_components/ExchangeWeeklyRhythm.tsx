/**
 * ExchangeWeeklyRhythm — 7-day bar chart (CSS-only).
 *
 * Server Component. bars بر اساس max(counts) scale می‌شوند (relative).
 * امروز highlight متمایز (gold).
 */

import type { DailyPoint } from '@/actions/exchange-dashboard';
import s from './ExchangeDashboard.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

export default function ExchangeWeeklyRhythm({
  data,
}: {
  data: DailyPoint[];
}) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const lastIdx = data.length - 1;

  return (
    <div>
      <div className={s.weekGrid} role="list">
        {data.map((d, idx) => {
          const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          return (
            <div key={d.offset} role="listitem" className={s.weekCol}>
              <span className={s.weekCount} dir="ltr">
                {d.count > 0 ? _faNum.format(d.count) : '۰'}
              </span>
              <div
                className={s.weekBar}
                data-today={idx === lastIdx ? 'true' : 'false'}
                data-zero={d.count === 0 ? 'true' : 'false'}
                style={{ height: `${Math.max(2, heightPct)}%` }}
                title={`${d.weekdayFa} ${d.dayLabel} — ${d.count} تراکنش`}
              />
              <span className={s.weekLabel}>
                {d.weekdayFa.slice(0, 3)}
                <br />
                <span dir="ltr" style={{ fontSize: '9px', color: 'var(--at-fg-faint)' }}>
                  {d.dayLabel}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className={s.weekFooter}>
        <span>
          جمع هفته: <strong dir="ltr">{_faNum.format(totalCount)}</strong> تراکنش
        </span>
        <span>
          اوج روز: <strong dir="ltr">{_faNum.format(maxCount)}</strong>
        </span>
      </div>
    </div>
  );
}
