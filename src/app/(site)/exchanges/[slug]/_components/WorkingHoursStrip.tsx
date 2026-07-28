'use client';

/**
 * WorkingHoursStrip — visual 7-day schedule.
 *
 *   • 7 day-cards (شنبه تا جمعه) with hours
 *   • "اکنون باز/بسته" live status based on current time + timezone
 *   • Today highlight
 *   • Per-day progress bar (closed / open / current)
 *   • HoursMatrix for full editor on sub-route /hours
 */

import { Calendar, Clock4, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './WorkingHoursStrip.module.css';

type HoursValue = { open: string; close: string; closed: boolean };
type HoursMap = Record<string, HoursValue>;

type Props = {
  hours: HoursMap;
  /** نام روز فعلی (مثلاً "sat" برای شنبه). محاسبه از ساعت سیستم. */
  todayKey?: string;
  /** timezone IANA. */
  timezone?: string;
};

const DAYS: ReadonlyArray<{ key: keyof HoursMap; label: string; sub: string }> = [
  { key: 'sat', label: 'شنبه', sub: 'Sat' },
  { key: 'sun', label: 'یکشنبه', sub: 'Sun' },
  { key: 'mon', label: 'دوشنبه', sub: 'Mon' },
  { key: 'tue', label: 'سه‌شنبه', sub: 'Tue' },
  { key: 'wed', label: 'چهارشنبه', sub: 'Wed' },
  { key: 'thu', label: 'پنجشنبه', sub: 'Thu' },
  { key: 'fri', label: 'جمعه', sub: 'Fri' },
];

function nowDayKey(timezone = 'Asia/Tehran'): keyof HoursMap {
  // ساعت سیستم را به Asia/Tehran تبدیل می‌کنیم
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

export default function WorkingHoursStrip({ hours, timezone = 'Asia/Tehran' }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // current minutes-of-day in the given timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const [hh, mm] = fmt.format(now).split(':').map(Number);
  const currentMin = hh + mm / 60;
  const todayKey = nowDayKey(timezone);

  // total open hours per week
  const totalOpenHours = DAYS.reduce((acc, d) => {
    const v = hours[d.key];
    if (!v || v.closed) return acc;
    return acc + Math.max(0, parseTime(v.close) - parseTime(v.open));
  }, 0);
  const openDays = DAYS.filter((d) => hours[d.key] && !hours[d.key].closed).length;

  return (
    <section
      className={s.section}
      id="hours"
      aria-label="ساعات کاری هفتگی"
      dir="rtl"
    >
      <div className={s.inner}>
        <header className={s.header}>
          <div className={s.titleBlock}>
            <div className={s.eyebrow}>
              <Clock4 size={12} strokeWidth={1.9} aria-hidden />
              ساعات کاری
            </div>
            <h2 className={s.title}>چه زمانی می‌توانید مراجعه کنید؟</h2>
            <p className={s.sub}>
              برنامهٔ هفتگی صرافی به‌صورت زنده نمایش داده می‌شود. روز فعلی با رنگ متمایز
              مشخص شده و وضعیت «باز/بسته» به‌صورت لحظه‌ای به‌روز می‌شود.
            </p>
          </div>
          <div className={s.stats} aria-label="خلاصهٔ ساعات کاری">
            <div className={s.statItem}>
              <span className={s.statLabel}>روز فعال</span>
              <span className={s.statValue}>
                {new Intl.NumberFormat('fa-IR').format(openDays)}
                <span className={s.statUnit}>/۷</span>
              </span>
            </div>
            <span className={s.statDiv} aria-hidden />
            <div className={s.statItem}>
              <span className={s.statLabel}>مجموع ساعت</span>
              <span className={s.statValue}>
                {new Intl.NumberFormat('fa-IR').format(Math.round(totalOpenHours))}
                <span className={s.statUnit}>ساعت</span>
              </span>
            </div>
          </div>
        </header>

        <div className={s.grid} role="list" aria-label="برنامهٔ هفتگی">
          {DAYS.map((d) => {
            const v = hours[d.key] ?? { open: '00:00', close: '00:00', closed: true };
            const status = getStatus(hours, d.key, currentMin);
            const isToday = d.key === todayKey;
            const open = parseTime(v.open);
            const close = parseTime(v.close);
            const span = Math.max(0, close - open);
            // progress: how much of today's window is done
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
                  {isToday ? (
                    <span className={s.todayChip} aria-hidden>
                      <Calendar size={10} strokeWidth={2.4} />
                      امروز
                    </span>
                  ) : status === 'open' ? (
                    <span className={s.openChip} aria-hidden>
                      <span className={s.openChipDot} />
                      باز
                    </span>
                  ) : null}
                </header>

                <div className={s.dayTime}>
                  {v.closed ? (
                    <div className={s.closedTime}>
                      <Moon size={20} strokeWidth={1.6} aria-hidden />
                      <span>تعطیل</span>
                    </div>
                  ) : (
                    <>
                      <div className={s.timeRow}>
                        <span className={s.timeKey}>
                          <Sun size={11} strokeWidth={1.9} aria-hidden />
                          شروع
                        </span>
                        <span className={s.timeVal} dir="ltr">
                          {v.open}
                        </span>
                      </div>
                      <div className={s.timeRow}>
                        <span className={s.timeKey}>
                          <Moon size={11} strokeWidth={1.9} aria-hidden />
                          پایان
                        </span>
                        <span className={s.timeVal} dir="ltr">
                          {v.close}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Progress bar (only if not closed) */}
                {!v.closed && (
                  <div className={s.progressTrack} aria-hidden>
                    <div
                      className={s.progressFill}
                      style={{ inlineSize: `${Math.max(2, progress * 100)}%` }}
                    />
                  </div>
                )}

                {/* Status text */}
                <div className={s.dayStatus}>
                  {status === 'open' && (
                    <span className={s.statusOpen}>
                      <span className={s.statusDot} aria-hidden />
                      الان باز است
                    </span>
                  )}
                  {status === 'upcoming' && <span className={s.statusMuted}>شروع نشده</span>}
                  {status === 'past' && <span className={s.statusMuted}>پایان یافته</span>}
                  {status === 'closed' && <span className={s.statusClosed}>تعطیل</span>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
