import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import PostsPageHeader from '@/components/Dashboard/Blog/PostsPageHeader';
import type { PostStatus } from '@/types/types';
import { checkRole } from '@/lib/auth';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; filter?: 'همه' | PostStatus }>;
}) {
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR']);
  const searchParamsData = await searchParams;

  return (
    <div className="dash2-page">
      <PostsPageHeader searchParams={searchParamsData} />
      <AdminPostListView searchParams={searchParamsData} />
    </div>
  );
}
