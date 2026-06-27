'use client';

/**
 * ActivityRail — 2026 day-grouped timeline (range-driven).
 *
 * The range filter (today / week / all) is now controlled from the
 * persistent Header / WorkspaceToolbar. This component is a pure
 * presentation surface that day-groups activity items by date and
 * shows a relative timestamp per row.
 *
 * Modern techniques:
 *   • Day-grouped headers (today / yesterday / earlier this week / …) so
 *     long-running logs stay scannable.
 *   • IntersectionObserver-free scroll performance — rows are memoized
 *     with a stable key so React can skip the work.
 *   • All hover/focus/active interactions are mapped through CSS for
 *     cheap motion.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import Avatar from '@/components/Avatar/Avatar';
import {
  HiOutlineClock,
  HiOutlineArrowLeft,
  HiOutlineInbox,
} from 'react-icons/hi2';
import { DashboardEmpty } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

type Range = 'today' | 'week' | 'all';

interface ActivityRailProps {
  items: ActivityItem[];
  range: Range;
}

const RANGE_LABEL: Record<Range, string> = {
  today: 'امروز',
  week: 'هفتگی',
  all: 'همه',
};

function formatRelativeFa(d: Date, now: Date) {
  const diff = Math.max(0, now.getTime() - d.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'لحظاتی پیش';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m.toLocaleString('fa-IR')} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h.toLocaleString('fa-IR')} ساعت پیش`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day.toLocaleString('fa-IR')} روز پیش`;
  return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function actionTone(action: string): 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' {
  if (/(حذف|خطا)/.test(action)) return 'rose';
  if (/(ایجاد|جدید)/.test(action)) return 'emerald';
  if (/(ویرایش|بروز)/.test(action)) return 'cyan';
  if (/(تأیید|انتشار)/.test(action)) return 'amber';
  return 'violet';
}

const TONE_DOT: Record<ReturnType<typeof actionTone>, string> = {
  // 2026-06-26: monochrome dot mapping — each tone now points to a
  // .dash-status-dot[data-tone="..."] rule (defined in globals.css §1.8).
  // The semantic dot color is retained for state communication, but the
  // pill / link / icon chrome around it is neutralized separately.
  violet: 'dash-status-dot',
  cyan: 'dash-status-dot',
  emerald: 'dash-status-dot',
  amber: 'dash-status-dot',
  rose: 'dash-status-dot',
};

const TONE_DOT_DATA: Record<ReturnType<typeof actionTone>, 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose'> = {
  violet: 'violet',
  cyan: 'cyan',
  emerald: 'emerald',
  amber: 'amber',
  rose: 'rose',
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabelFa(d: Date, now: Date): { label: string; tone: 'today' | 'yesterday' | 'week' | 'older' } {
  if (isSameDay(d, now)) return { label: 'امروز', tone: 'today' };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return { label: 'دیروز', tone: 'yesterday' };
  const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) return { label: 'این هفته', tone: 'week' };
  return { label: d.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }), tone: 'older' };
}

export default function ActivityRail({ items, range }: ActivityRailProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (!now) return items;
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const since = (() => {
      if (range === 'today') {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (range === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      }
      return null;
    })();
    return since ? sorted.filter((it) => new Date(it.createdAt) >= since) : sorted;
  }, [items, range, now]);

  const grouped = useMemo(() => {
    if (!now) return [] as Array<{ label: string; tone: string; items: ActivityItem[] }>;
    const map = new Map<string, { label: string; tone: string; items: ActivityItem[] }>();
    for (const it of filtered) {
      const meta = dayLabelFa(new Date(it.createdAt), now);
      const key = `${meta.tone}-${meta.label}`;
      if (!map.has(key)) map.set(key, { label: meta.label, tone: meta.tone, items: [] });
      map.get(key)!.items.push(it);
    }
    return Array.from(map.values());
  }, [filtered, now]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall"
      aria-label="فعالیت‌های اخیر"
    >
      <header className="dash-pane__head">
        <span className="dash-pane__title">
          <span className="dash-ico dash-ico--violet w-10 h-10 shrink-0" aria-hidden>
            <HiOutlineClock className="w-5 h-5" />
          </span>
          <span className="dash-pane__title-text">فعالیت‌های اخیر</span>
        </span>
        <span className="dash-pane__chip" aria-live="polite">
          {RANGE_LABEL[range]}
        </span>
      </header>

      {filtered.length === 0 ? (
        <DashboardEmpty
          icon={<HiOutlineInbox className="w-full h-full" />}
          title="فید خاموشه"
          description="هنوز فعالیتی در این بازه ثبت نشده است. وقتی هم‌تیمی‌ها پستی منتشر یا ویرایش کنن، اینجا می‌بینی."
          tone="violet"
        />
      ) : (
        <ol className="relative">
          {grouped.map((group, gi) => (
            <li key={`${group.tone}-${group.label}`} className={gi === 0 ? '' : 'mt-4'}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {group.label}
                <span className="ms-2 tabular-nums text-slate-400 dark:text-slate-500">
                  {group.items.length.toLocaleString('fa-IR')}
                </span>
              </p>
              <ul className="relative space-y-0.5">
                <span
                  aria-hidden
                  className="absolute top-2 bottom-2 start-[15px] w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-transparent dark:from-slate-700 dark:via-slate-700/40"
                />
                {group.items.map((item, i) => {
                  const tone = actionTone(item.action);
                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: Math.min(0.03 * i, 0.25),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="relative ps-9 pe-1 py-2"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'dash-status-dot absolute start-[10px] top-3 w-2.5 h-2.5 ring-2 ring-white dark:ring-slate-900',
                        )}
                        data-tone={TONE_DOT_DATA[tone]}
                      />
                      <div className="dash-cardlink !py-2">
                        <Avatar
                          imgUrl={item.user.image ?? undefined}
                          userName={item.user.name ?? undefined}
                          sizeClass="h-8 w-8"
                          containerClassName="rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="dash-cardlink__title !font-semibold">
                            {item.user.name ?? 'کاربر'}{' '}
                            <span className="text-slate-500 dark:text-slate-400 font-normal">
                              {item.action}
                            </span>
                          </p>
                          {item.details && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {item.details}
                            </p>
                          )}
                          <p className="dash-cardlink__meta !mt-0.5">
                            <span>
                              {now ? formatRelativeFa(new Date(item.createdAt), now) : '—'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <footer className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/dashboard/reports"
          className="dash-link text-xs px-1"
        >
          <span>مشاهده همه در گزارش‌ها</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </motion.section>
  );
}
