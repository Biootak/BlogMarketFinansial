'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import ImageUploader from '@/components/ImageUpload/ImageUploader';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: TaxonomyType;
  parentCategories: TaxonomyType[];
}

// Define a new type for the form data
type CategoryFormData = {
  name: string;
  slug: string;
  thumbnail: string | null;
  parentId: string;
};

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
    defaultValues: {
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail || null,
      parentId: category.parentCategoryId || '',
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    const updateData: UpdateCategoryInput = {
      name: data.name,
      slug: data.slug,
      parentId: data.parentId === 'none' ? null : data.parentId,
      thumbnail: data.thumbnail || null,
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
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>دسته‌بندی والد</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
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
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
