import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import { checkRole } from '@/lib/auth';
import type { PostStatus } from '@/types/types';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; filter?: 'همه' | PostStatus }>;
}) {
  // SUPER_ADMIN, ADMIN, and AUTHOR can access posts
  await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);
  const searchParamsData = await searchParams;

  return <AdminPostListView searchParams={searchParamsData} />;
}
