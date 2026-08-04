'use client';

import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
/**
 * AuthStatus — client island for the header's sign-in / avatar area.
 *
 * Previously MainNav (a server component) awaited `auth()` to render this
 * area. That request-dependent API opted the ENTIRE (site) tree out of
 * static generation — every public page was server-rendered on demand.
 *
 * SessionProvider is already mounted in the root layout and auto-fetches the
 * session on first load, so this island reads `useSession()` (a few KB, no
 * bcrypt/Prisma on the render path). The server header renders the guest
 * branch immediately; the avatar/notify buttons appear once the session
 * arrives. Same UX, static-friendly render path.
 *
 * 2026-08-XX: pathname-aware session refresh.
 * Next.js router cache (staleTimes) can serve a cached page shell without
 * remounting this component, so useSession() may still hold the pre-login
 * guest state when the user navigates back to a cached page.
 * Calling update() on every pathname change forces SessionProvider to
 * re-validate the JWT cookie and emit the correct authenticated/guest state.
 */
import { type ReactNode, useEffect, useRef } from 'react';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';

export default function AuthStatus() {
  const { data: session, status, update } = useSession();
  const isLoading = status === 'loading';
  const user = session?.user;
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  // Re-validate session on every client-side navigation.
  // This covers the router-cache case: when Next.js serves a cached page
  // shell the component does NOT remount, so useSession() keeps the stale
  // value from before login/logout. update() hits /api/auth/session and
  // refreshes the in-memory session state inside SessionProvider.
  useEffect(() => {
    if (prevPathname.current !== null && prevPathname.current !== pathname) {
      update();
    }
    prevPathname.current = pathname;
  }, [pathname, update]);

  if (isLoading) {
    // Reserve space so the header doesn't shift when the session lands.
    return <div className="h-10 w-10 rounded-xl" aria-hidden="true" />;
  }

  if (user) {
    return (
      <>
        <NotifyDropdown />
        <AvatarDropdown user={user} />
      </>
    );
  }

  return <GuestAuthLinks />;
}

/**
 * Guest auth links (login / register). Rendered by AuthStatus so the server
 * header never needs the session to draw the "ورود / ثبت‌نام" entry points.
 */
export function GuestAuthLinks(): ReactNode {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 me-1">
      <Link
        href="/auth"
        className="
          group relative inline-flex items-center justify-center gap-1 sm:gap-1.5
          h-8 sm:h-10 px-3 sm:px-5
          text-xs sm:text-sm font-semibold text-white
          rounded-lg sm:rounded-xl overflow-hidden
          transition-transform duration-200
          hover:scale-[1.02] active:scale-[0.98]
        "
      >
        <span
          aria-hidden
          className="
            absolute inset-0
            bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600
          "
        />
        <span
          aria-hidden
          className="
            absolute inset-0
            bg-gradient-to-r from-transparent via-white/20 to-transparent
            -translate-x-full
            group-hover:translate-x-full
            transition-transform duration-700
          "
        />
        <Sparkles className="relative size-3 sm:size-4" aria-hidden />
        <span className="relative">ورود</span>
      </Link>
      <Link
        href="/auth?step=register"
        className="
          group relative inline-flex items-center justify-center
          h-8 sm:h-10 px-3 sm:px-5
          text-xs sm:text-sm font-semibold
          rounded-lg sm:rounded-xl overflow-hidden
          transition-transform duration-200
          hover:scale-[1.02] active:scale-[0.98]
        "
      >
        <span
          aria-hidden
          className="
            absolute inset-0 rounded-lg sm:rounded-xl
            bg-gradient-to-r from-primary-500 to-indigo-500
            p-[1.5px]
          "
        >
          <span
            aria-hidden
            className="
              absolute inset-[1.5px] rounded-[7px] sm:rounded-[10px]
              bg-white dark:bg-neutral-900
            "
          />
        </span>
        <span
          aria-hidden
          className="
            absolute inset-[1.5px] rounded-[7px] sm:rounded-[10px]
            bg-gradient-to-r
            from-primary-50 to-indigo-50
            dark:from-primary-950/50 dark:to-indigo-950/50
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
          "
        />
        <span className="relative text-primary-600 dark:text-primary-400">ثبت‌نام</span>
      </Link>
    </div>
  );
}
