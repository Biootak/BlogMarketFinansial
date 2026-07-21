'use client';

import {
  createAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
} from '@/actions/advertisementActions';
import { getAllHeaderAds } from '@/actions/headerAdActions';
import HeaderAdsClient, { type HeaderAdData } from '@/app/dashboard/header-ad/HeaderAdsClient';
import BannerADS from '@/components/BannerADS/BannerADS';
import { PageHeader } from '@/components/Dashboard/primitives';
import {
  ActionButton,
  DashboardPageHeader,
  DashboardSearchInput,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableContainer,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
  EmptyState,
  PrimaryActionButton,
  StatusBadge,
} from '@/components/Dashboard/shared/DashboardTableWrapper';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import LoadingMore from '@/components/LoadingMore';
import { AdvertisementsSkeleton } from '@/components/Skeletons';
import SubmitButton from '@/components/SubmitButton';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn, toPersianNumber } from '@/lib/utils';
import type { AdPosition, AdSize, Advertisement, CustomAdDimensions } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  HiMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineMegaphone,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRectangleStack,
  HiOutlineTrash,
} from 'react-icons/hi2';
import * as z from 'zod';

const advertisementSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  description: z.string().optional(),
  imageUrl: z.string().url('آدرس تصویر معتبر نیست'),
  linkUrl: z.string().url('آدرس لینک معتبر نیست'),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM']),
  position: z.enum(['HEADER', 'FOOTER', 'SIDEBAR', 'IN_CONTENT', 'BETWEEN_POSTS', 'CUSTOM']),
  customPosition: z.string().optional(),
  order: z.coerce.number().int().positive(),
  customDimensions: z
    .object({
      width: z.string().optional(),
      height: z.string().optional(),
      aspectRatio: z.string().optional(),
    })
    .optional(),
});

type AdvertisementFormData = z.infer<typeof advertisementSchema>;

const sizeLabels: Record<string, string> = {
  SMALL: 'کوچک',
  MEDIUM: 'متوسط',
  LARGE: 'بزرگ',
  CUSTOM: 'سفارشی',
};

const positionLabels: Record<string, string> = {
  HEADER: 'سربرگ',
  FOOTER: 'پاورقی',
  SIDEBAR: 'نوار کناری',
  IN_CONTENT: 'داخل محتوا',
  BETWEEN_POSTS: 'بین پست‌ها',
  CUSTOM: 'سفارشی',
};

