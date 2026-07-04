import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { getMarketRates } from '@/actions/market-rates';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentActivity } from '@/actions/getRecentActivity';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getViewStats } from '@/actions/getViewStats';
import { getScheduledPosts, getStats } from '@/actions/postActions';
// 2026-07-04: Replaced Editorial Command (typography-only, 5-row, single
// emerald accent) with Atelier 2026 — Persian-modern redesign with a
// live market ticker band, radial pulse chart, brand mark, 7-day strip,
// 2x2 market grid, gold "lead" accents, and gradient hero. Visual
// language still hairline-only (no glass) and emerald-first, but the
// composition gains a clear focal point (the pulse + today number) and
// a real-time data layer (the ticker). Editorial module kept on disk
// for rollback.
import { AtelierDeck } from '@/components/Dashboard/DashboardPage/atelier';
import ServiceRequestsWidget from '@/components/Dashboard/ServiceRequests/ServiceRequestsWidget';
import { checkRole } from '@/lib/auth';

export default async function Dashboard() {
  // Check user role before loading any data
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR']);

  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const userRole = (session.user.role ?? 'AUTHOR') as 'OWNER' | 'ADMIN' | 'AUTHOR';

  const [
    statsResult,
    scheduledPostsResult,
    popularPostsResult,
    recentDraftsResult,
    viewStatsResult,
    recentActivityResult,
    marketRates,
    topAuthors,
  ] = await Promise.all([
    getStats(),
    getScheduledPosts(),
    getPopularPosts(),
    getRecentDrafts(),
    getViewStats(),
    getRecentActivity(8),
    getMarketRates(),
    getTopAuthors(4),
  ]);

  if (
    !statsResult.success ||
    !scheduledPostsResult.success ||
    !popularPostsResult.success ||
    !recentDraftsResult.success ||
    !viewStatsResult.success
  ) {
    return notFound();
  }

  if (
    !statsResult.data ||
    !scheduledPostsResult.data ||
    !popularPostsResult.data ||
    !recentDraftsResult.data ||
    !viewStatsResult.data
  ) {
    return notFound();
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  // Activity feed: silently fall back to [] on failure (decorative).
  const recentActivity =
    recentActivityResult.success && Array.isArray(recentActivityResult.data)
      ? recentActivityResult.data
      : [];

  return (
    <>
      <AtelierDeck
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
        viewStats={viewStatsResult.data}
        recentActivity={recentActivity}
        userRole={userRole}
        marketRates={marketRates}
        topAuthors={topAuthors}
      />
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <ServiceRequestsWidget />
        </div>
      )}
    </>
  );
}
