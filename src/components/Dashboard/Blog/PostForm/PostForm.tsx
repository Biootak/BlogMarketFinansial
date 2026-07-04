'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useForm, type FieldValues, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FiX, FiPlus, FiImage, FiVideo, FiMusic, FiGrid, FiFileText, FiTag, FiFolder, FiLink, FiStar } from 'react-icons/fi';
import { RiSendPlaneFill, RiDraftLine } from 'react-icons/ri';
import { BiLoaderAlt } from 'react-icons/bi';
import { HiOutlineSparkles, HiOutlineArrowPath } from 'react-icons/hi2';
import { PersianDateTimePicker } from '@/components/ui/PersianDateTimePicker';

import type { CreatePostInput, UpdatePostInput, TaxonomyType, PostType, PostStatus } from '@/types/types';
import type { ZodType } from 'zod';
import { generateSlug } from '@/lib/utils';
import { CategorySelectDialog } from './CategorySelectDialog';
import { TagSelectDialog } from './TagSelectDialog';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { pickDims } from '@/lib/image-dims';
// 2026-06-14: Tiptap editor (~150KB gzipped) was eagerly imported into
// the dashboard post-form chunk. Lazy-loading it shaves ~100ms off the
// initial dashboard TTFB, especially on the posts list page that pulls
// in the same chunk via barrel imports. The editor still ships in the
// route bundle, just not in the first paint.
import type { EditorRef } from '@/components/Editor1';
const Editor = dynamic(
  () => import('@/components/Editor1/editor').then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="at-editor-skeleton" aria-hidden />,
  },
);
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// 2026-07-04: کمک‌کننده برای تعیین وضعیت نهایی پست بر اساس نقش +
// scheduledAt + نوع دکمه. این منبع حقیقت است؛ سرور (`createPost`/`updatePost`)
// همین منطق را با نقش کاربر اعمال می‌کند، ولی فرم برای نمایش فوری
// به آن نیاز دارد.
// 2026-07-04: `SCHEDULED` به enum اضافه شد؛ تایپ اینجا نیاز به
// به‌روزرسانی داشت چون PostStatus حالا شامل SCHEDULED هم هست.
function deriveStatus(args: {
  role: string | undefined;
  saveAsDraft: boolean;
  scheduledAt: Date | null;
}): PostStatus {
  const { role, saveAsDraft, scheduledAt } = args;
  if (saveAsDraft) return 'DRAFT';
  const isFuture = scheduledAt && scheduledAt.getTime() > Date.now();
  if (isFuture) {
    return role === 'AUTHOR' ? 'PENDING_REVIEW' : 'SCHEDULED';
  }
  return role === 'AUTHOR' ? 'PENDING_REVIEW' : 'PUBLISHED';
}

// تبدیل Date → تقویم شمسی و زمان اکنون در `PersianDateTimePicker` انجام می‌شود.

