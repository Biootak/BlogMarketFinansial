'use client';

/**
 * HoursView — نمایش کامل ساعات کاری
 *
 *   • 7 day-cards بزرگ
 *   • Status زنده (open/closed) بر اساس ساعت سیستم
 *   • progress bar
 *   • خلاصهٔ آماری در header
 */

import { Calendar, Clock4, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './HoursView.module.css';

type HoursValue = { open: string; close: string; closed: boolean };
type HoursMap = Record<string, HoursValue>;

type Props = {
  exchange: { name: string; city: string | null };
  hours: HoursMap;
};

const DAYS: ReadonlyArray<{ key: keyof HoursMap; label: string; sub: string }> = [
  { key: 'sat', label: 'شنبه', sub: 'Saturday' },
  { key: 'sun', label: 'یکشنبه', sub: 'Sunday' },
  { key: 'mon', label: 'دوشنبه', sub: 'Monday' },
  { key: 'tue', label: 'سه‌شنبه', sub: 'Tuesday' },
  { key: 'wed', label: 'چهارشنبه', sub: 'Wednesday' },
  { key: 'thu', label: 'پنجشنبه', sub: 'Thursday' },
  { key: 'fri', label: 'جمعه', sub: 'Friday' },
];

function nowDayKey(timezone = 'Asia/Tehran'): keyof HoursMap {
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  });
  const wd = fmt.format(new Date());
  const map: Record<string, keyof HoursMap> = {
    Sat: 'sat',
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
  };
  return (map[wd] ?? 'sat') as keyof HoursMap;
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function getStatus(
  hours: HoursMap,
  dayKey: keyof HoursMap,
  currentMinutes: number,
): 'closed' | 'open' | 'upcoming' | 'past' {
  const v = hours[dayKey];
  if (!v) return 'closed';
  if (v.closed) return 'closed';
  const open = parseTime(v.open);
  const close = parseTime(v.close);
  if (currentMinutes >= open && currentMinutes < close) return 'open';
  if (currentMinutes < open) return 'upcoming';
  return 'past';
}

function formatFaTime(t: string): string {
  // HH:MM -> فارسی
  const [h, m] = t.split(':');
  return `${new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Number(h))}:${new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Number(m))}`;
}

