/**
 * Header — linear.app inspired dark glassmorphism + Ticker bar 2026
 *
 * - Ticker bar بالا با نرخ‌های لحظه‌ای
 * - Sticky, translucent surface that picks up content behind it
 * - Subtle 1px hairline border at the bottom (linear-style)
 * - Server component — no framer-motion here, no client JS for the shell
 * - The actual interactive bits (Navigation, dropdowns) live in their own
 *   client components
 *
 * 2026-06-14: split into Header (sync shell) + HeaderTicker (async ticker
 * loader). Layout wraps HeaderTicker in <Suspense> so a slow Exir API or
 * DB hiccup never blocks the rest of the page. Nav is rendered
 * immediately; ticker streams in once ready.
 */
import { Suspense } from 'react';
import MainNav from './MainNav';
import { TickerBar } from './TickerBar';
import { getTickerData } from '@/actions/tickerActions';

// Skeleton used by <Suspense> while the ticker is loading.
function TickerBarSkeleton() {
  return (
    <div
      aria-hidden
      className="h-9 w-full bg-[rgb(var(--c-surface-elevated))]/40 animate-pulse"
    />
  );
}

// Async subcomponent that hits the (cached) ticker. Lives separately so
// Next can stream it inside <Suspense>.
async function HeaderTicker() {
  const tickerItems = await getTickerData();
  if (tickerItems.length === 0) return null;
  return <TickerBar items={tickerItems} />;
}

const Header = () => {
  return (
    <header className="sticky top-0 w-full z-40" role="banner">
      {/* Ticker bar — نرخ‌های لحظه‌ای. در <Suspense> پیچیده شد تا
          کندی Exir/DB کل صفحه را بلاک نکند. */}
      <Suspense fallback={<TickerBarSkeleton />}>
        <HeaderTicker />
      </Suspense>

      {/* Translucent surface — picks up gradient/blur from main background */}
      <div
        aria-hidden
        className="
          absolute inset-0
          bg-[rgb(var(--c-surface-canvas))]/70
          dark:bg-[rgb(var(--c-surface-elevated))]/70
          backdrop-blur-xl backdrop-saturate-150
        "
      />

      {/* Subtle inner glow / top highlight, linear.app style */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 top-0 h-px
          bg-gradient-to-r
          from-transparent
          via-white/[0.06]
          to-transparent
        "
      />

      {/* Hairline divider */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 bottom-0 h-px
          bg-[rgb(var(--c-border-subtle))]
        "
      />

      <MainNav />
    </header>
  );
};

export default Header;
