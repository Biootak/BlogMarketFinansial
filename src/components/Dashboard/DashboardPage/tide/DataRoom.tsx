'use client';

/**
 * DataRoom — TIDE 2026 (July 1) trading-room analytics surface.
 *
 * A 60/40 split that places the analytics canvas (chart + calendar) on
 * the left and a real-time activity stream on the right. The split is
 * derived from 60/40 golden proportions intentionally — it's not the
 * φ² : 1 / 1+φ of ATLAS, it's a more confident 60/40 that suits a
 * data-heavy role.
 *
 * The activity stream runs its own day-grouping, day-tone rendering,
 * and live ticker — independent of the analytics period filter. We
 * receive `range` so we can show the right empty state.
 *
 * The right-rail activity column is capped at a viewport-aware height
 * (CSS clamp) so it scrolls independently on tall viewports.
 */

import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineInbox,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import type { ActivityItem } from '../overview/ActivityRail';
import type { Range } from '../overview/WorkspaceToolbar';

const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => <div className="tide-dataroom__skeleton" aria-hidden />,
});

const PublishingCalendar = dynamic(
  () => import('@/components/Dashboard/Calendar/PublishingCalendar'),
  { ssr: false, loading: () => <div className="tide-dataroom__skeleton" aria-hidden /> },
);

const PERIODS = [
  { id: '7d', label: '۷ روز', days: 7 },
  { id: '30d', label: '۳۰ روز', days: 30 },
  { id: '90d', label: '۹۰ روز', days: 90 },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];
type TabId = 'traffic' | 'calendar';

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'traffic', label: 'آمار بازدید', icon: <HiOutlineChartBar className="w-4 h-4" /> },
  { id: 'calendar', label: 'تقویم انتشار', icon: <HiOutlineCalendarDays className="w-4 h-4" /> },
];

const RANGE_LABEL: Record<Range, string> = {
  today: 'امروز',
  week: 'هفتگی',
  all: 'همه',
};

type Tone = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';

