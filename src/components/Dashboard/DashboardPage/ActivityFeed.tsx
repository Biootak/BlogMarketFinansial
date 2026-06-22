'use client';

/**
 * ActivityFeed — Notion-style vertical timeline of recent events.
 *
 * Reads the most recent N rows from `ActivityLog` (via the
 * `getRecentActivity` server action) and renders them as a compact,
 * low-noise list. Each row is a single row with:
 *   • A leading avatar / icon
 *   • A Persian action label + details
 *   • A relative timestamp (just-now / X min ago / Y hours ago / date)
 *   • A hover-only quick action (drill into /dashboard/reports)
 *
 * The rail line is drawn with a CSS gradient + dots, mirroring the
 * Notion sidebar timeline. The whole component is a real <section>
 * with a proper aria-label and list semantics.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import Avatar from '@/components/Avatar/Avatar';
import {
  HiOutlineClock,
  HiOutlineArrowLeft,
  HiOutlineInbox,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  action: string;
  details: string;
  createdAt: string; // ISO
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

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
  return d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function actionTone(
  action: string,
): 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' {
  if (/(حذف|خطا)/.test(action)) return 'rose';
  if (/(ایجاد|جدید)/.test(action)) return 'emerald';
  if (/(ویرایش|بروز)/.test(action)) return 'cyan';
  if (/(تأیید|انتشار)/.test(action)) return 'amber';
  return 'violet';
}

const TONE_DOT: Record<ReturnType<typeof actionTone>, string> = {
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section
      aria-label="فعالیت‌های اخیر"
      className="dash-panel overflow-hidden h-full flex flex-col"
    >
      <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="dash-ico dash-ico--violet w-10 h-10 shrink-0"
            aria-hidden="true"
          >
            <HiOutlineClock className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              فعالیت‌های اخیر
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              رویدادهای سیستم و اقدام‌های اخیر
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/reports"
          className="group inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md px-2 py-1"
        >
          <span>همه</span>
          <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </header>

      <div className="p-4 flex-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-sm text-slate-500 dark:text-slate-400">
            <span
              className="dash-ico dash-ico--violet w-12 h-12 mb-3 opacity-50"
              aria-hidden="true"
            >
              <HiOutlineInbox className="w-5 h-5" />
            </span>
            <p>هنوز فعالیتی ثبت نشده است.</p>
          </div>
        ) : (
          <ol className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 start-[15px] w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-transparent dark:from-slate-700 dark:via-slate-700/40"
            />
            {sorted.slice(0, 8).map((item, i) => {
              const tone = actionTone(item.action);
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(0.04 * i, 0.3),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative ps-9 pe-1 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute start-[10px] top-3 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
                      TONE_DOT[tone],
                    )}
                  />
                  <div className="flex items-start gap-3">
                    <Avatar
                      imgUrl={item.user.image ?? undefined}
                      userName={item.user.name ?? undefined}
                      sizeClass="h-8 w-8"
                      containerClassName="rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.user.name ?? 'کاربر'}{' '}
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          {item.action}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {item.details}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                        {now
                          ? formatRelativeFa(new Date(item.createdAt), now)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
