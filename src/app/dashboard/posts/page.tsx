import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import type { PostStatus } from '@/types/types';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}) {
  return <AdminPostListView searchParams={searchParams} />;
}
