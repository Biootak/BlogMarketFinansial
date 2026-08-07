/**
 * DailyVolumeStrip — یک heatmap-style rail از ۷ روز اخیر.
 *
 * هر روز یک cell است؛ رنگ و ارتفاع آن متناسب با volume است.
 * در بالای هر cell یک dot نشان‌دهندهٔ peak hour.
 * اگر داده کمتر از ۷ باشد، بقیه cell ها empty هستند.
 */

import { formatFaNumber } from '@/lib/fa-number';
import s from './DailyVolumeStrip.module.css';

export interface DailyBucket {
  date: Date;
  volume: number;
  dealCount: number;
}

interface Props {
  buckets: DailyBucket[];
  currency: string;
}

// Module-level singletons — created once, never per call
const _faCompact = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const _faDayFmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });

const fmtCompact = (v: number): string => _faCompact.format(v);

const fmtDay = (d: Date): string => _faDayFmt.format(new Date(d));

export default function DailyVolumeStrip({ buckets, currency }: Props) {
  if (buckets.length === 0) {
    return null;
  }

  // pad to 7 cells (use empty for missing)
  const cells: Array<DailyBucket | null> = [...buckets];
  while (cells.length < 7) cells.push(null);
  const last7 = cells.slice(-7);

  const maxVol = Math.max(
    1,
    ...last7.filter((b): b is DailyBucket => b !== null).map((b) => b.volume),
  );

  const totalVol = last7.reduce((acc, b) => acc + (b?.volume ?? 0), 0);
  const totalDeals = last7.reduce((acc, b) => acc + (b?.dealCount ?? 0), 0);

  return (
    <section className={s.strip} aria-label="حجم هفتگی">
      <header className={s.head}>
        <div className={s.headLeft}>
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden />
            ریتم هفتگی
          </span>
          <h2 className={s.title}>۷ روز اخیر</h2>
        </div>
        <div className={s.headMeta}>
          <span className={s.metaItem}>
            <span className={s.metaLabel}>حجم</span>
            <span className={s.metaValue}>
              {fmtCompact(totalVol)} <em className={s.metaCurrency}>{currency}</em>
            </span>
          </span>
          <span className={s.metaItem}>
            <span className={s.metaLabel}>معاملات</span>
            <span className={s.metaValue}>{formatFaNumber(totalDeals)}</span>
          </span>
        </div>
      </header>

      <div className={s.cells} role="list">
        {last7.map((bucket, i) => {
          if (!bucket) {
            return (
              <div key={`empty-${i}`} className={s.cell} data-empty aria-hidden>
                <span className={s.bar} />
                <span className={s.dayLabel}>—</span>
              </div>
            );
          }
          const ratio = bucket.volume / maxVol;
          const h = Math.max(8, ratio * 100);
          const day = fmtDay(bucket.date);
          return (
            <div key={bucket.date.toISOString()} className={s.cell} role="listitem">
              <div className={s.barWrap}>
                <span
                  className={s.bar}
                  data-tone={ratio > 0.66 ? 'emerald' : ratio > 0.33 ? 'cyan' : 'muted'}
                  style={{ height: `${h}%` }}
                >
                  <span className={s.barValue}>
                    {bucket.volume > 0 ? fmtCompact(bucket.volume) : ''}
                  </span>
                </span>
              </div>
              <span className={s.dayLabel}>{day}</span>
              <span className={s.dealCount}>{formatFaNumber(bucket.dealCount)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
