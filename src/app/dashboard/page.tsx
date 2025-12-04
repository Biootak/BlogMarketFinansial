import { Suspense } from 'react';
import DashboardPage from '@/components/Dashboard/DashboardPage/DashboardPage';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';

import { getStats, getScheduledPosts } from '@/actions/postActions';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getViewStats } from '@/actions/getViewStats';
import { DashboardPageSkeleton } from '@/components/Skeletons';
import { checkRole } from '@/lib/auth';
import ServiceRequestsWidget from '@/components/Dashboard/ServiceRequests/ServiceRequestsWidget';

export default async function Dashboard() {
  // Check user role before loading any data
  await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);

  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  const [
    statsResult,
    scheduledPostsResult,
    popularPostsResult,
    recentDraftsResult,
    viewStatsResult,
  ] = await Promise.all([
    getStats(),
    getScheduledPosts(),
    getPopularPosts(),
    getRecentDrafts(),
    getViewStats(),
  ]);

  if (
    !statsResult.success ||
    !scheduledPostsResult.success ||
    !popularPostsResult.success ||
    !recentDraftsResult.success ||
    !viewStatsResult.success
  ) {
    // Handle error
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

  const userRole = session.user?.role as string;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardPage
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
        viewStats={viewStatsResult.data}
      />
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <ServiceRequestsWidget />
        </div>
      )}
    </Suspense>
  );
}
