import { Suspense } from 'react';
import EditPostForm from '@/components/Dashboard/Blog/PostForm/EditPostForm';

interface EditPostPageProps {
  params: {
    postId: string;
  };
}

export default function EditPostPage({ params }: EditPostPageProps) {
  return (
    <Suspense>
      <EditPostForm postId={params.postId} />
    </Suspense>
  );
}
