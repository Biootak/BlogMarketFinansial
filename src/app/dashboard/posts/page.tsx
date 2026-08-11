import { getPostStatusCounts } from '@/actions/postActions';
import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import PostsPageHeader from '@/components/Dashboard/Blog/PostsPageHeader';
import { checkRole } from '@/lib/auth';
import type { PostStatus } from '@/types/types';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; filter?: 'همه' | PostStatus }>;
}) {
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR']);
  const searchParamsData = await searchParams;

  // شمارنده‌های KPI برای نوار بالای صفحه (موازی با لیست).
  const countsResult = await getPostStatusCounts();
  const counts = countsResult.success && countsResult.data ? countsResult.data : null;

  return (
    <div className="route-frame dash-scope" dir="rtl">
      <PostsPageHeader searchParams={searchParamsData} counts={counts} />
      <AdminPostListView searchParams={searchParamsData} />
    </div>
  );
}
