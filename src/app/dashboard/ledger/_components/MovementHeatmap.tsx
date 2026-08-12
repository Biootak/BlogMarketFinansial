'use client';

/**
 * MovementHeatmap — GitHub-style daily activity heatmap for ledger.
 *
 * A grid of cells, each cell a day, color intensity proportional to
 * net movement (credit + |debit|). Hover reveals a richer label. The
 * component computes a 7×N grid (weeks × days) for a configurable
 * window. Auto-fits to its container.
 *
 * Tokens only. RTL safe (rows remain in calendar order; axis labels
 * are Persian but anchored LTR for the day-of-week mini labels).
 */

import { useMemo } from 'react';
import s from './MovementHeatmap.module.css';

export interface HeatmapCell {
  /** YYYY-MM-DD (gregorian). */
  date: string;
  value: number;
  /** Optional override label for tooltip. */
  hint?: string;
}

export interface MovementHeatmapProps {
  /** Cells sorted oldest → newest. */
  data: HeatmapCell[];
  className?: string;
  /** Number of weeks to display (default 12). */
  weeks?: number;
}

const DAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function intensityClass(value: number, max: number): string {
  if (max <= 0) return s.l0 ?? '';
  const ratio = value / max;
  if (ratio === 0) return s.l0 ?? '';
  if (ratio < 0.2) return s.l1 ?? '';
  if (ratio < 0.45) return s.l2 ?? '';
  if (ratio < 0.7) return s.l3 ?? '';
  if (ratio < 0.9) return s.l4 ?? '';
  return s.l5 ?? '';
}

export function MovementHeatmap({ data, className, weeks = 12 }: MovementHeatmapProps) {
  const { grid, monthLabels, max, total } = useMemo(() => {
    if (data.length === 0) {
      return {
        grid: [] as HeatmapCell[][],
        monthLabels: [] as { week: number; label: string }[],
        max: 0,
        total: 0,
      };
    }

    const max = Math.max(...data.map((d) => d.value), 0);
    const total = data.reduce((s, d) => s + d.value, 0);

    // Group into weeks: take last `weeks * 7` cells.
    const cells = data.slice(-weeks * 7);
    const grid: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      grid.push(cells.slice(i, i + 7));
    }
    if (grid.length > weeks) grid.shift();

    // Build month labels (first week of each month)
    const monthLabels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    grid.forEach((week, wIdx) => {
      const first = week[0];
      if (!first) return;
      const d = new Date(first.date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        const monthNames = [
          'ژانویه',
          'فوریه',
          'مارس',
          'آپریل',
          'می',
          'جون',
          'جولای',
          'آگست',
          'سپتامبر',
          'اکتوبر',
          'نوامبر',
          'دسامبر',
        ];
        monthLabels.push({ week: wIdx, label: monthNames[m] ?? '' });
      }
    });

    return { grid, monthLabels, max, total };
  }, [data, weeks]);

  if (data.length === 0) {
    return (
      <div className={`${s.root} ${s.empty} ${className ?? ''}`}>
        <span>داده‌ای برای نمایش نیست</span>
      </div>
    );
  }

  return (
    <div className={`${s.root} ${className ?? ''}`} role="img" aria-label="نقشه فعالیت">
      <div className={s.headRow}>
        <div className={s.totalBox}>
          <span className={s.totalLabel}>جمع فعالیت</span>
          <span className={s.totalValue}>{total.toLocaleString('fa-IR')}</span>
        </div>
        <div className={s.legendBox} aria-label="راهنمای شدت">
          <span className={s.legendText}>کم</span>
          <span className={`${s.legendCell} ${s.l0}`} />
          <span className={`${s.legendCell} ${s.l1}`} />
          <span className={`${s.legendCell} ${s.l2}`} />
          <span className={`${s.legendCell} ${s.l3}`} />
          <span className={`${s.legendCell} ${s.l4}`} />
          <span className={`${s.legendCell} ${s.l5}`} />
          <span className={s.legendText}>زیاد</span>
        </div>
      </div>

      <div className={s.scrollWrap}>
        <div className={s.gridWrap}>
          {/* Day labels (sticky right column on RTL) */}
          <div className={s.dayCol}>
            <span className={s.daySpacer} />
            {DAY_LABELS.map((d, i) => (
              <span key={d} className={`${s.dayLabel} ${i % 2 === 1 ? s.dayLabelHide : ''}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Scrollable grid */}
          <div className={s.gridScroll}>
            {/* Month strip */}
            <div className={s.monthStrip} aria-hidden>
              {grid.map((_, w) => {
                const ml = monthLabels.find((m) => m.week === w);
                return (
                  <span key={`m-${w}`} className={s.monthCell}>
                    {ml?.label ?? ''}
                  </span>
                );
              })}
            </div>

            {/* Day cells */}
            <div className={s.cells}>
              {grid.map((week, wIdx) => (
                <div key={`w-${wIdx}`} className={s.weekCol}>
                  {week.map((cell) => {
                    const dayIdx = (() => {
                      try {
                        return new Date(cell.date).getDay();
                      } catch {
                        return 0;
                      }
                    })();
                    return (
                      <span
                        key={cell.date}
                        className={`${s.cell} ${intensityClass(cell.value, max)}`}
                        title={`${cell.date}${cell.hint ? ` — ${cell.hint}` : ''}: ${cell.value.toLocaleString('fa-IR')}`}
                        data-day={dayIdx}
                      />
                    );
                  })}
                  {/* Pad incomplete weeks */}
                  {Array.from({ length: 7 - week.length }).map((_, i) => (
                    <span key={`pad-${i}`} className={`${s.cell} ${s.pad}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
