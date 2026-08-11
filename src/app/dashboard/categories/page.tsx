import { getAllParentCategories, getCategories } from '@/actions/categoryActions';
import { PageHeader } from '@/components/Dashboard/primitives';
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
    <div className="at-page" dir="rtl">
      <PageHeader
        variant="compact"
        eyebrow="ساختار"
        title="مدیریت دسته‌بندی‌ها"
        description="تعریف، ویرایش و سازماندهی درختی دسته‌بندی‌های محتوا"
        icon="folder-open"
        accent="cyan"
        actions={
          <>
            <Suspense fallback={null}>
              <SearchCategories />
            </Suspense>
            <CategoryForm parentCategories={parentCategories} />
          </>
        }
      />

      <Suspense
        fallback={
          <div className="at-loading">
            <span className="at-loading__dot" />
            <span className="at-loading__dot" />
            <span className="at-loading__dot" />
            <span>در حال بارگذاری دسته‌بندی‌ها…</span>
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
