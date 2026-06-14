/**
 * Header — Premium dark glassmorphism × Linear × Vercel × Stripe
 *
 * ساختار نهایی:
 *  - TickerBar بالا (h-8) با نرخ‌های لحظه‌ای
 *  - MainNav اصلی (h-12 mobile / h-14 desktop)
 *  - sticky + backdrop-blur
 *  - layout سه‌ستونه متقارن: Logo | Navigation (وسط) | Actions
 *  - هیچ overlap یا asymmetry بین ستون‌ها
 *  - سرور کامپوننت بدون framer-motion
 *
 * 2026-06-14: بازطراحی کامل برای تقارن کامل در همه سایزها
 *  - Navigation واقعاً در مرکز viewport (نه فقط container)
 *  - Logo و Actions هم‌عرض و هم‌تراز با Navigation
 *  - TickerBar با marquee صحیح RTL
 */
import { Suspense } from 'react';
import MainNav from './MainNav';
import { TickerBar } from './TickerBar';
import { getTickerData } from '@/actions/tickerActions';

// Skeleton ticker برای زمان load
function TickerBarSkeleton() {
  return (
    <div
      aria-hidden
      className="h-8 w-full bg-[rgb(var(--c-surface-elevated))]/40 animate-pulse"
    />
  );
}

// Async ticker loader در Suspense
async function HeaderTicker() {
  const tickerItems = await getTickerData();
  if (tickerItems.length === 0) return null;
  return <TickerBar items={tickerItems} />;
}

const Header = () => {
  return (
    <header
      className="sticky top-0 w-full z-40 isolate"
      role="banner"
    >
      {/* Ticker bar — نرخ‌های لحظه‌ای */}
      <Suspense fallback={<TickerBarSkeleton />}>
        <HeaderTicker />
      </Suspense>

      {/* Translucent surface با glassmorphism ملایم */}
      <div
        aria-hidden
        className="
          absolute inset-0 -z-10
          bg-white/70 dark:bg-neutral-950/70
          backdrop-blur-xl backdrop-saturate-150
          supports-[backdrop-filter]:bg-white/60
          dark:supports-[backdrop-filter]:bg-neutral-950/60
        "
      />

      {/* Top inner highlight (linear.app style) */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 top-0 h-px -z-10
          bg-gradient-to-r
          from-transparent
          via-black/[0.06] dark:via-white/[0.08]
          to-transparent
        "
      />

      {/* Bottom hairline divider */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 bottom-0 h-px -z-10
          bg-neutral-200/70 dark:bg-neutral-800/70
        "
      />

      <MainNav />
    </header>
  );
};

export default Header;