export default function AdvertisementsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'advertisements' | 'header'>(
    searchParams.get('tab') === 'header' ? 'header' : 'advertisements',
  );

  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [_totalCount, setTotalCount] = useState(0);

  const [headerAds, setHeaderAds] = useState<HeaderAdData[]>([]);
  const [isHeaderAdsLoading, setIsHeaderAdsLoading] = useState(false);

  const form = useForm<AdvertisementFormData>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: {
      size: 'MEDIUM',
      position: 'IN_CONTENT',
      isActive: true,
      order: 1,
      customDimensions: {},
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setAds([]);
    fetchAds(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchHeaderAds = useCallback(async () => {
    setIsHeaderAdsLoading(true);
    const result = await getAllHeaderAds();
    if (result.success && result.data) {
      setHeaderAds(result.data as HeaderAdData[]);
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
    setIsHeaderAdsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'header') {
      fetchHeaderAds();
    }
  }, [activeTab, fetchHeaderAds]);

  const handleTabChange = (value: string) => {
    const next = value as 'advertisements' | 'header';
    setActiveTab(next);
    router.replace(`/dashboard/advertisements?tab=${next}`, { scroll: false });
  };

  const fetchAds = useCallback(
    async (pageNumber: number, search: string) => {
      setIsLoading(true);
      const result = await getAllAdvertisements({ limit: 10, page: pageNumber, search });
      if (result.success && result.data) {
        const { ads: newAds, totalCount } = result.data;
        if (pageNumber === 1) {
          setAds(newAds);
        } else {
          setAds((prev) => [...prev, ...newAds]);
        }
        setTotalCount(totalCount);
        setHasNextPage(pageNumber * 10 < totalCount);
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
      setIsLoading(false);
    },
    [toast],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
      fetchAds(page + 1, debouncedSearchTerm);
    }
  }, [fetchAds, hasNextPage, isLoading, page, debouncedSearchTerm]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const onSubmit = async (data: AdvertisementFormData) => {
    const formattedData = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : new Date(),
    };

    const result = editingAd
      ? await updateAdvertisement(editingAd.id, formattedData)
      : await createAdvertisement(formattedData);

    if (result.success) {
      fetchAds(1, debouncedSearchTerm);
      form.reset();
      setEditingAd(null);
      setIsDialogOpen(false);
      toast({ title: 'موفقیت', description: result.message, variant: 'success' });
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsDialogOpen(true);

    const validateCustomDimensions = (dimensions: unknown): CustomAdDimensions | undefined => {
      if (typeof dimensions === 'object' && dimensions !== null) {
        const d = dimensions as Record<string, unknown>;
        return {
          width:
            typeof d.width === 'number'
              ? String(d.width)
              : typeof d.width === 'string'
                ? d.width
                : undefined,
          height:
            typeof d.height === 'number'
              ? String(d.height)
              : typeof d.height === 'string'
                ? d.height
                : undefined,
          aspectRatio: typeof d.aspectRatio === 'string' ? d.aspectRatio : undefined,
        };
      }
      return undefined;
    };

    form.reset({
      title: ad.title,
      description: ad.description ?? undefined,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      startDate: new Date(ad.startDate),
      endDate: new Date(ad.endDate),
      isActive: ad.isActive,
      size: ad.size,
      position: ad.position,
      customPosition: ad.customPosition ?? undefined,
      order: Number(ad.order),
      customDimensions: validateCustomDimensions(ad.customDimensions ?? undefined),
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این تبلیغ را حذف کنید؟')) {
      const result = await deleteAdvertisement(id);
      if (result.success) {
        fetchAds(1, debouncedSearchTerm);
        toast({ title: 'موفقیت', description: result.message, variant: 'success' });
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    }
  };

  const openNewAdDialog = () => {
    setEditingAd(null);
    form.reset({
      size: 'MEDIUM',
      position: 'IN_CONTENT',
      isActive: true,
      order: 1,
      customDimensions: {},
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تبلیغات' }]}
        eyebrow="محتوا"
        title={activeTab === 'header' ? 'تبلیغ بالای هدر' : 'مدیریت تبلیغات'}
        description={
          activeTab === 'header'
            ? 'نوار باریک تبلیغ که در بالای سایت نمایش داده می‌شود. فقط یک تبلیغ فعال در لحظه.'
            : 'مشاهده و مدیریت تبلیغات سایت'
        }
        actions={
          activeTab === 'advertisements' ? (
            <>
              <div className="at-filterbar__search" style={{ minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="جستجوی تبلیغ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <HiMagnifyingGlass className="at-filterbar__search__ico size-4" />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={openNewAdDialog}
                    className="at-btn at-btn--primary"
                  >
                    <HiOutlinePlus className="size-4" />
                    <span>افزودن تبلیغ</span>
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="at-dialog-content max-h-[90vh] w-full max-w-5xl p-0 overflow-hidden"
                  dir="rtl"
                >
                  <div className="at-dialog-header">
                    <div className="at-dialog-title">
                      <span className="at-dialog-title__ico">
                        <HiOutlineMegaphone className="size-4" />
                      </span>
                      <div>
                        <div>{editingAd ? 'ویرایش تبلیغ' : 'افزودن تبلیغ جدید'}</div>
                        <div className="at-dialog-sub">محتوا، جایگاه و زمان‌بندی نمایش</div>
                      </div>
                    </div>
                  </div>
                  <div className="at-dialog-body" style={{ padding: '20px 22px' }}>
                    <AdvertisementForm form={form} onSubmit={onSubmit} />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : null
        }
      />

      {/* Tabs — atelier */}
      <nav className="at-form-tabs" role="tablist" style={{ marginBottom: '18px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'advertisements'}
          onClick={() => handleTabChange('advertisements')}
          className={`at-form-tab ${activeTab === 'advertisements' ? 'is-active' : ''}`}
        >
          تبلیغات
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'header'}
          onClick={() => handleTabChange('header')}
          className={`at-form-tab ${activeTab === 'header' ? 'is-active' : ''}`}
        >
          تبلیغ هدر
        </button>
      </nav>

      {activeTab === 'advertisements' && (
        <>
          {/* KPI strip — atelier */}
          <div className="at-stats">
            <div className="at-stat">
              <div className="at-stat__ico">
                <HiOutlineMegaphone className="size-4" />
              </div>
              <div className="at-stat__main">
                <div className="at-stat__value">{toPersianNumber(ads.length)}</div>
                <div className="at-stat__label">کل تبلیغات</div>
              </div>
            </div>
            <div className="at-stat">
              <div
                className="at-stat__ico at-stat__ico--emerald"
                style={{ background: 'var(--at-accent-soft)', color: 'var(--at-accent)' }}
              >
                <HiOutlineCheckCircle className="size-4" />
              </div>
              <div className="at-stat__main">
                <div className="at-stat__value" style={{ color: 'var(--at-accent)' }}>
                  {toPersianNumber(ads.filter((a) => a.isActive).length)}
                </div>
                <div className="at-stat__label">تبلیغات فعال</div>
              </div>
            </div>
            <div className="at-stat">
              <div className="at-stat__ico at-stat__ico--blue">
                <HiOutlineRectangleStack className="size-4" />
              </div>
              <div className="at-stat__main">
                <div className="at-stat__value" style={{ color: 'var(--at-info)' }}>
                  {toPersianNumber(ads.filter((a) => a.position === 'HEADER').length)}
                </div>
                <div className="at-stat__label">جایگاه سربرگ</div>
              </div>
            </div>
            <div className="at-stat">
              <div className="at-stat__ico at-stat__ico--amber">
                <HiOutlineRectangleStack className="size-4" />
              </div>
              <div className="at-stat__main">
                <div className="at-stat__value" style={{ color: 'var(--at-warning)' }}>
                  {toPersianNumber(ads.filter((a) => a.position !== 'HEADER').length)}
                </div>
                <div className="at-stat__label">سایر جایگاه‌ها</div>
              </div>
            </div>
          </div>

          {isLoading && page === 1 ? (
            <AdvertisementsSkeleton />
          ) : ads.length === 0 ? (
            <DashboardTableContainer>
              <EmptyState
                title="تبلیغی یافت نشد"
                description="هنوز هیچ تبلیغی در سیستم ثبت نشده است."
                icon={<HiOutlineMegaphone className="h-8 w-8 text-neutral-400" />}
              />
            </DashboardTableContainer>
          ) : (
            <DashboardTableContainer>
              <DashboardTable>
                <DashboardTableHeader>
                  <tr>
                    <DashboardTableHead>تصویر</DashboardTableHead>
                    <DashboardTableHead>عنوان</DashboardTableHead>
                    <DashboardTableHead hidden>اندازه</DashboardTableHead>
                    <DashboardTableHead hidden>موقعیت</DashboardTableHead>
                    <DashboardTableHead hidden>وضعیت فعال</DashboardTableHead>
                    <DashboardTableHead>عملیات</DashboardTableHead>
                  </tr>
                </DashboardTableHeader>
                <DashboardTableBody>
                  {ads.map((ad) => (
                    <DashboardTableRow key={ad.id}>
                      <DashboardTableCell>
                        <div className="relative h-16 w-28 overflow-hidden rounded-xl ring-1 ring-neutral-200/60 dark:ring-neutral-700/50">
                          <Image
                            src={ad.imageUrl}
                            alt={ad.title}
                            width={112}
                            height={64}
                            sizes="112px"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder-small.png';
                            }}
                          />
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {ad.title}
                        </span>
                      </DashboardTableCell>
                      <DashboardTableCell hidden>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {sizeLabels[ad.size] || ad.size}
                        </span>
                      </DashboardTableCell>
                      <DashboardTableCell hidden>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {positionLabels[ad.position] || ad.position}
                        </span>
                      </DashboardTableCell>
                      <DashboardTableCell hidden>
                        <div className="flex items-center h-full">
                          <CustomSwitch
                            checked={ad.isActive}
                            onCheckedChange={async (checked) => {
                              // Optimistic update
                              setAds((prev) =>
                                prev.map((a) => (a.id === ad.id ? { ...a, isActive: checked } : a)),
                              );
                              const result = await updateAdvertisement(ad.id, {
                                isActive: checked,
                              });
                              if (result.success) {
                                toast({
                                  title: 'موفقیت',
                                  description: 'وضعیت فعال بودن تبلیغ تغییر کرد.',
                                  variant: 'success',
                                });
                              } else {
                                // Rollback
                                setAds((prev) =>
                                  prev.map((a) =>
                                    a.id === ad.id ? { ...a, isActive: !checked } : a,
                                  ),
                                );
                                toast({
                                  title: 'خطا',
                                  description: result.message,
                                  variant: 'destructive',
                                });
                              }
                            }}
                          />
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <div className="flex items-center gap-2">
                          <ActionButton variant="edit" onClick={() => handleEdit(ad)}>
                            <HiOutlinePencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">ویرایش</span>
                          </ActionButton>
                          <ActionButton variant="delete" onClick={() => handleDelete(ad.id)}>
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">حذف</span>
                          </ActionButton>
                        </div>
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
              {isLoading && page > 1 && <LoadingMore message="در حال دریافت تبلیغات بیشتر..." />}
              <div ref={infiniteScrollRef} style={{ height: '1px' }} />
            </DashboardTableContainer>
          )}
        </>
      )}

      {activeTab === 'header' &&
        (isHeaderAdsLoading ? (
          <AdvertisementsSkeleton />
        ) : (
          <HeaderAdsClient initialAds={headerAds} onRefresh={fetchHeaderAds} />
        ))}
    </div>
  );
}

function AdvertisementForm({
  form,
  onSubmit,
}: {
  form: ReturnType<typeof import('react-hook-form').useForm<AdvertisementFormData>>;
  onSubmit: (data: AdvertisementFormData) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'placement' | 'schedule'>('content');
  const watchedValues = form.watch();

  const handleImageUpload = (urls: string[]) => {
    form.setValue('imageUrl', urls[0]);
  };

  // 2026-06-21: ابعاد واقعی تصویر را بعد از آپلود در customDimensions ذخیره
  // می‌کنیم تا ArchiveAdCard با aspect-ratio درست رندر شود (بدون fallback 16:6).
  const handleImageUploadComplete = (
    files: Array<{ url: string; width?: number | null; height?: number | null }>,
  ) => {
    const f = files[0];
    if (!f || !f.width || !f.height) return;
    form.setValue('customDimensions', {
      width: String(f.width),
      height: String(f.height),
      aspectRatio: `${f.width}/${f.height}`,
    });
  };

  const handleImageRemove = () => {
    form.setValue('imageUrl', '');
    form.setValue('customDimensions', {});
  };

  const inputClassName =
    'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:text-neutral-100';
  const selectClassName =
    'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:text-neutral-100';

  // Construct preview ad matching database type
  const previewAd: Advertisement = {
    id: 'preview',
    title: watchedValues.title || 'عنوان نمونه تبلیغ شما',
    description:
      watchedValues.description || 'توضیحات نمونه تبلیغات در این قسمت نمایش داده خواهد شد.',
    imageUrl: watchedValues.imageUrl || '',
    linkUrl: watchedValues.linkUrl || 'https://google.com',
    size: watchedValues.size || 'MEDIUM',
    position: watchedValues.position || 'IN_CONTENT',
    isActive: watchedValues.isActive ?? true,
    order: Number(watchedValues.order || 1),
    customPosition: watchedValues.customPosition || null,
    customDimensions: watchedValues.customDimensions || null,
    startDate: watchedValues.startDate || new Date(),
    endDate: watchedValues.endDate || new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* Form Fields Side */}
          <div className="space-y-5">
            {/* Tabs Header */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700/60 pb-px mb-6 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={cn(
                  'pb-3 text-sm font-semibold border-b-2 transition-all duration-200 px-2 cursor-pointer',
                  activeTab === 'content'
                    ? 'border-primary-500 text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
                )}
              >
                ۱. محتوا و مقصد
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('placement')}
                className={cn(
                  'pb-3 text-sm font-semibold border-b-2 transition-all duration-200 px-2 cursor-pointer',
                  activeTab === 'placement'
                    ? 'border-primary-500 text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
                )}
              >
                ۲. جایگاه و ابعاد
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  'pb-3 text-sm font-semibold border-b-2 transition-all duration-200 px-2 cursor-pointer',
                  activeTab === 'schedule'
                    ? 'border-primary-500 text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
                )}
              >
                ۳. زمان‌بندی و انتشار
              </button>
            </div>

            {/* Tab: Content */}
            {activeTab === 'content' && (
              <div className="space-y-4 anim-fade-in">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        عنوان تبلیغ
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: جشنواره زمستانه بورس‌مارکت"
                          {...field}
                          className={inputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        توضیحات کوتاه
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="توضیحات جذاب و خلاصه برای جذب مخاطب"
                          className="w-full rounded-xl border border-neutral-200/60 bg-white/80 px-4 py-3 text-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80 dark:text-neutral-100"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        لینک مقصد (URL)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/landing"
                          {...field}
                          className={inputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        تصویر بنر
                      </FormLabel>
                      <FormControl>
                        <ImageUploader
                          onImageUpload={handleImageUpload}
                          onUploadComplete={handleImageUploadComplete}
                          onImageRemove={handleImageRemove}
                          initialPreviews={field.value ? [field.value] : []}
                          folder="ads"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Tab: Placement */}
            {activeTab === 'placement' && (
              <div className="space-y-4 anim-fade-in">
                {/* Visual Placement selector mockup */}
                <div>
                  <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    انتخاب بصری موقعیت تبلیغ
                  </FormLabel>
                  <div className="border border-neutral-200/60 dark:border-neutral-700/50 rounded-2xl p-4 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3">
                    <div className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl p-3 bg-white dark:bg-neutral-800 space-y-2.5">
                      {/* Header ad mock */}
                      <button
                        type="button"
                        onClick={() => form.setValue('position', 'HEADER')}
                        className={cn(
                          'w-full py-2.5 rounded-lg border text-xs font-semibold transition-all duration-300 cursor-pointer',
                          watchedValues.position === 'HEADER'
                            ? 'bg-primary-500/10 border-primary-500 text-primary-600 shadow-[0_0_12px_rgba(94,106,230,0.15)] scale-[1.01]'
                            : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700/60 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600',
                        )}
                      >
                        {watchedValues.position === 'HEADER'
                          ? '✓ سربرگ (Header)'
                          : 'سربرگ (Header)'}
                      </button>

                      {/* Body mock */}
                      <div className="grid grid-cols-[1.8fr_1fr] gap-3">
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => form.setValue('position', 'IN_CONTENT')}
                            className={cn(
                              'w-full py-5 rounded-lg border text-xs font-semibold transition-all duration-300 cursor-pointer',
                              watchedValues.position === 'IN_CONTENT'
                                ? 'bg-primary-500/10 border-primary-500 text-primary-600 shadow-[0_0_12px_rgba(94,106,230,0.15)] scale-[1.01]'
                                : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700/60 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600',
                            )}
                          >
                            {watchedValues.position === 'IN_CONTENT'
                              ? '✓ داخل محتوای پست'
                              : 'داخل محتوای پست'}
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('position', 'BETWEEN_POSTS')}
                            className={cn(
                              'w-full py-3.5 rounded-lg border text-xs font-semibold transition-all duration-300 cursor-pointer',
                              watchedValues.position === 'BETWEEN_POSTS'
                                ? 'bg-primary-500/10 border-primary-500 text-primary-600 shadow-[0_0_12px_rgba(94,106,230,0.15)] scale-[1.01]'
                                : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700/60 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600',
                            )}
                          >
                            {watchedValues.position === 'BETWEEN_POSTS'
                              ? '✓ بین پست‌های لیست'
                              : 'بین پست‌های لیست'}
                          </button>
                        </div>

                        {/* Sidebar mock */}
                        <button
                          type="button"
                          onClick={() => form.setValue('position', 'SIDEBAR')}
                          className={cn(
                            'w-full h-full flex items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-300 cursor-pointer',
                            watchedValues.position === 'SIDEBAR'
                              ? 'bg-primary-500/10 border-primary-500 text-primary-600 shadow-[0_0_12px_rgba(94,106,230,0.15)] scale-[1.01]'
                              : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700/60 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600',
                          )}
                        >
                          {watchedValues.position === 'SIDEBAR'
                            ? '✓ نوار کناری (Sidebar)'
                            : 'نوار کناری'}
                        </button>
                      </div>

                      {/* Footer mock */}
                      <button
                        type="button"
                        onClick={() => form.setValue('position', 'FOOTER')}
                        className={cn(
                          'w-full py-2 rounded-lg border text-xs font-semibold transition-all duration-300 cursor-pointer',
                          watchedValues.position === 'FOOTER'
                            ? 'bg-primary-500/10 border-primary-500 text-primary-600 shadow-[0_0_12px_rgba(94,106,230,0.15)] scale-[1.01]'
                            : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700/60 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600',
                        )}
                      >
                        {watchedValues.position === 'FOOTER'
                          ? '✓ پاورقی (Footer)'
                          : 'پاورقی (Footer)'}
                      </button>
                    </div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center font-medium">
                      برای تغییر موقعیت، مستقیماً روی بخش مورد نظر در مدل شبیه‌سازی بالا کلیک کنید.
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        اندازه نمایش بنر
                      </FormLabel>
                      <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder="انتخاب اندازه بنر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SMALL">کوچک (100% * 65)</SelectItem>
                          <SelectItem value="MEDIUM">متوسط (160 * 65)</SelectItem>
                          <SelectItem value="LARGE">بزرگ / عریض (1280 * 250)</SelectItem>
                          <SelectItem value="CUSTOM">ابعاد سفارشی</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedValues.size === 'CUSTOM' && (
                  <div className="grid gap-5 sm:grid-cols-3 p-4 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30">
                    <FormField
                      control={form.control}
                      name="customDimensions.width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            عرض سفارشی
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="مثال: 300px یا 100%"
                              {...field}
                              className={inputClassName}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customDimensions.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            ارتفاع سفارشی
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="مثال: 250px"
                              {...field}
                              className={inputClassName}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customDimensions.aspectRatio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            نسبت تصویر
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: 16/9" {...field} className={inputClassName} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab: Schedule */}
            {activeTab === 'schedule' && (
              <div className="space-y-4 anim-fade-in">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          تاریخ شروع نمایش
                        </FormLabel>
                        <FormControl>
                          <PersianDatePicker value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          تاریخ پایان نمایش
                        </FormLabel>
                        <FormControl>
                          <PersianDatePicker value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          اولویت نمایش (ترتیب)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-white/50 p-4 dark:border-neutral-700/50 dark:bg-neutral-800/50">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-5 w-5 rounded-md border-neutral-300 text-primary-600 transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                          فعال بودن فوری تبلیغ در سایت
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Stepped Actions Buttons */}
            <div className="flex items-center justify-between pt-5 mt-6 border-t border-neutral-200/60 dark:border-neutral-700/50">
              {activeTab !== 'content' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'schedule') setActiveTab('placement');
                    else if (activeTab === 'placement') setActiveTab('content');
                  }}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  مرحله قبلی
                </button>
              ) : (
                <div />
              )}

              {activeTab === 'content' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('placement')}
                  className="h-10 px-6 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  مرحله بعد: جایگاه و ابعاد
                </button>
              )}

              {activeTab === 'placement' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="h-10 px-6 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  مرحله بعد: زمان‌بندی
                </button>
              )}

              {activeTab === 'schedule' && (
                <SubmitButton isSubmitting={form.formState.isSubmitting} />
              )}
            </div>
          </div>

          {/* Left Side: Real-time Live Preview Pane */}
          <div className="lg:sticky lg:top-0 border border-neutral-200/60 dark:border-neutral-700/50 rounded-2xl p-5 bg-neutral-50/40 dark:bg-neutral-900/20 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-700/50 pb-2">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                پیش‌نمایش زنده کارت تبلیغ
              </span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                زنده
              </span>
            </div>

            <div className="flex items-center justify-center p-3 bg-neutral-950/5 dark:bg-neutral-950/20 rounded-xl overflow-hidden min-h-[160px] border border-neutral-200/40 dark:border-neutral-800/40">
              {previewAd.imageUrl ? (
                <div className="w-full scale-90 sm:scale-100 origin-center transition-all duration-300">
                  <BannerADS
                    ad={previewAd}
                    variant={
                      previewAd.size === 'LARGE'
                        ? 'showcase'
                        : previewAd.size === 'MEDIUM'
                          ? 'rich'
                          : previewAd.size === 'SMALL'
                            ? 'minimal'
                            : 'image'
                    }
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="text-center py-8 px-4 space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                    <HiOutlineMegaphone className="h-5 w-5" />
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                    در حال انتظار برای تصویر...
                  </div>
                  <div className="text-neutral-400 dark:text-neutral-550 text-[10px] max-w-[200px] mx-auto leading-relaxed">
                    با وارد کردن اطلاعات و آپلود تصویر، شکل زنده تبلیغ را اینجا مشاهده خواهید کرد.
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="p-3 bg-primary-500/5 rounded-xl border border-primary-500/10 text-[11px] text-primary-600 dark:text-primary-400 leading-relaxed">
              💡 <strong>راهنما:</strong> ابعاد بزرگ (LARGE) دارای افکت تعاملی سه‌بعدی و بازتاب ماوس
              است. ابعاد متوسط (MEDIUM) به صورت متنی-تصویری غنی، و ابعاد کوچک (SMALL) متناسب با
              سایدبار نمایش داده می‌شود.
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
