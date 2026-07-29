'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface ViewTransitionAPI {
  startViewTransition?: (callback: () => void | Promise<void>) => {
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
 *   - Next.js router.push ناهمزمان است؛ برای اینکه snapshot جدید قبل از
 *     transition آماده باشد، دو requestAnimationFrame صبر می‌کنیم (≈ ۳۲ms).
 *     این مقدار به اندازهٔ کافی برای commit اولیهٔ App Router کافی است.
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

      doc.startViewTransition(async () => {
        router.push(href);
        // دو frame صبر کن تا App Router صفحهٔ جدید را commit کند
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      });
    },
    [router],
  );
}
