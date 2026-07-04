'use client';

/**
 * EditorialActivity — live activity feed.
 *
 * Compact list: tone-colored dot, action text, relative time. No glow,
 * no glass, no animated reveal — just a calm, scannable feed.
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

interface EditorialActivityProps {
  items: ActivityItem[];
}

export default function EditorialActivity({ items }: EditorialActivityProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const sorted = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [items],
  );

  return (
    <section className="ec-tile ec-activity" aria-label="جریان فعالیت">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">فعالیت اخیر</h2>
            <p className="ec-head__sub">{sorted.length.toLocaleString('fa-IR')} مورد</p>
          </div>
        </div>
      </header>

      {sorted.length === 0 ? (
        <p className="ec-activity__empty">
          <HiOutlineInbox className="w-4 h-4 inline-block ml-1 align-middle" aria-hidden />
          هنوز فعالیتی ثبت نشده است.
        </p>
      ) : (
        <ol className="ec-activity__list">
          {sorted.map((item) => {
            const tone = actionTone(item.action);
            return (
              <li key={item.id} className="ec-activity__item">
                <span className={cn('ec-activity__dot', `ec-activity__dot--${tone}`)} aria-hidden />
                <span className="ec-activity__body">
                  <p className="ec-activity__text">
                    <strong>{item.user.name ?? 'کاربر'}</strong> {item.action}
                  </p>
                  <p className="ec-activity__time">
                    {now ? formatRelativeFa(new Date(item.createdAt), now) : '—'}
                  </p>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
