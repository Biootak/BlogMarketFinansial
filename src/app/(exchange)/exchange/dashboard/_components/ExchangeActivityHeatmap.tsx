/**
 * ExchangeActivityHeatmap — heatmap تراکنش‌ها بر اساس (روز هفته، ساعت).
 *
 * 7 ستون (روز) × 24 ردیف (ساعت). هر سلول یک رنگ دارد که شدت فعالیت را نشان می‌دهد.
 * سلول peak (اوج ساعت × اوج روز) با ring طلایی مشخص می‌شود.
 *
 * Server Component. کاملاً render در سمت سرور.
 */

import type { ActivityHeatmap } from '@/actions/exchange-dashboard';
import { Clock4, Flame } from 'lucide-react';
import { Fragment } from 'react';
import s from './ExchangeDashboard.module.css';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

function formatFaNumber(n: number): string {
  return _faNum.format(n);
}

function formatHour(h: number): string {
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', hour12: false }).format(
    new Date(2026, 0, 1, h, 0, 0),
  );
}

interface Props {
  data: ActivityHeatmap;
}

export default function ExchangeActivityHeatmap({ data }: Props) {
  const { cells, daysFa, peakHour, peakDay, total } = data;

  if (total === 0) {
    return (
      <div className={s.heatEmpty}>برای نمایش heatmap نیاز به دادهٔ تراکنش ۳۰ روز اخیر است.</div>
    );
  }

  // build 2D map [day][hour] -> count
  const byKey = new Map<string, number>();
  for (const c of cells) byKey.set(`${c.day}:${c.hour}`, c.count);
  const max = cells.reduce((m, c) => (c.count > m ? c.count : m), 0);

  return (
    <div className={s.heatWrap}>
      <div className={s.heatLegend}>
        <div className={s.heatLegendItem}>
          <Flame size={11} aria-hidden />
          <span>
            اوج ساعت:&nbsp;
            <strong dir="ltr">{formatHour(peakHour)}</strong> در روز&nbsp;
            <strong>{daysFa[peakDay]}</strong>
          </span>
        </div>
        <div className={s.heatLegendItem}>
          <Clock4 size={11} aria-hidden />
          <span>
            مجموع ۳۰ روز:&nbsp;
            <strong dir="ltr">{formatFaNumber(total)}</strong> تراکنش
          </span>
        </div>
        <div className={s.heatScale} aria-hidden>
          <span className={s.heatScaleLabel}>کم</span>
          <div className={s.heatScaleBar}>
            <span data-step="0" />
            <span data-step="1" />
            <span data-step="2" />
            <span data-step="3" />
            <span data-step="4" />
            <span data-step="5" />
          </div>
          <span className={s.heatScaleLabel}>زیاد</span>
        </div>
      </div>

      <div className={s.heatGrid} role="grid" aria-label="heatmap فعالیت">
        {/* header row: روزها */}
        <div className={s.heatCorner} aria-hidden />
        {daysFa.map((d, i) => (
          <div key={`day-${i}`} className={s.heatDayLabel} data-peak={i === peakDay}>
            {d}
          </div>
        ))}

        {/* rows: hour × days. هر Fragment = یک ردیف کامل (1 ساعت + 7 روز) */}
        {Array.from({ length: 24 }, (_, h) => (
          <Fragment key={`h-${h}`}>
            <div className={s.heatHourLabel} data-peak={h === peakHour}>
              <span dir="ltr">{formatHour(h)}</span>
            </div>
            {Array.from({ length: 7 }, (_, d) => {
              const count = byKey.get(`${d}:${h}`) ?? 0;
              const ratio = max > 0 ? count / max : 0;
              const step = ratio === 0 ? 0 : Math.min(5, Math.ceil(ratio * 5));
              const isPeakHour = h === peakHour;
              const isPeakDay = d === peakDay;
              return (
                <div
                  key={`c-${d}-${h}`}
                  className={s.heatCell}
                  data-step={step}
                  data-peak={isPeakHour && isPeakDay}
                  title={`${daysFa[d]} ساعت ${formatHour(h)} — ${formatFaNumber(count)} تراکنش`}
                >
                  {count > 0 && ratio > 0.4 ? (
                    <span className={s.heatCellValue} dir="ltr">
                      {count}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
