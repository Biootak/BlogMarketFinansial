import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getPostById } from '@/actions/postActions';
import EditPostForm from '@/components/Dashboard/Blog/PostForm/EditPostForm';
import SkeletonLoader from '@/components/SkeletonLoader';
import { notFound } from 'next/navigation';
// app/dashboard/posts/edit/[postId]/page.tsx
import { Suspense } from 'react';

interface EditPostPageProps {
  params: Promise<{
    postId: string;
  }>;
}

export const revalidate = 0; // No caching for edit page

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { postId } = await params;
  const [postResult, categoriesResult, tagsResult] = await Promise.all([
    getPostById(postId),
    getCategories({ limit: 100, page: 1 }),
    getTags({ limit: 100, page: 1 }),
  ]);

  if (!postResult.success || !postResult.data || !categoriesResult.success || !tagsResult.success) {
    return notFound();
  }

  const initialCategories = categoriesResult.data?.categories ?? [];
  const initialTags = tagsResult.data?.tags ?? [];
  const totalCategories = categoriesResult.data?.totalCount ?? 0;
  const totalTags = tagsResult.data?.totalCount ?? 0;

  return (
    <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
      <EditPostForm
        initialData={postResult.data}
        initialCategories={initialCategories}
        initialTags={initialTags}
        totalCategories={totalCategories}
        totalTags={totalTags}
      />
    </Suspense>
  );
}
