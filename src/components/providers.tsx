'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';

/**
 * Providers — wraps the app in SessionProvider + ThemeProvider.
 *
 * Session strategy:
 *  - refetchOnWindowFocus=true  → re-validates token when user returns to tab.
 *    This is the primary fix for "logged in elsewhere but header still shows guest".
 *  - refetchWhenOffline=false   → don't fire requests when network is down.
 *  - refetchInterval=0          → no background polling (avoids server pressure).
 *    After login/logout, router.refresh() + router.push() in the auth components
 *    re-renders the RSC tree and useSession() reflects the new state immediately.
 *
 * Theme flash prevention: next-themes injects its own blocking script via
 * `<script>` that reads localStorage before paint. We rely on that built-in
 * mechanism instead of our own useState/useEffect mount guard, which was
 * causing an extra render cycle (mounted=false → mounted=true) on every page.
 *
 * `suppressHydrationWarning` on <html> (in layout.tsx) handles the class mismatch
 * that next-themes creates when the user has a dark preference stored — the HTML
 * attribute is set synchronously by the injected script before React hydrates.
 */
export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: unknown;
}) {
  return (
    <SessionProvider
      {...(session ? { session: session as never } : {})}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="bmf-theme"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
