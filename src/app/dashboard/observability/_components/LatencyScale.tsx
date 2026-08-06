'use client';

import { Info } from 'lucide-react';

import { faNum, faPercent, msShort } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

/**
 * یک محور مشترک به‌جای سه کارت عدد بزرگ.
 * وقتی p50 و p95 و p99 روی یک خط بنشینند، «کشیدگی دم» فوراً دیده می‌شود؛
 * سه کارت جدا این را پنهان می‌کند.
 */
export function LatencyScale() {
  const { data } = useObs();
  if (!data) return null;

  const { p50, p95, p99, latencySource, latencySamples } = data.performance;
  const max = Math.max(p99, p95, p50, 1) * 1.1;

  const marks: Array<{ id: string; value: number; tone: 'ok' | 'warn' | 'bad' }> = [
    { id: 'p50', value: p50, tone: 'ok' },
    { id: 'p95', value: p95, tone: 'warn' },
    { id: 'p99', value: p99, tone: 'bad' },
  ];

  return (
    <div>
      <div className={s.scale}>
        <div className={s.scaleTrack}>
          {marks.map((mark) => {
            const position = Math.min(97, (mark.value / max) * 100);
            return (
              <span key={mark.id} data-tone={mark.tone}>
                <span className={s.scaleMark} style={{ insetInlineStart: `${position}%` }} />
                <span className={s.scaleLabel} style={{ insetInlineStart: `${position}%` }}>
                  <b>{msShort(mark.value)}</b>
                  {mark.id}
                </span>
              </span>
            );
          })}
        </div>
        <p className={s.scaleAxis}>
          <span>{faNum(0)}</span>
          <span>{msShort(Math.round(max))}</span>
        </p>
      </div>

      <dl className={s.rows}>
        <div className={s.row}>
          <dt className={s.rowKey}>نرخ خطای ساعت اخیر</dt>
          <dd className={s.rowVal} data-tone={data.performance.errorRate > 2 ? 'bad' : 'ok'}>
            {faPercent(data.performance.errorRate)}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>حجم لاگ ساعت اخیر</dt>
          <dd className={s.rowVal}>{faNum(data.performance.logsPerHour)}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>نمونه‌های اندازه‌گیری‌شده</dt>
          <dd className={s.rowVal}>{faNum(latencySamples)}</dd>
        </div>
      </dl>

      <p className={s.note}>
        <Info size={16} strokeWidth={1.5} aria-hidden />
        {latencySource === 'measured'
          ? `صدک‌ها از ${faNum(latencySamples)} نمونهٔ واقعی duration در لاگ‌های یک ساعت اخیر محاسبه شده‌اند.`
          : 'هنوز نمونهٔ کافی duration در لاگ‌ها نیست، پس این اعداد مشتق‌شده از حجم و نرخ خطا هستند نه اندازه‌گیری مستقیم. برای اعداد دقیق، در مسیرهای داغ الگوی duration=<ms> را لاگ کنید.'}
      </p>
    </div>
  );
}
