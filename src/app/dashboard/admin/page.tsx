import { Suspense } from 'react';
import DashboardPage from '@/components/Dashboard/DashboardPage/DashboardPage';
import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { getStats, getScheduledPosts } from '@/actions/postActions';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import Loading from '@/components/Loading';

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  const [statsResult, scheduledPostsResult, popularPostsResult, recentDraftsResult] =
    await Promise.all([getStats(), getScheduledPosts(), getPopularPosts(), getRecentDrafts()]);

  if (
    !statsResult.success ||
    !scheduledPostsResult.success ||
    !popularPostsResult.success ||
    !recentDraftsResult.success
  ) {
    // Handle error
    return notFound();
  }

  if (
    !statsResult.data ||
    !scheduledPostsResult.data ||
    !popularPostsResult.data ||
    !recentDraftsResult.data
  ) {
    return notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="bg-neutral-100 dark:bg-neutral-800 p-6 space-y-6">
          <Loading count={1} height="200px" className="mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Loading count={1} height="100px" />
            <Loading count={1} height="100px" />
            <Loading count={1} height="100px" />
            <Loading count={1} height="100px" />
            <Loading count={1} height="100px" />
            <Loading count={1} height="100px" />
          </div>
        </div>
      }
    >
      <DashboardPage
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
      />
    </Suspense>
  );
}
