'use client';

import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
/**
 * AuthStatus — client island for the header's sign-in / avatar area.
 *
 * الگوی hydration-safe:
 *  - سرور: GuestAuthLinks (بدون دسترسی به session)
 *  - client اولیه (mounted=false): GuestAuthLinks — دقیقاً همان سرور → بدون mismatch
 *  - client بعد از mount: session واقعی → اگر login بود، avatar نشان داده می‌شود
 *
 * این الگو lurch/shake را از بین می‌برد:
 *  قبلاً: SSR=Guest → hydrate=skeleton → ms بعد=avatar/guest (دو jump)
 *  حالا:  SSR=Guest → hydrate=Guest (match) → mount=avatar اگر login بود (یک jump صاف)
 *
 * AvatarDropdown + NotifyDropdown با ssr:false lazy-load هستند (~40KB+ JS) —
 * برای guest‌ها اصلاً load نمی‌شوند.
 */
import { type ReactNode, useEffect, useState } from 'react';

const AvatarDropdown = dynamic(() => import('./AvatarDropdown'), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-10 rounded-xl animate-pulse bg-neutral-100 dark:bg-neutral-800" />
  ),
});
const NotifyDropdown = dynamic(() => import('./NotifyDropdown'), {
  ssr: false,
  loading: () => <div className="hidden sm:block h-10 w-10 rounded-xl" />,
});

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // بعد از اولین mount client-side، state را به true تغییر می‌دهیم.
  // تا قبل از mount، همان چیزی که سرور رندر کرده (GuestAuthLinks) را برمی‌گردانیم
  // تا hydration mismatch رخ ندهد.
  useEffect(() => {
    setMounted(true);
  }, []);

  // قبل از mount: همان GuestAuthLinks که سرور رندر کرده — بدون mismatch
  if (!mounted) {
    return <GuestAuthLinks />;
  }

  // بعد از mount: session واقعی
  if (status === 'loading') {
    return (
      <div
        className="h-10 w-10 rounded-xl animate-pulse bg-neutral-100 dark:bg-neutral-800"
        aria-hidden="true"
      />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-1">
        <NotifyDropdown />
        <AvatarDropdown user={session.user} />
      </div>
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
