// app/admin/categories/CategoryForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  parentId: z.string().optional(),
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
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      thumbnail: category?.thumbnail || null,
      parentId: category?.parentCategoryId || undefined,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        thumbnail: category.thumbnail || undefined,
        parentId: category?.parentCategoryId || undefined,
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        thumbnail: undefined,
        parentId: undefined,
      });
    }
  }, [category, form]);

  const onSubmit = async (formData: CategoryFormData) => {
    setIsSubmitting(true);
    let result: ActionResult<TaxonomyType>;

    const baseData = {
      name: formData.name,
      slug: formData.slug,
      parentId:
        formData.parentId === 'none' || formData.parentId === undefined ? null : formData.parentId,
      thumbnail: formData.thumbnail || null,
    };

    try {
      if (category) {
        // اگر در حال ویرایش هستیم
        const updateData: UpdateCategoryInput = baseData;
        result = await updateCategory(category.id, updateData);
      } else {
        // اگر در حال ایجاد دسته‌بندی جدید هستیم
        const createData: CreateCategoryInput = baseData;
        result = await createCategory(createData);
      }

      if (result.success) {
        toast({
          title: 'موفقیت',
          description: result.message,
          variant: 'success',
        });
        router.refresh();
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
  };
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Input {...field} className="text-left" dir="ltr" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller
          name="parentId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>دسته‌بندی والد</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب دسته‌بندی والد" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">بدون والد</SelectItem>
                  {parentCategories.map((parentCategory) => (
                    <SelectItem key={parentCategory.id} value={parentCategory.id}>
                      {parentCategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
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
      <Dialog open={isOpen} onOpenChange={onClose}>
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
    <Dialog>
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
