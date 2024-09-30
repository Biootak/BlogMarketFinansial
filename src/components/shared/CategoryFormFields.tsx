'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import type { TaxonomyType } from '@/types/types';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  thumbnail: z.string().nullable(),
  parentIds: z.array(z.string()).default([]),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormFieldsProps {
  category?: TaxonomyType;
  parentCategories: TaxonomyType[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function CategoryFormFields({
  category,
  parentCategories,
  onSubmit,
  isSubmitting,
}: CategoryFormFieldsProps) {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      thumbnail: category?.thumbnail || null,
      parentIds: category?.parentCategories?.map((pc) => pc.id) || [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام دسته‌بندی</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
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
              <FormLabel>دسته‌بندی‌های والد</FormLabel>
              <Select
                onValueChange={(value) => field.onChange([...field.value, value])}
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
                      {parentCategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                {field.value.map((parentId) => {
                  const parent = parentCategories.find((pc) => pc.id === parentId);
                  return parent ? (
                    <span
                      key={parentId}
                      className="inline-block bg-primary-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                    >
                      {parent.name}
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value.filter((id) => id !== parentId))}
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
                  onImageUpload={(urls) => form.setValue('thumbnail', urls[0])}
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
}
