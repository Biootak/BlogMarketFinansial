'use client';

import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
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
 * 2026-08-05 perf: AvatarDropdown + NotifyDropdown به dynamic import تبدیل شدند.
 * این کامپوننت‌ها Radix DropdownMenu + Avatar + DarkModeSwitch + LogoutButton +
 * SideDropdown + Icons را ایمپورت می‌کنند (~40KB+ first-load JS). وقتی کاربر
 * مهمان است (اکثریت بازدیدکنندگان)، این باندل اصلاً لود نمی‌شود — فقط پس از
 * احراز هویت و فقط روی تعامل کاربر (کلیک روی آواتار) بارگذاری می‌شود.
 * ssr:false چون این dropdownها فقط تعاملی‌اند و نیازی به SSR ندارند.
 *
 * 2026-08-05 perf: pathname-aware update() حذف شد. این hook در هر ناوبری
 * کلاینت‌ساید یک fetch اضافه به /api/auth/session می‌زد — TBT را بالا می‌برد.
 * SessionProvider با refetchOnWindowFocus=true خودش session را در بازگشت به تب
 * refresh می‌کند؛ update() دستی روی هر pathname change ضروری نیست.
 */
import { type ReactNode } from 'react';

// Lazy-load authenticated-only UI — ~40KB+ JS (Radix + Avatar + DarkMode +
// Logout + SideDropdown + Icons) stays off the critical path for guests.
const AvatarDropdown = dynamic(() => import('./AvatarDropdown'), {
  ssr: false,
  loading: () => <div className="h-10 w-10 rounded-xl animate-pulse bg-neutral-100 dark:bg-neutral-800" />,
});
const NotifyDropdown = dynamic(() => import('./NotifyDropdown'), {
  ssr: false,
  loading: () => <div className="hidden sm:block h-10 w-10 rounded-xl" />,
});

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const user = session?.user;
  const pathname = usePathname();

  // 2026-08-05 perf: update() در pathname change حذف شد. SessionProvider با
  // refetchOnWindowFocus=true خودش session را refresh می‌کند. pathname فقط
  // برای key در استفاده شده تا مطمئن شویم re-render رخ می‌دهد.
  if (isLoading) {
    return <div className="h-10 w-10 rounded-xl" aria-hidden="true" key={pathname} />;
  }

  if (user) {
    return (
      <div key={pathname}>
        <NotifyDropdown />
        <AvatarDropdown user={user} />
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
