import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Debounce window - فقط آخرین navigation در این بازه ثبت می‌شه
// جلوگیری از ثبت چندباره pageview در navigation سریع (مثلاً SPA back/forward)
const DEBOUNCE_MS = 1000;

// Module-level cache: pathname -> timestamp آخرین ثبت
// این باعث می‌شه در React StrictMode (که useEffect رو در dev دو بار اجرا می‌کنه)
// فقط یک pageview ثبت بشه
const lastRecordedPath = new Map<string, number>();
const RECORD_COOLDOWN = 2000; // هر pathname حداکثر هر 2 ثانیه یکبار

export function usePageView() {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // پاک کردن timer قبلی (debounce)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      // Skip اگه همین pathname اخیراً ثبت شده (StrictMode guard)
      const last = lastRecordedPath.get(pathname);
      const now = Date.now();
      if (last && now - last < RECORD_COOLDOWN) {
        return;
      }
      lastRecordedPath.set(pathname, now);

      // cleanup old entries (بیش از 10 pathname نگه ندار)
      if (lastRecordedPath.size > 50) {
        const cutoff = now - RECORD_COOLDOWN * 10;
        for (const [key, ts] of lastRecordedPath.entries()) {
          if (ts < cutoff) lastRecordedPath.delete(key);
        }
      }

      // ارسال pageview - با sendBeacon در صورت امکان (non-blocking)
      const send = () => {
        try {
          const body = JSON.stringify({ page: pathname });
          // اولویت با sendBeacon - در unload کار می‌کنه و non-blocking هست
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon('/api/pageview', blob);
            return;
          }
          // fallback به fetch با keepalive
          fetch('/api/pageview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch((error) => {
            // silent fail - pageview نباید UX رو خراب کنه
            if (process.env.NODE_ENV === 'development') {
              console.error('[usePageView] failed:', error);
            }
          });
        } catch {
          // silent
        }
      };

      // درخواست رو در idle time بفرست تا UI رو بلاک نکنه
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (
          window as Window & { requestIdleCallback?: (cb: () => void) => void }
        ).requestIdleCallback?.(send);
      } else {
        send();
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pathname]);
}
