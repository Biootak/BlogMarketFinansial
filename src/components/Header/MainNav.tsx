import SiteLogo from '@/components/Logo/SiteLogo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation2026';
import type { RateListData } from '@/types/types';
import AuthStatus from './AuthStatus';
import SearchModalLazy from './SearchModalLazy';

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
 * 2026-08-02: `auth()` از این کامپوننت حذف شد. بخش ورود/آواتار به یک
 * جزیره‌ی کلاینت (AuthStatus) منتقل شد که session را با useSession()
 * می‌خواند. این کار کل درخت (site) را از force-dynamic آزاد کرد —
 * صفحات عمومی حالا می‌توانند static/ISR باشند.
 */
export default function MainNav({
  activeRateLists = [],
}: {
  activeRateLists?: RateListData[];
}) {
  return (
    <nav className="relative z-10" aria-label="ناوبری اصلی سایت">
      <div className="container">
        <div
          className="
            grid items-center main-nav-grid
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
          {/*
            2026-08-02 (perf): قبلاً SearchModalLazy + AuthStatus دو بار رندر
            می‌شدند (یک‌بار در div موبایل lg:hidden و یک‌بار در div دسکتاپ
            hidden lg:flex) — یعنی دو اشتراک useSession، دو نمونه‌ی
            NotifyDropdown/AvatarDropdown و DOM تکراری. حالا یک نمونه‌ی واحد
            در یک container ریسپانسیو رندر می‌شود.
          */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0 col-start-3 row-start-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div
                className="
                  flex items-center justify-center
                  size-10 rounded-xl
                  text-neutral-600 dark:text-neutral-300
                  hover:bg-neutral-100 dark:hover:bg-neutral-800/80
                  transition-colors duration-200
                "
              >
                <SearchModalLazy />
              </div>

              <AuthStatus />
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
