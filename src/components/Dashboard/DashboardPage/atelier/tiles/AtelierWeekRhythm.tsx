'use client';

/**
 * AtelierWeekRhythm — current-week rhythm (2026-07-04 redesign).
 *
 * سه‌لایه، تمام‌عرض، با یک عدد بزرگ به‌عنوان نقطهٔ کانونی:
 *   1) سرصفحه: عدد بزرگ «X پست» + چیپ تغییر نسبت به هفتۀ قبل +
 *      پیوند «تقویم کامل» که به صفحهٔ مستقل `/dashboard/posts/calendar`
 *      می‌رود (نه به anchor داخل داشبورد). عدد بزرگ‌ترین تایپوگرافی
 *      داشبورد پس از هیرو است — این تأکید اصلی است.
 *   2) نمودار میله‌ای: هفت ستون عمودی (شنبه→جمعه) با پُشتهٔ رنگی
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
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChartBar,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import Link from 'next/link';

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

const WEEKDAY_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;
const WEEKDAY_SHORT_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

const faDigit = new Intl.NumberFormat('fa-IR');

function fmtFa(n: number): string {
  return faDigit.format(n);
}

function persianDateShort(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(d);
}

function deltaLabel(delta: number): { text: string; trend: 'up' | 'down' | 'flat' } {
  if (Math.abs(delta) < 0.5) return { text: 'بدون تغییر', trend: 'flat' };
  const sign = delta > 0 ? '+' : '';
  return { text: `${sign}${fmtFa(Math.round(delta))}٪`, trend: delta > 0 ? 'up' : 'down' };
}

const STATUS_LABEL: Record<StatusKey, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING_REVIEW: 'در انتظار',
  PUBLISHED: 'منتشر شده',
};

export default function AtelierWeekRhythm({
  scheduledPosts,
}: AtelierWeekRhythmProps) {
  const today = useMemo(() => new Date(), []);
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek(today));
        d.setDate(d.getDate() + i);
        return d;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Bucket posts by createdAt — this is the week's publishing plan,
  // independent of `updatedAt` which already proved unreliable.
  const byDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of scheduledPosts ?? []) {
      const ts = p.createdAt ? new Date(p.createdAt) : null;
      if (!ts) continue;
      const k = dayKey(ts);
      const list = map.get(k) ?? [];
      list.push(p);
      map.set(k, list);
    }
    // sort each day newest first
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
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
  const openBucket = openDay
    ? buckets.find((b) => isSameDay(b.date, openDay))
    : undefined;

  return (
    <section className="at-tile at-rhythm" aria-label="هفتهٔ جاری">
      {/* ───── Header ───── */}
      <header className="at-rhythm__head">
        <div className="at-rhythm__head-aside">
          <span className="at-rhythm__head-eyebrow">
            <HiOutlineChartBar className="w-3 h-3" />
            <span>ضرباهنگ هفته</span>
          </span>
          <p className="at-rhythm__head-day">
            {WEEKDAY_FA[today.getDay() === 0 ? 6 : today.getDay() - 1]}{' '}
            <span className="at-rhythm__head-day-sep">·</span>
            <span className="tabular-nums">{persianDateShort(today)}</span>
          </p>
        </div>

        <div className="at-rhythm__metric">
          <span className="at-rhythm__metric-num tabular-nums">
            {fmtFa(thisWeekTotal)}
          </span>
          <span className="at-rhythm__metric-suffix">پست در ۷ روز</span>
          <span className={cn('at-rhythm__metric-delta', `is-${delta.trend}`)}>
            {delta.trend === 'up' && <span aria-hidden>▲</span>}
            {delta.trend === 'down' && <span aria-hidden>▼</span>}
            {delta.trend === 'flat' && <span aria-hidden>—</span>}
            <span className="tabular-nums">{delta.text}</span>
            <span className="at-rhythm__metric-delta-aux">
              نسبت به هفتۀ قبل
            </span>
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
      </header>

      {/* ───── Bar chart ───── */}
      <div className="at-rhythm__chart" role="group" aria-label="ریتم ۷ روز اخیر">
        {buckets.map((b) => {
          const isToday = isSameDay(b.date, today);
          const isOpen = openDay && isSameDay(b.date, openDay);
          const total = b.posts.length;
          const heightPct = (total / maxDayTotal) * 100;
          // split by status for stack
          const draftN = b.posts.filter((p) => p.status === 'DRAFT').length;
          const pendingN = b.posts.filter((p) => p.status === 'PENDING_REVIEW').length;
          const publishedN = b.posts.filter((p) => p.status === 'PUBLISHED').length;
          return (
            <button
              key={dayKey(b.date)}
              type="button"
              onClick={() => setOpenDay(b.date)}
              className={cn(
                'at-rhythm__col',
                isToday && 'is-today',
                isOpen && 'is-open',
                total === 0 && 'is-empty',
              )}
              aria-pressed={Boolean(isOpen)}
              aria-label={`${WEEKDAY_FA[b.date.getDay() === 0 ? 6 : b.date.getDay() - 1]} ${fmtFa(b.date.getDate())}، ${fmtFa(total)} پست`}
            >
              <span className="at-rhythm__col-count tabular-nums">
                {total > 0 ? fmtFa(total) : '·'}
              </span>
              <span className="at-rhythm__col-track">
                {total > 0 && (
                  <span
                    className="at-rhythm__col-stack"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  >
                    {publishedN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--published"
                        style={{ flexGrow: publishedN }}
                        title={`${fmtFa(publishedN)} منتشر شده`}
                      />
                    )}
                    {pendingN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--pending"
                        style={{ flexGrow: pendingN }}
                        title={`${fmtFa(pendingN)} در انتظار`}
                      />
                    )}
                    {draftN > 0 && (
                      <span
                        className="at-rhythm__bar at-rhythm__bar--draft"
                        style={{ flexGrow: draftN }}
                        title={`${fmtFa(draftN)} پیش‌نویس`}
                      />
                    )}
                  </span>
                )}
              </span>
              <span className="at-rhythm__col-meta">
                <span className="at-rhythm__col-name">
                  {WEEKDAY_SHORT_FA[b.date.getDay() === 0 ? 6 : b.date.getDay() - 1]}
                </span>
                <span className="at-rhythm__col-num tabular-nums">
                  {fmtFa(b.date.getDate())}
                </span>
              </span>
              {isToday && <span className="at-rhythm__col-today" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* ───── Today spotlight ───── */}
      <div className="at-rhythm__spotlight">
        <div className="at-rhythm__spotlight-head">
          <span className="at-rhythm__spotlight-eyebrow">
            <HiOutlineSparkles className="w-3 h-3" />
            <span>امروز</span>
          </span>
          <span className="at-rhythm__spotlight-day tabular-nums">
            {persianDateShort(today)}
          </span>
          <span className="at-rhythm__spotlight-count tabular-nums">
            {fmtFa(todayPosts.length)} پست
          </span>
        </div>

        <div className="at-rhythm__spot-grid">
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
          <Link
            href="/dashboard/posts/create"
            className="at-rhythm__spot at-rhythm__spot--cta"
          >
            <span className="at-rhythm__spot-ico">
              <HiOutlinePencilSquare className="w-5 h-5" />
            </span>
            <span className="at-rhythm__spot-title">نوشتن پست جدید</span>
            <span className="at-rhythm__spot-meta">
              امروز را پُر کن
              <HiOutlineArrowLeft className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* ───── Day agenda (inline) ───── */}
      {openBucket && (
        <div
          className="at-rhythm__agenda"
          aria-label={`پست‌های ${persianDateShort(openBucket.date)}`}
        >
          <div className="at-rhythm__agenda-head">
            <span className="at-rhythm__agenda-day">
              <span className="at-rhythm__agenda-day-name">
                {WEEKDAY_FA[openBucket.date.getDay() === 0 ? 6 : openBucket.date.getDay() - 1]}
              </span>
              <span className="at-rhythm__agenda-day-num tabular-nums">
                {persianDateShort(openBucket.date)}
              </span>
              {isSameDay(openBucket.date, today) && (
                <span className="at-rhythm__agenda-today">امروز</span>
              )}
            </span>
            <span className="at-rhythm__agenda-count tabular-nums">
              {fmtFa(openBucket.posts.length)} پست
            </span>
          </div>

          {openBucket.posts.length === 0 ? (
            <div className="at-rhythm__agenda-empty">
              <p>این روز هنوز پستی ندارد. اولین پست امروز را بنویسید.</p>
              <Link
                href="/dashboard/posts/create"
                className="at-rhythm__agenda-cta"
              >
                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                <span>نوشتن پست</span>
                <HiOutlineArrowLeft className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <ul className="at-rhythm__agenda-list">
              {openBucket.posts.map((p) => {
                const status =
                  (p.status as StatusKey) in STATUS_LABEL
                    ? (p.status as StatusKey)
                    : 'DRAFT';
                return (
                  <li key={p.id} className="at-rhythm__agenda-item">
                    <span
                      className={cn(
                        'at-rhythm__agenda-dot',
                        `at-rhythm__agenda-dot--${status.toLowerCase()}`,
                      )}
                      aria-hidden
                    />
                    <Link
                      href={`/dashboard/posts/edit/${p.id}`}
                      className="at-rhythm__agenda-link"
                    >
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
                        <span className="at-rhythm__agenda-author">
                          {p.author?.name ?? '—'}
                        </span>
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
          className={cn(
            'at-rhythm__spot-dot',
            `at-rhythm__spot-dot--${statusLower}`,
          )}
          aria-hidden
        />
        <span className="at-rhythm__spot-label">{STATUS_LABEL[status]}</span>
        <span className="at-rhythm__spot-num tabular-nums">
          {fmtFa(posts.length)}
        </span>
      </div>
      {primary ? (
        <Link
          href={`/dashboard/posts/edit/${primary.id}`}
          className="at-rhythm__spot-title-link"
        >
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
          ? `+${fmtFa(posts.length - 1)} مورد دیگر`
          : primary
            ? primary.author?.name ?? '—'
            : 'برای افزودن کلیک کنید'}
      </span>
    </div>
  );
}
