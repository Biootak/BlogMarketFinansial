'use client';

import { useEffect } from 'react';

/**
 * ServiceWorkerRegister — ثبت service worker در root layout.
 *
 * استراتژی (2026، الگوی web.dev):
 *  - فقط بعد از load ثبت می‌شود تا با render اول تداخل نکند.
 *  - فقط در production فعال است — در dev، SW با Fast Refresh/HMR
 *    تداخل می‌کند و دیباگ را گیج‌کننده می‌کند.
 *  - /sw.js خودش فقط navigation ها را رهگیری می‌کند و به /offline.html
 *    fallback می‌دهد (بقیهٔ درخواست‌ها دست‌نخورده‌اند).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    if (typeof window === 'undefined') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // ثبت‌نام نباید هرگز تجربهٔ کاربر را خراب کند — فقط log.
        // eslint-disable-next-line no-console
        console.warn('[sw] registration failed');
      });
    };

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