interface PostFormProps<T extends CreatePostInput | UpdatePostInput> {
  // 2026-07-04: `ZodType<T, any, any>` تا input متفاوت با output
  // (مثلاً scheduledAt: `string|Date` در ورودی، `Date|null` در خروجی)
  // مجاز باشد. `ZodSchema<T>` فقط یه type alias برای `ZodType<T>` است
  // که input و output را یکی فرض می‌کند و با transform نمی‌سازد.
  schema: ZodType<T, any, any>;
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
  STANDARD: { icon: FiFileText, label: 'استاندارد' },
  VIDEO: { icon: FiVideo, label: 'ویدیو' },
  GALLERY: { icon: FiGrid, label: 'گالری' },
  AUDIO: { icon: FiMusic, label: 'صوتی' },
} as const;

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
      try { return JSON.parse(trimmed); } catch { return trimmed; }
    }
    return trimmed;
  };

  const [editorContent, setEditorContent] = useState(defaultValues.content || '');
  const [slug, setSlug] = useState(defaultValues.slug || '');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<EditorRef>(null);
  const [featuredImage, setFeaturedImage] = useState<string | undefined>(defaultValues.featuredImage);
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
    (data: FieldValues) => { localStorage.setItem(localStorageKey, JSON.stringify(data)); },
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

  const generateSlugFromTitle = useCallback((title: string) => {
    // فقط در حالت ایجاد پست جدید، اسلاگ خودکار ساخته بشه
    if (!isEditing) {
      const generatedSlug = generateSlug(title);
      setSlug(generatedSlug);
      form.setValue('slug', generatedSlug);
    }
  }, [form, isEditing]);

  const handleSelectCategories = useCallback((selectedCategories: string[]) => {
    form.setValue('categories', selectedCategories);
  }, [form]);

  const handleSelectTags = useCallback((selectedTags: string[]) => {
    form.setValue('tags', selectedTags);
  }, [form]);

  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 2026-07-04: scheduledAt به‌صورت محلی نگه داشته می‌شود تا با
  // input کنترل نشدهٔ datetime-local سازگار باشد. موقع submit در
  // data تزریق می‌شود.
  const [scheduledAt, setScheduledAt] = useState<Date | null>(
    defaultValues.scheduledAt
      ? defaultValues.scheduledAt instanceof Date
        ? defaultValues.scheduledAt
        : new Date(defaultValues.scheduledAt)
      : null,
  );
  const router = useRouter();

  const handleSubmit = async (data: FieldValues) => {
    try {
      setIsLoading(true);
      // 2026-07-04: وضعیت نهایی بر اساس نقش + scheduledAt + دکمه.
      const finalStatus: PostStatus = deriveStatus({
        role: session?.user?.role,
        saveAsDraft,
        scheduledAt,
      });

      const submissionData = {
        ...data, content: editorContent, slug,
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage, status: finalStatus,
        // scheduledAt فقط وقتی معتبر است که saveAsDraft نباشد.
        // اگر draft ذخیره شود، scheduledAt را null می‌فرستیم تا
        // پیش‌نویس بدون برنامه باشد.
        scheduledAt: saveAsDraft ? null : scheduledAt,
      } as T;

      await onSubmit(submissionData);
      const toastDesc = saveAsDraft
        ? 'پست به عنوان پیش‌نویس ذخیره شد'
        : scheduledAt && scheduledAt.getTime() > Date.now()
          ? 'پست برای انتشار در تاریخ انتخاب‌شده زمان‌بندی شد'
          : 'پست با موفقیت ارسال شد';
      toast({ variant: 'success', title: 'موفقیت‌آمیز', description: toastDesc });
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(`${localStorageKey}-editor`);
      await new Promise(resolve => setTimeout(resolve, 300));
      router.push('/dashboard/posts');
      router.refresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({ title: 'خطا', description: 'خطا در ارسال فرم. لطفاً دوباره تلاش کنید.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const sectionTabs = [
    { id: 'content' as const, label: 'محتوا', icon: FiFileText },
    { id: 'meta' as const, label: 'تنظیمات', icon: FiTag },
    { id: 'media' as const, label: 'رسانه', icon: FiImage },
  ];

  // شمارنده‌های تب‌ها — به خواننده حس تکمیل بودن می‌دهند.
  const titleValue = (form.watch('title') as string | undefined) ?? '';
  const excerptValue = (form.watch('excerpt') as string | undefined) ?? '';
  const contentNonEmpty = !!editorContent && editorContent !== '<p></p>';
  const contentCount =
    (titleValue.trim() ? 1 : 0) +
    (slug.trim() ? 1 : 0) +
    (contentNonEmpty ? 1 : 0) +
    (excerptValue.trim() ? 1 : 0);
  const categoryCount = (form.watch('categories') as string[] | undefined)?.length ?? 0;
  const tagCount = (form.watch('tags') as string[] | undefined)?.length ?? 0;
  const hasFeatured = !!featuredImage;
  const postType = (form.watch('postType') as PostType | undefined) ?? 'STANDARD';
  const hasMediaType = postType === 'GALLERY' || postType === 'VIDEO' || postType === 'AUDIO';
  const mediaCount =
    (hasFeatured ? 1 : 0) +
    (hasMediaType ? 1 : 0);

  return (
    <FormProvider {...form}>
      <>
        {/* ─── Header (sticky) ─── */}
        <div className="at-form-header">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="at-head__ico" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-[color:var(--at-fg)] truncate">
                  {title}
                </h1>
                <p className="text-xs text-[color:var(--at-fg-subtle)] mt-0.5 truncate">
                  {isEditing ? 'ویرایش و به‌روزرسانی پست' : 'ایجاد محتوای جدید'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => { setSaveAsDraft(true); form.handleSubmit(handleSubmit)(); }}
                className="at-btn at-btn--secondary"
              >
                <RiDraftLine className="w-4 h-4" />
                <span className="hidden sm:inline">پیش‌نویس</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => { setSaveAsDraft(false); form.handleSubmit(handleSubmit)(); }}
                className="at-btn at-btn--primary"
              >
                {isLoading ? (
                  <>
                    <BiLoaderAlt className="w-4 h-4 animate-spin" />
                    <span>در حال ارسال...</span>
                  </>
                ) : (
                  <>
                    <RiSendPlaneFill className="w-4 h-4" />
                    <span>{isEditing ? 'به‌روزرسانی' : 'انتشار پست'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="at-form-tabs" role="tablist" aria-label="بخش‌های فرم">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              const count =
                tab.id === 'content' ? contentCount :
                tab.id === 'meta' ? (categoryCount + tagCount + (scheduledAt ? 1 : 0) + (form.watch('postType') ? 1 : 0)) :
                mediaCount;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSection(tab.id)}
                  className={`at-form-tab ${isActive ? 'is-active' : ''}`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className="at-form-tab__count">
                      {count.toLocaleString('fa-IR')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Main content ─── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="at-form-stack at-form-stack--lg" style={{ marginTop: 20 }}>
            {/* Content Section */}
            <div className={activeSection === 'content' ? '' : 'hidden'}>
              <div className="at-form-stack">
                {/* Title */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <FiFileText className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                          <span>عنوان پست</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!isEditing && !slug) generateSlugFromTitle(e.target.value);
                            }}
                            placeholder="یک عنوان جذاب برای پست..."
                            className="at-input at-input--ghost"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Slug */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <FormLabel className="at-field__label">
                            <FiLink className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                            <span>اسلاگ (URL)</span>
                          </FormLabel>
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
                            className="at-btn at-btn--ghost at-btn--sm"
                            aria-label="بازسازی اسلاگ از عنوان"
                          >
                            <HiOutlineArrowPath className="w-3.5 h-3.5" />
                            <span>از عنوان</span>
                          </button>
                        </div>
                        <FormControl>
                          <div className="at-slug-row">
                            <span className="at-slug-row__prefix">biotak.ir/post/</span>
                            <input
                              value={slug}
                              onChange={(e) => {
                                const newSlug = generateSlug(e.target.value);
                                setSlug(newSlug);
                                field.onChange(newSlug);
                              }}
                              placeholder="my-post-slug"
                              className="at-slug-row__input"
                              dir="ltr"
                            />
                          </div>
                        </FormControl>
                        <p className="at-field__hint">
                          اسلاگ را می‌توانید دستی ویرایش کنید یا با دکمهٔ «از عنوان» بازسازی کنید.
                        </p>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Editor */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <div className="at-form-section__head">
                          <div className="at-form-section__title">
                            <span className="at-form-section__ico" aria-hidden>
                              <HiOutlineSparkles className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <div className="at-form-section__title-text">محتوای پست</div>
                              <div className="at-form-section__sub">بدنه اصلی مقاله با ویرایشگر</div>
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <div className="at-editor-wrap" style={{ borderRadius: 0, border: 0, boxShadow: 'none' }}>
                            <Editor
                              ref={editorRef}
                              wrapperClassName="flex flex-col min-h-[500px]"
                              contentClassName="flex-1 overflow-auto"
                              toolBarClassName="z-40 inset-x-0 w-full bg-[color:var(--at-bg-elevated)] sticky top-0 border-b border-[color:var(--at-line)] px-4 py-2"
                              footerClassName="bg-[color:var(--at-bg-elevated)] border-t border-[color:var(--at-line)] px-4 py-2"
                              content={parseContent(editorContent)}
                              localStorageKey={`${localStorageKey}-editor`}
                              editorProps={{
                                attributes: {
                                  class: 'py-4 px-4 prose prose-lg prose-violet prose-headings:scroll-mt-[80px] dark:prose-invert max-w-none focus:outline-none min-h-[400px]',
                                },
                              }}
                              onUpdate={({ editor }) => {
                                const json = !editor.isEmpty ? JSON.stringify(editor.getJSON()) : '';
                                setEditorContent(json);
                                field.onChange(json);
                                saveToLocalStorage({ ...form.getValues(), content: json });
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="at-field__error" style={{ padding: '0 20px 16px' }} />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Excerpt */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <FiFileText className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                          <span>خلاصه پست</span>
                        </FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            placeholder="خلاصه‌ای کوتاه از محتوای پست..."
                            rows={3}
                            className="at-textarea"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>
              </div>
            </div>

            {/* Meta Section */}
            <div className={activeSection === 'meta' ? '' : 'hidden'}>
              <div className="at-form-grid">
                {/* Categories */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <FiFolder className="w-4 h-4 at-field__ico at-field__ico--blue" aria-hidden />
                          <span>دسته‌بندی‌ها</span>
                        </FormLabel>
                        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                          {field.value?.map((categoryId) => {
                            const category = categories.find((c) => c.id === categoryId);
                            return category ? (
                              <span key={categoryId} className="at-pill at-pill--blue">
                                <span>{category.name}</span>
                                <button
                                  type="button"
                                  onClick={() => form.setValue('categories', field.value?.filter((id) => id !== categoryId) || [])}
                                  className="at-pill__close"
                                  aria-label={`حذف ${category.name}`}
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => setIsCategoryDialogOpen(true)}
                            className="at-btn at-btn--dashed w-full"
                          >
                            <FiPlus className="w-4 h-4" />
                            <span>افزودن دسته‌بندی</span>
                          </button>
                        </FormControl>
                        <p className="at-field__hint">{categoryCount} از {totalCategories.toLocaleString('fa-IR')} دسته‌بندی</p>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Tags */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <FiTag className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                          <span>برچسب‌ها</span>
                        </FormLabel>
                        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                          {field.value?.map((tag) => (
                            <span key={tag} className="at-pill">
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => form.setValue('tags', field.value?.filter((t) => t !== tag) || [])}
                                className="at-pill__close"
                                aria-label={`حذف ${tag}`}
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => setIsTagDialogOpen(true)}
                            className="at-btn at-btn--dashed w-full"
                          >
                            <FiPlus className="w-4 h-4" />
                            <span>افزودن برچسب</span>
                          </button>
                        </FormControl>
                        <p className="at-field__hint">{tagCount} برچسب</p>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Status */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <span>وضعیت پست</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={isAuthor ? 'PENDING_REVIEW' : field.value} disabled={isAuthor}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-[10px] border-[color:var(--at-line)] bg-[color:var(--at-bg)] focus:ring-2 focus:ring-[color:var(--at-accent)]/20">
                              <SelectValue placeholder="انتخاب وضعیت" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">
                              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[color:var(--at-fg-faint)]" />پیش‌نویس</div>
                            </SelectItem>
                            <SelectItem value="PENDING_REVIEW">
                              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[color:var(--at-warning)]" />در انتظار بررسی</div>
                            </SelectItem>
                            {!isAuthor && (
                              <>
                                {/* 2026-07-04: گزینهٔ زمان‌بندی برای admin/owner. */}
                                <SelectItem value="SCHEDULED">
                                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[color:var(--at-info)]" />زمان‌بندی شده</div>
                                </SelectItem>
                                <SelectItem value="PUBLISHED">
                                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[color:var(--at-accent)]" />منتشر شده</div>
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {isAuthor && (
                          <p className="at-field__hint" style={{ color: 'var(--at-warning)' }}>
                            پست‌های شما پس از تأیید مدیر منتشر می‌شوند.
                          </p>
                        )}
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Scheduled At */}
                <section className="at-form-section">
                  <div className="at-form-section__body">
                    <div className="at-field">
                      <FormLabel className="at-field__label">
                        <span className="at-switch-row__ico" aria-hidden style={{ width: 28, height: 28 }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span>زمان انتشار برنامه‌ریزی‌شده</span>
                      </FormLabel>
                      <p className="at-field__hint">
                        اختیاری. اگر تاریخ آینده انتخاب کنید، پست خودکار در آن زمان منتشر می‌شود.
                      </p>
                      <PersianDateTimePicker
                        value={scheduledAt}
                        onChange={setScheduledAt}
                        placeholder="روی کلیک کنید تا تقویم باز شود"
                        showPresets
                      />
                    </div>
                  </div>
                </section>

                {/* Post Type */}
                <section className="at-form-section" style={{ gridColumn: '1 / -1' }}>
                  <FormField
                    control={form.control}
                    name="postType"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <span>نوع پست</span>
                        </FormLabel>
                        <div className="at-ptype-grid">
                          {(Object.entries(postTypeConfig) as [PostType, typeof postTypeConfig.STANDARD][]).map(([type, config]) => {
                            const Icon = config.icon;
                            const isSelected = field.value === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => field.onChange(type)}
                                className={`at-ptype ${isSelected ? 'is-active' : ''}`}
                                aria-pressed={isSelected}
                              >
                                <span className="at-ptype__ico" aria-hidden>
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span className="at-ptype__label">{config.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Featured toggle */}
                <section className="at-form-section" style={{ gridColumn: '1 / -1' }}>
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <div className="at-switch-row">
                          <div className="at-switch-row__meta">
                            <span className="at-switch-row__ico" aria-hidden>
                              <FiStar className="w-4 h-4" />
                            </span>
                            <div className="at-switch-row__text">
                              <FormLabel className="at-switch-row__title">پست ویژه</FormLabel>
                              <p className="at-switch-row__sub">نمایش در بخش ویژهٔ سایت</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Video URL */}
                {form.watch('postType') === 'VIDEO' && (
                  <section className="at-form-section" style={{ gridColumn: '1 / -1' }}>
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem className="at-form-section__body">
                          <FormLabel className="at-field__label">
                            <FiVideo className="w-4 h-4 at-field__ico at-field__ico--rose" aria-hidden />
                            <span>آدرس ویدیو</span>
                          </FormLabel>
                          <FormControl>
                            <input
                              {...field}
                              placeholder="https://..."
                              dir="ltr"
                              className="at-input"
                            />
                          </FormControl>
                          <FormMessage className="at-field__error" />
                        </FormItem>
                      )}
                    />
                  </section>
                )}

                {/* Audio URL */}
                {form.watch('postType') === 'AUDIO' && (
                  <section className="at-form-section" style={{ gridColumn: '1 / -1' }}>
                    <FormField
                      control={form.control}
                      name="audioUrl"
                      render={({ field }) => (
                        <FormItem className="at-form-section__body">
                          <FormLabel className="at-field__label">
                            <FiMusic className="w-4 h-4 at-field__ico at-field__ico--amber" aria-hidden />
                            <span>آدرس فایل صوتی</span>
                          </FormLabel>
                          <FormControl>
                            <input
                              {...field}
                              placeholder="https://..."
                              dir="ltr"
                              className="at-input"
                            />
                          </FormControl>
                          <FormMessage className="at-field__error" />
                        </FormItem>
                      )}
                    />
                  </section>
                )}
              </div>
            </div>

            {/* Media Section */}
            <div className={activeSection === 'media' ? '' : 'hidden'}>
              <div className="at-form-stack">
                {/* Featured Image */}
                <section className="at-form-section">
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem className="at-form-section__body">
                        <FormLabel className="at-field__label">
                          <FiImage className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                          <span>تصویر شاخص</span>
                        </FormLabel>
                        <FormControl>
                          <ImageUploader
                            onImageUpload={(urls) => { setFeaturedImage(urls[0]); field.onChange(urls[0]); }}
                            onUploadComplete={(files) => {
                              const d = pickDims(files);
                              if (!d) return;
                              form.setValue('featuredImageWidth', d.width ?? undefined);
                              form.setValue('featuredImageHeight', d.height ?? undefined);
                            }}
                            onImageRemove={() => {
                              setFeaturedImage(undefined);
                              field.onChange(undefined);
                              form.setValue('featuredImageWidth', undefined);
                              form.setValue('featuredImageHeight', undefined);
                            }}
                            maxFiles={1}
                            multiple={false}
                            initialPreviews={featuredImage ? [featuredImage] : []}
                            folder="posts"
                          />
                        </FormControl>
                        <FormMessage className="at-field__error" />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Gallery Images - only show when post type is GALLERY */}
                {form.watch('postType') === 'GALLERY' && (
                  <section className="at-form-section">
                    <FormField
                      control={form.control}
                      name="galleryImages"
                      render={({ field }) => (
                        <FormItem className="at-form-section__body">
                          <FormLabel className="at-field__label">
                            <FiGrid className="w-4 h-4 at-field__ico at-field__ico--emerald" aria-hidden />
                            <span>گالری تصاویر</span>
                          </FormLabel>
                          <FormControl>
                            <ImageUploader
                              onImageUpload={(urls) => field.onChange([...(field.value ?? []), ...urls])}
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
                          <FormMessage className="at-field__error" />
                        </FormItem>
                      )}
                    />
                  </section>
                )}
              </div>
            </div>

          </form>
        </Form>

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
      </>
    </FormProvider>
  );
};

export default PostForm;