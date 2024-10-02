'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, type FieldValues, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FiX, FiPlus } from 'react-icons/fi';
import { RiSendPlaneFill } from 'react-icons/ri';
import { BiLoaderAlt } from 'react-icons/bi';

import type {
  CreatePostInput,
  UpdatePostInput,
  TaxonomyType,
  PostType,
  PostStatus,
} from '@/types/types';
import type { ZodSchema } from 'zod';
import { generateSlug, sanitizeSlug } from '@/lib/utils';
import { CategorySelectDialog } from './CategorySelectDialog';
import { TagSelectDialog } from './TagSelectDialog';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { Editor } from '@/components/Editor1';

interface PostFormProps<T extends CreatePostInput | UpdatePostInput> {
  schema: ZodSchema<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<void>;
  title: string;
  isEditing?: boolean;
  isSubmitting: boolean;
  categories: TaxonomyType[];
  tags: TaxonomyType[];
  onLoadMoreCategories: () => Promise<void>;
  onLoadMoreTags: () => Promise<void>;
  isLoadingMore: boolean;
  totalCategories: number;
  totalTags: number;
}

const PostForm = <T extends CreatePostInput | UpdatePostInput>({
  defaultValues,
  onSubmit,
  title,
  isEditing = false,
  schema,
  isSubmitting,
  categories,
  tags,
  onLoadMoreCategories,
  onLoadMoreTags,
  isLoadingMore,
  totalCategories,
  totalTags,
}: PostFormProps<T>) => {
  const [editorContent, setEditorContent] = useState(defaultValues.content || '');
  const [slug, setSlug] = useState(defaultValues.slug || '');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreatePostInput | UpdatePostInput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      form.reset(defaultValues);
      setEditorContent(defaultValues.content || '');
      setSlug(defaultValues.slug || '');
    }
  }, [isEditing, defaultValues, form]);

  const generateSlugFromTitle = useCallback(
    (title: string) => {
      const generatedSlug = generateSlug(title);
      setSlug(generatedSlug);
      form.setValue('slug', generatedSlug);
    },
    [form],
  );

  const handleSelectCategories = useCallback(
    (selectedCategories: string[]) => {
      form.setValue('categories', selectedCategories);
    },
    [form],
  );

  const handleSelectTags = useCallback(
    (selectedTags: string[]) => {
      form.setValue('tags', selectedTags);
    },
    [form],
  );

  const handleSubmit = async (data: FieldValues) => {
    try {
      const submissionData = {
        ...data,
        content: editorContent,
        slug: slug,
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
      } as T;
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در ارسال فرم رخ داد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  return (
    <FormProvider {...form}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 rtl my-4 sm:my-6 md:my-8 w-full max-w-[95%] sm:max-w-[90%] md:max-w-4xl"
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-center text-gray-800 dark:text-white">
          {title}
        </h1>
        {/* Editor component outside the form */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Editor
                  wrapperClassName="flex flex-col h-full "
                  contentClassName="h-full overflow-auto"
                  toolBarClassName="z-50 inset-x-0 w-full bg-toolbar sticky top-0"
                  footerClassName="bg-toolbar"
                  content={editorContent}
                  editorProps={{
                    attributes: {
                      class:
                        'py-6 px-8 prose prose-base prose-blue prose-headings:scroll-mt-[80px] dark:prose-invert',
                    },
                  }}
                  onUpdate={({ editor }) => {
                    const html = !editor.isEmpty ? editor.getHTML() : '';
                    setEditorContent(html);
                    field.onChange(html);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 sm:space-y-6 md:space-y-8"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان پست</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!isEditing && !slug) {
                          generateSlugFromTitle(e.target.value);
                        }
                      }}
                      placeholder="عنوان پست را وارد کنید"
                    />
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
                    <Input
                      {...field}
                      value={slug}
                      onChange={(e) => {
                        const newSlug = sanitizeSlug(e.target.value);
                        setSlug(newSlug);
                        field.onChange(newSlug);
                      }}
                      placeholder="اسلاگ را وارد کنید"
                    />
                  </FormControl>
                  <FormDescription>
                    اسلاگ به صورت خودکار ایجاد می‌شود، اما می‌توانید آن را تغییر دهید.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>خلاصه پست</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="خلاصه‌ای از پست را وارد کنید" rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>دسته‌بندی‌ها</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value?.map((categoryId) => {
                        const category = categories.find((c) => c.id === categoryId);
                        return category ? (
                          <Badge
                            key={categoryId}
                            variant="secondary"
                            className="bg-primary-100 text-primary-800 text-xs px-2 py-1"
                          >
                            {category.name}
                            <button
                              type="button"
                              onClick={() => {
                                const newCategories =
                                  field.value?.filter((id) => id !== categoryId) || [];
                                form.setValue('categories', newCategories);
                              }}
                              className="mr-1 text-red-500 hover:text-red-700"
                            >
                              <FiX />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        onClick={() => setIsCategoryDialogOpen(true)}
                        className="w-full justify-center text-sm"
                        variant="outline"
                      >
                        انتخاب دسته‌بندی‌ها
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>برچسب‌ها</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value?.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-secondary-100 text-secondary-800 text-xs px-2 py-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = field.value?.filter((t) => t !== tag) || [];
                              form.setValue('tags', newTags);
                            }}
                            className="mr-1 text-red-500 hover:text-red-700"
                          >
                            <FiX />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        onClick={() => setIsTagDialogOpen(true)}
                        className="w-full justify-center text-sm"
                        variant="outline"
                      >
                        انتخاب برچسب‌ها
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="featuredImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تصویر شاخص پست</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onImageUpload={(urls) => field.onChange(urls[0])}
                      onImageRemove={() => field.onChange(undefined)}
                      maxFiles={1}
                      multiple={false}
                      initialPreviews={field.value ? [field.value] : []}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="galleryImages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>گالری تصاویر</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onImageUpload={(urls) => {
                        field.onChange([...(field.value ?? []), ...urls]);
                      }}
                      onImageRemove={(index) => {
                        const newValue = [...(field.value ?? [])];
                        newValue.splice(index, 1);
                        field.onChange(newValue);
                      }}
                      multiple
                      maxFiles={10}
                      initialPreviews={field.value ?? []}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وضعیت پست</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب وضعیت" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                        <SelectItem value="PENDING_REVIEW">در انتظار بررسی</SelectItem>
                        <SelectItem value="PUBLISHED">منتشر شده</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع پست</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب نوع پست" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STANDARD">استاندارد</SelectItem>
                        <SelectItem value="VIDEO">ویدیو</SelectItem>
                        <SelectItem value="GALLERY">گالری</SelectItem>
                        <SelectItem value="AUDIO">صوتی</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('postType') === 'VIDEO' && (
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>آدرس ویدیو</FormLabel>
                    <FormControl>
                      <Input placeholder="آدرس ویدیو را وارد کنید" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('postType') === 'AUDIO' && (
              <FormField
                control={form.control}
                name="audioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>آدرس فایل صوتی</FormLabel>
                    <FormControl>
                      <Input placeholder="آدرس فایل صوتی را وارد کنید" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel>پست ویژه</FormLabel>
                    <FormDescription>این پست را به عنوان پست ویژه نمایش دهید</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
            >
              {isSubmitting ? (
                <>
                  <BiLoaderAlt className="animate-spin h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="mr-2">در حال ارسال</span>
                </>
              ) : (
                <>
                  <RiSendPlaneFill className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="mr-2">{isEditing ? 'به‌روزرسانی پست' : 'ارسال پست'}</span>
                </>
              )}
            </Button>
          </form>
        </Form>

        <CategorySelectDialog
          isOpen={isCategoryDialogOpen}
          onClose={() => setIsCategoryDialogOpen(false)}
          onSelectCategories={handleSelectCategories}
          initialSelectedCategories={form.getValues('categories') || []}
          categories={categories}
          onLoadMore={onLoadMoreCategories}
          isLoading={isLoadingMore}
          hasMoreItems={categories.length < totalCategories}
        />

        <TagSelectDialog
          isOpen={isTagDialogOpen}
          onClose={() => setIsTagDialogOpen(false)}
          onSelectTags={handleSelectTags}
          initialSelectedTags={form.getValues('tags') || []}
          tags={tags}
          onLoadMore={onLoadMoreTags}
          isLoading={isLoadingMore}
          hasMoreItems={tags.length < totalTags}
        />
      </motion.div>
    </FormProvider>
  );
};

export default PostForm;
