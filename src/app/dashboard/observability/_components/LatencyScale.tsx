'use client';

import { Info } from 'lucide-react';

import { faNum, faPercent, msShort } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

/**
 * شانهٔ توزیع تأخیر — سه ساقه روی **یک** محور مشترک، به‌جای سه کارت عدد بزرگ.
 *
 * چرا: سه کارت جدا «کشیدگی دم» را پنهان می‌کند. اینجا فاصلهٔ افقی p95 تا p99
 * به‌صورت یک ناحیهٔ سایه‌دار دیده می‌شود؛ هرچه آن ناحیه پهن‌تر باشد، تجربهٔ
 * بدترین درصد کاربران از میانه فاصلهٔ بیشتری دارد.
 *
 * موقعیت افقی هر ساقه = مقدار واقعی روی محور میلی‌ثانیه (داده).
 * ارتفاع ساقه‌ها فقط پله‌بندی صدک است (۵۰ → ۹۵ → ۹۹)، پس عدد جعلی نمی‌سازد.
 *
 * موقعیت‌ها به ۸۶٪ محدود می‌شوند: ساقه از لبهٔ شروع خودش لنگر می‌اندازد، پس
 * بی‌سقف، برچسب p99 از لبهٔ محور بیرون می‌زد.
 */

const MAX_POSITION = 86;

const STEMS = [
  { id: 'p50', tone: 'ok' as const, height: '2.5rem' },
  { id: 'p95', tone: 'warn' as const, height: '4rem' },
  { id: 'p99', tone: 'bad' as const, height: '5.5rem' },
];

export function LatencyScale() {
  const { data } = useObs();
  if (!data) return null;

  const { p50, p95, p99, latencySource, latencySamples, errorRate, logsPerHour } = data.performance;
  const max = Math.max(p99, p95, p50, 1) * 1.12;

  const values = [p50, p95, p99];
  const positions = values.map((value) => Math.min(MAX_POSITION, (value / max) * 100));
  const tailStart = positions[1] ?? 0;
  const tailEnd = positions[2] ?? 0;

  return (
    <div>
      <div className={s.comb}>
        {tailEnd > tailStart ? (
          <span
            className={s.tail}
            aria-hidden="true"
            style={{
              insetInlineStart: `${tailStart}%`,
              inlineSize: `${tailEnd - tailStart}%`,
            }}
          />
        ) : null}

        {STEMS.map((stem, index) => (
          <span
            key={stem.id}
            className={s.stem}
            data-tone={stem.tone}
            style={{ insetInlineStart: `${positions[index] ?? 0}%` }}
          >
            <span className={s.stemLabel}>
              <span className={s.stemVal}>{msShort(values[index] ?? 0)}</span>
              <span className={s.stemKey}>{stem.id}</span>
            </span>
            <span className={s.stemLine} style={{ blockSize: stem.height }} />
          </span>
        ))}
      </div>

      <p className={s.combAxis}>
        <span>{faNum(0)}</span>
        <span>{msShort(Math.round(max))}</span>
      </p>

      <dl className={s.rows}>
        <div className={s.row}>
          <dt className={s.rowKey}>فاصلهٔ دم (p99 منهای p95)</dt>
          <dd className={s.rowVal} data-tone={p99 - p95 > p95 ? 'bad' : 'warn'}>
            {msShort(Math.max(0, p99 - p95))}
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
          <dd className={s.rowVal} data-tone="info">
            {faNum(logsPerHour)}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowKey}>نمونه‌های اندازه‌گیری‌شده</dt>
          <dd className={s.rowVal} data-tone={latencySource === 'measured' ? 'ok' : 'warn'}>
            {faNum(latencySamples)}
          </dd>
        </div>
      </dl>

      <p className={s.note}>
        <Info size={16} strokeWidth={1.5} aria-hidden="true" />
        {latencySource === 'measured'
          ? `صدک‌ها از ${faNum(latencySamples)} نمونهٔ واقعی duration در لاگ‌های یک ساعت اخیر محاسبه شده‌اند.`
          : 'هنوز نمونهٔ کافی duration در لاگ‌ها نیست، پس این اعداد مشتق‌شده از حجم و نرخ خطا هستند نه اندازه‌گیری مستقیم. برای اعداد دقیق، در مسیرهای داغ الگوی duration=<ms> را لاگ کنید.'}
      </p>
    </div>
  );
}