function actionTone(action: string): Tone {
  if (/(حذف|خطا)/.test(action)) return 'rose';
  if (/(ایجاد|جدید)/.test(action)) return 'emerald';
  if (/(ویرایش|بروز)/.test(action)) return 'cyan';
  if (/(تأیید|انتشار)/.test(action)) return 'amber';
  return 'violet';
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
  return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabelFa(d: Date, now: Date): { label: string; tone: string } {
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

interface DataRoomProps {
  scheduledPosts: PostWithRelations[];
  recentActivity: ActivityItem[];
  range: Range;
}

/* ── Activity stream ─────────────────────────────────────────────── */

interface ActivityStreamProps {
  items: ActivityItem[];
  range: Range;
}

function ActivityStream({ items, range }: ActivityStreamProps) {
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
    if (!now) return [] as Array<{ label: string; items: ActivityItem[] }>;
    const map = new Map<string, { label: string; items: ActivityItem[] }>();
    for (const it of filtered) {
      const meta = dayLabelFa(new Date(it.createdAt), now);
      const key = `${meta.tone}-${meta.label}`;
      if (!map.has(key)) map.set(key, { label: meta.label, items: [] });
      map.get(key)?.items.push(it);
    }
    return Array.from(map.values());
  }, [filtered, now]);

  return (
    <div className="tide-stream">
      <header className="tide-stream__head">
        <span className="tide-stream__head-title">
          <span className="tide-stream__head-ico" aria-hidden>
            <HiOutlineClock className="w-4 h-4" />
          </span>
          <span>جریان فعالیت</span>
        </span>
        <span className="tide-stream__head-chip" aria-live="polite">
          {RANGE_LABEL[range]}
        </span>
      </header>

      <div className="tide-stream__viewport">
        {filtered.length === 0 ? (
          <div className="tide-stream__empty">
            <span className="tide-stream__empty-ico" aria-hidden>
              <HiOutlineInbox className="w-6 h-6" />
            </span>
            <p className="tide-stream__empty-title">فید خاموشه</p>
            <p className="tide-stream__empty-desc">
              هنوز فعالیتی در این بازه ثبت نشده. وقتی هم‌تیمی‌ها پستی منتشر کنن، اینجا می‌بینی.
            </p>
          </div>
        ) : (
          <ol className="tide-stream__list">
            {grouped.map((group, gi) => (
              <li key={`${group.label}-${gi}`} className={gi === 0 ? '' : 'mt-4'}>
                <p className="tide-stream__day">
                  {group.label}
                  <span className="ms-2 tabular-nums">
                    {group.items.length.toLocaleString('fa-IR')}
                  </span>
                </p>
                <ul className="tide-stream__items">
                  {group.items.slice(0, 8).map((item) => {
                    const tone = actionTone(item.action);
                    return (
                      <li key={item.id} className="tide-stream__row">
                        <span className={cn('tide-stream__dot', `is-${tone}`)} aria-hidden />
                        <div className="tide-stream__row-body">
                          <p className="tide-stream__row-title">
                            <strong>{item.user.name ?? 'کاربر'}</strong> <span>{item.action}</span>
                          </p>
                          {item.details && (
                            <p className="tide-stream__row-detail">{item.details}</p>
                          )}
                          <p className="tide-stream__row-meta">
                            {now ? formatRelativeFa(new Date(item.createdAt), now) : '—'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="tide-stream__foot">
        <Link href="/dashboard/reports" className="tide-stream__more">
          <span>مشاهده همه در گزارش‌ها</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </div>
  );
}

/* ── DataRoom ───────────────────────────────────────────────────── */

export default function DataRoom({ scheduledPosts, recentActivity, range }: DataRoomProps) {
  const [tab, setTab] = useState<TabId>('traffic');
  const [period, setPeriod] = useState<PeriodId>('7d');
  const tabId = useId();

  return (
    <section className="tide-dataroom" aria-label="اتاق داده">
      <div className="tide-dataroom__panel tide-dataroom__panel--chart">
        <header className="tide-dataroom__head">
          <span className="tide-dataroom__head-ico" aria-hidden>
            <HiOutlineChartBar className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="tide-dataroom__head-title">تحلیل بازدید و تقویم</h2>
            <p className="tide-dataroom__head-sub">
              روند {PERIODS.find((p) => p.id === period)?.label} اخیر + برنامه‌ی انتشار
            </p>
          </div>

          {/* biome-ignore lint/a11y/useSemanticElements: styled period switcher uses ARIA radio group pattern to match existing AnalyticsCanvas */}
          <div className="tide-dataroom__period" role="radiogroup" aria-label="بازه زمانی">
            {PERIODS.map((p) => (
              // biome-ignore lint/a11y/useSemanticElements: ARIA radio inside radiogroup is the correct pattern for styled buttons
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => setPeriod(p.id)}
                className={cn('tide-dataroom__period-btn', p.id === period && 'is-active')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <div className="tide-dataroom__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`${tabId}-${t.id}`}
              id={`${tabId}-trigger-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn('tide-dataroom__tab', tab === t.id && 'is-active')}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="tide-dataroom__canvas">
          {tab === 'traffic' ? (
            <div
              role="tabpanel"
              id={`${tabId}-traffic`}
              aria-labelledby={`${tabId}-trigger-traffic`}
              className="tide-dataroom__canvas-pane"
            >
              <TrafficChart key={`traffic-${period}`} period={period} />
            </div>
          ) : (
            <div
              role="tabpanel"
              id={`${tabId}-calendar`}
              aria-labelledby={`${tabId}-trigger-calendar`}
              className="tide-dataroom__canvas-pane"
            >
              <PublishingCalendar scheduledPosts={scheduledPosts} />
            </div>
          )}
        </div>
      </div>

      <motion.aside
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="tide-dataroom__panel tide-dataroom__panel--stream"
        aria-label="جریان فعالیت"
      >
        <ActivityStream items={recentActivity} range={range} />
      </motion.aside>
    </section>
  );
}

void HiOutlineSparkles; // ensure tree-shake keeps icon namespace consistent
