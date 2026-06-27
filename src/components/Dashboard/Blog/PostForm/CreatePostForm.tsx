// components/Dashboard/Blog/PostForm/CreatePostForm.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreatePostSchema } from '@/schemas';
import PostForm from './PostForm';
import type { CreatePostInput, TaxonomyType } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { createPost } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { isSuccessResult } from '@/lib/utils';


interface CreatePostFormProps {
  initialCategories: TaxonomyType[];
  initialTags: TaxonomyType[];
  totalCategories: number;
  totalTags: number;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({
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

  const defaultValues: CreatePostInput = {
    title: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
    isFeatured: false,
    postType: 'STANDARD',
    videoUrl: '',
    audioUrl: '',
    featuredImage: '',
    galleryImages: [],
    categories: [],
    tags: [],
    slug: '',
  };
  const handleCreatePost = async (data: CreatePostInput) => {
    setIsSubmitting(true);
    try {
      const result = await createPost(data);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت ایجاد شد',
          variant: 'success',
        });
        router.push("/dashboard/posts");
        router.refresh();
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('خطا در ایجاد پست:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در ایجاد پست رخ داد. لطفاً دوباره تلاش کنید.',
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
      if (isSuccessResult(result) && result.data.categories) {
        setCategories((prev) => [...prev, ...result.data.categories]);
        setCategoryPage((prev) => prev + 1);
      }
    } catch {
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
      if (isSuccessResult(result) && result.data.tags) {
        setTags((prev) => [...prev, ...result.data.tags]);
        setTagPage((prev) => prev + 1);
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
      schema={CreatePostSchema}
      defaultValues={defaultValues}
      onSubmit={handleCreatePost}
      isSubmitting={isSubmitting}
      title="ایجاد پست جدید"
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

export default CreatePostForm;
