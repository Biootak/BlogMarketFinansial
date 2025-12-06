'use client';

import { getCategories } from '@/actions/categoryActions';
import {
  DashboardTable,
  DashboardTableBody,
  DashboardTableContainer,
  DashboardTableHead,
  DashboardTableHeader,
  EmptyState,
} from '@/components/Dashboard/shared/DashboardTableWrapper';
import LoadingMore from '@/components/LoadingMore';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { TaxonomyType } from '@/types/types';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineFolderOpen } from 'react-icons/hi2';
import CategoryItem from './CategoryItem';

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

  const fetchNextPage = useCallback(async () => {
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
  }, [isLoading, hasNextPage, search, page, categories.length, toast]);

  const elementRef = useInfiniteScroll(fetchNextPage, hasNextPage, isLoading);

  useEffect(() => {
    setCategories(initialData.categories);
    setPage(1);
    setHasNextPage(initialData.categories.length < initialData.totalCount);
  }, [initialData]);

  const renderCategories = useCallback(
    (cats: TaxonomyType[], level = 0) => {
      return cats.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          level={level}
          parentCategories={parentCategories}
        >
          {category.childCategories && renderCategories(category.childCategories, level + 1)}
        </CategoryItem>
      ));
    },
    [parentCategories],
  );

  if (categories.length === 0) {
    return (
      <DashboardTableContainer>
        <EmptyState
          title="دسته‌بندی یافت نشد"
          description="هنوز هیچ دسته‌بندی در سیستم ثبت نشده است."
          icon={<HiOutlineFolderOpen className="h-8 w-8 text-neutral-400" />}
        />
      </DashboardTableContainer>
    );
  }

  return (
    <DashboardTableContainer>
      <DashboardTable>
        <DashboardTableHeader>
          <tr>
            <DashboardTableHead>تصویر</DashboardTableHead>
            <DashboardTableHead>نام</DashboardTableHead>
            <DashboardTableHead>اسلاگ</DashboardTableHead>
            <DashboardTableHead hidden>تعداد پست‌ها</DashboardTableHead>
            <DashboardTableHead>عملیات</DashboardTableHead>
          </tr>
        </DashboardTableHeader>
        <DashboardTableBody>{renderCategories(categories)}</DashboardTableBody>
      </DashboardTable>
      {isLoading && <LoadingMore message="در حال دریافت دسته‌بندی‌های بیشتر..." />}
      <div ref={elementRef} style={{ height: '20px' }} />
    </DashboardTableContainer>
  );
}
