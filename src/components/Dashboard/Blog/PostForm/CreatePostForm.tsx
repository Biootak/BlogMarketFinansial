'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreatePostSchema } from '@/schemas';
import PostForm from './PostForm';
import type { CreatePostInput, UpdatePostInput } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { createPost } from '@/actions/postActions';

const CreatePostForm: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: CreatePostInput = {
    title: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
    isFeatured: false,
    postType: 'STANDARD',
    videoUrl: '',
    audioUrl: '',
    featuredImage: undefined,
    galleryImages: [],
    categories: [],
    tags: [],
  };

  const handleCreatePost = async (data: CreatePostInput) => {
    setIsSubmitting(true);
    try {
      const result = await createPost(data);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت ایجاد شد.',
          variant: 'success',
        });
        router.push('/dashboard/posts');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در ایجاد پست',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PostForm
      schema={CreatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleCreatePost as (data: CreatePostInput | UpdatePostInput) => Promise<void>}
      isSubmitting={isSubmitting}
      title="ایجاد پست جدید"
    />
  );
};

export default CreatePostForm;
