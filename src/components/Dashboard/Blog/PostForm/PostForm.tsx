'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast, useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { FiPlus, FiX } from 'react-icons/fi';
import { RiSendPlaneFill } from 'react-icons/ri';
import { BiLoaderAlt } from 'react-icons/bi';

import { Badge } from '@/components/ui/badge';
const TipTapEditor = dynamic(() => import('@/components/Dashboard/Blog/PostForm/Editor/Editor'), {
  ssr: false,
});
import Input from '@/components/Input/Input';
import { Button } from '@/components/ui/button';
import Textarea from '@/components/Textarea/Textarea';
import ImageUploader from '../../../ImageUpload/ImageUploader';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { CreatePostInput, UpdatePostInput } from '@/types/types';

import type { ZodSchema } from 'zod';
import { Switch } from '@/components/ui/switch';
import dynamic from 'next/dynamic';
import { generateSlug, sanitizeSlug } from '@/lib/utils';
import { CreatePostSchema, UpdatePostSchema } from '@/schemas';

const MAX_CATEGORIES = 5;
const MAX_TAGS = 10;
const MAX_LENGTH = 50;

interface PostFormProps {
  schema: ZodSchema<CreatePostInput | UpdatePostInput>;
  defaultValues: CreatePostInput | UpdatePostInput;
  onSubmit: (data: CreatePostInput | UpdatePostInput) => Promise<void>;
  title: string;
  isEditing?: boolean;
}

const PostForm: React.FC<PostFormProps> = ({
  defaultValues,
  onSubmit,
  title,
  isEditing = false,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>(defaultValues.categories || []);
  const [tags, setTags] = useState<string[]>(defaultValues.tags || []);
  const [editorContent, setEditorContent] = useState(defaultValues.content || '');
  const [slug, setSlug] = useState(defaultValues.slug || '');

  const form = useForm<CreatePostInput | UpdatePostInput>({
    resolver: zodResolver(isEditing ? UpdatePostSchema : CreatePostSchema),
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

  const resetForm = useCallback(() => {
    form.reset();
    setEditorContent('');
    localStorage.removeItem('editorContent');
  }, [form]);

  const handleSubmit = useCallback(
    async (data: CreatePostInput | UpdatePostInput) => {
      setIsSubmitting(true);
      try {
        await onSubmit({ ...data, content: editorContent });
        resetForm();
        router.push('/dashboard/posts');
      } catch (error) {
        console.error('خطا در ایجاد/ویرایش پست:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, editorContent, resetForm, router],
  );

  const addItem = useCallback(
    (item: string, type: 'category' | 'tag') => {
      const trimmedItem = item.trim();
      if (trimmedItem) {
        if (trimmedItem.length > MAX_LENGTH) {
          toast({
            title: 'خطا',
            description: `${type === 'category' ? 'دسته‌بندی' : 'تگ'} نمی‌تواند بیشتر از ${MAX_LENGTH} کاراکتر باشد.`,
            variant: 'destructive',
          });
          return;
        }

        if (type === 'category') {
          if (categories.length >= MAX_CATEGORIES) {
            toast({
              title: 'خطا',
              description: `نمی‌توانید بیش از ${MAX_CATEGORIES} دسته‌بندی اضافه کنید.`,
              variant: 'destructive',
            });
            return;
          }
          if (!categories.includes(trimmedItem)) {
            setCategories((prev) => [...prev, trimmedItem]);
            form.setValue('categories', [...categories, trimmedItem]);
          }
        } else {
          if (tags.length >= MAX_TAGS) {
            toast({
              title: 'خطا',
              description: `نمی‌توانید بیش از ${MAX_TAGS} تگ اضافه کنید.`,
              variant: 'destructive',
            });
            return;
          }
          if (!tags.includes(trimmedItem)) {
            setTags((prev) => [...prev, trimmedItem]);
            form.setValue('tags', [...tags, trimmedItem]);
          }
        }
      }
    },
    [categories, tags, form, toast],
  );

  const removeItem = useCallback(
    (item: string, type: 'category' | 'tag') => {
      if (type === 'category') {
        setCategories((prev) => prev.filter((c) => c !== item));
        form.setValue(
          'categories',
          categories.filter((c) => c !== item),
        );
      } else {
        setTags((prev) => prev.filter((t) => t !== item));
        form.setValue(
          'tags',
          tags.filter((t) => t !== item),
        );
      }
    },
    [categories, tags, form],
  );

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <FormField
              control={form.control}
              name="categories"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    دسته‌بندی‌ها
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="rtl bg-primary-100 text-primary-800 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeItem(category, 'category')}
                          className="mr-1 sm:mr-2 text-red-500 hover:text-red-700 transition duration-200"
                        >
                          <FiX />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        placeholder="دسته‌بندی جدید"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem(e.currentTarget.value, 'category');
                            e.currentTarget.value = '';
                          }
                        }}
                        className="rtl text-sm sm:text-base p-2 sm:p-3 border-2 border-gray-300 focus:border-primary-500 rounded-lg transition duration-200 flex-grow"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="دسته‌بندی جدید"]',
                          ) as HTMLInputElement;
                          addItem(input.value, 'category');
                          input.value = '';
                        }}
                        className="mr-2 p-2 sm:p-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition duration-200 flex items-center"
                      >
                        <FiPlus className="ml-1" />
                        <span className="hidden sm:inline">افزودن</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    برچسب‌ها
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rtl bg-secondary-100 text-secondary-800 text-xs sm:text-sm px-2 sm:px-3 py-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeItem(tag, 'tag')}
                          className="mr-1 sm:mr-2 text-red-500 hover:text-red-700 transition duration-200"
                        >
                          <FiX />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        placeholder="برچسب جدید"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem(e.currentTarget.value, 'tag');
                            e.currentTarget.value = '';
                          }
                        }}
                        className="rtl text-sm sm:text-base p-2 sm:p-3 border-2 border-gray-300 focus:border-primary-500 rounded-lg transition duration-200 flex-grow"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="برچسب جدید"]',
                          ) as HTMLInputElement;
                          addItem(input.value, 'tag');
                          input.value = ' ';
                        }}
                        className="mr-2 p-2 sm:p-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition duration-200 flex items-center"
                      >
                        <FiPlus className="ml-1" />
                        <span className="hidden sm:inline">افزودن</span>
                      </Button>
                    </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
    </motion.div>
  );
};

export default PostForm;
