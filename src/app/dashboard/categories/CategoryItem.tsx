'use client';

import { deleteCategory } from '@/actions/categoryActions';
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
  const isParent = level === 0;

  return (
    <>
      <tr>
        <td>
          <div className="at-thumb">
            {category.thumbnail ? (
              <Image
                src={category.thumbnail}
                alt={category.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <span>
                {category.name && category.name.length > 0 ? category.name[0].toUpperCase() : '?'}
              </span>
            )}
          </div>
        </td>
        <td>
          <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
            <CategoryIcon
              className={`size-3.5 ${isParent ? 'text-[color:var(--at-accent)]' : 'text-[color:var(--at-info)]'}`}
            />
            <span
              className={`font-semibold ${isParent ? 'text-[color:var(--at-fg)]' : 'text-[color:var(--at-fg-muted)]'}`}
            >
              {category.name}
            </span>
            {category.childCategories && category.childCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[color:var(--at-fg-subtle)] hover:bg-[color:var(--at-surface-hover)] hover:text-[color:var(--at-fg)] transition-colors"
                aria-label={isExpanded ? 'بستن زیرمجموعه' : 'باز کردن زیرمجموعه'}
              >
                {isExpanded ? (
                  <HiOutlineChevronDown className="size-3.5" />
                ) : (
                  <HiOutlineChevronLeft className="size-3.5" />
                )}
              </button>
            )}
          </div>
        </td>
        <td>
          <code className="at-code">{category.slug}</code>
        </td>
        <td className="hidden sm:table-cell">
          <span className="at-badge at-badge--draft">{category.count} پست</span>
        </td>
        <td>
          <div className="at-actions">
            <button
              type="button"
              onClick={() => setIsEditDialogOpen(true)}
              className="at-actions__btn at-actions__btn--edit"
              title="ویرایش"
            >
              <HiOutlinePencil className="size-3.5" />
              <span className="hidden sm:inline">ویرایش</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="at-actions__btn at-actions__btn--danger"
              title="حذف"
            >
              <HiOutlineTrash className="size-3.5" />
              <span className="hidden sm:inline">حذف</span>
            </button>
          </div>
        </td>
      </tr>
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
