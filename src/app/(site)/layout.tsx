import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getSystemSettingsCached } from '@/data/getSystemSettingsCached';
import SiteHeaderData, {
  HeaderSkeleton,
} from '@/app/(site)/_components/SiteHeaderData';
import SiteFooterData, {
  FooterSkeleton,
} from '@/app/(site)/_components/SiteFooterData';
import SiteSettingsData from '@/app/(site)/_components/SiteSettingsData';

export async function generateMetadata(): Promise<Metadata> {
  // 2026-06-29: `getSystemSettingsCached` (unstable_cache, 60s revalidate)
  // lets metadata be statically prerendered and revalidated alongside the
  // page under ISR — no dynamic request API needed.
  const settings = await getSystemSettingsCached();

  return {
    title: settings.siteName || 'Market Financial',
    description: settings.siteDescription || 'پلتفرم مورد اعتماد شما در بازار مالی',
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
 * fallbacks if the database is unreachable. With `cacheComponents: false`,
 * pages are prerendered and revalidated via their own `revalidate` exports
 * (ISR) — no force-dynamic / request-API guards needed here.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
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
    </>
  );
}
