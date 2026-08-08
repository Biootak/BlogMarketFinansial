'use client';

import { getCategories } from '@/actions/categoryActions';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import SectionGridCategoryBox from '@/components/SectionGridCategoryBox/SectionGridCategoryBox';
import type { TaxonomyType } from '@/types/types';
import type React from 'react';
import { useState } from 'react';

interface DynamicCategoriesProps {
  initialCategories: TaxonomyType[];
  initialTotalCount: number;
}

const DynamicCategories: React.FC<DynamicCategoriesProps> = ({
  initialCategories,
  initialTotalCount,
}) => {
  const [categories, setCategories] = useState<TaxonomyType[]>(initialCategories);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const loadMoreCategories = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const result = await getCategories({ limit: 10, page: nextPage });

    if (result.success && result.data) {
      setCategories([...categories, ...result.data.categories]);
      setTotalCount(result.data.totalCount);
      setPage(nextPage);
    }
    setLoading(false);
  };

  return (
    <>
      <SectionGridCategoryBox
        categories={categories}
        headingCenter={true}
        totalCount={totalCount}
      />
      <div className="text-center mx-auto mt-10 md:mt-16">
        {categories.length < totalCount && (
          <ButtonPrimary onClick={loadMoreCategories} disabled={loading}>
            {loading ? 'در حال دریافت دسته‌بندی‌ها…' : 'دسته‌بندی‌های بیشتر'}
          </ButtonPrimary>
        )}
      </div>
    </>
  );
};

export default DynamicCategories;
