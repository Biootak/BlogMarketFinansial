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
 * نکتهٔ داده: پست‌ها در Prisma هنوز فیلد `publishedAt` /
 * `scheduledAt` ندارند، پس bucketing بر اساس `createdAt` است؛
 * `getScheduledPosts` پنجرهٔ سه‌هفته‌ای برمی‌گرداند، این صفحه
 * به همان داده متکی است.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlinePencilSquare,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineSparkles,
  HiOutlineHome,
} from 'react-icons/hi2';
import Link from 'next/link';

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

type StatusKey = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const faDigit = new Intl.NumberFormat('fa-IR');
function fmtFa(n: number): string {
  return faDigit.format(n);
}

const MONTHS_FA = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
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
  PUBLISHED: 'منتشر شده',
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + n);
  return result;
}

function buildMonthGrid(monthStart: Date): Date[] {
  // Persian week starts Saturday (JS Sat=6). Compute offset from Sat.
  const offset = (monthStart.getDay() - 6 + 7) % 7;
  const firstCell = new Date(monthStart);
  firstCell.setDate(firstCell.getDate() - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const FA_WEEKDAYS = new Map(
  WEEKDAY_HEADERS_FA.map((w) => [w.name, w.short]),
);

export default function AtelierMonthCalendar({
  scheduledPosts,
  embedded = false,
}: AtelierMonthCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today));
  const [openDay, setOpenDay] = useState<Date | null>(today);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  // Bucket posts by createdAt for the month being viewed (and a
  // window of one month before/after, so agenda cells stay accurate
  // when the user pages around).
  const byDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts ?? []) {
      const ts = p.createdAt ? new Date(p.createdAt) : null;
      if (!ts) continue;
      const k = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}`;
      const list = map.get(k) ?? [];
      list.push(p);
      map.set(k, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return map;
  }, [scheduledPosts]);

  const monthPosts = useMemo(() => {
    return grid
      .filter((d) => d.getMonth() === cursor.getMonth())
      .flatMap((d) => byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? []);
  }, [grid, byDay, cursor]);

  const monthMetrics = useMemo(() => {
    const counts = { DRAFT: 0, PENDING_REVIEW: 0, PUBLISHED: 0 };
    for (const p of monthPosts) {
      const s = p.status as StatusKey;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [monthPosts]);

  const openDayPosts = useMemo(() => {
    if (!openDay) return [];
    return byDay.get(`${openDay.getFullYear()}-${openDay.getMonth()}-${openDay.getDate()}`) ?? [];
  }, [byDay, openDay]);

  const monthLabel = `${MONTHS_FA[cursor.getMonth()]} ${fmtFa(cursor.getFullYear())}`;
  const isCurrentMonth =
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth() === today.getMonth();

  return (
    <div className="at-cal">
      {/* ───── Header ───── */}
      <header className="at-cal__head">
        {!embedded && (
          <Link
            href="/dashboard"
            className="at-cal__back"
            aria-label="بازگشت به داشبورد"
          >
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
          {isCurrentMonth && (
            <span className="at-cal__here">اکنون</span>
          )}
        </div>

        <div className="at-cal__nav">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="at-cal__nav-btn"
            aria-label="ماه قبل"
          >
            <HiOutlineArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor(startOfMonth(today));
              setOpenDay(today);
            }}
            className="at-cal__nav-today"
            aria-label="بازگشت به امروز"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
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
          <span className="at-cal__metric-num tabular-nums">
            {fmtFa(monthPosts.length)}
          </span>
        </div>
        <div className="at-cal__metric at-cal__metric--published">
          <span className="at-cal__metric-dot" aria-hidden />
          <span className="at-cal__metric-label">منتشر شده</span>
          <span className="at-cal__metric-num tabular-nums">
            {fmtFa(monthMetrics.PUBLISHED)}
          </span>
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
          <span className="at-cal__metric-num tabular-nums">
            {fmtFa(monthMetrics.DRAFT)}
          </span>
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
          const isInMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const isOpen = openDay && isSameDay(d, openDay);
          const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const posts = byDay.get(dayKey) ?? [];
          return (
            <button
              key={dayKey}
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
              aria-selected={Boolean(isOpen)}
              aria-label={`${fmtFa(d.getDate())} ${MONTHS_FA[d.getMonth()]}، ${fmtFa(posts.length)} پست`}
            >
              <span className="at-cal__cell-head">
                <span className="at-cal__cell-num tabular-nums">
                  {FA_DIGITS[d.getDate()] ?? fmtFa(d.getDate())}
                </span>
                {isToday && <span className="at-cal__cell-today">امروز</span>}
              </span>
              {posts.length > 0 && (
                <span className="at-cal__cell-posts">
                  {posts.slice(0, 3).map((p) => {
                    const s = (p.status as StatusKey) in STATUS_LABEL
                      ? (p.status as StatusKey)
                      : 'DRAFT';
                    return (
                      <span
                        key={p.id}
                        className={cn(
                          'at-cal__post',
                          `at-cal__post--${s.toLowerCase()}`,
                        )}
                        title={p.title}
                      >
                        <span className="at-cal__post-title">{p.title}</span>
                        <span className={cn('at-cal__post-status', `at-cal__post-status--${s.toLowerCase()}`)} />
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
                {FA_DIGITS[openDay.getDate()] ?? fmtFa(openDay.getDate())}
              </span>
              <span className="at-cal__agenda-day-name">
                {MONTHS_FA[openDay.getMonth()]} {fmtFa(openDay.getFullYear())}
              </span>
              {isSameDay(openDay, today) && (
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
                const status = (p.status as StatusKey) in STATUS_LABEL
                  ? (p.status as StatusKey)
                  : 'DRAFT';
                return (
                  <li key={p.id} className="at-cal__agenda-item">
                    <span
                      className={cn(
                        'at-cal__agenda-dot',
                        `at-cal__agenda-dot--${status.toLowerCase()}`,
                      )}
                      aria-hidden
                    />
                    <Link
                      href={`/dashboard/posts/edit/${p.id}`}
                      className="at-cal__agenda-link"
                    >
                      <span className="at-cal__agenda-title">{p.title}</span>
                      <span className="at-cal__agenda-meta">
                        <span
                          className={cn(
                            'at-cal__pill',
                            `at-cal__pill--${status.toLowerCase()}`,
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="at-cal__agenda-author">
                          {p.author?.name ?? '—'}
                        </span>
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
