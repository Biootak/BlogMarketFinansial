'use client';

import { createCategory, updateCategory } from '@/actions/categoryActions';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
import type {
  ActionResult,
  CreateCategoryInput,
  TaxonomyType,
  UpdateCategoryInput,
} from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2';
import { HiOutlineFolder, HiOutlineLink, HiOutlinePhoto, HiOutlineTag } from 'react-icons/hi2';
import { z } from 'zod';

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="at-form-stack" dir="rtl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="at-field__label">
                <HiOutlineFolder className="at-field__ico at-field__ico--emerald size-4" />
                نام دسته‌بندی
              </FormLabel>
              <FormControl>
                <Input {...field} className="at-input" placeholder="مثلاً: بازار سرمایه" />
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
              <FormLabel className="at-field__label">
                <HiOutlineLink className="at-field__ico at-field__ico--blue size-4" />
                اسلاگ
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  dir="ltr"
                  className="at-input text-left font-mono"
                  placeholder="bazar-sarmaye"
                />
              </FormControl>
              <p className="at-field__hint">
                شناسه‌ی یکتا برای URL — بدون فاصله، حروف لاتین و اعداد
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          name="parentIds"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="at-field__label">
                <HiOutlineTag className="at-field__ico at-field__ico--emerald size-4" />
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
                  <SelectTrigger className="at-input flex items-center h-auto py-2.5">
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
                      <span key={parentId} className="at-pill">
                        {parent.name}
                        <button
                          type="button"
                          onClick={() =>
                            field.onChange((field.value || []).filter((id) => id !== parentId))
                          }
                          className="at-pill__close"
                          aria-label={`حذف ${parent.name}`}
                        >
                          <HiOutlineXMark className="size-3" />
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
              <FormLabel className="at-field__label">
                <HiOutlinePhoto className="at-field__ico at-field__ico--amber size-4" />
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

        <div
          className="at-dialog-foot"
          style={{ marginInlineStart: '-22px', marginInlineEnd: '-22px', marginBottom: '-20px' }}
        >
          <button
            type="button"
            onClick={() => handleDialogOpenChange(false)}
            className="at-btn at-btn--ghost"
            disabled={isSubmitting}
          >
            انصراف
          </button>
          <button type="submit" className="at-btn at-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'در حال ذخیره…' : category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی'}
          </button>
        </div>
      </form>
    </Form>
  );

  // edit-mode: external control
  if (isOpen !== undefined && onClose) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="at-dialog-content max-h-[90vh] w-full max-w-lg p-0 overflow-hidden"
          dir="rtl"
        >
          <div className="at-dialog-header">
            <div className="at-dialog-title">
              <span className="at-dialog-title__ico">
                <HiOutlineFolder className="size-4" />
              </span>
              <div>
                <div>{category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}</div>
                <div className="at-dialog-sub">نام، اسلاگ و والد را تنظیم کنید</div>
              </div>
            </div>
          </div>
          <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
            {formContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // create-mode: trigger button
  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="at-btn at-btn--primary">
          <HiOutlinePlus className="size-4" />
          <span>افزودن دسته‌بندی</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="at-dialog-content max-h-[90vh] w-full max-w-lg p-0 overflow-hidden"
        dir="rtl"
      >
        <div className="at-dialog-header">
          <div className="at-dialog-title">
            <span className="at-dialog-title__ico">
              <HiOutlineFolder className="size-4" />
            </span>
            <div>
              <div>افزودن دسته‌بندی جدید</div>
              <div className="at-dialog-sub">نام، اسلاگ و والد را تنظیم کنید</div>
            </div>
          </div>
        </div>
        <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
