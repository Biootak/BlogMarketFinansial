import { getAllParentCategories, getCategories } from '@/actions/categoryActions';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';
import { CategoriesStats } from './_components/CategoriesStats';
import { CategoryForm } from './_components/CategoryForm';
import { CategoryList } from './_components/CategoryList';
import { SearchCategories } from './_components/SearchCategories';

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

  const [categoriesResult, parentCategoriesResult] = await Promise.all([
    getCategories({ search, page, limit }),
    getAllParentCategories(),
  ]);

  const categories = categoriesResult.data || { categories: [], totalCount: 0 };
  const parentCategories = parentCategoriesResult.data || [];

  return (
    <div className="route-frame">
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

      <CategoriesStats totalCount={categories.totalCount} parentCount={parentCategories.length} />

      <Section
        title="سالنامهٔ دسته‌بندی‌ها"
        subtitle="هر دسته‌بندی یک مدخل شماره‌دار — اسکرول برای بارگذاری بیشتر"
        icon="folder-tree"
      >
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
      </Section>
    </div>
  );
}
