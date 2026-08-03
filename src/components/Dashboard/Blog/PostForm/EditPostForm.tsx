// components/Dashboard/Blog/PostForm/EditPostForm.tsx
'use client';

import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { updatePost } from '@/actions/postActions';
import { useToast } from '@/components/ui/use-toast';
import { isSuccessResult } from '@/lib/utils';
import { UpdatePostSchema } from '@/schemas';
import type { PostWithRelations, TaxonomyType, UpdatePostInput } from '@/types/types';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import PostForm from './PostForm';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
    // 2026-06-21: ابعاد تصویر شاخص از دیتابیس
    featuredImageWidth: initialData.featuredImageWidth ?? undefined,
    featuredImageHeight: initialData.featuredImageHeight ?? undefined,
    galleryImages: initialData.galleryImages || [],
    categories: initialData.categories.map((cat) => cat.id),
    tags: initialData.tags.map((tag) => tag.name),
    status: initialData.status,
    // 2026-07-04: scheduledAt از DB. Prisma آن را به صورت Date برمی‌گرداند.
    scheduledAt: initialData.scheduledAt ? new Date(initialData.scheduledAt) : null,
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
        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'مشکلی در به‌روزرسانی پست رخ داد. لطفاً دوباره تلاش کنید.',
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
    } catch {
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
