import { Suspense } from 'react';
import DashboardPage from '@/components/Dashboard/DashboardPage/DashboardPage';
import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { getStats, getScheduledPosts } from '@/actions/postActions';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getViewStats } from '@/actions/getViewStats';
import Loading from '@/components/Loading';

export default async function Dashboard() {
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

  return (
    <Suspense fallback={<Loading />}>
      <DashboardPage
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
        viewStats={viewStatsResult.data}
      />
    </Suspense>
  );
}
