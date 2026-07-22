'use client';

/**
 * NotificationBadge — شمارنده اعلان‌های خوانده‌نشده در Sidebar
 *
 * هر ۶۰ ثانیه یک‌بار count را از سرور می‌گیرد.
 * وقتی کاربر روی صفحه notifications رفت، به‌طور خودکار reset می‌شود.
 */

import { getUnreadNotificationsCount } from '@/actions/notification-actions';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function NotificationBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

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
    }
  }, [pathname]);

  // poll every 60s
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (count === 0) return null;

  return (
    <span className="dash-side__notif-badge" aria-label={`${count} اعلان خوانده‌نشده`}>
      {count > 99 ? '۹۹+' : new Intl.NumberFormat('fa-IR').format(count)}
    </span>
  );
}
