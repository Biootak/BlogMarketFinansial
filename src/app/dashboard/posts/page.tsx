import { Suspense } from 'react';
import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import SkeletonLoader from '@/components/SkeletonLoader';
import type { PostStatus } from '@/types/types';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}) {
  return (
    <Suspense fallback={<SkeletonLoader variant="card" count={6} />}>
      <AdminPostListView searchParams={searchParams} />
    </Suspense>
  );
}
