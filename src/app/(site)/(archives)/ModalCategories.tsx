'use client';

import React, { type FC, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaxonomyType } from '@/types/types';

export type ModalCategoriesProps = {
  categories?: TaxonomyType[];
};

const ModalCategories: FC<ModalCategoriesProps> = ({ categories = [] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentCategory, setCurrentCategory] = useState('all');

  useEffect(() => {
    const category = searchParams.get('category');
    setCurrentCategory(category || 'all');
  }, [searchParams]);

  const handleCategoryChange = (categoryId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (categoryId === 'all') {
      current.delete('category');
    } else {
      current.set('category', categoryId);
    }
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/archive${query}`);
  };

  return (
    <div className="nc-ModalCategories">
      <Select dir="rtl" onValueChange={handleCategoryChange} value={currentCategory}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="انتخاب دسته‌بندی" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
          {categories.length > 0 ? (
            categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-categories" disabled>
              دسته‌بندی موجود نیست
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModalCategories;
