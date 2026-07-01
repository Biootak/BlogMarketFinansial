import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentActivity } from '@/actions/getRecentActivity';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getViewStats } from '@/actions/getViewStats';
import { getScheduledPosts, getStats } from '@/actions/postActions';
// 2026-07-01: Redesigned the dashboard home with the TIDE / newsroom
// composition (LiveTicker + TideCover + QuickStage + DataRoom +
// ConstellationGrid + PostsRail + StatusFloor). The data layer is
// unchanged — only the presentation is new.
import { TideShell } from '@/components/Dashboard/DashboardPage/tide';
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
  ] = await Promise.all([
    getStats(),
    getScheduledPosts(),
    getPopularPosts(),
    getRecentDrafts(),
    getViewStats(),
    getRecentActivity(8),
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
      <TideShell
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
        viewStats={viewStatsResult.data}
        recentActivity={recentActivity}
        userRole={userRole}
      />
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <ServiceRequestsWidget />
        </div>
      )}
    </>
  );
}
