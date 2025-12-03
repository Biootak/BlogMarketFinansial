import { Suspense } from 'react';
import { CategoryForm } from './CategoryForm';
import SearchCategories from './SearchCategories';
import { CategoryList } from './CategoryList';
import { getCategories, getAllParentCategories } from '@/actions/categoryActions';
import { unstable_noStore as noStore } from 'next/cache';

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
    <div className="container py-4 sm:py-6 lg:py-8 rtl">
      <h1 className="text-2xl sm:text-xl font-bold mb-4 sm:mb-6 lg:mb-8 text-end text-primary-700 dark:text-primary-300">
        مدیریت دسته‌بندی‌ها
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-0">
        <CategoryForm parentCategories={parentCategories} />
        <SearchCategories />
      </div>

      <Suspense fallback={<div>در حال بارگذاری دسته‌بندی‌ها...</div>}>
        <CategoryList
          initialData={categories}
          search={search}
          parentCategories={parentCategories}
        />
      </Suspense>
    </div>
  );
}
