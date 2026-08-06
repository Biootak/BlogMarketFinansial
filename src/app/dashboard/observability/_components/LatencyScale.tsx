'use client';

import { Info } from 'lucide-react';

import { faDecimal, faNum, faPercent, msShort } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

const MARKS = [
  { id: 'p50', label: 'میانه', tone: 'ok' as const },
  { id: 'p95', label: 'دم نزدیک', tone: 'warn' as const },
  { id: 'p99', label: 'دم دور', tone: 'bad' as const },
];

/**
 * یک محور مشترک به‌جای سه کارت عدد بزرگ.
 *
 * وقتی p50 و p95 و p99 روی یک خط بنشینند، «کشیدگی دم» فوراً دیده می‌شود؛ سه
 * کارت جدا دقیقاً همین را پنهان می‌کند.
 *
 * تازه در این نسخه: نسبت p99/p50 به‌عنوان «ضریب کشیدگی» صریح نوشته می‌شود.
 * تجربهٔ SRE می‌گوید عددِ خودِ p99 کمتر از نسبتش به میانه اهمیت دارد — نسبت
 * بالای ۴ یعنی صف یا قفل، نه کندی یکنواخت.
 */
export function LatencyScale() {
  const { data } = useObs();
  if (!data) return null;

  const { p50, p95, p99, latencySource, latencySamples, errorRate, logsPerHour } = data.performance;
  const max = Math.max(p99, p95, p50, 1) * 1.1;
  const stretch = p50 > 0 ? p99 / p50 : 0;
  const values: Record<string, number> = { p50, p95, p99 };

  return (
    <div>
      <div className={s.scale}>
        <div className={s.scaleTrack}>
          <span className={s.scaleGrid} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>

          {MARKS.map((mark) => {
            const value = values[mark.id] ?? 0;
            const position = Math.min(96, (value / max) * 100);
            return (
              <span key={mark.id} className={s.scaleGroup} data-tone={mark.tone}>
                <span className={s.scaleMark} style={{ insetInlineStart: `${position}%` }} />
                <span className={s.scaleLabel} style={{ insetInlineStart: `${position}%` }}>
                  <b>{msShort(value)}</b>
                  <span>
                    {mark.id} · {mark.label}
                  </span>
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
          <dt className={s.rowKey}>ضریب کشیدگی دم (p99÷p50)</dt>
          <dd className={s.rowVal} data-tone={stretch > 4 ? 'bad' : stretch > 2 ? 'warn' : 'ok'}>
            {stretch > 0 ? `${faDecimal(stretch, 1)}×` : '—'}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>نرخ خطای ساعت اخیر</dt>
          <dd className={s.rowVal} data-tone={errorRate > 2 ? 'bad' : 'ok'}>
            {faPercent(errorRate)}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>حجم لاگ ساعت اخیر</dt>
          <dd className={s.rowVal}>{faNum(logsPerHour)}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>نمونه‌های اندازه‌گیری‌شده</dt>
          <dd className={s.rowVal} data-tone={latencySource === 'measured' ? 'ok' : 'warn'}>
            {faNum(latencySamples)}
          </dd>
        </div>
      </dl>

      <p className={s.note} data-tone={latencySource === 'measured' ? 'info' : 'warn'}>
        <Info size={16} strokeWidth={1.5} aria-hidden="true" />
        {latencySource === 'measured'
          ? `صدک‌ها از ${faNum(latencySamples)} نمونهٔ واقعی duration در لاگ‌های یک ساعت اخیر محاسبه شده‌اند.`
          : 'هنوز نمونهٔ کافی duration در لاگ‌ها نیست، پس این اعداد مشتق‌شده از حجم و نرخ خطا هستند نه اندازه‌گیری مستقیم. برای اعداد دقیق، در مسیرهای داغ الگوی duration=<ms> را لاگ کنید.'}
      </p>
    </div>
  );
}
