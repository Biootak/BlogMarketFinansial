'use client';

import { deleteCategory } from '@/actions/categoryActions';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { TaxonomyType } from '@/types/types';
import { ChevronDown, ChevronLeft, Folder, FolderTree, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { CategoryForm } from './CategoryForm';
import s from './categories.module.css';

interface CategoryItemProps {
  category: TaxonomyType;
  level: number;
  parentCategories: TaxonomyType[];
  children?: React.ReactNode;
}

/**
 * CategoryItem — یک «مدخل» در سالنامهٔ دسته‌بندی‌ها.
 *
 * - شمارهٔ مدخل از CSS counter می‌آید (نه props) — ترتیب DOM منبع حقیقت است.
 * - تورفتگی درختی با paddingInlineStart (logical — در RTL درست می‌نشیند،
 *   برخلاف paddingRight قدیم).
 * - حذف از ConfirmDialog canonical می‌گذرد، نه window.confirm مرورگر.
 */
export default function CategoryItem({
  category,
  level,
  parentCategories,
  children,
}: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    const result = await deleteCategory(category.id);
    setIsDeleting(false);
    if (result.success) {
      setIsDeleteOpen(false);
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      router.refresh();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  }, [category.id, toast, router]);

  const isParent = level === 0;
  const CategoryIcon = isParent ? FolderTree : Folder;
  const hasChildren = !!category.childCategories && category.childCategories.length > 0;

  return (
    <>
      <li
        className={s.entry}
        style={{ paddingInlineStart: `calc(var(--ds-space-4) + ${level * 20}px)` }}
      >
        <span className={s.index} aria-hidden="true" />
        <span className={cn(s.iconChip, !isParent && s.iconChipChild)} aria-hidden>
          <CategoryIcon size={15} strokeWidth={1.6} />
        </span>

        <div className={s.main}>
          <span className={cn(s.name, !isParent && s.nameChild)}>{category.name}</span>
          <code className={s.slug}>{category.slug}</code>
          <span className={s.countPill}>
            <strong>{category.count}</strong>
            <span>پست</span>
          </span>
          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className={s.toggle}
              aria-label={isExpanded ? 'بستن زیرمجموعه' : 'باز کردن زیرمجموعه'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown size={14} aria-hidden />
              ) : (
                <ChevronLeft size={14} aria-hidden />
              )}
            </button>
          )}
        </div>

        <div className={s.actions}>
          <button
            type="button"
            onClick={() => setIsEditDialogOpen(true)}
            className={s.actionBtn}
            aria-label={`ویرایش ${category.name}`}
          >
            <Pencil size={13} aria-hidden />
            <span className={s.actionLabel}>ویرایش</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className={cn(s.actionBtn, s.actionBtnDanger)}
            aria-label={`حذف ${category.name}`}
          >
            <Trash2 size={13} aria-hidden />
            <span className={s.actionLabel}>حذف</span>
          </button>
        </div>
      </li>

      {isExpanded && children}

      {isEditDialogOpen && (
        <CategoryForm
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          category={category}
          parentCategories={parentCategories}
        />
      )}

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(o) => !o && setIsDeleteOpen(false)}
        title="حذف دسته‌بندی"
        description={`آیا مطمئن هستید که می‌خواهید دسته‌بندی «${category.name}» را حذف کنید؟ این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </>
  );
}
