import { Suspense } from 'react';
import { listAllPosts } from '@/actions/postActions';
import PostHeader from './PostHeader';
import PostList from './PostList';
import SkeletonLoader from '@/components/SkeletonLoader';
import ErrorComponent from '@/components/ErrorComponent';
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      <PostHeader />
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<SkeletonLoader variant="card" count={6} />}>
          <PostList
            initialPosts={result.data.posts}
            hasNextPage={page < result.data.pages}
            totalPages={result.data.pages}
          />
        </Suspense>
      </main>
    </div>
  );
}
