import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import type { PostStatus } from '@/types/types';
import { checkRole } from '@/lib/auth';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}) {
  // SUPER_ADMIN, ADMIN, and AUTHOR can access posts
  await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);
  
  return <AdminPostListView searchParams={searchParams} />;
}
