'use client';

/**
 * PageViewTracker — client-only component mounted once near the root.
 *
 * Calls `usePageView()` which POSTs the current pathname to
 * `/api/pageview` on every navigation (with debounce + StrictMode guard).
 *
 * Why a separate component instead of calling the hook directly in the
 * server `RootLayout`: server components can't run hooks, and we want
 * this to fire on EVERY public route — home, archive, single, author,
 * etc. — not just inside `(site)/layout`.
 */
import { usePageView } from '@/hooks/usePageView';

export default function PageViewTracker() {
  usePageView();
  return null;
}