'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface ViewTransitionAPI {
  startViewTransition?: (callback: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
}

/**
 * Navigate to a route with a browser-native view transition when supported.
 *
 * رفتار:
 *   - در صورت پشتیبانی مرورگر، قبل از تغییر DOM یک snapshot می‌گیرد و بعد
 *     از رندر صفحهٔ جدید، transition را اجرا می‌کند.
 *   - اگر startViewTransition در دسترس نبود یا کاربر prefers-reduced-motion
 *     داشت، navigation معمولی Next.js (router.push) اجرا می‌شود.
 *   - callback داخل startViewTransition باید synchronous باشد و فقط router.push
 *     را صدا بزند. مرورگر خودش منتظر DOM update می‌ماند — هر await اضافی
 *     باعث timeout و "Transition was aborted" می‌شود.
 */
export function useViewTransition(): (href: string) => void {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      if (typeof document === 'undefined') {
        router.push(href);
        return;
      }

      // prefers-reduced-motion → بدون transition
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        router.push(href);
        return;
      }

      const doc = document as Document & ViewTransitionAPI;
      if (typeof doc.startViewTransition !== 'function') {
        router.push(href);
        return;
      }

      // callback باید sync باشد — نه async، نه await، نه rAF
      // مرورگر خودش DOM update را detect می‌کند
      doc.startViewTransition(() => {
        router.push(href);
      });
    },
    [router],
  );
}
