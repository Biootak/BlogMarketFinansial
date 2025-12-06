'use client';

import { deleteCategory } from '@/actions/categoryActions';
import {
  ActionButton,
  DashboardTableCell,
  DashboardTableRow,
} from '@/components/Dashboard/shared/DashboardTableWrapper';
import { useToast } from '@/components/ui/use-toast';
import type { TaxonomyType } from '@/types/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FaFolder, FaLayerGroup } from 'react-icons/fa';
import {
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { CategoryForm } from './CategoryForm';

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
  const textColor =
    level === 0
      ? 'text-primary-600 dark:text-primary-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <>
      <DashboardTableRow>
        <DashboardTableCell>
          <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-lg sm:rounded-xl ring-1 sm:ring-2 ring-white shadow-sm sm:shadow-md dark:ring-neutral-700">
            {category.thumbnail ? (
              <Image src={category.thumbnail} alt={category.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-500 dark:from-neutral-700 dark:to-neutral-800 dark:text-neutral-400">
                <span className="text-sm sm:text-lg font-semibold">
                  {category.name && category.name.length > 0 ? category.name[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
          </div>
        </DashboardTableCell>
        <DashboardTableCell>
          <div
            className="flex items-center gap-1.5 sm:gap-2"
            style={{ paddingRight: `${level * 16}px` }}
          >
            <CategoryIcon className={`h-3 w-3 sm:h-4 sm:w-4 ${iconColor} flex-shrink-0`} />
            <span className={`font-medium text-xs sm:text-sm ${textColor} truncate`}>
              {category.name}
            </span>
            {category.childCategories && category.childCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-md p-0.5 sm:p-1 transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex-shrink-0"
              >
                {isExpanded ? (
                  <HiOutlineChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-neutral-500" />
                ) : (
                  <HiOutlineChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-neutral-500" />
                )}
              </button>
            )}
          </div>
        </DashboardTableCell>
        <DashboardTableCell>
          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 block truncate max-w-[120px] sm:max-w-none">
            {category.slug}
          </code>
        </DashboardTableCell>
        <DashboardTableCell hidden>
          <span className="inline-flex items-center justify-center rounded-full bg-primary-50 px-2 py-0.5 sm:px-2.5 text-[10px] sm:text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {category.count} پست
          </span>
        </DashboardTableCell>
        <DashboardTableCell>
          <div className="flex items-center gap-1 sm:gap-2">
            <ActionButton variant="edit" onClick={() => setIsEditDialogOpen(true)}>
              <HiOutlinePencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">ویرایش</span>
            </ActionButton>
            <ActionButton variant="delete" onClick={handleDelete}>
              <HiOutlineTrash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
