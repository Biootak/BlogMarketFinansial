import { Suspense } from 'react';
import CreatePostForm from '@/components/Dashboard/Blog/PostForm/CreatePostForm';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';

export default async function CreatePostPage() {
  const [categoriesResult, tagsResult] = await Promise.all([
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
  ]);

  const initialCategories = categoriesResult.success ? categoriesResult.data?.categories ?? [] : [];
  const initialTags = tagsResult.success ? tagsResult.data?.tags ?? [] : [];

  return (
    <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
      <CreatePostForm initialCategories={initialCategories} initialTags={initialTags} />
    </Suspense>
  );
}