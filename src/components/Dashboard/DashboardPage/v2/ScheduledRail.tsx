'use client';

/**
 * ScheduledRail — mini calendar + next-slot list (2026-06-26 Jalali fix).
 *
 * Sits in the right rail of the dashboard shell. Shows the current Persian
 * (Jalali) month as a 7-column grid with correct Jalali weekday alignment.
 *
 * 2026-06-26 fix: the previous implementation used `new Date().getMonth()`
 * (Gregorian) to build the grid but rendered Persian month names — the grid
 * was misaligned. Replaced with `date-fns-jalali` which provides drop-in
 * Jalali calendar functions (getMonth, getDate, getDay, startOfMonth,
 * getDaysInMonth) so the weekday columns and month name are always
 * consistent.
 *
 * Uses logical CSS properties (inset-inline-start / block-start) so it
 * mirrors correctly in RTL.
 */

import FormattedDate from '@/components/FormattedDate';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import {
  format as formatJalali,
  getDate as getJalaliDate,
  getDay as getJalaliDay,
  getDaysInMonth as getJalaliDaysInMonth,
  getMonth as getJalaliMonth,
  startOfMonth as startOfJalaliMonth,
} from 'date-fns-jalali';
import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { HiOutlineArrowLeft, HiOutlineCalendarDays } from 'react-icons/hi2';

interface ScheduledRailProps {
  scheduledPosts: PostWithRelations[];
}

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const; // شنبه..جمعه

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Build the calendar grid for a Jalali month containing `reference`.
 * Returns cells with Jalali day numbers (1..31) or null for padding.
 * Saturday is column 0 (RTL first), Friday is column 6.
 *
 * `date-fns-jalali`'s `getDay` returns 0..6 where 0 = Saturday (the
 * Persian week starts on Saturday), so the value maps directly to our
 * WEEKDAYS_SHORT index.
 */
function getJalaliMonthGrid(reference: Date) {
  const monthStart = startOfJalaliMonth(reference);
  const startWeekday = getJalaliDay(monthStart); // 0=Sat..6=Fri
  const daysInMonth = getJalaliDaysInMonth(reference);

  const cells: Array<{ day: number | null; date: Date | null }> = [];

  // Leading padding
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null, date: null });
  }

  // Day cells — compute the Gregorian Date for each Jalali day by
  // adding `i` days from the start-of-month anchor.
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(monthStart);
    cellDate.setDate(cellDate.getDate() + (d - 1));
    cells.push({ day: d, date: cellDate });
  }

  // Trailing padding to fill the last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, date: null });
  }

  return cells;
}

const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export default function ScheduledRail({ scheduledPosts }: ScheduledRailProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const monthCells = useMemo(() => getJalaliMonthGrid(today), [today]);
  const monthName = PERSIAN_MONTH_NAMES[getJalaliMonth(today)];
  const yearFa = formatJalali(today, 'yyyy');
  const gridRef = useRef<HTMLDivElement>(null);

  const moveFocus = (direction: 'up' | 'down' | 'left' | 'right') => {
    const grid = gridRef.current;
    if (!grid) return;
    const cells = Array.from(
      grid.querySelectorAll<HTMLElement>('.dash-minical__cell:not(.dash-minical__cell--muted)'),
    );
    if (cells.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    let idx = cells.findIndex((cell) => cell === active);
    if (idx === -1) {
      idx = cells.findIndex((cell) => cell.classList.contains('dash-minical__cell--today'));
    }
    if (idx === -1) idx = 0;

    const cols = 7;
    let next = idx;
    switch (direction) {
      case 'right':
        next = idx + 1;
        break;
      case 'left':
        next = idx - 1;
        break;
      case 'down':
        next = idx + cols;
        break;
      case 'up':
        next = idx - cols;
        break;
    }
    next = Math.max(0, Math.min(cells.length - 1, next));

    cells.forEach((cell, i) => {
      cell.setAttribute('tabindex', i === next ? '0' : '-1');
    });
    cells[next]?.focus();
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
    event.preventDefault();
    const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    moveFocus(map[key]);
  };

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts) {
      const dateValue = p.updatedAt;
      if (!dateValue) continue;
      const d = startOfDay(new Date(dateValue));
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key);
      if (list) list.push(p);
    }
    return map;
  }, [scheduledPosts]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...scheduledPosts]
      .filter((p) => (p.updatedAt ? new Date(p.updatedAt).getTime() >= now - 60_000 : false))
      .sort((a, b) => {
        const aT = new Date(a.updatedAt ?? 0).getTime();
        const bT = new Date(b.updatedAt ?? 0).getTime();
        return aT - bT;
      })
      .slice(0, 4);
  }, [scheduledPosts]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall"
      aria-label="تقویم انتشار"
    >
      <header className="dash-pane__head">
        <span className="dash-pane__title">
          <span className="dash-ico dash-ico--emerald w-10 h-10 shrink-0" aria-hidden>
            <HiOutlineCalendarDays className="w-5 h-5" />
          </span>
          <span className="dash-pane__title-text">تقویم انتشار</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {monthName} {yearFa}
        </span>
      </header>

      <div className="grid gap-1.5">
        <div className="dash-minical" aria-hidden>
          {WEEKDAYS_SHORT.map((w) => (
            <span
              key={w}
              className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold"
            >
              {w}
            </span>
          ))}
        </div>
        <div
          ref={gridRef}
          className="dash-minical"
          role="grid"
          aria-label="روزهای ماه جاری"
          onKeyDown={handleGridKeyDown}
        >
          {monthCells.map((cell, idx) => {
            if (cell.date === null) {
              return (
                <span
                  key={`pad-${idx}-${cell.day ?? 'null'}`}
                  className="dash-minical__cell dash-minical__cell--muted"
                  aria-hidden
                />
              );
            }
            const key = cell.date.toISOString().slice(0, 10);
            const isToday = cell.date.getTime() === today.getTime();
            const has = scheduledByDay.has(key);
            const postCount = scheduledByDay.get(key)?.length ?? 0;
            return (
              <span
                key={key}
                role="gridcell"
                tabIndex={isToday ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                aria-label={
                  has
                    ? `${cell.day} ${monthName} - ${postCount} پست زمان‌بندی‌شده`
                    : `${cell.day} ${monthName}`
                }
                className={cn(
                  'dash-minical__cell',
                  isToday && 'dash-minical__cell--today',
                  has && 'dash-minical__cell--has',
                )}
              >
                {cell.day?.toLocaleString('fa-IR')}
              </span>
            );
          })}
        </div>
      </div>

      <div className="dash-divider" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">انتشارهای پیش‌رو</h3>
          <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
            {upcoming.length.toLocaleString('fa-IR')} مورد
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            پستی برای انتشار برنامه‌ریزی نشده است.
          </p>
        ) : (
          <ul className="space-y-1">
            {upcoming.map((p) => {
              const when = p.updatedAt;
              return (
                <li key={p.id}>
                  <Link href={`/dashboard/posts/edit/${p.id}`} className="dash-cardlink !py-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 w-14 shrink-0">
                      {when ? <FormattedDate date={new Date(when)} /> : '—'}
                    </span>
                    <span className="min-w-0">
                      <p className="dash-cardlink__title !font-semibold !text-[13px]">{p.title}</p>
                    </span>
                    <HiOutlineArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/dashboard/posts?view=calendar"
          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-md px-1"
        >
          <span>مشاهده تقویم کامل</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </motion.section>
  );
}