export default function HoursView({ exchange, hours, timezone = 'Asia/Tehran' }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const [hh, mm] = fmt.format(now).split(':').map(Number);
  const currentMin = hh + mm / 60;
  const todayKey = nowDayKey(timezone);

  const totalOpenHours = DAYS.reduce((acc, d) => {
    const v = hours[d.key];
    if (!v || v.closed) return acc;
    return acc + Math.max(0, parseTime(v.close) - parseTime(v.open));
  }, 0);
  const openDays = DAYS.filter((d) => hours[d.key] && !hours[d.key].closed).length;
  const todayStatus = getStatus(hours, todayKey, currentMin);

  return (
    <section className={s.section} dir="rtl" aria-label={`ساعات کاری ${exchange.name}`}>
      <div className={s.inner}>
        <header className={s.header}>
          <h1 className={s.title}>ساعات کاری {exchange.name}</h1>
          <p className={s.sub}>
            برنامهٔ کامل هفتگی همراه با وضعیت لحظه‌ای باز/بسته. ساعت بر اساس منطقهٔ زمانی
            {' '}
            {timezone === 'Asia/Tehran' ? 'تهران' : timezone} نمایش داده می‌شود.
          </p>
          {todayStatus === 'open' && (
            <div className={s.statusBanner} role="status">
              <span className={s.statusDot} aria-hidden />
              الان باز است — به‌روزشده در{' '}
              {new Intl.DateTimeFormat('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: timezone,
              }).format(now)}
            </div>
          )}
        </header>

        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <span className={s.statLabel}>روزهای فعال در هفته</span>
            <span className={s.statValue}>
              {new Intl.NumberFormat('fa-IR').format(openDays)}
              <span className={s.statUnit}>/۷ روز</span>
            </span>
          </div>
          <div className={s.statCard}>
            <span className={s.statLabel}>مجموع ساعت کاری</span>
            <span className={s.statValue}>
              {new Intl.NumberFormat('fa-IR').format(Math.round(totalOpenHours))}
              <span className={s.statUnit}>ساعت</span>
            </span>
          </div>
          <div className={s.statCard}>
            <span className={s.statLabel}>میانگین روزانه</span>
            <span className={s.statValue}>
              {openDays > 0
                ? new Intl.NumberFormat('fa-IR').format(
                    Math.round((totalOpenHours / openDays) * 10) / 10,
                  )
                : '۰'}
              <span className={s.statUnit}>ساعت</span>
            </span>
          </div>
        </div>

        <div className={s.daysGrid} role="list" aria-label="برنامهٔ هفتگی">
          {DAYS.map((d) => {
            const v = hours[d.key] ?? { open: '00:00', close: '00:00', closed: true };
            const status = getStatus(hours, d.key, currentMin);
            const isToday = d.key === todayKey;
            const open = parseTime(v.open);
            const close = parseTime(v.close);
            const span = Math.max(0, close - open);
            const progress = isToday && status === 'open'
              ? Math.min(1, (currentMin - open) / span)
              : status === 'past' ? 1 : 0;
            return (
              <article
                key={d.key}
                className={`${s.dayCard} ${isToday ? s.dayCardToday : ''} ${status === 'open' ? s.dayCardOpen : ''}`}
                role="listitem"
                aria-current={isToday ? 'date' : undefined}
                data-status={status}
              >
                <header className={s.dayHead}>
                  <div className={s.dayLabel}>
                    <span className={s.dayLabelMain}>{d.label}</span>
                    <span className={s.dayLabelSub}>{d.sub}</span>
                  </div>
                  {isToday && (
                    <span className={s.todayChip}>
                      <Calendar size={11} strokeWidth={2.4} aria-hidden />
                      امروز
                    </span>
                  )}
                </header>

                {v.closed ? (
                  <div className={s.closedTime}>
                    <Moon size={28} strokeWidth={1.4} aria-hidden />
                    <span className={s.closedText}>تعطیل</span>
                  </div>
                ) : (
                  <>
                    <div className={s.dayTime}>
                      <div className={s.timeBlock}>
                        <span className={s.timeKey}>
                          <Sun size={11} strokeWidth={1.9} aria-hidden />
                          شروع
                        </span>
                        <span className={s.timeVal} dir="ltr">
                          {formatFaTime(v.open)}
                        </span>
                      </div>
                      <span className={s.timeSep} aria-hidden />
                      <div className={s.timeBlock}>
                        <span className={s.timeKey}>
                          <Moon size={11} strokeWidth={1.9} aria-hidden />
                          پایان
                        </span>
                        <span className={s.timeVal} dir="ltr">
                          {formatFaTime(v.close)}
                        </span>
                      </div>
                    </div>
                    <div className={s.dayFoot}>
                      <span className={s.dayDuration}>
                        {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(span)} ساعت کار
                      </span>
                      {status === 'open' && (
                        <span className={s.statusOpen}>
                          <span className={s.statusDot} aria-hidden />
                          الان باز
                        </span>
                      )}
                      {status === 'upcoming' && <span className={s.statusMuted}>شروع نشده</span>}
                      {status === 'past' && <span className={s.statusMuted}>پایان یافته</span>}
                    </div>
                    <div className={s.progressTrack} aria-hidden>
                      <div
                        className={s.progressFill}
                        style={{ inlineSize: `${Math.max(2, progress * 100)}%` }}
                      />
                    </div>
                  </>
                )}

                {v.closed && (
                  <div className={s.dayFoot}>
                    <span className={s.statusClosed}>
                      <Moon size={11} strokeWidth={1.9} aria-hidden />
                      صرافی امروز تعطیل است
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className={s.tipBox}>
          <Clock4 size={14} strokeWidth={1.9} aria-hidden />
          <p>
            پیشنهاد می‌شود قبل از مراجعه حضوری، یک تماس تلفنی با صرافی داشته باشید تا از
            باز بودن و موجود بودن ارز مورد نظر مطمئن شوید.
          </p>
        </div>
      </div>
    </section>
  );
}
