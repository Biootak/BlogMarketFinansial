'use client';

/**
 * SessionGuard — 2026 Million-dollar auto re-auth experience.
 *
 * مشکل: وقتی session در داشبورد منقضی شود، اولین Server Action که نیاز به
 * session دارد، 401 برمی‌گرداند. کاربر به error.tsx می‌رود و باید دستی
 * به /auth برود.
 *
 * راه‌حل: این component:
 *  1. به‌صورت دوره‌ای session status را چک می‌کند (هر ۶۰ ثانیه).
 *  2. وقتی session در حال انقضا باشد (کمتر از ۵ دقیقه)، یک warning modal
 *     غیر‌مسدودکننده نشان می‌دهد.
 *  3. اگر یک fetch با 401 رخ دهد (session منقضی شده)، یک modal تمام‌صفحه
 *     با دکمه «ورود مجدد» نشان می‌دهد که به /auth هدایت می‌کند و callbackUrl
 *     صفحه فعلی را نگه می‌دارد.
 *
 * طراحی: Linear × Vercel — glass modal با progress arc برای شمارش معکوس.
 *
 * Mount: در dashboard/layout.tsx زیر DashboardGate.
 */

import { LogIn, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './SessionGuard.module.css';

const CHECK_INTERVAL_MS = 60_000; // هر ۱ دقیقه
const WARNING_THRESHOLD_MS = 5 * 60_000; // ۵ دقیقه قبل از انقضا

type GuardState = 'idle' | 'warning' | 'expired';

interface Props {
  /** callback path برای store کردن current path */
  children?: React.ReactNode;
}

export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>('idle');
  const [remainingSec, setRemainingSec] = useState(0);
  const lastFetchRef = useRef(0);

  // ۱. fetch interceptor برای تشخیص 401
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const original = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const res = await original(...args);
      // فقط response های 401 که JSON هستند و از مسیر auth ما می‌آیند
      if (
        res.status === 401 &&
        !args[0]?.toString().includes('/auth/') &&
        !args[0]?.toString().includes('/_next/')
      ) {
        // session منقضی شده — نمایش expired modal
        setState('expired');
      }
      return res;
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  // ۲. session expiry warning — poll /api/auth/session
  const checkSession = useCallback(async () => {
    // throttling: بیشتر از هر ۳۰ ثانیه یک‌بار fetch نکن
    const now = Date.now();
    if (now - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = now;

    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401) setState('expired');
        return;
      }
      // NextAuth session payload حاوی expires (epoch seconds) است
      const data = (await res.json()) as { expires?: string | number; user?: unknown };
      if (!data?.user) {
        // logged out
        return;
      }
      const expiresAt =
        typeof data.expires === 'number'
          ? data.expires * 1000
          : data.expires
            ? new Date(data.expires).getTime()
            : 0;
      if (!expiresAt) return;

      const remaining = expiresAt - Date.now();
      setRemainingSec(Math.max(0, Math.floor(remaining / 1000)));

      if (remaining <= 0) {
        setState('expired');
      } else if (remaining < WARNING_THRESHOLD_MS) {
        setState('warning');
      } else {
        setState('idle');
      }
    } catch {
      // network error — no-op
    }
  }, []);

  useEffect(() => {
    checkSession();
    const id = setInterval(checkSession, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkSession]);

  // ۳. countdown برای warning state
  useEffect(() => {
    if (state !== 'warning') return;
    const id = setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          setState('expired');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  const handleExtend = useCallback(async () => {
    setState('idle');
    // trigger a session refresh by calling any authed endpoint
    await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => {});
    router.refresh();
  }, [router]);

  const handleReAuth = useCallback(() => {
    const callbackUrl = pathname ?? '/dashboard';
    router.push(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}&reason=session-expired`);
  }, [pathname, router]);

  // format mm:ss
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');
  const progress = state === 'warning'
    ? Math.max(0, Math.min(1, remainingSec / (WARNING_THRESHOLD_MS / 1000)))
    : 0;

  return (
    <>
      {children}
      {/* Warning Modal — soft, non-blocking */}
      {state === 'warning' && (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="sg-warn-title">
          <div className={s.modalWarning}>
            <div className={s.warnIcon}>
              <ShieldAlert size={22} aria-hidden />
            </div>
            <div className={s.warnBody}>
              <h2 id="sg-warn-title" className={s.warnTitle}>
                نشست شما رو به انقضا است
              </h2>
              <p className={s.warnDesc}>
                برای ادامه کار بدون وقفه، می‌توانید همین حالا نشست را تمدید کنید.
              </p>
              <div className={s.countdownRow}>
                <span className={s.countdownNum} dir="ltr">
                  {mm}:{ss}
                </span>
                <span className={s.countdownLabel}>تا پایان نشست</span>
                <span
                  className={s.progressArc}
                  style={{ ['--sg-progress' as string]: progress.toString() }}
                  aria-hidden
                />
              </div>
              <div className={s.warnActions}>
                <button type="button" className={s.btnPrimary} onClick={handleExtend}>
                  <RefreshCcw size={14} aria-hidden />
                  تمدید نشست
                </button>
                <button type="button" className={s.btnGhost} onClick={handleReAuth}>
                  ورود مجدد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expired Modal — full blocking */}
      {state === 'expired' && (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="sg-exp-title">
          <div className={s.modalExpired}>
            <div className={s.expIcon} aria-hidden>
              <LogIn size={28} strokeWidth={1.5} />
            </div>
            <h2 id="sg-exp-title" className={s.expTitle}>
              نشست منقضی شد
            </h2>
            <p className={s.expDesc}>
              برای ادامه کار، لطفاً دوباره وارد حساب کاربری خود شوید. اطلاعات فعلی شما ذخیره
              نشده است.
            </p>
            <div className={s.expActions}>
              <button type="button" className={s.btnPrimary} onClick={handleReAuth}>
                <LogIn size={14} aria-hidden />
                ورود به حساب
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SessionGuard;
