'use client';

import { useState, useEffect } from 'react';
import { UpdatePostSchema } from '@/schemas';
import { usePostStore } from '@/hooks/postStore';
import PostForm from './PostForm';
import type { UpdatePostInput, PostWithRelations } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import SkeletonLoader from '@/components/SkeletonLoader';

interface EditPostFormProps {
  postId: string;
}

const EditPostForm: React.FC<EditPostFormProps> = ({ postId }) => {
  const updatePost = usePostStore((state) => state.updatePost);
  const getPostById = usePostStore((state) => state.getPostById);
  const [post, setPost] = useState<PostWithRelations | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPost = async () => {
      const fetchedPost = await getPostById(postId);
      if (fetchedPost) {
        setPost(fetchedPost);
      }
    };

    fetchPost();
  }, [postId, getPostById]);

  if (!post) {
    return <SkeletonLoader variant="card" count={6} />;
  }

  const defaultValues: UpdatePostInput = {
    title: post.title,
    content: post.content || '',
    excerpt: post.excerpt || '',
    isFeatured: post.isFeatured,
    postType: post.postType,
    videoUrl: post.videoUrl || '',
    audioUrl: post.audioUrl || '',
    featuredImage: post.featuredImage || '',
    galleryImages: post.galleryImages,
    categories: post.categories.map((cat) => cat.name),
    tags: post.tags.map((tag) => tag.name),
    status: post.status,
  };

  const handleUpdatePost = async (data: UpdatePostInput) => {
    await updatePost(
      postId,
      {
        ...data,
        featuredImage: data.featuredImage ?? undefined,
      },
      toast,
    );
  };

  return (
    <PostForm
      schema={UpdatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleUpdatePost}
      title="ویرایش پست"
      isEditing={true}
    />
  );
};

export default EditPostForm;
