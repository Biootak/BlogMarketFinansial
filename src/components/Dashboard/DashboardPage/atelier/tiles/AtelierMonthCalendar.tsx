'use client';

/**
 * AtelierMonthCalendar — full month publishing view (2026-07-04).
 *
 * دو حالت لود دارد:
 *   1. standalone (پیش‌فرض): صفحهٔ `/dashboard/posts/calendar`.
 *      تقویم کامل برای برنامهٔ انتشار، با دکمهٔ «بازگشت به
 *      داشبورد» و کارت‌های مستقل (border + shadow).
 *   2. embedded: ردیف ۳.۵ از `AtelierDeck`. کارت‌ها صاف می‌شوند
 *      (بدون border-radius بیرونی) چون `.at-cal-tile` در CSS
 *      این override را اعمال می‌کند؛ دکمهٔ بازگشت پنهان می‌شود.
 *
 * طراحی هم‌خانواده با AtelierWeekRhythm (همان رنگ‌ها، همان وزن،
 * همان رفتار کلیک) تا از داشبورد تا این صفحه یک زبان بصری
 * واحد حس شود.
 *
 * Layout (desktop, standalone):
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ HEADER  نام ماه فارسی + سال + prev/next + بازگشت به داشبورد  │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ METRIC  ۴ کارت: کل پست ماه / منتشر شده / در انتظار / پیش‌نویس│
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ GRID    ۷×۶ (شنبه → جمعه)، هر سلول شمارهٔ روز + پست‌ها       │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ AGENDA  جزئیات روز انتخابی، درون‌خطی                          │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * نکتهٔ داده: 2026-07-04 — پست‌ها فیلد `scheduledAt` گرفتن. تقویم
 * پست‌ها رو بر اساس `scheduledAt ?? createdAt` bucketing می‌کنه،
 * یعنی پست‌های برنامه‌ریزی‌شده دقیقاً زیر سلول روز انتشارشون
 * می‌افتن (نه روز ایجاد). `getScheduledPosts` پنجرهٔ گسترده
 * (۶ ماه قبل + ۱۲ ماه بعد) برمی‌گردونه تا آیندهٔ دور هم دیده
 * بشه.
 *
 * نکتهٔ تقویم: 2026-07-04 — کل گرید بر اساس تقویم شمسی رندر
 * می‌شود (نه میلادی با اسامی فارسی). کلید bucketing پست‌ها هم
 * شمسی است تا پست‌های یک روز شمسی دقیقاً زیر همان سلول شمسی
 * ظاهر شوند. تبدیل میلادی↔شمسی از `jalaali-js` (الگوریتم
 * Borkowski) می‌آید.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineHome,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';

interface AtelierMonthCalendarProps {
  scheduledPosts: PostWithRelations[];
  /**
   * وقتی `true`، تقویم داخل داشبورد لود شده؛ دکمهٔ «بازگشت به
   * داشبورد» و لایهٔ بیرونی صفحه حذف می‌شود تا دقیقاً به‌عنوان یک
   * ردیف از داشبورد حس شود. وقتی `false` یا حذف‌شده (default)،
   * رفتار صفحهٔ مستقل قبلی را دارد.
   */
  embedded?: boolean;
}

type StatusKey = 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED';

type JalaliYMD = { y: number; m: number; d: number };

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const faDigit = new Intl.NumberFormat('fa-IR');
function fmtFa(n: number): string {
  return faDigit.format(n);
}

const JALALI_MONTHS_FA = [
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

// Persian week starts Saturday.
const WEEKDAY_HEADERS_FA = [
  { short: 'ش', name: 'شنبه' },
  { short: 'ی', name: 'یکشنبه' },
  { short: 'د', name: 'دوشنبه' },
  { short: 'س', name: 'سه‌شنبه' },
  { short: 'چ', name: 'چهارشنبه' },
  { short: 'پ', name: 'پنج‌شنبه' },
  { short: 'ج', name: 'جمعه' },
] as const;

const STATUS_LABEL: Record<StatusKey, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING_REVIEW: 'در انتظار',
  SCHEDULED: 'زمان‌بندی شده',
  PUBLISHED: 'منتشر شده',
};

