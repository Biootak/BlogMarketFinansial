'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HiOutlinePlus } from 'react-icons/hi2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createCategory, updateCategory } from '@/actions/categoryActions';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { pickDims } from '@/lib/image-dims';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ActionResult, CreateCategoryInput, TaxonomyType, UpdateCategoryInput } from '@/types/types';
import { z } from 'zod';
import { PrimaryActionButton } from '@/components/Dashboard/shared/DashboardTableWrapper';

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  thumbnail: z.string().nullable(),
  // 2026-06-21: ابعاد thumbnail برای CLS-safe رندر
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
      } catch (error) {
        console.error('خطا در ارسال فرم:', error);
        toast({ title: 'خطا', description: 'مشکلی در ارسال اطلاعات رخ داد.', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [category, toast, router, form, onClose]
  );

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset();
      if (onClose) onClose();
    }
  };

  const inputClassName = 'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" dir="rtl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نام دسته‌بندی</FormLabel>
              <FormControl>
                <Input {...field} className={inputClassName} />
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
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">اسلاگ</FormLabel>
              <FormControl>
                <Input {...field} className={`${inputClassName} text-left`} dir="ltr" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller
          name="parentIds"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">دسته‌بندی‌های والد</FormLabel>
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
                  <SelectTrigger className={inputClassName}>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {(field.value || []).map((parentId) => {
                  const parent = parentCategories.find((pc) => pc.id === parentId);
                  return parent ? (
                    <span
                      key={parentId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    >
                      {parent.name}
                      <button
                        type="button"
                        onClick={() => field.onChange((field.value || []).filter((id) => id !== parentId))}
                        className="rounded-full p-0.5 transition-colors hover:bg-primary-200 dark:hover:bg-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تصویر شاخص</FormLabel>
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
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 py-3 font-medium text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl disabled:opacity-50"
          >
            {isSubmitting ? 'در حال ذخیره...' : category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی'}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isOpen !== undefined && onClose) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
          <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">{formContent}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <PrimaryActionButton>
          <HiOutlinePlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span>افزودن دسته‌بندی</span>
        </PrimaryActionButton>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
        <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
          <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            افزودن دسته‌بندی جدید
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">{formContent}</div>
      </DialogContent>
    </Dialog>
  );
}
