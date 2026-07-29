import { getActiveAdvertisements } from '@/actions/advertisementActions';
import Footer from '@/components/Footer/Footer';
import { getSiteIdentity } from '@/lib/site-identity';
import { getSystemSettingsCached } from '@/data/getSystemSettingsCached';
import type { Advertisement } from '@/types/types';
import { Suspense } from 'react';

/**
 * SiteFooterData — async data boundary for the public site footer.
 *
 * 2026-06-25: Isolates the footer-ad fetch inside a <Suspense> boundary
 * so the root layout does not block on uncached data access.
 * 2026-07-29: Hydrates footer with site identity + dynamic contact info
 * from SystemSettings (admin-editable). Falls back to safe defaults when
 * the contact fields are null/empty.
 */
export default async function SiteFooterData() {
  const [footerAdsResult, identity, settings] = await Promise.all([
    getActiveAdvertisements({
      limit: 1,
      position: 'FOOTER',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
    getSiteIdentity(),
    getSystemSettingsCached(),
  ]);

  const footerAd: Advertisement | null =
    footerAdsResult.success && Array.isArray(footerAdsResult.data) && footerAdsResult.data[0]
      ? (footerAdsResult.data[0] as Advertisement)
      : null;

  return (
    <Footer
      footerAd={footerAd}
      siteName={identity.siteName}
      contactEmail={settings.contactEmail ?? undefined}
      contactPhone={settings.contactPhone ?? undefined}
      contactAddress={settings.contactAddress ?? undefined}
    />
  );
}

/**
 * FooterSkeleton — placeholder that reserves the footer's approximate
 * vertical space to avoid cumulative layout shift while the ad fetch resolves.
 */
export function FooterSkeleton() {
  return (
    <footer
      className="w-full min-h-[320px] bg-slate-50 dark:bg-neutral-900"
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Convenience wrapper that provides its own Suspense boundary + fallback.
 */
export function SiteFooterDataWithSuspense() {
  return (
    <Suspense fallback={<FooterSkeleton />}>
      <SiteFooterData />
    </Suspense>
  );
}