// --- Jalali helpers ---
// All conversion goes through `jalaali-js` (Borkowski's algorithm,
// already a project dep). Kept thin here so the calendar logic
// stays readable.

function jalaliDaysInMonth(y: number, m: number): number {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  return jalaaliMonthLength(y, m);
}

function gregorianToJalali(g: Date): JalaliYMD {
  // toJalaali(date) → {jy, jm, jd}
  const j = toJalaali(g);
  return { y: j.jy, m: j.jm, d: j.jd };
}

function jalaliToGregorian(y: number, m: number, d: number): Date {
  // toGregorian(jy, jm, jd) → {gy, gm, gd}
  const g = toGregorian(y, m, d);
  return new Date(g.gy, g.gm - 1, g.gd);
}

function jalaliDayOfWeek(y: number, m: number, d: number): number {
  // Returns 0 for Saturday (matching WEEKDAY_HEADERS_FA[0]) and
  // 6 for Friday. JS Date.getDay(): Sun=0, Mon=1, ..., Sat=6.
  return (jalaliToGregorian(y, m, d).getDay() - 6 + 7) % 7;
}

function isSameJalaliDay(a: JalaliYMD, b: JalaliYMD): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function jalaliKey(j: JalaliYMD): string {
  return `${j.y}-${j.m}-${j.d}`;
}

function addJalaliMonths(y: number, m: number, n: number): JalaliYMD {
  const total = y * 12 + (m - 1) + n;
  return { y: Math.floor(total / 12), m: (total % 12) + 1, d: 1 };
}

function buildJalaliMonthGrid(year: number, month: number): JalaliYMD[] {
  const daysInMonth = jalaliDaysInMonth(year, month);
  const firstWeekday = jalaliDayOfWeek(year, month, 1);
  const prev = addJalaliMonths(year, month, -1);
  const prevDaysInMonth = jalaliDaysInMonth(prev.y, prev.m);
  const cells: JalaliYMD[] = [];

  // Leading days from previous month
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ y: prev.y, m: prev.m, d: prevDaysInMonth - i });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d });
  }
  // Trailing days from next month (round to full weeks)
  const next = addJalaliMonths(year, month, 1);
  const totalCells = Math.ceil(cells.length / 7) * 7;
  let nextDay = 1;
  while (cells.length < totalCells) {
    cells.push({ y: next.y, m: next.m, d: nextDay++ });
  }
  return cells;
}

