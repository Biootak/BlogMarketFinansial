import { Suspense } from 'react';
import Header from '@/components/Header/Header';
import { getActiveRateListsOrCryptoFallback } from '@/actions/rate-lists';

/**
 * SiteHeaderData — async data boundary for the public site header.
 *
 * 2026-06-25: Under Next.js 16 `cacheComponents: true`, any uncached data
 * access must happen inside a <Suspense> boundary so the static shell can
 * stream first. This component isolates the rate-list fetch from the root
 * layout and hands the resolved data to the existing Header component.
 */
export default async function SiteHeaderData() {
  const rateLists = await getActiveRateListsOrCryptoFallback();
  const activeRateLists = (rateLists ?? []).filter((list) => list.isActive);

  return <Header activeRateLists={activeRateLists} />;
}

/**
 * HeaderSkeleton — visual placeholder that matches the sticky header's
 * footprint to keep CLS near zero while rate lists and auth state resolve.
 */
export function HeaderSkeleton() {
  return (
    <header
      className="sticky top-0 w-full z-40 h-14 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/60 border-b border-neutral-200/70 dark:border-neutral-800/70"
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Convenience wrapper that provides its own Suspense boundary + fallback.
 */
export function SiteHeaderDataWithSuspense() {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <SiteHeaderData />
    </Suspense>
  );
}
