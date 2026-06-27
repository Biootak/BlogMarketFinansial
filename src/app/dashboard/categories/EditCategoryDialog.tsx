'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import type { TaxonomyType, UpdateCategoryInput } from '@/types/types';
import { updateCategory } from '@/actions/categoryActions';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { pickDims } from '@/lib/image-dims';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: TaxonomyType;
  parentCategories: TaxonomyType[];
}

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  thumbnail: z.string().nullable(),
  // 2026-06-21: ابعاد thumbnail
  thumbnailWidth: z.number().int().positive().nullable().optional(),
  thumbnailHeight: z.number().int().positive().nullable().optional(),
  parentIds: z.array(z.string()).default([]),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function EditCategoryDialog({
  isOpen,
  onClose,
  category,
  parentCategories,
}: EditCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail || null,
      thumbnailWidth: category.thumbnailWidth ?? null,
      thumbnailHeight: category.thumbnailHeight ?? null,
      parentIds: category.parentCategories?.map((pc) => pc.id) || [],
    },
  });

  useEffect(() => {
    form.reset({
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail || null,
      thumbnailWidth: category.thumbnailWidth ?? null,
      thumbnailHeight: category.thumbnailHeight ?? null,
      parentIds: category.parentCategories?.map((pc) => pc.id) || [],
    });
  }, [category, form]);

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    const updateData: UpdateCategoryInput = {
      name: data.name,
      slug: data.slug,
      parentIds: data.parentIds,
      thumbnail: data.thumbnail || null,
      thumbnailWidth: data.thumbnailWidth ?? null,
      thumbnailHeight: data.thumbnailHeight ?? null,
    };

    const result = await updateCategory(category.id, updateData);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'موفقیت',
        description: result.message,
        variant: 'success',
      });
      router.refresh();
      onClose();
    } else {
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ویرایش دسته‌بندی</DialogTitle>
        </DialogHeader>
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
                    onValueChange={(value) => field.onChange([...(field.value || []), value])}
                    value={(field.value || [])[(field.value || []).length - 1] || ''}
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
                    {(field.value || []).map((parentId) => {
                      const parent = parentCategories.find((pc) => pc.id === parentId);
                      return parent ? (
                        <span
                          key={parentId}
                          className="inline-block bg-primary-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                        >
                          {parent.name}
                          <button
                            type="button"
                            onClick={() =>
                              field.onChange((field.value || []).filter((id) => id !== parentId))
                            }
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
                      initialPreviews={category.thumbnail ? [category.thumbnail] : []}
                      folder="categories"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
