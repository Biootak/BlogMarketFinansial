import { auth } from '@/auth';
import SiteLogo from '@/components/Logo/SiteLogo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation2026';
import type { RateListData } from '@/types/types';
import { Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';
import SearchModal from './SearchModal';

/**
 * MainNav — Premium Header با تراز کاملاً متقارن
 *
 * ساختار:
 *  - سه ستون مساوی با grid: `grid-cols-[1fr_auto_1fr]`
 *  - ستون وسط: Navigation دقیقاً در مرکز (فقط در دسکتاپ ≥1024px)
 *  - ستون راست (start در RTL): Logo
 *  - ستون چپ (end در RTL): Actions
 *  - در موبایل و تبلت (<1024px): hamburger + auth
 *  - در دسکتاپ (≥1024px): navigation وسط + auth در راست
 *
 * 2026-06-17: لیست‌های فعال RateList به Navigation پاس داده می‌شه
 *  تا مگامنوی «بازار» با داده‌ی زنده رندر بشه.
 */
export default async function MainNav({
  activeRateLists = [],
}: {
  activeRateLists?: RateListData[];
}) {
  const session = await auth();

  return (
    <nav className="relative z-10" aria-label="ناوبری اصلی سایت">
      <div className="container">
        <div
          className="
            grid items-center
            grid-cols-[1fr_auto_1fr]
            lg:grid-cols-[auto_1fr_auto]
            lg:grid-rows-[auto_auto]
            h-auto lg:py-2
            gap-2 sm:gap-4
          "
        >
          {/* ستون راست (در RTL: همبرگر منو - موبایل و تبلت <lg) */}
          <div className="flex items-center justify-start min-w-0 col-start-1 row-start-1">
            {/* موبایل و تبلت: همبرگر منو - در دسکتاپ مخفی */}
            <div
              className="
                lg:hidden
                flex items-center justify-center
                size-10 rounded-xl
                text-neutral-600 dark:text-neutral-300
                hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                transition-colors duration-200
              "
            >
              <MenuBar />
            </div>
          </div>

          {/* ستون وسط — Logo */}
          <div
            className="flex items-center justify-center min-w-0 col-start-2 row-start-1
                          lg:col-start-1 lg:row-start-1 lg:justify-start"
          >
            <SiteLogo variant="modern" />
          </div>

          {/* ستون چپ (در RTL: اکشن‌ها/ورود — همه سایزها) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0 col-start-3 row-start-1">
            {/* موبایل و تبلت: search + user/auth */}
            <div className="flex lg:hidden items-center gap-1">
              <div
                className="
                  flex items-center justify-center
                  size-10 rounded-xl
                  text-neutral-600 dark:text-neutral-300
                  hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                  transition-colors duration-200
                "
              >
                <SearchModal />
              </div>
              {!session?.user ? (
                <Link
                  href="/auth"
                  className="
                    group flex items-center justify-center
                    size-10 rounded-xl
                    text-neutral-600 dark:text-neutral-300
                    hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                    transition-colors duration-200
                  "
                  aria-label="ورود به حساب کاربری"
                >
                  <User className="size-5" strokeWidth={1.8} />
                </Link>
              ) : (
                <div
                  className="
                    flex items-center justify-center
                    size-10 rounded-xl
                    hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                    transition-colors duration-200
                  "
                >
                  <AvatarDropdown />
                </div>
              )}
            </div>

            {/* دسکتاپ (lg+): search + notify + avatar/sign-in */}
            <div className="hidden lg:flex items-center gap-1.5">
              <div
                className="
                  flex items-center justify-center
                  size-10 rounded-xl
                  text-neutral-600 dark:text-neutral-300
                  hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                  transition-colors duration-200
                "
              >
                <SearchModal />
              </div>

              {session?.user && (
                <>
                  <div
                    className="
                      flex items-center justify-center
                      size-10 rounded-xl
                      text-neutral-600 dark:text-neutral-300
                      hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                      transition-colors duration-200
                    "
                  >
                    <NotifyDropdown />
                  </div>
                  <div
                    className="
                      flex items-center justify-center
                      size-10 rounded-xl
                      hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                      transition-colors duration-200
                    "
                  >
                    <AvatarDropdown />
                  </div>
                </>
              )}

              {!session?.user && (
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
                    href="/signup"
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
              )}
            </div>
          </div>

          {/* ستون وسط ردیف دوم — Navigation (فقط lg+ = دسکتاپ) */}
          <div
            className="hidden lg:flex items-center justify-center min-w-0
                          col-span-3 row-start-2
                          lg:col-span-1 lg:col-start-2 lg:row-start-1"
          >
            <Navigation rateLists={activeRateLists} />
          </div>
        </div>
      </div>
    </nav>
  );
}
