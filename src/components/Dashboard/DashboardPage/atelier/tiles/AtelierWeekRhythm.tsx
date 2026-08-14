'use client';

/**
 * AtelierWeekRhythm — current-week publishing view (2026-07-04 redesign).
 *
 * سه‌لایه، تمام‌عرض، با یک عدد بزرگ به‌عنوان نقطهٔ کانونی:
 *   1) سرصفحه: عدد بزرگ «X پست» + چیپ تغییر نسبت به هفتۀ قبل +
 *      پیوند «تقویم کامل» که به صفحهٔ مستقل `/dashboard/posts/calendar`
 *      می‌رود (نه به anchor داخل داشبورد). عدد بزرگ‌ترین تایپوگرافی
 *      داشبورد پس از هیرو است — این تأکید اصلی است.
 *   2) نمودار میله‌ای: هفت ستون عمودی (شنبه→جمعه) با پشتهٔ رنگی
 *      بر اساس وضعیت (زمردین = منتشر شده، طلایی = در انتظار،
 *      خاکستری = پیش‌نویس). ستون امروز با پس‌زمینهٔ راه‌راه زمردین
 *      و پالس نرم برجسته می‌شود. کلیک روی هر ستون، agenda همان
 *      روز را در همین کاشی باز می‌کند (نه modal).
 *   3) spotlight امروز: چهار کارت کنار هم — منتشر شده، در انتظار،
 *      پیش‌نویس، و یک CTA بزرگ «+ نوشتن پست جدید». کارت‌های خالی
 *      به‌جای حذف، با حالت dashed آرام نشان داده می‌شوند تا تاکید
 *      اصلی روی تکمیل تقویم هفتۀ جاری باشد.
 *
 * اتصال داده: این کاشی دادهٔ خام را می‌گیرد و خودش عمل bucketing
 * را انجام می‌دهد (`createdAt` کلید اصلی) تا نمودار و spotlight
 * از یک منبع واحد بخوانند — هیچ کوئری دیگری برای «پست‌های امروز»
 * لازم نیست.
 *
 * 2026-07-04 (late night) — refactor pass، چند ایراد برطرف شد:
 *   - نام: «ضرباهنگ هفته» ثقیل و کتابی بود → «هفتهٔ انتشار»
 *     (هم متنِ دیده‌شده، هم aria-label، هم section label).
 *   - Stale week بعد از نیمه‌شب: `today` از useMemo با deps `[]`
 *     به useState ارتقا یافت + listener روی `visibilitychange`
 *     و `focus` تا وقتی کاربر tab رو ترک کرده و برمی‌گرده، اگر
 *     روز عوض شده، state به‌روز بشه.
 *   - Stacked bars: `flexGrow: N` نسبت‌بندی غلط می‌داد (یه روز با
 *     ۱ published و ۲ draft، یک‌سوم نوار سبز می‌شد). حالا درصد
 *     درون‌ستونی واقعی هر وضعیت (published/total) به `flexBasis`
 *     می‌رود. ترتیب هم معکوس شد: published حالا بالای پشته است
 *     (مهم‌ترین چیز اول دیده می‌شود).
 *   - Radio semantics: انتخاب روز از ۷ ستون، الگوی radiogroup
 *     است نه toggle — `role="group"` + `aria-pressed` به
 *     `role="radiogroup"` + `role="radio"` + `aria-checked` ارتقا یافت.
 *   - helper: منطق نگاشت JS weekday به فارسی (`WEEKDAY_FA[idx]`)
 *     چهار بار در فایل کپی شده بود؛ به `persianWeekdayName` و
 *     `persianWeekdayShort` استخراج شد.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChartBar,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { dayNameFa, fmt, persianShortDate } from '../utils';

interface AtelierWeekRhythmProps {
  scheduledPosts: PostWithRelations[];
}

type StatusKey = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';

interface DayBucket {
  date: Date;
  posts: PostWithRelations[];
}

function startOfWeek(d: Date): Date {
  // Persian week starts Saturday; JS Sun=0, Sat=6, so offset from Sat.
  const offset = (d.getDay() - 6 + 7) % 7;
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

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAY_SHORT_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

// JS getDay() = Sunday=0..Saturday=6. Persian week starts Saturday.
// Formula درست: `(getDay() + 1) % 7` که شنبه (6) → 0 و یکشنبه (0) → 1.
// قبلاً اینجا باگ بود: `=== 0 ? 6 : -1` که شنبه را ۵ و یکشنبه را ۶ می‌کرد.
function persianWeekdayShort(d: Date): string {
  return WEEKDAY_SHORT_FA[(d.getDay() + 1) % 7];
}

function persianRangeShort(start: Date, end: Date): string {
  // «۱۰ تا ۱۶ تیر» اگه یک ماه، «۲۸ تیر تا ۴ مرداد» اگه دو ماه.
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${fmt(start.getDate())} تا ${fmt(end.getDate())} ${persianShortDate(end).split(' ')[1]}`
    : `${persianShortDate(start)} تا ${persianShortDate(end)}`;
}

function deltaLabel(delta: number): { text: string; trend: 'up' | 'down' | 'flat' } {
  if (Math.abs(delta) < 0.5) return { text: 'بدون تغییر', trend: 'flat' };
  const sign = delta > 0 ? '+' : '';
  return { text: `${sign}${fmt(Math.round(delta))}٪`, trend: delta > 0 ? 'up' : 'down' };
}

const STATUS_LABEL: Record<StatusKey, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING_REVIEW: 'در انتظار',
  PUBLISHED: 'منتشر شده',
};

export default function AtelierWeekRhythm({ scheduledPosts }: AtelierWeekRhythmProps) {
  // 2026-07-04 (late night): `today` قبلاً useMemo با deps=[] بود
  // که اگه داشبورد بدون reload از نیمه‌شب رد بشه، همهٔ محاسبات رو
  // روز قبل گیر می‌کرد. حالا state هست + وقتی tab به visible
  // برمی‌گرده یا window فوکوس می‌گیره، اگر روز عوض شده state رو
  // به‌روز می‌کنیم.
  const [today, setToday] = useState<Date>(() => new Date());

  useEffect(() => {
    const checkDayRollover = () => {
      setToday((prev) => {
        const now = new Date();
        if (
          prev.getFullYear() !== now.getFullYear() ||
          prev.getMonth() !== now.getMonth() ||
          prev.getDate() !== now.getDate()
        ) {
          return now;
        }
        return prev;
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkDayRollover();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', checkDayRollover);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', checkDayRollover);
    };
  }, []);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek(today));
        d.setDate(d.getDate() + i);
        return d;
      }),
    [today],
  );

  // Bucket posts by their effective day: scheduledAt if set, else
  // createdAt. So a post scheduled for Friday this week lands on
  // Friday, not the day it was written. Matches MonthCalendar.
  const byDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts ?? []) {
      const eff = p.scheduledAt
        ? new Date(p.scheduledAt)
        : p.createdAt
          ? new Date(p.createdAt)
          : null;
      if (!eff) continue;
      const k = dayKey(eff);
      const list = map.get(k) ?? [];
      list.push(p);
      map.set(k, list);
    }
    // sort each day newest first (using effective date)
    for (const list of map.values()) {
      list.sort((a, b) => {
        const at = a.scheduledAt ?? a.createdAt;
        const bt = b.scheduledAt ?? b.createdAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
    }
    return map;
  }, [scheduledPosts]);

  const buckets: DayBucket[] = useMemo(
    () => week.map((date) => ({ date, posts: byDay.get(dayKey(date)) ?? [] })),
    [week, byDay],
  );

  // Weekly metric: number of *created* posts this week.
  const thisWeekTotal = buckets.reduce((sum, b) => sum + b.posts.length, 0);

  // Last week for delta comparison (8..14 days back from start of week).
  const lastWeekTotal = useMemo(() => {
    let total = 0;
    const prevStart = new Date(week[0]);
    prevStart.setDate(prevStart.getDate() - 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevStart);
      d.setDate(d.getDate() + i);
      total += (byDay.get(dayKey(d)) ?? []).length;
    }
    return total;
  }, [week, byDay]);

  const deltaPct = useMemo(() => {
    if (lastWeekTotal === 0) return thisWeekTotal === 0 ? 0 : 100;
    return ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
  }, [thisWeekTotal, lastWeekTotal]);

  const delta = deltaLabel(deltaPct);

  const maxDayTotal = Math.max(1, ...buckets.map((b) => b.posts.length));

  const todayBucket = buckets.find((b) => isSameDay(b.date, today)) ?? buckets[0];
  const todayPosts = todayBucket.posts;

  const groupedToday = useMemo(() => {
    const out: Record<StatusKey, PostWithRelations[]> = {
      DRAFT: [],
      PENDING_REVIEW: [],
      PUBLISHED: [],
    };
    for (const p of todayPosts) {
      const s = (p.status as StatusKey) in out ? (p.status as StatusKey) : 'DRAFT';
      out[s].push(p);
    }
    return out;
  }, [todayPosts]);

  const [openDay, setOpenDay] = useState<Date | null>(todayBucket.date);
  const openBucket = openDay ? buckets.find((b) => isSameDay(b.date, openDay)) : undefined;

  // 2026-07-04: اگر هر سه وضعیت امروز خالی باشن، کارت CTA بزرگ
  // («نوشتن پست جدید») حذف می‌شه — در غیر این صورت ۴ مسیر موازی برای
  // نوشتن پست داریم (۳ لینک «خالی» تخصصی + ۱ کارت عمومی).
  const allTodayEmpty =
    groupedToday.PUBLISHED.length === 0 &&
    groupedToday.PENDING_REVIEW.length === 0 &&
    groupedToday.DRAFT.length === 0;

  // 2026-07-04: keyboard nav برای radiogroup ستون‌ها.
  // کلیدها مسیر بصری دنبال می‌کنن، نه DOM order. در RTL، DOM[0] (شنبه)
  // در سمت راست بصری است؛ پس ArrowRight = کاهش ایندکس = راست بصری.
  // ArrowLeft = افزایش ایندکس = چپ بصری. Home/End = اول/آخر در reading
  // order (شنبه/جمعه) که مستقل از جهت بصری است.
  const chartRef = useRef<HTMLDivElement>(null);
  const handleChartKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = chartRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    if (!buttons || buttons.length === 0) return;
    const currentIdx = Array.from(buttons).indexOf(e.target as HTMLButtonElement);
    if (currentIdx === -1) return;
    let nextIdx: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = (currentIdx - 1 + buttons.length) % buttons.length;
        break;
      case 'ArrowLeft':
        nextIdx = (currentIdx + 1) % buttons.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = buttons.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextBucket = buckets[nextIdx];
    setOpenDay(nextBucket.date);
    buttons[nextIdx].focus();
  };

  return (
    <section className="at-tile at-rhythm" aria-label="هفتهٔ انتشار">
      {/* ───── Header ───── */}
      <header className="at-rhythm__head">
        {/* Mobile: metric + link in same row. On ≥768px: display:contents → grid children */}
        <div className="at-rhythm__head-top">
          <div className="at-rhythm__metric">
            <span className="at-rhythm__metric-num tabular-nums">{fmt(thisWeekTotal)}</span>
            <span className="at-rhythm__metric-suffix">پست در ۷ روز</span>
            <span className={cn('at-rhythm__metric-delta', `is-${delta.trend}`)}>
              {delta.trend === 'up' && <span aria-hidden>▲</span>}
              {delta.trend === 'down' && <span aria-hidden>▼</span>}
              {delta.trend === 'flat' && <span aria-hidden>—</span>}
              <span className="tabular-nums">{delta.text}</span>
              <span className="at-rhythm__metric-delta-aux">نسبت به هفتۀ قبل</span>
            </span>
          </div>

          <Link
            href="/dashboard/posts/calendar"
            className="at-rhythm__head-link"
            aria-label="تقویم کامل"
          >
            <span>تقویم کامل</span>
            <HiOutlineArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        <div className="at-rhythm__head-aside">
          <span className="at-rhythm__head-eyebrow">
            <HiOutlineChartBar className="w-3 h-3" />
            <span>هفتهٔ انتشار</span>
          </span>
          <p className="at-rhythm__head-day">
            {dayNameFa(today)} <span className="at-rhythm__head-day-sep">·</span>
            <span className="tabular-nums">{persianShortDate(today)}</span>
          </p>
          <p className="at-rhythm__head-range tabular-nums">
            هفتهٔ {persianRangeShort(week[0], week[6])}
          </p>
        </div>
      </header>

      {/* ───── Bar chart ───── */}
      {/* radiogroup: انتخاب روز از ۷ ستون، radio pattern است نه toggle. */}
      <div
        ref={chartRef}
        className="at-rhythm__chart"
        role="radiogroup"
        aria-label="انتخاب روز از هفتهٔ جاری"
        onKeyDown={handleChartKeyDown}
      >
        {buckets.map((b) => {
          const isToday = isSameDay(b.date, today);
          const isOpen = openDay && isSameDay(b.date, openDay);
          const total = b.posts.length;
          const heightPct = (total / maxDayTotal) * 100;
          // درصد درون‌ستونی هر وضعیت بر اساس سهمش از کل آن روز.
          // قبلاً flexGrow: N بود که نسبت‌بندی غلط می‌داد.
          const draftN = b.posts.filter((p) => p.status === 'DRAFT').length;
          const pendingN = b.posts.filter((p) => p.status === 'PENDING_REVIEW').length;
          const publishedN = b.posts.filter((p) => p.status === 'PUBLISHED').length;
          const publishedPct = total > 0 ? (publishedN / total) * 100 : 0;
          const pendingPct = total > 0 ? (pendingN / total) * 100 : 0;
          const draftPct = total > 0 ? (draftN / total) * 100 : 0;
          return (
            <button
              key={dayKey(b.date)}
              type="button"
              role="radio"
              aria-checked={Boolean(isOpen)}
              onClick={() => setOpenDay(b.date)}
              className={cn(
                'at-rhythm__col',
                isToday && 'is-today',
                isOpen && 'is-open',
                total === 0 && 'is-empty',
              )}
              aria-label={`${dayNameFa(b.date)} ${fmt(b.date.getDate())}، ${fmt(total)} پست${isToday ? '، امروز' : ''}`}
            >
              <span className="at-rhythm__col-count tabular-nums">
                {total > 0 ? fmt(total) : '·'}
              </span>
              <span className="at-rhythm__col-track">
                {total > 0 && (
                  <span
                    className="at-rhythm__col-stack"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  >
                    {/* ترتیب: published بالا، pending وسط، draft پایین (CSS
                        `.at-rhythm__col-stack` حالا column-reverse نیست).
                        مهم‌ترین وضعیت اول دیده می‌شود. */}
                    {publishedN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--published"
                        style={{ flex: `0 0 ${publishedPct}%` }}
                        title={`${fmt(publishedN)} منتشر شده`}
                      />
                    )}
                    {pendingN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--pending"
                        style={{ flex: `0 0 ${pendingPct}%` }}
                        title={`${fmt(pendingN)} در انتظار`}
                      />
                    )}
                    {draftN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--draft"
                        style={{ flex: `0 0 ${draftPct}%` }}
                        title={`${fmt(draftN)} پیش‌نویس`}
                      />
                    )}
                  </span>
                )}
              </span>
              <span className="at-rhythm__col-meta">
                <span className="at-rhythm__col-name">{persianWeekdayShort(b.date)}</span>
                <span className="at-rhythm__col-num tabular-nums">{fmt(b.date.getDate())}</span>
              </span>
              {isToday && (
                <span className="at-rhythm__col-today" aria-hidden>
                  امروز
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───── Today spotlight (whole week → «هفتهٔ خالی») ───── */}
      {thisWeekTotal === 0 ? (
        <div className="at-rhythm__empty" role="status">
          <span className="at-rhythm__empty-ico" aria-hidden>
            <HiOutlineSparkles className="w-6 h-6" />
          </span>
          <div className="at-rhythm__empty-text">
            <p className="at-rhythm__empty-title">هفتهٔ خالی</p>
            <p className="at-rhythm__empty-sub">
              هنوز هیچ پستی برای این هفته برنامه‌ریزی نشده است. اولین پست را بنویسید تا تقویم تکمیل
              شود.
            </p>
          </div>
          <Link href="/dashboard/posts/create" className="at-rhythm__empty-cta">
            <HiOutlinePencilSquare className="w-4 h-4" />
            <span>نوشتن اولین پست</span>
            <HiOutlineArrowLeft className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="at-rhythm__spotlight">
          <div className="at-rhythm__spotlight-head">
            <span className="at-rhythm__spotlight-eyebrow">
              <HiOutlineSparkles className="w-3 h-3" />
              <span>امروز</span>
            </span>
            <span className="at-rhythm__spotlight-day tabular-nums">{persianShortDate(today)}</span>
            <span className="at-rhythm__spotlight-count tabular-nums">
              {fmt(todayPosts.length)} پست
            </span>
          </div>

          <div
            className={cn('at-rhythm__spot-grid', allTodayEmpty && 'at-rhythm__spot-grid--three')}
          >
            <SpotCard
              status="PUBLISHED"
              posts={groupedToday.PUBLISHED}
              hrefCreate="/dashboard/posts/create?status=PUBLISHED"
            />
            <SpotCard
              status="PENDING_REVIEW"
              posts={groupedToday.PENDING_REVIEW}
              hrefCreate="/dashboard/posts/create"
            />
            <SpotCard
              status="DRAFT"
              posts={groupedToday.DRAFT}
              hrefCreate="/dashboard/posts/create?status=DRAFT"
            />
            {!allTodayEmpty && (
              <Link href="/dashboard/posts/create" className="at-rhythm__spot at-rhythm__spot--cta">
                <span className="at-rhythm__spot-ico">
                  <HiOutlinePencilSquare className="w-5 h-5" />
                </span>
                <span className="at-rhythm__spot-title">نوشتن پست جدید</span>
                <span className="at-rhythm__spot-meta">
                  امروز را تکمیل کنید
                  <HiOutlineArrowLeft className="w-3 h-3" />
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ───── Day agenda (inline) ───── */}
      {openBucket && (
        <div
          className="at-rhythm__agenda"
          aria-label={`پست‌های ${persianShortDate(openBucket.date)}`}
        >
          <div className="at-rhythm__agenda-head">
            <span className="at-rhythm__agenda-day">
              <span className="at-rhythm__agenda-day-name">{dayNameFa(openBucket.date)}</span>
              <span className="at-rhythm__agenda-day-num tabular-nums">
                {persianShortDate(openBucket.date)}
              </span>
              {isSameDay(openBucket.date, today) && (
                <span className="at-rhythm__agenda-today">امروز</span>
              )}
            </span>
            <span className="at-rhythm__agenda-count tabular-nums">
              {fmt(openBucket.posts.length)} پست
            </span>
          </div>

          {openBucket.posts.length === 0 ? (
            <div className="at-rhythm__agenda-empty">
              <p>این روز هنوز پستی ندارد.</p>
            </div>
          ) : (
            <ul className="at-rhythm__agenda-list">
              {openBucket.posts.map((p) => {
                const status =
                  (p.status as StatusKey) in STATUS_LABEL ? (p.status as StatusKey) : 'DRAFT';
                return (
                  <li key={p.id} className="at-rhythm__agenda-item">
                    <span
                      className={cn(
                        'at-rhythm__agenda-dot',
                        `at-rhythm__agenda-dot--${status.toLowerCase()}`,
                      )}
                      aria-hidden
                    />
                    <Link href={`/dashboard/posts/edit/${p.id}`} className="at-rhythm__agenda-link">
                      <span className="at-rhythm__agenda-title">{p.title}</span>
                      <span className="at-rhythm__agenda-meta">
                        <span
                          className={cn(
                            'at-rhythm__pill',
                            `at-rhythm__pill--${status.toLowerCase()}`,
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="at-rhythm__agenda-author">{p.author?.name ?? '—'}</span>
                      </span>
                    </Link>
                    {p.slug && (
                      <Link
                        href={`/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="at-rhythm__agenda-view"
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
    </section>
  );
}

interface SpotCardProps {
  status: StatusKey;
  posts: PostWithRelations[];
  hrefCreate: string;
}

function SpotCard({ status, posts, hrefCreate }: SpotCardProps) {
  const statusLower = status.toLowerCase();
  const primary = posts[0];
  return (
    <div
      className={cn(
        'at-rhythm__spot',
        `at-rhythm__spot--${statusLower}`,
        posts.length === 0 && 'is-empty',
      )}
    >
      <div className="at-rhythm__spot-head">
        <span
          className={cn('at-rhythm__spot-dot', `at-rhythm__spot-dot--${statusLower}`)}
          aria-hidden
        />
        <span className="at-rhythm__spot-label">{STATUS_LABEL[status]}</span>
        <span className="at-rhythm__spot-num tabular-nums">{fmt(posts.length)}</span>
      </div>
      {primary ? (
        <Link href={`/dashboard/posts/edit/${primary.id}`} className="at-rhythm__spot-title-link">
          <span className="at-rhythm__spot-title">{primary.title}</span>
        </Link>
      ) : posts.length === 0 ? (
        <Link href={hrefCreate} className="at-rhythm__spot-empty-link">
          <span>خالی</span>
          <HiOutlineArrowLeft className="w-3 h-3" />
        </Link>
      ) : null}
      <span className="at-rhythm__spot-foot">
        {posts.length > 1
          ? `+${fmt(posts.length - 1)} مورد دیگر`
          : primary
            ? (primary.author?.name ?? '—')
            : 'برای افزودن کلیک کنید'}
      </span>
    </div>
  );
}
