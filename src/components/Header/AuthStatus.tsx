'use client';

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
 */
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const user = session?.user;

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
    <div className="flex items-center gap-2 me-1">
      <Link
        href="/auth"
        className="
          group relative inline-flex items-center justify-center gap-1.5
          h-10 px-5
          text-sm font-semibold text-white
          rounded-xl overflow-hidden
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
        <Sparkles className="relative size-4" aria-hidden />
        <span className="relative">ورود</span>
      </Link>
      <Link
        href="/auth?step=register"
        className="
          group relative inline-flex items-center justify-center
          h-10 px-5
          text-sm font-semibold
          rounded-xl overflow-hidden
          transition-transform duration-200
          hover:scale-[1.02] active:scale-[0.98]
        "
      >
        <span
          aria-hidden
          className="
            absolute inset-0 rounded-xl
            bg-gradient-to-r from-primary-500 to-indigo-500
            p-[1.5px]
          "
        >
          <span
            aria-hidden
            className="
              absolute inset-[1.5px] rounded-[10px]
              bg-white dark:bg-neutral-900
            "
          />
        </span>
        <span
          aria-hidden
          className="
            absolute inset-[1.5px] rounded-[10px]
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
