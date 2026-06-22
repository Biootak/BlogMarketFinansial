'use client';

/**
 * ScheduledRail — mini calendar + next-slot list.
 *
 * Sits in the right rail of the dashboard shell. Shows the current Persian
 * month as a 7-column grid (muted cells for padding days, a today cell,
 * and a small "has-event" marker for each day with a scheduled post).
 * Beneath the grid, the next three upcoming posts are listed with their
 * publish date + status pill.
 *
 * Uses logical CSS properties (inset-inline-start / block-start) so it
 * mirrors correctly in RTL.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineCalendarDays,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import type { PostWithRelations } from '@/types/types';
import FormattedDate from '@/components/FormattedDate';
import { cn } from '@/lib/utils';

interface ScheduledRailProps {
  scheduledPosts: PostWithRelations[];
}

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const; // شنبه..جمعه

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getMonthGrid(reference: Date) {
  const firstOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 1) % 7; // Saturday = 0
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  const cells: Array<{ day: number | null; date: Date | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      date: new Date(reference.getFullYear(), reference.getMonth(), d),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });
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
  const monthCells = useMemo(() => getMonthGrid(today), [today]);
  const monthName = PERSIAN_MONTH_NAMES[today.getMonth()];
  const yearFa = today.toLocaleDateString('fa-IR', { year: 'numeric' });

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts) {
      const dateValue = p.updatedAt;
      if (!dateValue) continue;
      const d = startOfDay(new Date(dateValue));
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
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
            <span key={w} className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold">
              {w}
            </span>
          ))}
        </div>
        <div className="dash-minical" role="grid" aria-label="روزهای ماه جاری">
          {monthCells.map((cell, idx) => {
            if (cell.date === null) {
              return (
                <span
                  key={`pad-${idx}`}
                  className="dash-minical__cell dash-minical__cell--muted"
                  aria-hidden
                />
              );
            }
            const key = cell.date.toISOString().slice(0, 10);
            const isToday = cell.date.getTime() === today.getTime();
            const has = scheduledByDay.has(key);
            return (
              <span
                key={key}
                role="gridcell"
                aria-current={isToday ? 'date' : undefined}
                aria-label={
                  has
                    ? `${cell.day} ${monthName} — ${scheduledByDay.get(key)!.length} پست برنامه‌ریزی‌شده`
                    : `${cell.day} ${monthName}`
                }
                className={cn(
                  'dash-minical__cell',
                  isToday && 'dash-minical__cell--today',
                  has && 'dash-minical__cell--has',
                )}
              >
                {cell.day}
              </span>
            );
          })}
        </div>
      </div>

      <div className="dash-divider" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            انتشارهای پیش‌رو
          </h3>
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
                  <Link
                    href={`/dashboard/posts/edit/${p.id}`}
                    className="dash-cardlink !py-1.5"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 w-14 shrink-0">
                      {when ? <FormattedDate date={new Date(when)} /> : '—'}
                    </span>
                    <span className="min-w-0">
                      <p className="dash-cardlink__title !font-semibold !text-[13px]">
                        {p.title}
                      </p>
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