'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
import { SessionProvider } from 'next-auth/react';

/**
 * Providers — wraps the app in SessionProvider + ThemeProvider.
 *
 * Session strategy:
 *  - refetchOnWindowFocus=false  → only fetch on mount.
 *  - refetchWhenOffline=false   → don't fire requests when network is down.
 *  - refetchInterval=0          → no background polling.
 *
 * Theme: custom ThemeProvider (replaces next-themes) to avoid <script>
 * injection which is blocked in Next.js 16 React tree.
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
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      <ThemeProvider defaultTheme="light" storageKey="bmf-theme">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
