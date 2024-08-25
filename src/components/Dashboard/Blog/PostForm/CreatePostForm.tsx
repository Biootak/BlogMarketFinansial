'use client';

import { CreatePostSchema } from '@/schemas';
import { usePostStore } from '@/hooks/postStore';
import PostForm from './PostForm';
import type { CreatePostInput, UpdatePostInput } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';

const CreatePostForm: React.FC = () => {
  const createPost = usePostStore((state) => state.createPost);
  const { toast } = useToast();

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

  const handleCreatePost = async (data: CreatePostInput | UpdatePostInput) => {
    // Ensure that data is of type CreatePostInput
    if ('id' in data) {
      throw new Error('Invalid data type for creating a post');
    }

    // Ensure that data does not contain undefined values
    const validatedData: CreatePostInput = {
      title: data.title ?? '',
      content: data.content ?? '',
      excerpt: data.excerpt ?? '',
      status: data.status ?? 'DRAFT',
      isFeatured: data.isFeatured ?? false,
      postType: data.postType ?? 'STANDARD',
      videoUrl: data.videoUrl || undefined,
      audioUrl: data.audioUrl || undefined,
      featuredImage: data.featuredImage ?? undefined,
      galleryImages: data.galleryImages ?? [],
      categories: data.categories ?? [],
      tags: data.tags ?? [],
    };

    await createPost(validatedData, toast);
  };

  return (
    <PostForm
      schema={CreatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleCreatePost}
      title="ایجاد پست جدید"
    />
  );
};

export default CreatePostForm;
