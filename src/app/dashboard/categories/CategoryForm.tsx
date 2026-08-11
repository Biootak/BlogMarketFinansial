'use client';

import { createCategory, updateCategory } from '@/actions/categoryActions';
import cm from '@/components/Dashboard/primitives/CenterModal.module.css';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { pickDims } from '@/lib/image-dims';
import { cn } from '@/lib/utils';
import type {
  ActionResult,
  CreateCategoryInput,
  TaxonomyType,
  UpdateCategoryInput,
} from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Folder, Image as ImageIcon, Link2, Plus, Tag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import s from './categories.module.css';

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  thumbnail: z.string().nullable(),
  thumbnailWidth: z.number().int().positive().nullable().optional(),
  thumbnailHeight: z.number().int().positive().nullable().optional(),
  parentIds: z.array(z.string()).default([]),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  category?: TaxonomyType;
  parentCategories: TaxonomyType[];
}

/**
 * CategoryForm — افزودن/ویرایش دسته‌بندی.
 *
 * - پوستهٔ دیالوگ: CenterModal مشترک (glass + noise + spring) — نه atelier.
 * - منطق فرم (zod + react-hook-form + ImageUploader) دست‌نخورده.
 */
export function CategoryForm({ isOpen, onClose, category, parentCategories }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(isOpen);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      thumbnail: category?.thumbnail || null,
      parentIds: category?.parentCategories?.map((pc) => pc.id) || [],
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        thumbnail: category.thumbnail || null,
        parentIds: category.parentCategories?.map((pc) => pc.id) || [],
      });
    } else {
      form.reset({ name: '', slug: '', thumbnail: null, parentIds: [] });
    }
  }, [category, form]);

  const onSubmit = useCallback(
    async (formData: CategoryFormData) => {
      setIsSubmitting(true);
      try {
        const actionData: CreateCategoryInput | UpdateCategoryInput = {
          name: formData.name,
          slug: formData.slug,
          parentIds: formData.parentIds,
          thumbnail: formData.thumbnail || null,
          thumbnailWidth: formData.thumbnailWidth ?? null,
          thumbnailHeight: formData.thumbnailHeight ?? null,
        };

        let result: ActionResult<TaxonomyType>;
        if (category) {
          result = await updateCategory(category.id, actionData as UpdateCategoryInput);
        } else {
          result = await createCategory(actionData as CreateCategoryInput);
        }

        if (result.success) {
          toast({ title: 'موفقیت', description: result.message, variant: 'success' });
          router.refresh();
          form.reset();
          setDialogOpen(false);
          if (onClose) onClose();
        } else {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
        }
      } catch {
        // Error handled by action result — no console needed
        toast({
          title: 'خطا',
          description: 'مشکلی در ارسال اطلاعات رخ داد.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [category, toast, router, form, onClose],
  );

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset();
      if (onClose) onClose();
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={s.form} dir="rtl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={s.formLabel}>
                <Folder size={15} className={s.formLabelIco} aria-hidden />
                نام دسته‌بندی
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="مثلاً: بازار سرمایه" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={s.formLabel}>
                <Link2 size={15} className={s.formLabelIco} aria-hidden />
                اسلاگ
              </FormLabel>
              <FormControl>
                <Input {...field} dir="ltr" className="font-mono" placeholder="bazar-sarmaye" />
              </FormControl>
              <p className={s.formHint}>شناسه‌ی یکتا برای URL — بدون فاصله، حروف لاتین و اعداد</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          name="parentIds"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={s.formLabel}>
                <Tag size={15} className={s.formLabelIco} aria-hidden />
                دسته‌بندی‌های والد
              </FormLabel>
              <Select
                dir="rtl"
                onValueChange={(value) => {
                  const currentValue = field.value || [];
                  if (!currentValue.includes(value)) {
                    field.onChange([...currentValue, value]);
                  }
                }}
                value=""
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب دسته‌بندی والد" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parentCategories.map((parentCategory) => (
                    <SelectItem key={parentCategory.id} value={parentCategory.id}>
                      {parentCategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(field.value || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(field.value || []).map((parentId) => {
                    const parent = parentCategories.find((pc) => pc.id === parentId);
                    if (!parent) return null;
                    return (
                      <span key={parentId} className={s.pill}>
                        {parent.name}
                        <button
                          type="button"
                          onClick={() =>
                            field.onChange((field.value || []).filter((id) => id !== parentId))
                          }
                          className={s.pillClose}
                          aria-label={`حذف ${parent.name}`}
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={s.formLabel}>
                <ImageIcon size={15} className={s.formLabelIco} aria-hidden />
                تصویر شاخص
              </FormLabel>
              <FormControl>
                <ImageUploader
                  onImageUpload={(urls) => form.setValue('thumbnail', urls[0] || null)}
                  onUploadComplete={(files) => {
                    const d = pickDims(files);
                    if (!d) return;
                    form.setValue('thumbnailWidth', d.width);
                    form.setValue('thumbnailHeight', d.height);
                  }}
                  onImageRemove={() => {
                    form.setValue('thumbnail', null);
                    form.setValue('thumbnailWidth', null);
                    form.setValue('thumbnailHeight', null);
                  }}
                  maxFiles={1}
                  multiple={false}
                  initialPreviews={field.value ? [field.value] : []}
                  folder="categories"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={s.formFoot}>
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'در حال ذخیره…' : category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی'}
          </Button>
        </div>
      </form>
    </Form>
  );

  // edit-mode: external control
  if (isOpen !== undefined && onClose) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogPortal>
          <DialogOverlay className={cm.overlay} />
          <DialogContentShell
            title={category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}
            sub="نام، اسلاگ و والد را تنظیم کنید"
          >
            {formContent}
          </DialogContentShell>
        </DialogPortal>
      </Dialog>
    );
  }

  // create-mode: trigger button
  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus size={15} aria-hidden />
          <span>افزودن دسته‌بندی</span>
        </Button>
      </DialogTrigger>
      {dialogOpen && (
        <DialogPortal>
          <DialogOverlay className={cm.overlay} />
          <DialogContentShell title="ایجاد دسته‌بندی جدید" sub="نام، اسلاگ و والد را تنظیم کنید">
            {formContent}
          </DialogContentShell>
        </DialogPortal>
      )}
    </Dialog>
  );
}

/**
 * پوستهٔ مرکزی دیالوگ — CenterModal مشترک (glass + noise + spring).
 */
function DialogContentShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Content dir="rtl" className={cm.panel} aria-label={title}>
      <div className={cm.header}>
        <div>
          <div className={s.dialogTitle}>{title}</div>
          <div className={s.dialogSub}>{sub}</div>
        </div>
        <DialogClose asChild>
          <button type="button" className={cn(cm.close)} aria-label="بستن">
            <X size={15} aria-hidden />
          </button>
        </DialogClose>
      </div>
      <div className={cm.body}>{children}</div>
    </DialogPrimitive.Content>
  );
}
