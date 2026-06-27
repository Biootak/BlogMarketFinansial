import AdminPostListView from '@/components/Dashboard/Blog/AdminPostListView';
import { PageHeader } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import type { PostStatus } from '@/types/types';
import { checkRole } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPosts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; filter?: 'همه' | PostStatus }>;
}) {
  // SUPER_ADMIN, ADMIN, and AUTHOR can access posts
  await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);
  const searchParamsData = await searchParams;

  return (
    <div className="dash2-page">
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'پست‌ها' },
        ]}
        title="پست‌ها"
        description="مدیریت پست‌های وبلاگ"
        actions={
          <Link href="/dashboard/posts/create">
            <Button>ایجاد پست جدید</Button>
          </Link>
        }
      />
      <AdminPostListView searchParams={searchParamsData} />
    </div>
  );
}