export default function AtelierMonthCalendar({
  scheduledPosts,
  embedded = false,
}: AtelierMonthCalendarProps) {
  const todayJ = useMemo<JalaliYMD>(() => gregorianToJalali(new Date()), []);
  const [cursor, setCursor] = useState<JalaliYMD>(() => ({
    y: todayJ.y,
    m: todayJ.m,
    d: 1,
  }));
  const [openDay, setOpenDay] = useState<JalaliYMD | null>(todayJ);

  const grid = useMemo(() => buildJalaliMonthGrid(cursor.y, cursor.m), [cursor.y, cursor.m]);

  // Bucket posts by their effective day: scheduledAt if set, else
  // createdAt. So a post scheduled for 25 Tir lands under Tir 25,
  // not the day it was written.
  const byDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts ?? []) {
      const eff = p.scheduledAt
        ? new Date(p.scheduledAt)
        : p.createdAt
          ? new Date(p.createdAt)
          : null;
      if (!eff) continue;
      const k = jalaliKey(gregorianToJalali(eff));
      const list = map.get(k) ?? [];
      list.push(p);
      map.set(k, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const at = a.scheduledAt ?? a.createdAt;
        const bt = b.scheduledAt ?? b.createdAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
    }
    return map;
  }, [scheduledPosts]);

  const monthPosts = useMemo(() => {
    return grid
      .filter((d) => d.y === cursor.y && d.m === cursor.m)
      .flatMap((d) => byDay.get(jalaliKey(d)) ?? []);
  }, [grid, byDay, cursor.y, cursor.m]);

  const monthMetrics = useMemo(() => {
    const counts = { DRAFT: 0, PENDING_REVIEW: 0, SCHEDULED: 0, PUBLISHED: 0 };
    for (const p of monthPosts) {
      const s = p.status as StatusKey;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [monthPosts]);

  const openDayPosts = useMemo(() => {
    if (!openDay) return [];
    return byDay.get(jalaliKey(openDay)) ?? [];
  }, [byDay, openDay]);

  const monthLabel = `${JALALI_MONTHS_FA[cursor.m - 1]} ${fmtFa(cursor.y)}`;
  const isCurrentMonth = cursor.y === todayJ.y && cursor.m === todayJ.m;

  return (
    <div className="at-cal">
      {/* ───── Header ───── */}
      <header className="at-cal__head">
        {!embedded && (
          <Link href="/dashboard" className="at-cal__back" aria-label="بازگشت به داشبورد">
            <HiOutlineHome className="w-3.5 h-3.5" />
            <span>بازگشت به داشبورد</span>
          </Link>
        )}

        <div className="at-cal__title">
          <span className="at-cal__eyebrow">
            <HiOutlineCalendarDays className="w-3.5 h-3.5" />
            <span>تقویم انتشار</span>
          </span>
          <h1 className="at-cal__title-text">{monthLabel}</h1>
          {isCurrentMonth && <span className="at-cal__here">اکنون</span>}
        </div>

        <div className="at-cal__nav">
          <button
            type="button"
            onClick={() => setCursor((c) => addJalaliMonths(c.y, c.m, -1))}
            className="at-cal__nav-btn"
            aria-label="ماه قبل"
          >
            <HiOutlineArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor({ y: todayJ.y, m: todayJ.m, d: 1 });
              setOpenDay(todayJ);
            }}
            className="at-cal__nav-today"
            aria-label="بازگشت به امروز"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addJalaliMonths(c.y, c.m, 1))}
            className="at-cal__nav-btn"
            aria-label="ماه بعد"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ───── Metric strip ───── */}
      <div className="at-cal__metrics">
        <div className="at-cal__metric">
          <span className="at-cal__metric-label">کل پست‌های ماه</span>
          <span className="at-cal__metric-num tabular-nums">{fmtFa(monthPosts.length)}</span>
        </div>
        <div className="at-cal__metric at-cal__metric--published">
          <span className="at-cal__metric-dot" aria-hidden />
          <span className="at-cal__metric-label">منتشر شده</span>
          <span className="at-cal__metric-num tabular-nums">{fmtFa(monthMetrics.PUBLISHED)}</span>
        </div>
        <div className="at-cal__metric at-cal__metric--scheduled">
          <span className="at-cal__metric-dot" aria-hidden />
          <span className="at-cal__metric-label">زمان‌بندی شده</span>
          <span className="at-cal__metric-num tabular-nums">{fmtFa(monthMetrics.SCHEDULED)}</span>
        </div>
        <div className="at-cal__metric at-cal__metric--pending">
          <span className="at-cal__metric-dot" aria-hidden />
          <span className="at-cal__metric-label">در انتظار</span>
          <span className="at-cal__metric-num tabular-nums">
            {fmtFa(monthMetrics.PENDING_REVIEW)}
          </span>
        </div>
        <div className="at-cal__metric at-cal__metric--draft">
          <span className="at-cal__metric-dot" aria-hidden />
          <span className="at-cal__metric-label">پیش‌نویس</span>
          <span className="at-cal__metric-num tabular-nums">{fmtFa(monthMetrics.DRAFT)}</span>
        </div>
      </div>

      {/* ───── Month grid ───── */}
      <div className="at-cal__grid" role="grid" aria-label={`تقویم ${monthLabel}`}>
        {/* Weekday headers */}
        {WEEKDAY_HEADERS_FA.map((w) => (
          <div key={w.name} className="at-cal__weekday" role="columnheader">
            {w.name}
          </div>
        ))}

        {/* Day cells */}
        {grid.map((d) => {
          const isInMonth = d.y === cursor.y && d.m === cursor.m;
          const isToday = isSameJalaliDay(d, todayJ);
          const isOpen = openDay ? isSameJalaliDay(d, openDay) : false;
          const key = jalaliKey(d);
          const posts = byDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenDay(d)}
              className={cn(
                'at-cal__cell',
                !isInMonth && 'is-other',
                isToday && 'is-today',
                isOpen && 'is-open',
                posts.length > 0 && 'has-posts',
                posts.length === 0 && 'is-empty',
              )}
              role="gridcell"
              aria-selected={isOpen}
              aria-label={`${fmtFa(d.d)} ${JALALI_MONTHS_FA[d.m - 1]}، ${fmtFa(posts.length)} پست`}
            >
              <span className="at-cal__cell-head">
                <span className="at-cal__cell-num tabular-nums">
                  {FA_DIGITS[d.d] ?? fmtFa(d.d)}
                </span>
                {isToday && <span className="at-cal__cell-today">امروز</span>}
              </span>
              {posts.length > 0 && (
                <span className="at-cal__cell-posts">
                  {posts.slice(0, 3).map((p) => {
                    const s =
                      (p.status as StatusKey) in STATUS_LABEL ? (p.status as StatusKey) : 'DRAFT';
                    return (
                      <span
                        key={p.id}
                        className={cn('at-cal__post', `at-cal__post--${s.toLowerCase()}`)}
                        title={p.title}
                      >
                        <span className="at-cal__post-title">{p.title}</span>
                        <span
                          className={cn(
                            'at-cal__post-status',
                            `at-cal__post-status--${s.toLowerCase()}`,
                          )}
                        />
                      </span>
                    );
                  })}
                  {posts.length > 3 && (
                    <span className="at-cal__more tabular-nums">
                      +{fmtFa(posts.length - 3)} مورد
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───── Day agenda ───── */}
      {openDay && (
        <div className="at-cal__agenda">
          <div className="at-cal__agenda-head">
            <span className="at-cal__agenda-day">
              <span className="at-cal__agenda-day-num tabular-nums">
                {FA_DIGITS[openDay.d] ?? fmtFa(openDay.d)}
              </span>
              <span className="at-cal__agenda-day-name">
                {JALALI_MONTHS_FA[openDay.m - 1]} {fmtFa(openDay.y)}
              </span>
              {isSameJalaliDay(openDay, todayJ) && (
                <span className="at-cal__agenda-today">امروز</span>
              )}
            </span>
            <span className="at-cal__agenda-count tabular-nums">
              {fmtFa(openDayPosts.length)} پست
            </span>
          </div>

          {openDayPosts.length === 0 ? (
            <div className="at-cal__agenda-empty">
              <p>این روز هنوز پستی ندارد. اولین پست این روز را بنویسید.</p>
              <Link href="/dashboard/posts/create" className="at-cal__agenda-cta">
                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                <span>نوشتن پست</span>
                <HiOutlineArrowLeft className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <ul className="at-cal__agenda-list">
              {openDayPosts.map((p) => {
                const status =
                  (p.status as StatusKey) in STATUS_LABEL ? (p.status as StatusKey) : 'DRAFT';
                return (
                  <li key={p.id} className="at-cal__agenda-item">
                    <span
                      className={cn(
                        'at-cal__agenda-dot',
                        `at-cal__agenda-dot--${status.toLowerCase()}`,
                      )}
                      aria-hidden
                    />
                    <Link href={`/dashboard/posts/edit/${p.id}`} className="at-cal__agenda-link">
                      <span className="at-cal__agenda-title">{p.title}</span>
                      <span className="at-cal__agenda-meta">
                        <span
                          className={cn('at-cal__pill', `at-cal__pill--${status.toLowerCase()}`)}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="at-cal__agenda-author">{p.author?.name ?? '—'}</span>
                      </span>
                    </Link>
                    {p.slug && (
                      <Link
                        href={`/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="at-cal__agenda-view"
                        aria-label="مشاهده در سایت"
                      >
                        <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
