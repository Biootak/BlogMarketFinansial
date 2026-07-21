import SiteFooterData, { FooterSkeleton } from '@/app/(site)/_components/SiteFooterData';
import SiteHeaderData, { HeaderSkeleton } from '@/app/(site)/_components/SiteHeaderData';
import SiteSettingsData from '@/app/(site)/_components/SiteSettingsData';
import { getSystemSettingsCached } from '@/data/getSystemSettingsCached';
import type { Metadata } from 'next';
import { Suspense } from 'react';

// The shared header reads auth() to render sign-in/avatar state, which opts
// the entire (site) tree out of static generation. Declaring force-dynamic here
// prevents Next.js from attempting a build-time DB connection on any child route.
export const dynamic = 'force-dynamic';

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
 * fallbacks if the database is unreachable. Note that `MainNav` (rendered by
 * SiteHeaderData) reads `auth()`, so every (site) route is dynamically
 * rendered on demand — there is no static prerender (and therefore no
 * build-time DB connection). Performance comes from safeCache + the CDN
 * `s-maxage` header in next.config.ts, not ISR.
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
