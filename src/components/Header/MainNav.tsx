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
        {/* ── موبایل / تبلت (<lg): grid-cols-3 — هر ستون دقیقاً ۱/۳ عرض ── */}
        <div className="grid grid-cols-3 items-center h-14 lg:hidden">
          {/* ستون ۱: همبرگر — چپ‌چین */}
          <div className="flex items-center justify-start">
            <div className="flex items-center justify-center size-10 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors duration-200">
              <MenuBar />
            </div>
          </div>

          {/* ستون ۲: لوگو — وسط‌چین دقیق */}
          <div className="flex items-center justify-center">
            <SiteLogo variant="modern" />
          </div>

          {/* ستون ۳: auth — راست‌چین */}
          <div className="flex items-center justify-end">
            <AuthStatus />
          </div>
        </div>

        {/* ── دسکتاپ (lg+): grid سه‌ستونه با Navigation وسط ── */}
        <div
          className="
            hidden lg:grid items-center main-nav-grid
            lg:grid-cols-[auto_minmax(0,1fr)_auto]
            lg:grid-rows-[auto_auto]
            lg:py-2
            gap-4
          "
        >
          {/* لوگو */}
          <div className="flex items-center col-start-1 row-start-1">
            <SiteLogo variant="modern" />
          </div>

          {/* Navigation وسط */}
          <div className="flex items-center justify-center min-w-0 col-start-2 row-start-1">
            <Navigation rateLists={activeRateLists} />
          </div>

          {/* اکشن‌ها */}
          <div className="flex items-center justify-end gap-1.5 col-start-3 row-start-1">
            <div className="flex items-center justify-center size-10 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors duration-200">
              <SearchModalLazy />
            </div>
            <AuthStatus />
          </div>
        </div>
      </div>
    </nav>
  );
}
