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

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import {
  DEFAULT_TIMEZONE,
  type HoursValue,
  WEEK_DAYS,
  getDayStatus,
  hourOfDayInZone,
  nowDayKey,
  parseTime,
  weeklyHoursSummary,
} from '@/lib/exchange-hours';
import { Calendar, Clock4, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import s from './WorkingHoursStrip.module.css';

type Props = {
  hours: Record<string, HoursValue>;
  /** timezone IANA. */
  timezone?: string;
};

const FA_NUM = new Intl.NumberFormat('fa-IR');

export default function WorkingHoursStrip({ hours, timezone = DEFAULT_TIMEZONE }: Props) {
  const [now, setNow] = useState(() => new Date());
  // کلاک ۳۰ ثانیه‌ای — در تب مخفی pause می‌شود
  useVisibilityAwareInterval(() => setNow(new Date()), 30_000);

  const currentMin = hourOfDayInZone(now, timezone);
  const todayKey = nowDayKey(timezone);
  const { openDays, totalOpenHours } = weeklyHoursSummary(hours);

  return (
    <section className={s.section} id="hours" aria-label="ساعات کاری هفتگی" dir="rtl">
      <div className={s.inner}>
        <header className={s.header}>
          <div className={s.titleBlock}>
            <div className={s.eyebrow}>
              <Clock4 size={12} strokeWidth={1.9} aria-hidden />
              ساعات کاری
            </div>
            <h2 className={s.title}>چه زمانی می‌توانید مراجعه کنید؟</h2>
            <p className={s.sub}>
              برنامهٔ هفتگی صرافی به‌صورت زنده نمایش داده می‌شود. روز فعلی با رنگ متمایز مشخص شده و
              وضعیت «باز/بسته» به‌صورت لحظه‌ای به‌روز می‌شود.
            </p>
          </div>
          <div className={s.stats} aria-label="خلاصهٔ ساعات کاری">
            <div className={s.statItem}>
              <span className={s.statLabel}>روز فعال</span>
              <span className={s.statValue}>
                {FA_NUM.format(openDays)}
                <span className={s.statUnit}>/۷</span>
              </span>
            </div>
            <span className={s.statDiv} aria-hidden />
            <div className={s.statItem}>
              <span className={s.statLabel}>مجموع ساعت</span>
              <span className={s.statValue}>
                {FA_NUM.format(Math.round(totalOpenHours))}
                <span className={s.statUnit}>ساعت</span>
              </span>
            </div>
          </div>
        </header>

        <div className={s.grid} role="list" aria-label="برنامهٔ هفتگی">
          {WEEK_DAYS.map((d) => {
            const v = hours[d.key] ?? { open: '00:00', close: '00:00', closed: true };
            const status = getDayStatus(hours, d.key, currentMin);
            const isToday = d.key === todayKey;
            const open = parseTime(v.open);
            const close = parseTime(v.close);
            const span = Math.max(0, close - open);
            // progress: how much of today's window is done
            const progress =
              isToday && status === 'open'
                ? Math.min(1, (currentMin - open) / span)
                : status === 'past'
                  ? 1
                  : 0;
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
                    <span className={s.dayLabelSub}>{d.short}</span>
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
