'use client';

/**
 * OfflineBanner — sticky banner وضعیت آفلاین
 *
 * 2026-07-29 (R16-fix): اضافه شد تا کاربر متوجه شود اتصال اینترنت قطع شده
 * و بدون نیاز به نگاه‌کردن به DevTools. رویداد `online` و `offline` مرورگر
 * را گوش می‌دهد. server-side safe: چون client component است فقط در browser
 * رندر می‌شود.
 */

import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './OfflineBanner.module.css';

export function OfflineBanner() {
  // SSR: شروع با false. در client mount مقدار واقعی navigator.onLine خوانده می‌شود.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // sync اولیه
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className={s.banner} role="status" aria-live="polite" dir="rtl">
      <span className={s.icon} aria-hidden>
        <WifiOff size={18} strokeWidth={1.9} />
      </span>
      <span className={s.text}>
        <strong>اتصال اینترنت قطع شده است.</strong>
        <span>برخی قابلیت‌ها تا بازگشت اتصال در دسترس نیستند.</span>
      </span>
    </div>
  );
}

export default OfflineBanner;
