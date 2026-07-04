'use client';

/**
 * StreamTile — NOVA live activity tile (tall, right column of the deck).
 *
 * A self-scrolling feed of recent activity, grouped by day with per-action
 * tone dots. Independent of the analytics period filter. Light rewrite of
 * the TIDE ActivityStream logic, restyled for the NOVA glass surface.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HiOutlineArrowLeft, HiOutlineBolt, HiOutlineInbox } from 'react-icons/hi2';
import type { ActivityItem } from '../../overview/ActivityRail';
import { formatRelativeFa, dayLabelFa } from '../utils';

type Tone = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';

function actionTone(action: string): Tone {
  if (/(حذف|خطا)/.test(action)) return 'rose';
  if (/(ایجاد|جدید)/.test(action)) return 'emerald';
  if (/(ویرایش|بروز)/.test(action)) return 'cyan';
  if (/(تأیید|انتشار)/.test(action)) return 'amber';
  return 'violet';
}

interface StreamTileProps {
  items: ActivityItem[];
}

export default function StreamTile({ items }: StreamTileProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  );

  const grouped = useMemo(() => {
    if (!now) return [] as Array<{ label: string; items: ActivityItem[] }>;
    const map = new Map<string, { label: string; items: ActivityItem[] }>();
    for (const it of sorted) {
      const label = dayLabelFa(new Date(it.createdAt), now);
      if (!map.has(label)) map.set(label, { label, items: [] });
      map.get(label)?.items.push(it);
    }
    return Array.from(map.values());
  }, [sorted, now]);

  return (
    <section className="nova-tile nova-tile--stream" data-tone="cyan" aria-label="جریان فعالیت زنده">
      <Spotlight tone="cyan" size={360} />
      <header className="nova-panel__head nova-panel__head--tight">
        <div className="nova-panel__head-title">
          <span className="nova-panel__head-ico" aria-hidden>
            <HiOutlineBolt className="w-4 h-4" />
          </span>
          <h2 className="nova-panel__title">جریان فعالیت</h2>
        </div>
        <span className="nova-live" aria-hidden>
          <span className="nova-live__dot" />
          زنده
        </span>
      </header>

      <div className="nova-stream__viewport">
        {sorted.length === 0 ? (
          <div className="nova-stream__empty">
            <span className="nova-stream__empty-ico" aria-hidden>
              <HiOutlineInbox className="w-6 h-6" />
            </span>
            <p className="nova-stream__empty-title">فید خاموشه</p>
            <p className="nova-stream__empty-desc">
              وقتی هم‌تیمی‌ها فعالیتی ثبت کنن، اینجا زنده می‌بینی.
            </p>
          </div>
        ) : (
          <ol className="nova-stream__list">
            {grouped.map((group, gi) => (
              <li key={`${group.label}-${gi}`} className={gi === 0 ? '' : 'nova-stream__group'}>
                <p className="nova-stream__day">
                  <span>{group.label}</span>
                  <span className="tabular-nums">{group.items.length.toLocaleString('fa-IR')}</span>
                </p>
                <ul className="nova-stream__items">
                  {group.items.slice(0, 8).map((item) => {
                    const tone = actionTone(item.action);
                    return (
                      <li key={item.id} className="nova-stream__row">
                        <span className={cn('nova-stream__dot', `is-${tone}`)} aria-hidden />
                        <div className="min-w-0">
                          <p className="nova-stream__row-title">
                            <strong>{item.user.name ?? 'کاربر'}</strong> <span>{item.action}</span>
                          </p>
                          {item.details && <p className="nova-stream__row-detail">{item.details}</p>}
                          <p className="nova-stream__row-meta">
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

      <footer className="nova-stream__foot">
        <Link href="/dashboard/reports" className="nova-morelink">
          <span>همه در گزارش‌ها</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </section>
  );
}
