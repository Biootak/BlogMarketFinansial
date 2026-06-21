import { Suspense } from 'react';
import { CategoryForm } from './CategoryForm';
import SearchCategories from './SearchCategories';
import { CategoryList } from './CategoryList';
import { getCategories, getAllParentCategories } from '@/actions/categoryActions';
import { unstable_noStore as noStore } from 'next/cache';
import { DashboardPageHeader } from '@/components/Dashboard/shared/DashboardTableWrapper';

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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      <DashboardPageHeader title="مدیریت دسته‌بندی‌ها" description="مشاهده و مدیریت دسته‌بندی‌های محتوا">
        <SearchCategories />
        <CategoryForm parentCategories={parentCategories} />
      </DashboardPageHeader>

      <Suspense fallback={<div className="flex items-center justify-center py-12 text-neutral-500">در حال بارگذاری دسته‌بندی‌ها...</div>}>
        <CategoryList
          initialData={categories}
          search={search}
          parentCategories={parentCategories}
        />
      </Suspense>
    </div>
  );
}
