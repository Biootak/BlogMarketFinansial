'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
;




import type { EditorRef } from '@/components/Editor1';

// Dynamic import for Editor - only load when needed
const Editor = dynamic(() => import('@/components/Editor1').then((mod) => mod.Editor), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
});
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { useToast } from '@/components/ui/use-toast';
import { generateSlug } from '@/lib/utils';
import type {
  CreatePostInput,
  PostStatus,
  PostType,
  TaxonomyType,
  UpdatePostInput,
} from '@/types/types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ZodSchema } from 'zod';
import { CategorySelectDialog } from './CategorySelectDialog';
import { TagSelectDialog } from './TagSelectDialog';
import { FileEdit, FileText, Folder, Grid, Image, Link2, Loader2, Music, Plus, Send, Sparkles, Star, Tag, Video, X } from 'lucide-react';

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

const postTypeConfig = {
  STANDARD: { icon: FileText, label: 'استاندارد', color: 'from-slate-500 to-gray-600' },
  VIDEO: { icon: Video, label: 'ویدیو', color: 'from-rose-500 to-pink-600' },
  GALLERY: { icon: Grid, label: 'گالری', color: 'from-violet-500 to-purple-600' },
  AUDIO: { icon: Music, label: 'صوتی', color: 'from-amber-500 to-orange-500' },
};

