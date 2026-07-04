'use client';

/**
 * AtelierActivity — live activity feed.
 *
 * Compact timeline: tone-colored dot, action text, relative time.
 * Items are day-grouped (today / yesterday / earlier this week /
 * older) so long-running logs stay scannable. Subtle vertical hairline
 * between dots gives the timeline a measured, almost editorial feel.
 */

import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { HiOutlineBolt, HiOutlineInbox } from 'react-icons/hi2';
import type { ActivityItem } from '../../overview/ActivityRail';
import { formatRelativeFa } from '../utils';

type Tone = 'up' | 'info' | 'warn' | 'danger';

function actionTone(action: string): Tone {
  if (/(حذف|خطا|ناموفق)/.test(action)) return 'danger';
  if (/(تأیید|انتشار|ایجاد|جدید|افزودن)/.test(action)) return 'up';
  if (/(ویرایش|بروز|به‌روز)/.test(action)) return 'info';
  if (/(هشدار|توجه|صبر)/.test(action)) return 'warn';
  return 'info';
}

interface DayGroup {
  label: string;
  tone: 'today' | 'yesterday' | 'week' | 'older';
  items: ActivityItem[];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabelFa(d: Date, now: Date): { label: string; tone: DayGroup['tone'] } {
  if (isSameDay(d, now)) return { label: 'امروز', tone: 'today' };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return { label: 'دیروز', tone: 'yesterday' };
  const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) return { label: 'این هفته', tone: 'week' };
  return {
    label: d.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }),
    tone: 'older',
  };
}

interface AtelierActivityProps {
  items: ActivityItem[];
}

export default function AtelierActivity({ items }: AtelierActivityProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const grouped = useMemo<DayGroup[]>(() => {
    if (!now) return [];
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const map = new Map<string, DayGroup>();
    for (const it of sorted) {
      const meta = dayLabelFa(new Date(it.createdAt), now);
      const key = `${meta.tone}-${meta.label}`;
      if (!map.has(key)) map.set(key, { label: meta.label, tone: meta.tone, items: [] });
      map.get(key)?.items.push(it);
    }
    return Array.from(map.values());
  }, [items, now]);

  const total = grouped.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <section className="at-tile at-activity" aria-label="جریان فعالیت">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">فعالیت اخیر</h2>
            <p className="at-head__sub">
              {total.toLocaleString('fa-IR')} مورد در {grouped.length.toLocaleString('fa-IR')} گروه
            </p>
          </div>
        </div>
      </header>

      {grouped.length === 0 ? (
        <p className="at-activity__empty">
          <HiOutlineInbox className="w-4 h-4 inline-block ml-1 align-middle" aria-hidden />
          هنوز فعالیتی ثبت نشده است.
        </p>
      ) : (
        <ol className="at-activity__list">
          {grouped.map((group) => (
            <li key={`${group.tone}-${group.label}`} className="at-activity__group">
              <p className={cn('at-activity__group-label', `is-${group.tone}`)}>
                {group.label}
                <span className="tabular-nums">
                  {group.items.length.toLocaleString('fa-IR')}
                </span>
              </p>
              <ol className="at-activity__items">
                {group.items.map((item) => {
                  const tone = actionTone(item.action);
                  return (
                    <li key={item.id} className="at-activity__item">
                      <span
                        className={cn('at-activity__dot', `is-${tone}`)}
                        aria-hidden
                      />
                      <span className="at-activity__body">
                        <p className="at-activity__text">
                          <strong>{item.user.name ?? 'کاربر'}</strong> {item.action}
                        </p>
                        <p className="at-activity__time">
                          {now
                            ? formatRelativeFa(new Date(item.createdAt), now)
                            : '—'}
                        </p>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
