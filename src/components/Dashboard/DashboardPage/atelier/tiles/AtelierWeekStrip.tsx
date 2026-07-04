'use client';

/**
 * AtelierWeekStrip — current week strip with content density.
 *
 * A horizontal 7-day strip (Saturday → Friday) showing each Persian
 * day name + day-of-month + a small "dots" indicator for how many
 * posts (draft / published / scheduled) exist for that day. Tapping
 * a day filters the chart to that range (visual only for now).
 *
 * Designed as a thin tile between the hero row and the chart.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { useMemo, useState } from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { dayNameFa, dayNumberFa } from '../utils';

interface AtelierWeekStripProps {
  scheduledPosts: PostWithRelations[];
}

function startOfWeek(d: Date): Date {
  // Persian week starts on Saturday (day 6 in JS where 0=Sunday)
  // Day index: Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
  const day = d.getDay();
  const offset = (day - 6 + 7) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offset);
  return start;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AtelierWeekStrip({ scheduledPosts }: AtelierWeekStripProps) {
  const today = new Date();
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek(today));
        d.setDate(d.getDate() + i);
        return d;
      }),
    // week is keyed on today (recomputed each mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [selected, setSelected] = useState(today);

  // Build density for each day in this week.
  const density = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of scheduledPosts ?? []) {
      // Use updatedAt as a coarse proxy; the chart is decorative
      const ts = p.updatedAt ? new Date(p.updatedAt) : null;
      if (!ts) continue;
      const key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [scheduledPosts]);

  return (
    <section className="at-tile at-week" aria-label="هفتهٔ جاری">
      <header className="at-head at-week__head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineCalendarDays className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">هفتهٔ جاری</h2>
            <p className="at-head__sub">۷ روز آینده</p>
          </div>
        </div>
      </header>

      <ol className="at-week__strip" role="listbox" aria-label="روزهای هفته">
        {week.map((d) => {
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selected);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const count = density.get(key) ?? 0;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  'at-week__day',
                  isToday && 'is-today',
                  isSelected && 'is-selected',
                )}
                aria-selected={isSelected}
              >
                <span className="at-week__day-name">{dayNameFa(d)}</span>
                <span className="at-week__day-num tabular-nums">
                  {dayNumberFa(d)}
                </span>
                <span className="at-week__day-dots" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'at-week__day-dot',
                        i < count && 'is-on',
                      )}
                    />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
