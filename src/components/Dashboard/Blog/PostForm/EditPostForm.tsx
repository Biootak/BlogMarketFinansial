// components/Dashboard/Blog/PostForm/EditPostForm.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UpdatePostSchema } from '@/schemas';
import PostForm from './PostForm';
import type { UpdatePostInput, PostWithRelations, TaxonomyType } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { updatePost } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';

interface EditPostFormProps {
  initialData: PostWithRelations;
  initialCategories: TaxonomyType[];
  initialTags: TaxonomyType[];
  totalCategories: number;
  totalTags: number;
}

const EditPostForm: React.FC<EditPostFormProps> = ({
  initialData,
  initialCategories,
  initialTags,
  totalCategories,
  totalTags,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [categoryPage, setCategoryPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const defaultValues: UpdatePostInput = {
    title: initialData.title,
    content: initialData.content || '',
    slug: initialData.slug || '',
    excerpt: initialData.excerpt || '',
    isFeatured: initialData.isFeatured,
    postType: initialData.postType,
    videoUrl: initialData.videoUrl || '',
    audioUrl: initialData.audioUrl || '',
    featuredImage: initialData.featuredImage || '',
    galleryImages: initialData.galleryImages,
    categories: initialData.categories.map((cat) => cat.id),
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

const loadMoreCategories = useCallback(async () => {
  if (isLoadingMore) return;
  setIsLoadingMore(true);
  try {
    const result = await getCategories({ limit: 10, page: categoryPage + 1 });
    if (result.success && result.data?.categories) {
      setCategories(prev => [...prev, ...result.data.categories]);
      setCategoryPage(prev => prev + 1);
    }
  } catch (error) {
    console.error('Error loading more categories:', error);
    toast({
      title: 'خطا',
      description: 'بارگذاری دسته‌بندی‌های بیشتر با مشکل مواجه شد.',
      variant: 'destructive',
    });
  } finally {
    setIsLoadingMore(false);
  }
}, [categoryPage, isLoadingMore, toast]);

const loadMoreTags = useCallback(async () => {
  if (isLoadingMore) return;
  setIsLoadingMore(true);
  try {
    const result = await getTags({ limit: 10, page: tagPage + 1 });
    if (result.success && result.data?.tags) {
      setTags(prev => [...prev, ...result.data.tags]);
      setTagPage(prev => prev + 1);
    }
  } catch (error) {
    console.error('Error loading more tags:', error);
    toast({
      title: 'خطا',
      description: 'بارگذاری برچسب‌های بیشتر با مشکل مواجه شد.',
      variant: 'destructive',
    });
  } finally {
    setIsLoadingMore(false);
  }
}, [tagPage, isLoadingMore, toast]);

  return (
    <PostForm
      schema={UpdatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleUpdatePost}
      isSubmitting={isSubmitting}
      title="ویرایش پست"
      isEditing={true}
      categories={categories}
      tags={tags}
      onLoadMoreCategories={loadMoreCategories}
      onLoadMoreTags={loadMoreTags}
      isLoadingMore={isLoadingMore}
      totalCategories={totalCategories}
      totalTags={totalTags}
    />
  );
};

export default EditPostForm;
