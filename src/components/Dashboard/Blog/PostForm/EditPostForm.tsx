'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UpdatePostSchema } from '@/schemas';
import PostForm from './PostForm';
import type { UpdatePostInput, PostWithRelations } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { updatePost } from '@/actions/postActions';

interface EditPostFormProps {
  initialData: PostWithRelations;
}

const EditPostForm: React.FC<EditPostFormProps> = ({ initialData }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: UpdatePostInput = {
    title: initialData.title,
    content: initialData.content || '',
    excerpt: initialData.excerpt || '',
    isFeatured: initialData.isFeatured,
    postType: initialData.postType,
    videoUrl: initialData.videoUrl || '',
    audioUrl: initialData.audioUrl || '',
    featuredImage: initialData.featuredImage || '',
    galleryImages: initialData.galleryImages,
    categories: initialData.categories.map((cat) => cat.name),
    tags: initialData.tags.map((tag) => tag.name),
    status: initialData.status,
  };

  const handleUpdatePost = async (data: UpdatePostInput) => {
    setIsSubmitting(true);
    try {
      const result = await updatePost(initialData.id, data);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت به‌روزرسانی شد.',
          variant: 'success',
        });
        router.push('/dashboard/posts');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در به‌روزرسانی پست',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PostForm
      schema={UpdatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleUpdatePost}
      isSubmitting={isSubmitting}
      title="ویرایش پست"
      isEditing={true}
    />
  );
};

export default EditPostForm;
