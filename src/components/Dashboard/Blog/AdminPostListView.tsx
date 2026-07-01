import { Suspense } from 'react';
import { listAllPosts } from '@/actions/postActions';
import PostList from './PostList';
import SkeletonLoader from '@/components/SkeletonLoader';
import ErrorComponent from '@/components/ErrorComponent';
import type { PostStatus } from '@/types/types';

export default async function AdminPostListView({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}) {
  const page = Number(searchParams.page) || 1;
  const searchTerm = searchParams.search || '';
  const filter: 'همه' | PostStatus = (searchParams.filter as 'همه' | PostStatus) || 'همه';

  const result = await listAllPosts(page, 12, searchTerm, filter);

  if (!result.success || !result.data) {
    return <ErrorComponent message={result.message || 'خطایی رخ داد'} />;
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<SkeletonLoader variant="card" count={6} />}>
          <PostList
            initialPosts={result.data.posts}
            hasNextPage={page < result.data.pages}
            totalPages={result.data.pages}
            totalPosts={result.data.total}
            currentSearch={searchTerm}
            currentFilter={filter}
          />
        </Suspense>
      </div>
    </main>
  );
}
