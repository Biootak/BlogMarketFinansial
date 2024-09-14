import { Suspense } from 'react';
import EditPostForm from '@/components/Dashboard/Blog/PostForm/EditPostForm';
import { getPostById } from '@/actions/postActions';
import SkeletonLoader from '@/components/SkeletonLoader';
import { notFound } from 'next/navigation';

interface EditPostPageProps {
  params: {
    postId: string;
  };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const postResult = await getPostById(params.postId);

  if (!postResult.success || !postResult.data) {
    return notFound();
  }

  return (
    <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
      <EditPostForm initialData={postResult.data} />
    </Suspense>
  );
}
