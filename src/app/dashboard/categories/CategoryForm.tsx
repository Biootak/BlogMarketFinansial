// components/Dashboard/Blog/PostForm/CategoryForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createCategory, updateCategory } from '@/actions/categoryActions';
import ImageUploader from '@/components/ImageUpload/ImageUploader';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ActionResult,
  CreateCategoryInput,
  TaxonomyType,
  UpdateCategoryInput,
} from '@/types/types';
import { z } from 'zod';
import { HiOutlinePlus } from 'react-icons/hi2';

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  thumbnail: z.string().nullable(),
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
      form.reset({
        name: '',
        slug: '',
        thumbnail: null,
        parentIds: [],
      });
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
        };

        let result: ActionResult<TaxonomyType>;
        if (category) {
          result = await updateCategory(category.id, actionData as UpdateCategoryInput);
        } else {
          result = await createCategory(actionData as CreateCategoryInput);
        }

        if (result.success) {
          toast({
            title: 'موفقیت',
            description: result.message,
            variant: 'success',
          });
          router.refresh();
          form.reset();
          setDialogOpen(false);
          if (onClose) onClose();
        } else {
          toast({
            title: 'خطا',
            description: result.message,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('خطا در ارسال فرم:', error);
        toast({
          title: 'خطا',
          description: 'مشکلی در ارسال اطلاعات رخ داد. لطفاً دوباره تلاش کنید.',
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام دسته‌بندی</FormLabel>
              <FormControl>
                <Input {...field} className="text-right" />
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
              <FormLabel>اسلاگ</FormLabel>
              <FormControl>
                <Input {...field} className="text-left" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller
          name="parentIds"
          control={form.control}
          render={({ field }) => {
            console.log('Current field value:', field.value); // لاگ مقدار فعلی فیلد
            return (
              <FormItem>
                <FormLabel>دسته‌بندی‌های والد</FormLabel>
                <Select
                  dir="rtl"
                  onValueChange={(value) => {
                    console.log('Selected value:', value); // لاگ مقدار انتخاب شده
                    const newValue = [...field.value, value];
                    console.log('New field value:', newValue); // لاگ مقدار جدید فیلد
                    field.onChange(newValue);
                  }}
                  value={field.value[field.value.length - 1] || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب دسته‌بندی والد" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parentCategories.map((parentCategory) => (
                      <SelectItem key={parentCategory.id} value={parentCategory.id}>
                        {parentCategory.name} (ID: {parentCategory.id}){' '}
                        {/* اضافه کردن ID به نمایش */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2">
                  {field.value.map((parentId) => {
                    const parent = parentCategories.find((pc) => pc.id === parentId);
                    console.log('Parent found for ID:', parentId, parent); // لاگ برای هر والد پیدا شده
                    return parent ? (
                      <span
                        key={parentId}
                        className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                      >
                        {parent.name} (ID: {parent.id}) {/* اضافه کردن ID به نمایش */}
                        <button
                          type="button"
                          onClick={() => {
                            const newValue = field.value.filter((id) => id !== parentId);
                            console.log('Removing parent, new value:', newValue); // لاگ برای حذف والد
                            field.onChange(newValue);
                          }}
                          className="mr-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تصویر شاخص</FormLabel>
              <FormControl>
                <ImageUploader
                  onImageUpload={(urls) => form.setValue('thumbnail', urls[0] || null)}
                  onImageRemove={() => form.setValue('thumbnail', null)}
                  maxFiles={1}
                  multiple={false}
                  initialPreviews={field.value ? [field.value] : []}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'در حال ذخیره...' : category ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی'}
        </Button>
      </form>
    </Form>
  );

  if (isOpen !== undefined && onClose) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="rtl">
          <DialogHeader>
            <DialogTitle>{category ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-4 sm:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group">
          <HiOutlinePlus
            className="inline-block ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
            aria-hidden="true"
          />
          <span className="group-hover:mr-2 transition-all duration-300">افزودن دسته‌بندی جدید</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rtl">
        <DialogHeader>
          <DialogTitle>افزودن دسته‌بندی جدید</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
