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
import type { TaxonomyType } from '@/types/types';
import { deleteCategory } from '@/actions/categoryActions';
import { useToast } from '@/components/ui/use-toast';
import { CategoryForm } from './CategoryForm';
import { useRouter } from 'next/navigation';
import {
  DashboardTableRow,
  DashboardTableCell,
  ActionButton,
} from '@/components/Dashboard/shared/DashboardTableWrapper';

interface CategoryItemProps {
  category: TaxonomyType;
  level: number;
  parentCategories: TaxonomyType[];
  children?: React.ReactNode;
}

export default function CategoryItem({
  category,
  level,
  parentCategories,
  children,
}: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟')) {
      const result = await deleteCategory(category.id);
      if (result.success) {
        toast({ title: 'موفقیت', description: result.message, variant: 'success' });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    }
  }, [category.id, toast, router]);

  const CategoryIcon = level === 0 ? FaLayerGroup : FaFolder;
  const iconColor = level === 0 ? 'text-primary-500' : 'text-emerald-500';
  const textColor = level === 0 ? 'text-primary-600 dark:text-primary-400' : 'text-emerald-600 dark:text-emerald-400';

  return (
    <>
      <DashboardTableRow>
        <DashboardTableCell>
          <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-2 ring-white shadow-md dark:ring-neutral-700">
            {category.thumbnail ? (
              <Image
                src={category.thumbnail}
                alt={category.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-500 dark:from-neutral-700 dark:to-neutral-800 dark:text-neutral-400">
                <span className="text-lg font-semibold">
                  {category.name && category.name.length > 0 ? category.name[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
          </div>
        </DashboardTableCell>
        <DashboardTableCell>
          <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
            <CategoryIcon className={`h-4 w-4 ${iconColor}`} />
            <span className={`font-medium ${textColor}`}>{category.name}</span>
            {category.childCategories && category.childCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-md p-1 transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {isExpanded ? (
                  <HiOutlineChevronDown className="h-4 w-4 text-neutral-500" />
                ) : (
                  <HiOutlineChevronLeft className="h-4 w-4 text-neutral-500" />
                )}
              </button>
            )}
          </div>
        </DashboardTableCell>
        <DashboardTableCell>
          <code className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
            {category.slug}
          </code>
        </DashboardTableCell>
        <DashboardTableCell hidden>
          <span className="inline-flex items-center justify-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {category.count} پست
          </span>
        </DashboardTableCell>
        <DashboardTableCell>
          <div className="flex items-center gap-2">
            <ActionButton variant="edit" onClick={() => setIsEditDialogOpen(true)}>
              <HiOutlinePencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ویرایش</span>
            </ActionButton>
            <ActionButton variant="delete" onClick={handleDelete}>
              <HiOutlineTrash className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">حذف</span>
            </ActionButton>
          </div>
        </DashboardTableCell>
      </DashboardTableRow>
      {isExpanded && children}
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
