import { Suspense } from 'react';

import SkeletonLoader from '@/components/SkeletonLoader';
import PostHeader from './PostHeader';
import PostList from './PostList';
import ErrorComponent from '@/components/ErrorComponent';
import { listAllPosts } from '@/actions/postActions';
import type { PostStatus } from '@/types/types';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}) {
  const page = Number(searchParams.page) || 1;
  const searchTerm = searchParams.search || '';
  const filter: 'همه' | PostStatus = (searchParams.filter as 'همه' | PostStatus) || 'همه';

  const result = await listAllPosts(page, 12, searchTerm, filter);

  if (!result.success || !result.data) {
    return <ErrorComponent message={result.message || 'An error occurred'} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900 dark:text-white">
      <PostHeader />
      <div className="flex-grow p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<SkeletonLoader variant="card" count={6} />}>
          <PostList
            initialPosts={result.data.posts}
            hasNextPage={page < result.data.pages}
            // totalPages={result.data.pages}
          />
        </Suspense>
      </div>
    </div>
  );
}
