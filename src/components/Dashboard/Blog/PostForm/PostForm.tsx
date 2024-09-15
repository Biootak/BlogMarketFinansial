'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
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
import { FiX } from 'react-icons/fi';
import { RiSendPlaneFill } from 'react-icons/ri';
import { BiLoaderAlt } from 'react-icons/bi';
import dynamic from 'next/dynamic';
import ImageUploader from '@/components/ImageUpload/ImageUploader';
import type { CreatePostInput, UpdatePostInput, TaxonomyType } from '@/types/types';
import type { ZodSchema } from 'zod';
import { generateSlug, sanitizeSlug } from '@/lib/utils';
import { CategorySelectDialog } from './CategorySelectDialog';
import { TagSelectDialog } from './TagSelectDialog';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';

const TipTapEditor = dynamic(() => import('@/components/Dashboard/Blog/PostForm/Editor/Editor'), {
  ssr: false,
});

interface PostFormProps {
  schema: ZodSchema<CreatePostInput | UpdatePostInput>;
  defaultValues: CreatePostInput | UpdatePostInput;
  onSubmit: (data: CreatePostInput | UpdatePostInput) => Promise<void>;
  title: string;
  isEditing?: boolean;
  isSubmitting: boolean;
  initialCategories: TaxonomyType[];
  initialTags: TaxonomyType[];
}

const PostForm: React.FC<PostFormProps> = ({
  defaultValues,
  onSubmit,
  title,
  isEditing = false,
  schema,
  isSubmitting,
  initialCategories,
  initialTags,
}) => {
  const [_editorContent, setEditorContent] = useState(defaultValues.content || '');
  const [slug, setSlug] = useState(defaultValues.slug || '');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [isPending, startTransition] = useTransition();
  const [hasMoreCategories, setHasMoreCategories] = useState(true);
  const [hasMoreTags, setHasMoreTags] = useState(true);
  const [categoryPage, setCategoryPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);

  const form = useForm<CreatePostInput | UpdatePostInput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const generateSlugFromTitle = useCallback(
    (title: string) => {
      const generatedSlug = generateSlug(title);
      setSlug(generatedSlug);
      form.setValue('slug', generatedSlug);
    },
    [form],
  );

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = sanitizeSlug(e.target.value);
    setSlug(newSlug);
    form.setValue('slug', newSlug);
  };

  const handleSelectCategories = (selectedCategories: string[]) => {
    form.setValue('categories', selectedCategories);
  };

  const handleSelectTags = (selectedTags: string[]) => {
    form.setValue('tags', selectedTags);
  };

  const loadMoreCategories = useCallback(() => {
    startTransition(async () => {
      const nextPage = categoryPage + 1;
      const result = await getCategories({ limit: 10, page: nextPage });
      if (result.success && result.data) {
        setCategories((prev) => [...prev, ...result.data.categories]);
        setCategoryPage(nextPage);
        setHasMoreCategories(result.data.categories.length === 10);
      }
    });
  }, [categoryPage]);

  const loadMoreTags = useCallback(() => {
    startTransition(async () => {
      const nextPage = tagPage + 1;
      const result = await getTags({ limit: 10, page: nextPage });
      if (result.success && result.data) {
        setTags((prev) => [...prev, ...result.data.tags]);
        setTagPage(nextPage);
        setHasMoreTags(result.data.tags.length === 10);
      }
    });
  }, [tagPage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 rtl my-4 sm:my-6 md:my-8 w-full max-w-[95%] sm:max-w-[90%] md:max-w-4xl"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-center text-gray-800 dark:text-white">
        {title}
      </h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 sm:space-y-6 md:space-y-8"
        >
          {/* Title Field */}
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

          {/* Slug Field */}
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسلاگ</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="اسلاگ را وارد کنید"
                    value={slug}
                    onChange={handleSlugChange}
                  />
                </FormControl>
                <FormDescription>
                  اسلاگ به صورت خودکار ایجاد می‌شود، اما می‌توانید آن را تغییر دهید.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Excerpt Field */}
          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                  خلاصه پست
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="rtl border-2 border-gray-300 focus:border-primary-500 rounded-lg transition duration-200"
                    placeholder="خلاصه‌ای از پست را وارد کنید"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categories and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Categories Field */}
            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    دسته‌بندی‌ها
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {field.value?.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="rtl bg-primary-100 text-primary-800 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => {
                            const newCategories = field.value?.filter((c) => c !== category) || [];
                            form.setValue('categories', newCategories);
                          }}
                          className="mr-1 sm:mr-2 text-red-500 hover:text-red-700 transition duration-200"
                        >
                          <FiX />
                        </button>
                      </Badge>
                    ))}
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

            {/* Tags Field */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    برچسب‌ها
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {field.value?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rtl bg-secondary-100 text-secondary-800 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = field.value?.filter((t) => t !== tag) || [];
                            form.setValue('tags', newTags);
                          }}
                          className="mr-1 sm:mr-2 text-red-500 hover:text-red-700 transition duration-200"
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

          {/* Featured Image Field */}
          <FormField
            control={form.control}
            name="featuredImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                  تصویر شاخص پست
                </FormLabel>
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

          {/* Gallery Images Field */}
          <FormField
            control={form.control}
            name="galleryImages"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                  گالری تصاویر
                </FormLabel>
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

          {/* Content Field */}
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                  محتوای پست
                </FormLabel>
                <FormControl>
                  <TipTapEditor
                    content={field.value}
                    onChange={(newContent) => {
                      field.onChange(newContent);
                      setEditorContent(newContent);
                    }}
                    isRTL={true}
                    className="min-h-[200px] sm:min-h-[300px] md:min-h-[400px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Post Status and Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Post Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    وضعیت پست
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger dir="rtl" className="w-full">
                        <SelectValue placeholder="انتخاب وضعیت" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                      <SelectItem value="PENDING_REVIEW">در انتظار بررسی</SelectItem>
                      <SelectItem value="PUBLISHED">منتشر شده</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Post Type Field */}
            <FormField
              control={form.control}
              name="postType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    نوع پست
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger dir="rtl">
                        <SelectValue placeholder="انتخاب نوع پست" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
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

          {/* Video URL Field (Conditional) */}
          {form.watch('postType') === 'VIDEO' && (
            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    آدرس ویدیو
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="آدرس ویدیو را وارد کنید" {...field} className="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Audio URL Field (Conditional) */}
          {form.watch('postType') === 'AUDIO' && (
            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    آدرس فایل صوتی
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="آدرس فایل صوتی را وارد کنید" {...field} className="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Is Featured Field */}
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm sm:text-base">پست ویژه</FormLabel>
                  <FormDescription className="text-xs sm:text-sm">
                    این پست را به عنوان پست ویژه نمایش دهید
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Submit Button */}
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

      {/* Category Select Dialog */}
      <CategorySelectDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onSelectCategories={handleSelectCategories}
        initialSelectedCategories={form.getValues('categories') || []}
        categories={categories}
        onLoadMore={loadMoreCategories}
        isLoading={isPending}
        hasNextPage={hasMoreCategories}
      />

      <TagSelectDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSelectTags={handleSelectTags}
        initialSelectedTags={form.getValues('tags') || []}
        tags={tags}
        onLoadMore={loadMoreTags}
        isLoading={isPending}
        hasNextPage={hasMoreTags}
      />
    </motion.div>
  );
};

export default PostForm;
