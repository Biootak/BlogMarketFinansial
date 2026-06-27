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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-25 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative">
        <PostHeader />
        <main className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<SkeletonLoader variant="card" count={6} />}>
              <PostList
                initialPosts={result.data.posts}
                hasNextPage={page < result.data.pages}
                totalPages={result.data.pages}
              />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
