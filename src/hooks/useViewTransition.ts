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
 * Falls back to plain router.push when startViewTransition is unavailable.
 */
export function useViewTransition(): (href: string) => void {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      if (typeof document === 'undefined') {
        router.push(href);
        return;
      }
      const doc = document as Document & ViewTransitionAPI;
      if (typeof doc.startViewTransition !== 'function') {
        router.push(href);
        return;
      }
      doc.startViewTransition(() => {
        router.push(href);
      });
    },
    [router],
  );
}
