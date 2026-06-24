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
  // 2026-06-25: Under Next.js 16 `cacheComponents: true`, metadata cannot
  // await dynamic request APIs (like `connection()`) without blocking the
  // static shell. We use the `"use cache"` variant of the settings fetch so
  // the page can be prerendered and revalidated via the `system-settings`
  // cache tag.
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
 * 2026-06-25: Refactored to avoid the `blocking-route` error under
 * Next.js 16 `cacheComponents: true`. The layout itself is now synchronous
 * and streams three dynamic data boundaries inside <Suspense>:
 *   - Header data (active rate lists for the market mega-menu)
 *   - Main page content (children) — renders immediately
 *   - Footer data (footer advertisement)
 *   - Site settings hydration (no visual impact)
 *
 * This lets the static shell paint instantly while DB/cache-dependent pieces
 * resolve in parallel. The `safeCache` wrappers inside the async components
 * still guarantee graceful fallbacks if the database is unreachable.
 */
export default function SiteLayout({
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
