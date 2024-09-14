import { Suspense } from 'react';
import CreatePostForm from '@/components/Dashboard/Blog/PostForm/CreatePostForm';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function CreatePostPage() {
  return (
    <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
      <CreatePostForm />
    </Suspense>
  );
}
