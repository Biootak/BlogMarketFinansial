import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';

import { getStats, getScheduledPosts } from '@/actions/postActions';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getViewStats } from '@/actions/getViewStats';
import { getRecentActivity } from '@/actions/getRecentActivity';
import DashboardShell from '@/components/Dashboard/DashboardPage/v2/DashboardShell';
import { checkRole } from '@/lib/auth';
import ServiceRequestsWidget from '@/components/Dashboard/ServiceRequests/ServiceRequestsWidget';

export default async function Dashboard() {
  // Check user role before loading any data
  await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);

  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const userRole = (session.user.role ?? 'AUTHOR') as
    | 'SUPER_ADMIN'
    | 'ADMIN'
    | 'AUTHOR';

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

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // Activity feed: silently fall back to [] on failure (decorative).
  const recentActivity =
    recentActivityResult.success && Array.isArray(recentActivityResult.data)
      ? recentActivityResult.data
      : [];

  return (
    <>
      <DashboardShell
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
