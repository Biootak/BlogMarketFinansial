'use client';

/**
 * NotificationBadge — شمارنده اعلان‌های خوانده‌نشده در Sidebar
 *
 * هر ۶۰ ثانیه یک‌بار count را از سرور می‌گیرد.
 * وقتی کاربر روی صفحه notifications رفت، به‌طور خودکار reset می‌شود.
 *
 * R15-fix (2026-07-29): pulse-on-activity — یک حلقهٔ گسترش‌یابنده پشت badge
 * اضافه شد تا کاربر متوجه اعلان جدید شود. از یک CSS module co-located استفاده
 * می‌کنیم تا dashboard.css دست‌نخورده بماند.
 */

import { getUnreadNotificationsCount } from '@/actions/notification-actions';
import { usePathname } from 'next/navigation';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './NotificationBadge.module.css';

export function NotificationBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const prevCountRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const n = await getUnreadNotificationsCount();
      setCount(n);
    } catch {
      // silent — badge is decorative
    }
  }, []);

  // initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // reset when on notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') {
      setCount(0);
      prevCountRef.current = 0;
    }
  }, [pathname]);

  // poll every 60s — paused when tab is hidden
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!id) id = setInterval(refresh, 60_000);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refresh();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  // فقط وقتی count واقعاً افزایش یافت (نه اولین بار) → pulse
  const showPulse = count > 0 && count > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  if (count === 0) return null;

  return (
    <span className={s.wrap}>
      {showPulse && <span className={s.pulse} aria-hidden />}
      <span className="dash-side__notif-badge" aria-label={`${count} اعلان خوانده‌نشده`}>
        {count > 99 ? '۹۹+' : _faNum.format(count)}
      </span>
    </span>
  );
}
