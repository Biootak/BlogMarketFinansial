// app/dashboard/posts/create/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CreatePostForm from '@/components/Dashboard/Blog/PostForm/CreatePostForm';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';

export const revalidate = 3600;

export default async function CreatePostPage() {
  const [categoriesResult, tagsResult] = await Promise.all([
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
  ]);

  if (!categoriesResult.success || !tagsResult.success) {
    return notFound();
  }

  const initialCategories = categoriesResult.data?.categories ?? [];
  const initialTags = tagsResult.data?.tags ?? [];

  return (
    <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
      <CreatePostForm initialCategories={initialCategories} initialTags={initialTags} />
    </Suspense>
  );
}
