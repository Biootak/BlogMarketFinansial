// app/dashboard/posts/create/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CreatePostForm from '@/components/Dashboard/Blog/PostForm/CreatePostForm';
import { PageHeader } from '@/components/Dashboard/primitives';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';

export const revalidate = 3600; // Revalidate every hour

export default async function CreatePostPage() {
  const [categoriesResult, tagsResult] = await Promise.all([
    getCategories({ limit: 100, page: 1 }),
    getTags({ limit: 100, page: 1 }),
  ]);

  if (!categoriesResult.success || !tagsResult.success) {
    return notFound();
  }

  const initialCategories = categoriesResult.data?.categories ?? [];
  const initialTags = tagsResult.data?.tags ?? [];
  const totalCategories = categoriesResult.data?.totalCount ?? 0;
  const totalTags = tagsResult.data?.totalCount ?? 0;

  return (
    <div className="dash2-page">
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'پست‌ها', href: '/dashboard/posts' },
          { label: 'ایجاد پست جدید' },
        ]}
        title="ایجاد پست جدید"
        description="نوشتن و انتشار پست جدید"
      />
      <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
        <CreatePostForm
          initialCategories={initialCategories}
          initialTags={initialTags}
          totalCategories={totalCategories}
          totalTags={totalTags}
        />
      </Suspense>
    </div>
  );
}