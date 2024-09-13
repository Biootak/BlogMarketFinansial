'use client';

import { useState, useEffect } from 'react';
import CategoryItem from './CategoryItem';
import type { TaxonomyType } from '@/types/types';
import { getCategories } from '@/actions/categoryActions';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useToast } from '@/components/ui/use-toast';
import LoadingMore from '@/components/LoadingMore';

interface CategoryListProps {
  initialData:
    | {
        categories: TaxonomyType[];
        totalCount: number;
      }
    | undefined;
  search: string;
  parentCategories: TaxonomyType[];
}

export function CategoryList({
  initialData = { categories: [], totalCount: 0 },
  search,
  parentCategories,
}: CategoryListProps) {
  const [categories, setCategories] = useState<TaxonomyType[]>(initialData.categories);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(categories.length < initialData.totalCount);
  const { toast } = useToast();

  const fetchNextPage = async () => {
    if (isLoading || !hasNextPage) return;
    setIsLoading(true);
    try {
      const result = await getCategories({ search, page: page + 1, limit: 10 });
      if (result.success && result.data) {
        setCategories((prev) => [...prev, ...(result.data?.categories || [])]);
        setPage((prev) => prev + 1);
        setHasNextPage(
          categories.length + (result.data?.categories.length || 0) <
            (result.data?.totalCount || 0),
        );
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'خطا',
        description:
          error instanceof Error ? error.message : 'در بارگیری دسته‌بندی‌های بیشتر مشکلی پیش آمد.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const elementRef = useInfiniteScroll(fetchNextPage, hasNextPage, isLoading);

  useEffect(() => {
    setCategories(initialData.categories);
    setPage(1);
    setHasNextPage(initialData.categories.length < initialData.totalCount);
  }, [initialData]);

  const renderCategories = (cats: TaxonomyType[], level = 0) => {
    return cats.map((category) => (
      <CategoryItem
        key={category.id}
        category={category}
        level={level}
        parentCategories={parentCategories}
      />
    ));
  };

  if (categories.length === 0) {
    return <div>هیچ دسته‌بندی یافت نشد.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white dark:bg-neutral-800 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-neutral-100 dark:bg-neutral-700">
          <tr>
            <th className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
              تصویر
            </th>
            <th className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
              نام
            </th>
            <th className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
              اسلاگ
            </th>
            <th className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:table-cell">
              تعداد پست‌ها
            </th>
            <th className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
              عملیات
            </th>
          </tr>
        </thead>
        <tbody>{renderCategories(categories)}</tbody>
      </table>
      {isLoading && <LoadingMore message="در حال دریافت دسته‌بندی‌های بیشتر..." />}
      <div ref={elementRef} style={{ height: '20px' }} />
    </div>
  );
}
