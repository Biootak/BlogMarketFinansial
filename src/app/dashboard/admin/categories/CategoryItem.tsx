'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import {
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineChevronLeft,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import { FaLayerGroup, FaFolder } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import type { TaxonomyType } from '@/types/types';
import { deleteCategory } from '@/actions/categoryActions';
import { useToast } from '@/components/ui/use-toast';
import { CategoryForm } from './CategoryForm';
import { useRouter } from 'next/navigation';

interface CategoryItemProps {
  category: TaxonomyType;
  level: number;
  parentCategories: TaxonomyType[];
}

export default function CategoryItem({ category, level, parentCategories }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟')) {
      const result = await deleteCategory(category.id);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: result.message,
          variant: 'success',
        });
        router.refresh();
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    }
  }, [category.id, toast, router]);

  const CategoryIcon = level === 0 ? FaLayerGroup : FaFolder;
  const iconColor = level === 0 ? 'text-blue-500' : 'text-green-500';

  return (
    <>
      <tr className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-150">
        <td className="py-3 px-4 sm:py-4 sm:px-6">
          <div className="w-8 h-8 sm:w-12 sm:h-12 relative overflow-hidden rounded-full">
            {category.thumbnail ? (
              <Image
                src={category.thumbnail}
                alt={category.name}
                layout="fill"
                objectFit="cover"
                className="rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <span className="text-lg sm:text-2xl">
                  {category.name && category.name.length > 0 ? category.name[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
          </div>
        </td>
        <td className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
          <div className="flex items-center" style={{ paddingRight: `${level * 20}px` }}>
            <CategoryIcon className={`ml-2 h-5 w-5 ${iconColor}`} />
            <span className={`font-medium ${level === 0 ? 'text-blue-600' : 'text-green-600'}`}>
              {category.name}
            </span>
            {category.subCategories && category.subCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mr-2 focus:outline-none"
              >
                {isExpanded ? (
                  <HiOutlineChevronDown className="h-4 w-4" />
                ) : (
                  <HiOutlineChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </td>
        <td className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          {category.slug}
        </td>
        <td className="text-right py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">
          {category.count}
        </td>
        <td className="py-3 px-4 sm:py-4 sm:px-6">
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="text-primary-600 border-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-900 text-xs sm:text-sm px-2 sm:px-3 py-1"
            >
              <HiOutlinePencil className="ml-1 hidden sm:inline" />
              ویرایش
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900 text-xs sm:text-sm px-2 sm:px-3 py-1"
            >
              <HiOutlineTrash className="ml-1 hidden sm:inline" />
              حذف
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        category.subCategories &&
        category.subCategories.map((subCategory) => (
          <CategoryItem
            key={subCategory.id}
            category={subCategory}
            level={level + 1}
            parentCategories={parentCategories}
          />
        ))}
      {isEditDialogOpen && (
        <CategoryForm
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          category={category}
          parentCategories={parentCategories}
        />
      )}
    </>
  );
}