const PostForm = <T extends CreatePostInput | UpdatePostInput>({
  defaultValues,
  onSubmit,
  title,
  isEditing = false,
  schema,
  categories,
  tags,
  onLoadMoreCategories,
  onLoadMoreTags,
  isLoadingMore,
  totalCategories,
  totalTags,
}: PostFormProps<T>) => {
  const { data: session } = useSession();
  const isAuthor = session?.user?.role === 'AUTHOR';

  const parseContent = (content: string | undefined) => {
    if (!content) return '';
    const trimmed = content.trim();
    if (trimmed.startsWith('<')) return trimmed;
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  };

  const [editorContent, setEditorContent] = useState(defaultValues.content || '');
  const [slug, setSlug] = useState(defaultValues.slug || '');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<EditorRef>(null);
  const [featuredImage, setFeaturedImage] = useState<string | undefined>(
    defaultValues.featuredImage,
  );
  const [activeSection, setActiveSection] = useState<'content' | 'meta' | 'media'>('content');
  const localStorageKey = isEditing ? `post-${defaultValues.slug}` : 'new-post';

  const form = useForm<CreatePostInput | UpdatePostInput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEditing) {
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          form.reset(parsedData);
          setEditorContent(parsedData.content || '');
          setSlug(parsedData.slug || '');
        } catch (e) {
          console.error('Error parsing saved data:', e);
        }
      }
    }
  }, [localStorageKey, form, isEditing]);

  const saveToLocalStorage = useCallback(
    (data: FieldValues) => {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
    },
    [localStorageKey],
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      saveToLocalStorage({ ...value, content: editorContent, slug });
    });
    return () => subscription.unsubscribe();
  }, [form, saveToLocalStorage, editorContent, slug]);

  useEffect(() => {
    if (isEditing && defaultValues.content) {
      form.reset(defaultValues);
      setEditorContent(defaultValues.content);
      setSlug(defaultValues.slug || '');
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(`${localStorageKey}-editor`);
    }
  }, [isEditing, defaultValues, form, localStorageKey]);

  const generateSlugFromTitle = useCallback(
    (title: string) => {
      // فقط در حالت ایجاد پست جدید، اسلاگ خودکار ساخته بشه
      if (!isEditing) {
        const generatedSlug = generateSlug(title);
        setSlug(generatedSlug);
        form.setValue('slug', generatedSlug);
      }
    },
    [form, isEditing],
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

  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data: FieldValues) => {
    try {
      setIsLoading(true);
      let initialStatus: PostStatus = 'PENDING_REVIEW';
      if (session?.user?.role === 'AUTHOR' && saveAsDraft) {
        initialStatus = 'DRAFT';
      } else if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
        initialStatus = saveAsDraft ? 'DRAFT' : 'PUBLISHED';
      }

      const submissionData = {
        ...data,
        content: editorContent,
        slug,
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage,
        status: initialStatus,
      } as T;

      await onSubmit(submissionData);
      toast({
        variant: 'success',
        title: 'موفقیت‌آمیز',
        description: saveAsDraft ? 'پست به عنوان پیش‌نویس ذخیره شد' : 'پست با موفقیت ارسال شد',
      });
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(`${localStorageKey}-editor`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push('/dashboard/posts');
      router.refresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'خطا',
        description: 'خطا در ارسال فرم. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sectionTabs = [
    { id: 'content', label: 'محتوا', icon: FileText },
    { id: 'meta', label: 'تنظیمات', icon: Tag },
    { id: 'media', label: 'رسانه', icon: Image },
  ] as const;

  return (
    <FormProvider {...form}>
      <div className="min-h-screen rtl">
        {/* Subtle ambient background */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
            {/* Mobile: Stack layout */}
            <div className="flex flex-col gap-3 sm:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white">{title}</h1>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setSaveAsDraft(true);
                    form.handleSubmit(handleSubmit)();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors duration-200 text-sm font-medium"
                >
                  <FileEdit className="w-4 h-4" />
                  <span>پیش‌نویس</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setSaveAsDraft(false);
                    form.handleSubmit(handleSubmit)();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ارسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isEditing ? 'به‌روزرسانی' : 'انتشار'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop: Original layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {isEditing ? 'ویرایش و به‌روزرسانی پست' : 'ایجاد محتوای جدید'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setSaveAsDraft(true);
                    form.handleSubmit(handleSubmit)();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors duration-200 font-medium"
                >
                  <FileEdit className="w-4 h-4" />
                  <span>پیش‌نویس</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setSaveAsDraft(false);
                    form.handleSubmit(handleSubmit)();
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-shadow duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال ارسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isEditing ? 'به‌روزرسانی' : 'انتشار پست'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section tabs - Scrollable on mobile */}
            <div className="flex items-center gap-1 mt-4 sm:mt-6 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              {sectionTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium transition-colors duration-200 whitespace-nowrap text-sm sm:text-base ${
                      isActive
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Content Section */}
              <div className={activeSection === 'content' ? 'space-y-6' : 'hidden'}>
                {/* Title */}
                <div className="group">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-shadow duration-200 focus-within:shadow-lg focus-within:shadow-violet-500/5 focus-within:border-violet-500/30">
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="p-6">
                          <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-violet-500" />
                            عنوان پست
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (!isEditing && !slug) generateSlugFromTitle(e.target.value);
                              }}
                              placeholder="عنوان جذاب برای پست..."
                              className="mt-2 text-xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Slug */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem className="p-5">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-violet-500" />
                            اسلاگ (URL)
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            {/* دکمه بازسازی از عنوان */}
                            <button
                              type="button"
                              onClick={() => {
                                const currentTitle = form.getValues('title');
                                if (currentTitle) {
                                  const newSlug = generateSlug(currentTitle);
                                  setSlug(newSlug);
                                  form.setValue('slug', newSlug);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              از عنوان
                            </button>
                          </div>
                        </div>
                        <FormControl dir="ltr">
                          <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-sm text-slate-400 whitespace-nowrap">
                              biotak.ir/post/
                            </span>
                            <Input
                              {...field}
                              value={slug}
                              onChange={(e) => {
                                const newSlug = generateSlug(e.target.value);
                                setSlug(newSlug);
                                field.onChange(newSlug);
                              }}
                              placeholder="اسلاگ را وارد کنید..."
                              className="flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 font-mono text-sm text-violet-600 dark:text-violet-400"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="mt-2 text-xs">
                          اسلاگ را می‌توانید دستی ویرایش کنید یا با دکمه "از عنوان" بازسازی کنید.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Editor */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Editor
                            ref={editorRef}
                            wrapperClassName="flex flex-col min-h-[500px]"
                            contentClassName="flex-1 overflow-auto"
                            toolBarClassName="z-40 inset-x-0 w-full bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b border-slate-200/50 dark:border-slate-700/50 px-4 py-2"
                            footerClassName="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50 px-4 py-2"
                            content={parseContent(editorContent)}
                            localStorageKey={`${localStorageKey}-editor`}
                            editorProps={{
                              attributes: {
                                class:
                                  'py-4 px-4 prose prose-lg prose-violet prose-headings:scroll-mt-[80px] dark:prose-invert max-w-none focus:outline-none min-h-[400px]',
                              },
                            }}
                            onUpdate={({ editor }) => {
                              const json = !editor.isEmpty ? JSON.stringify(editor.getJSON()) : '';
                              setEditorContent(json);
                              field.onChange(json);
                              saveToLocalStorage({ ...form.getValues(), content: json });
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Excerpt */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem className="p-5">
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          خلاصه پست
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="خلاصه‌ای جذاب از محتوای پست..."
                            rows={3}
                            className="mt-2 border-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl resize-none focus-visible:ring-1 focus-visible:ring-violet-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Meta Section */}
              <div
                className={activeSection === 'meta' ? 'grid grid-cols-1 gap-4 sm:gap-6' : 'hidden'}
              >
                {/* Categories */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-500" />
                          دسته‌بندی‌ها
                        </FormLabel>
                        <div className="flex flex-wrap gap-2 mt-3 min-h-[40px]">
                          {field.value?.map((categoryId) => {
                            const category = categories.find((c) => c.id === categoryId);
                            return category ? (
                              <Badge
                                key={categoryId}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                              >
                                {category.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue(
                                      'categories',
                                      field.value?.filter((id) => id !== categoryId) || [],
                                    )
                                  }
                                  className="hover:bg-white/20 rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                        <FormControl>
                          <Button
                            type="button"
                            onClick={() => setIsCategoryDialogOpen(true)}
                            variant="outline"
                            className="w-full mt-3 border-dashed border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            افزودن دسته‌بندی
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-500" />
                          برچسب‌ها
                        </FormLabel>
                        <div className="flex flex-wrap gap-2 mt-3 min-h-[40px]">
                          {field.value?.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() =>
                                  form.setValue('tags', field.value?.filter((t) => t !== tag) || [])
                                }
                                className="hover:bg-white/20 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <FormControl>
                          <Button
                            type="button"
                            onClick={() => setIsTagDialogOpen(true)}
                            variant="outline"
                            className="w-full mt-3 border-dashed border-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            افزودن برچسب
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Post Status */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          وضعیت پست
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={isAuthor ? 'PENDING_REVIEW' : field.value}
                          disabled={isAuthor}
                        >
                          <FormControl>
                            <SelectTrigger className="mt-2 h-12 rounded-xl">
                              <SelectValue placeholder="انتخاب وضعیت" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                پیش‌نویس
                              </div>
                            </SelectItem>
                            <SelectItem value="PENDING_REVIEW">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                در انتظار بررسی
                              </div>
                            </SelectItem>
                            {!isAuthor && (
                              <SelectItem value="PUBLISHED">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                  منتشر شده
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {isAuthor && (
                          <FormDescription className="mt-2 text-xs text-amber-600">
                            پست‌های شما پس از تأیید مدیر منتشر می‌شوند.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Post Type */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <FormField
                    control={form.control}
                    name="postType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          نوع پست
                        </FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
                          {(
                            Object.entries(postTypeConfig) as [
                              PostType,
                              typeof postTypeConfig.STANDARD,
                            ][]
                          ).map(([type, config]) => {
                            const Icon = config.icon;
                            const isSelected = field.value === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => field.onChange(type)}
                                className={`p-3 sm:p-4 rounded-xl border-2 transition-colors duration-200 ${
                                  isSelected
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white mb-1.5 sm:mb-2 mx-auto`}
                                >
                                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <span
                                  className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}
                                >
                                  {config.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Featured toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                            <Star className="w-5 h-5" />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              پست ویژه
                            </FormLabel>
                            <FormDescription className="text-xs">
                              نمایش در بخش ویژه سایت
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Video URL */}
                {form.watch('postType') === 'VIDEO' && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Video className="w-4 h-4 text-rose-500" />
                            آدرس ویدیو
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://..."
                              dir="ltr"
                              className="mt-2 h-12 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Audio URL */}
                {form.watch('postType') === 'AUDIO' && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                    <FormField
                      control={form.control}
                      name="audioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Music className="w-4 h-4 text-amber-500" />
                            آدرس فایل صوتی
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://..."
                              dir="ltr"
                              className="mt-2 h-12 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Media Section */}
              <div className={activeSection === 'media' ? 'space-y-6' : 'hidden'}>
                {/* Featured Image */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 mb-4 sm:mb-6 rounded-t-2xl" />
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
                          <Image className="w-4 h-4 text-violet-500" />
                          تصویر شاخص
                        </FormLabel>
                        <FormControl>
                          <ImageUploader
                            onImageUpload={(urls) => {
                              setFeaturedImage(urls[0]);
                              field.onChange(urls[0]);
                            }}
                            onImageRemove={() => {
                              setFeaturedImage(undefined);
                              field.onChange(undefined);
                            }}
                            maxFiles={1}
                            multiple={false}
                            initialPreviews={featuredImage ? [featuredImage] : []}
                            folder="posts"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Gallery Images - only show when post type is GALLERY */}
                {form.watch('postType') === 'GALLERY' && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 mb-4 sm:mb-6 rounded-t-2xl" />
                    <FormField
                      control={form.control}
                      name="galleryImages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
                            <Grid className="w-4 h-4 text-emerald-500" />
                            گالری تصاویر
                          </FormLabel>
                          <FormControl>
                            <ImageUploader
                              onImageUpload={(urls) =>
                                field.onChange([...(field.value ?? []), ...urls])
                              }
                              onImageRemove={(index) => {
                                const newValue = [...(field.value ?? [])];
                                newValue.splice(index, 1);
                                field.onChange(newValue);
                              }}
                              multiple
                              maxFiles={20}
                              initialPreviews={field.value ?? []}
                              folder="posts"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>

        {/* Dialogs */}
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
      </div>
    </FormProvider>
  );
};

export default PostForm;
