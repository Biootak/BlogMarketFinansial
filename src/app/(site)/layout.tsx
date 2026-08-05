import SiteFooterData, { FooterSkeleton } from '@/app/(site)/_components/SiteFooterData';
import SiteHeaderData, { HeaderSkeleton } from '@/app/(site)/_components/SiteHeaderData';
import SiteSettingsData from '@/app/(site)/_components/SiteSettingsData';
import MobileBottomNavGate from '@/components/Header/MobileBottomNavGate';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import QuickActionsGate from '@/components/QuickActions/QuickActionsGate';
import { getSystemSettingsCached } from '@/data/getSystemSettingsCached';
import type { Metadata } from 'next';
import { Suspense } from 'react';
// 2026-08-05 perf: moved from root layout. Legacy NC theme styles (header
// glass, RTL overrides, card animations, loading spinners) are only used
// by public marketing/blog pages. Loading them on auth/setup/dashboard
// pages added ~35KB render-blocking CSS to pages that never use NC classes.
import '@/styles/index.scss';

// 2026-08-02: `auth()` removed from the (site) server tree (MainNav,
// MobileBottomNavGate, QuickActionsGate, HeroSection now resolve the session
// client-side via useSession). This layout no longer forces dynamic rendering,
// so child routes can be static or ISR. Routes that still need per-request
// data opt in individually (e.g. credit-rates, search).
export async function generateMetadata(): Promise<Metadata> {
  // Site settings come from `getSystemSettingsCached` (unstable_cache, 60s)
  // so metadata generation reuses the cached value instead of hitting the DB
  // on every request.
  const settings = await getSystemSettingsCached();

  return {
    title: settings.siteName || 'Market Financial',
    description: settings.siteDescription || 'پلتفرم مورد اعتماد شما در Financial Market',
    icons: {
      icon: [
        {
          rel: 'icon',
          url: '/favicon.svg',
          type: 'image/svg+xml',
          sizes: 'any',
        },
      ],
    },
  };
}

/**
 * SiteLayout — public marketing/blog layout.
 *
 * The layout streams three DB/cache-dependent data boundaries inside
 * <Suspense> so the static shell paints instantly:
 *   - Header data (active rate lists for the market mega-menu)
 *   - Main page content (children) — renders immediately
 *   - Footer data (footer advertisement)
 *   - Site settings hydration (no visual impact)
 *
 * The `safeCache` wrappers inside the async components guarantee graceful
 * fallbacks if the database is unreachable. No server component in this tree
 * awaits `auth()` (session is resolved client-side via `useSession` in
 * `AuthStatus`), so child routes can be statically prerendered or ISR'd.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* R16-fix (2026-07-29): sticky banner وضعیت آفلاین */}
      <Suspense fallback={null}>
        <OfflineBanner />
      </Suspense>

      <Suspense fallback={<HeaderSkeleton />}>
        <SiteHeaderData />
      </Suspense>

      <main id="site-main">{children}</main>

      <Suspense fallback={<FooterSkeleton />}>
        <SiteFooterData />
      </Suspense>

      <Suspense fallback={null}>
        <SiteSettingsData />
      </Suspense>

      {/* Mobile bottom nav — SSR-correct (auth resolved on server) */}
      <Suspense fallback={null}>
        <MobileBottomNavGate />
      </Suspense>

      {/* Desktop floating quick actions (visible ≥768px) */}
      <Suspense fallback={null}>
        <QuickActionsGate />
      </Suspense>
    </>
  );
}
