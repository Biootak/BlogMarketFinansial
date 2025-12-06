import { getAllParentCategories, getCategories } from '@/actions/categoryActions';
import { DashboardPageHeader } from '@/components/Dashboard/shared/DashboardTableWrapper';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import { CategoryForm } from './CategoryForm';
import { CategoryList } from './CategoryList';
import SearchCategories from './SearchCategories';

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  noStore();

  const searchParamsData = await searchParams;
  const search = searchParamsData.search || '';
  const page = Number(searchParamsData.page) || 1;
  const limit = 10;

  const categoriesPromise = getCategories({ search, page, limit });
  const parentCategoriesPromise = getAllParentCategories();

  const [categoriesResult, parentCategoriesResult] = await Promise.all([
    categoriesPromise,
    parentCategoriesPromise,
  ]);

  const categories = categoriesResult.data || { categories: [], totalCount: 0 };
  const parentCategories = parentCategoriesResult.data || [];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 p-4 sm:p-6 lg:p-8 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-950/20"
      dir="rtl"
    >
      <DashboardPageHeader
        title="مدیریت دسته‌بندی‌ها"
        description="مشاهده و مدیریت دسته‌بندی‌های محتوا"
      >
        <SearchCategories />
        <CategoryForm parentCategories={parentCategories} />
      </DashboardPageHeader>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-neutral-500">
            در حال بارگذاری دسته‌بندی‌ها...
          </div>
        }
      >
        <CategoryList
          initialData={categories}
          search={search}
          parentCategories={parentCategories}
        />
      </Suspense>
    </div>
  );
}
