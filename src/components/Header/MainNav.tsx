import Logo from '@/components/Logo/Logo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation2026';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';
import SearchModal from './SearchModal';
import { auth } from '@/auth';
import Link from 'next/link';
import { User, Sparkles } from 'lucide-react';

/**
 * MainNav — Premium Header با تراز کاملاً متقارن
 *
 * ساختار:
 *  - سه ستون مساوی با grid: `grid-cols-[1fr_auto_1fr]`
 *  - ستون وسط: Navigation دقیقاً در مرکز
 *  - ستون راست (start در RTL): Logo
 *  - ستون چپ (end در RTL): Actions
 *  - در موبایل: hamburger + auth
 *  - در دسکتاپ: navigation وسط + auth در راست
 *
 * 2026-06-14: بازطراحی برای تقارن کامل
 *  - هر سه ستون flex-1 با items-center
 *  - Navigation خودش در center والد قرار می‌گیرد
 *  - Actions در سمت مخالف Logo با همان عرض تقریبی
 *  - حذف glow اضافی پشت Logo
 *
 * 2026-06-15: ریسپانسیو برای موبایل
 *  - در موبایل: فقط logo + actions (بدون 3-col grid برای جلوگیری از squeeze)
 *  - ساختار 3-col فقط در `@lg` (~1024px) فعال می‌شه
 *  - استفاده از container queries + @container برای تقارن بهتر در سایزهای میانی
 */
export default async function MainNav() {
  const session = await auth();

  return (
    <nav className="relative z-10 @container/nav" aria-label="ناوبری اصلی سایت">
      <div className="container">
        <div
          className="
            relative flex items-center justify-between
            @5xl/nav:grid
            @5xl/nav:grid-cols-[1fr_auto_1fr]
            h-14 @5xl/nav:h-16
            gap-2 sm:gap-4
          "
        >
          {/* همبرگر منو: فعال در زیر دسکتاپ (موبایل و تبلت) */}
          <div
            className="
              flex @5xl/nav:hidden items-center justify-center
              size-10 rounded-xl
              text-neutral-600 dark:text-neutral-300
              hover:bg-neutral-100 dark:hover:bg-neutral-800/80
              transition-colors duration-200
            "
          >
            <MenuBar />
          </div>

          {/* لوگو: با موضع‌گیری مطلق در وسط برای موبایل/تبلت و موضع‌گیری شبکه در سمت راست برای دسکتاپ */}
          <div
            className="
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              @5xl/nav:static @5xl/nav:translate-x-0 @5xl/nav:translate-y-0
              @5xl/nav:col-start-1 @5xl/nav:row-start-1
              flex items-center justify-start min-w-0
            "
          >
            <Logo variant="modern" />
          </div>

          {/* منوی ناوبری افقی دسکتاپ: فعال در دسکتاپ و بالاتر */}
          <div className="hidden @5xl/nav:flex items-center justify-center min-w-0 @5xl/nav:col-start-2 @5xl/nav:row-start-1">
            <Navigation />
          </div>

          {/* ستون چپ (در RTL: اکشن‌ها/ورود) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0 @5xl/nav:col-start-3 @5xl/nav:row-start-1">
            {/* موبایل و تبلت: فقط user/auth */}
            <div className="flex @5xl/nav:hidden items-center gap-1">
              {!session?.user ? (
                <Link
                  href="/signin"
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

            {/* دسکتاپ: search + notify + avatar/sign-in */}
            <div className="hidden @5xl/nav:flex items-center gap-1.5">
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
                    href="/signin"
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
                    <span className="relative text-primary-600 dark:text-primary-400">
                      ثبت‌نام
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
