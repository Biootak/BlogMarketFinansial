'use client';

import { getCategories } from '@/actions/categoryActions';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives';
import LoadingMore from '@/components/LoadingMore';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { TaxonomyType } from '@/types/types';
import { useCallback, useEffect, useState } from 'react';
import CategoryItem from './CategoryItem';
import s from './categories.module.css';

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

/**
 * CategoryList — «سالنامهٔ دسته‌بندی‌ها».
 *
 * - هر دسته‌بندی یک مدخل شماره‌دار است (counter در CSS) با ریل حاشیه.
 * - اسکرول بی‌نهایت و منطق fetch دست‌نخورده — فقط لایهٔ نمایش عوض شده.
 */
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
      // Silent fail — category list will show empty state
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
      <MillionDollarEmpty
        eyebrow="ساختار"
        title="دسته‌بندی یافت نشد"
        description="هنوز هیچ دسته‌بندی در سیستم ثبت نشده است. اولین دسته‌بندی را ایجاد کنید."
        tone="neutral"
      />
    );
  }

  return (
    <div>
      <ul className={s.board}>{renderCategories(categories)}</ul>

      {isLoading && <LoadingMore message="در حال دریافت دسته‌بندی‌های بیشتر…" />}

      <footer className={s.foot}>
        <span className={s.footCount}>
          <strong>{categories.length}</strong> از <strong>{initialData.totalCount}</strong> دسته‌بندی
        </span>
        {hasNextPage && (
          <span className={s.footHint}>
            <span className={s.footDot} aria-hidden />
            اسکرول برای بارگذاری بیشتر
          </span>
        )}
      </footer>

      <div ref={elementRef} style={{ blockSize: '1px' }} aria-hidden />
    </div>
  );
}
