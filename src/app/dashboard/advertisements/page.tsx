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
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import LoadingMore from '@/components/LoadingMore';
import { AdvertisementsSkeleton } from '@/components/Skeletons';
import SubmitButton from '@/components/SubmitButton';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn, toPersianNumber } from '@/lib/utils';
import type { Advertisement, CustomAdDimensions } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { type UseFormReturn, useForm } from 'react-hook-form';
import {
  HiMagnifyingGlass,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineComputerDesktop,
  HiOutlineDevicePhoneMobile,
  HiOutlineMegaphone,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRectangleStack,
  HiOutlineTrash,
  HiOutlineWindow,
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
  order: z.coerce.number().int().min(0),
  customDimensions: z
    .object({
      width: z.string().optional(),
      height: z.string().optional(),
      aspectRatio: z.string().optional(),
      imageFit: z.enum(['ambient', 'cover', 'contain']).optional(),
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
    try {
      const result = await getAllHeaderAds();
      if (result.success && result.data) {
        setHeaderAds(result.data as HeaderAdData[]);
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: 'خطا', description: 'ارتباط با سرور برقرار نشد', variant: 'destructive' });
    } finally {
      setIsHeaderAdsLoading(false);
    }
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
      try {
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
      } catch (_error) {
        toast({
          title: 'خطا',
          description: 'دریافت اطلاعات با خطا مواجه شد',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
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
    try {
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
    } catch (_error) {
      toast({ title: 'خطا', description: 'عملیات با خطا مواجه شد', variant: 'destructive' });
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsDialogOpen(true);

    const validateCustomDimensions = (dimensions: unknown): CustomAdDimensions | undefined => {
      if (typeof dimensions === 'object' && dimensions !== null) {
        const d = dimensions as Record<string, unknown>;
        const fit = d.imageFit;
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
          imageFit:
            fit === 'ambient' || fit === 'cover' || fit === 'contain'
              ? (fit as CustomAdDimensions['imageFit'])
              : undefined,
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
      try {
        const result = await deleteAdvertisement(id);
        if (result.success) {
          fetchAds(1, debouncedSearchTerm);
          toast({ title: 'موفقیت', description: result.message, variant: 'success' });
        } else {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
        }
      } catch (_error) {
        toast({ title: 'خطا', description: 'حذف تبلیغ با خطا مواجه شد', variant: 'destructive' });
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
    <div className="at-page dash-scope" dir="rtl">
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
          {/* KPI strip — bento 2026 */}
          <div className="dash-bento mb-8">
            <div className="dash-panel p-5 dash-glow">
              <div className="flex items-center gap-4">
                <div className="dash-ico dash-ico--indigo size-10">
                  <HiOutlineMegaphone className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold dash-num">{toPersianNumber(ads.length)}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    کل تبلیغات
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-panel p-5 dash-glow">
              <div className="flex items-center gap-4">
                <div className="dash-ico dash-ico--emerald size-10">
                  <HiOutlineCheckCircle className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold dash-num text-emerald-600 dark:text-emerald-500">
                    {toPersianNumber(ads.filter((a) => a.isActive).length)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    تبلیغات فعال
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-panel p-5 dash-glow">
              <div className="flex items-center gap-4">
                <div className="dash-ico dash-ico--cyan size-10">
                  <HiOutlineRectangleStack className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold dash-num text-cyan-600 dark:text-cyan-500">
                    {toPersianNumber(ads.filter((a) => a.position === 'HEADER').length)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    جایگاه سربرگ
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-panel p-5 dash-glow">
              <div className="flex items-center gap-4">
                <div className="dash-ico dash-ico--amber size-10">
                  <HiOutlineRectangleStack className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold dash-num text-amber-600 dark:text-amber-500">
                    {toPersianNumber(ads.filter((a) => a.position !== 'HEADER').length)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    سایر جایگاه‌ها
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-panel p-5 dash-glow col-span-2 hidden xl:block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="dash-ico dash-ico--violet size-10">
                    <HiOutlineChartBar className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">وضعیت کلی محتوا</div>
                    <div className="text-[10px] text-neutral-500">به‌روزرسانی لحظه‌ای</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[40, 70, 45, 90, 65, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-primary-500/20"
                      style={{ height: '24px', position: 'relative' }}
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-full bg-primary-500"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isLoading && page === 1 ? (
            <AdvertisementsSkeleton />
          ) : ads.length === 0 ? (
            <div className="dash-panel p-20 flex flex-col items-center justify-center text-center">
              <div className="dash-ico dash-ico--indigo size-16 mb-6">
                <HiOutlineMegaphone className="size-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">تبلیغی یافت نشد</h3>
              <p className="text-neutral-500 max-w-xs">
                هنوز هیچ تبلیغی در سیستم ثبت نشده است. برای شروع اولین تبلیغ را بسازید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <th className="px-6 py-4 text-start text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        محتوا
                      </th>
                      <th className="px-6 py-4 text-start text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        مشخصات فنی
                      </th>
                      <th className="px-6 py-4 text-start text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                        وضعیت
                      </th>
                      <th className="px-6 py-4 text-end text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {ads.map((ad) => (
                      <tr
                        key={ad.id}
                        className="group hover:bg-primary-500/[0.02] transition-colors anim-fade-in-up"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800">
                              <Image
                                src={ad.imageUrl}
                                alt={ad.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate max-w-[200px]">
                                {ad.title}
                              </div>
                              <div className="text-[10px] text-neutral-500 truncate max-w-[200px] mt-0.5">
                                {ad.linkUrl}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                              {sizeLabels[ad.size]}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-[10px] font-bold text-primary-600 dark:text-primary-400">
                              {positionLabels[ad.position]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <CustomSwitch
                              checked={ad.isActive}
                              onCheckedChange={async (checked) => {
                                try {
                                  setAds((prev) =>
                                    prev.map((a) =>
                                      a.id === ad.id ? { ...a, isActive: checked } : a,
                                    ),
                                  );
                                  const res = await updateAdvertisement(ad.id, {
                                    isActive: checked,
                                  });
                                  if (!res.success) throw new Error(res.message);
                                  toast({
                                    title: 'موفقیت',
                                    description: 'وضعیت تغییر کرد',
                                    variant: 'success',
                                  });
                                } catch (_e) {
                                  setAds((prev) =>
                                    prev.map((a) =>
                                      a.id === ad.id ? { ...a, isActive: !checked } : a,
                                    ),
                                  );
                                  toast({
                                    title: 'خطا',
                                    description: 'خطا در بروزرسانی',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(ad)}
                              className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-500 transition-all"
                            >
                              <HiOutlinePencil className="size-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ad.id)}
                              className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                            >
                              <HiOutlineTrash className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {ads.map((ad) => (
                  <div key={ad.id} className="dash-panel p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-32 rounded-xl overflow-hidden ring-1 ring-neutral-200">
                        <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="font-bold text-sm truncate">{ad.title}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold">
                            {sizeLabels[ad.size]}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary-50 text-[10px] font-bold text-primary-600">
                            {positionLabels[ad.position]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <CustomSwitch
                          checked={ad.isActive}
                          onCheckedChange={async (checked) => {
                            try {
                              setAds((prev) =>
                                prev.map((a) => (a.id === ad.id ? { ...a, isActive: checked } : a)),
                              );
                              const res = await updateAdvertisement(ad.id, { isActive: checked });
                              if (!res.success) throw new Error(res.message);
                              toast({
                                title: 'موفقیت',
                                description: 'وضعیت تغییر کرد',
                                variant: 'success',
                              });
                            } catch (_e) {
                              setAds((prev) =>
                                prev.map((a) =>
                                  a.id === ad.id ? { ...a, isActive: !checked } : a,
                                ),
                              );
                              toast({
                                title: 'خطا',
                                description: 'خطا در بروزرسانی',
                                variant: 'destructive',
                              });
                            }
                          }}
                        />
                        <span className="text-[10px] font-bold text-neutral-500">
                          {ad.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(ad)}
                          className="size-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
                        >
                          <HiOutlinePencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="size-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center"
                        >
                          <HiOutlineTrash className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isLoading && page > 1 && <LoadingMore message="در حال دریافت تبلیغات بیشتر..." />}
              <div ref={infiniteScrollRef} className="h-4" />
            </div>
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
  form: UseFormReturn<AdvertisementFormData>;
  onSubmit: (data: AdvertisementFormData) => Promise<void>;
}) {
  type AdFormTab = 'content' | 'placement' | 'schedule';
  const [activeTab, setActiveTab] = useState<AdFormTab>('content');
  const watchedValues = form.watch();

  const handleImageUpload = (urls: string[]) => {
    form.setValue('imageUrl', urls[0]);
  };

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
          <div className="space-y-5">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700/60 pb-px mb-6 gap-2">
              {(['content', 'placement', 'schedule'] as const satisfies readonly AdFormTab[]).map(
                (tab, idx) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'pb-3 text-sm font-semibold border-b-2 transition-all duration-200 px-2 cursor-pointer',
                      activeTab === tab
                        ? 'border-primary-500 text-neutral-900 dark:text-white'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
                    )}
                  >
                    {toPersianNumber(idx + 1)}.{' '}
                    {tab === 'content' ? 'محتوا' : tab === 'placement' ? 'جایگاه' : 'زمان‌بندی'}
                  </button>
                ),
              )}
            </div>

            {activeTab === 'content' && (
              <div className="space-y-4 anim-fade-in">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان تبلیغ</FormLabel>
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
                      <FormLabel>توضیحات کوتاه</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="توضیحات جذاب و خلاصه"
                          className="w-full rounded-xl border border-neutral-200/60 bg-white/80 px-4 py-3 text-sm dark:bg-neutral-800/80"
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
                      <FormLabel>لینک مقصد</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className={inputClassName} />
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
                      <FormLabel>تصویر بنر</FormLabel>
                      <FormControl>
                        <ImageUploader
                          onImageUpload={handleImageUpload}
                          onUploadComplete={handleImageUploadComplete}
                          onImageRemove={handleImageRemove}
                          initialPreviews={field.value ? [field.value] : []}
                          folder="ads"
                          slot="ad-tile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customDimensions.imageFit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نحوه نمایش تصویر</FormLabel>
                      <Select value={field.value ?? 'ambient'} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={inputClassName}>
                            <SelectValue placeholder="انتخاب حالت نمایش" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ambient">
                            پرب (پیش‌فرض) — کل کادر پر + کل تصویر دیده می‌شود
                          </SelectItem>
                          <SelectItem value="cover">کادری — کل کادر پر، بخشی برش می‌خورد</SelectItem>
                          <SelectItem value="contain">
                            کامل — کل تصویر دیده، فراغ با گرادینت
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        ambient (YouTube/Netflix): کل محتوا دیده + کادر پر. برای لوگو/متن تبلیغ
                        ایده‌آل.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {activeTab === 'placement' && (
              <div className="space-y-6 anim-fade-in">
                <div>
                  <FormLabel className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4 block">
                    انتخاب بصری موقعیت تبلیغ (Aurora Canvas)
                  </FormLabel>
                  <div className="dash-panel p-6 bg-neutral-100/30 dark:bg-neutral-900/40 border-dashed border-2 relative overflow-hidden">
                    <div className="relative mx-auto max-w-[440px] aspect-[4/3] perspective-1000">
                      <div className="w-full h-full relative transition-transform duration-300 [transform:rotateX(15deg)_rotateY(-10deg)] hover:[transform:rotateX(0deg)_rotateY(0deg)]">
                        <div className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col">
                          <div className="h-8 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex items-center px-3 gap-1.5">
                            <div className="size-2 rounded-full bg-rose-400" />
                            <div className="size-2 rounded-full bg-amber-400" />
                            <div className="size-2 rounded-full bg-emerald-400" />
                          </div>
                          <div className="flex-1 p-3 space-y-3">
                            <button
                              type="button"
                              onClick={() => form.setValue('position', 'HEADER')}
                              className={cn(
                                'w-full h-10 rounded-lg border-2 flex items-center justify-center gap-2',
                                watchedValues.position === 'HEADER'
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-neutral-200 dark:border-neutral-700',
                              )}
                            >
                              <HiOutlineWindow className="size-4" />
                              <span className="text-[10px] font-bold">HEADER</span>
                            </button>
                            <div className="grid grid-cols-[1fr_0.4fr] gap-3 h-48">
                              <div className="space-y-3">
                                <button
                                  type="button"
                                  onClick={() => form.setValue('position', 'IN_CONTENT')}
                                  className={cn(
                                    'w-full h-24 rounded-lg border-2 flex flex-col items-center justify-center gap-2',
                                    watchedValues.position === 'IN_CONTENT'
                                      ? 'border-primary-500 bg-primary-500/10'
                                      : 'border-neutral-200 dark:border-neutral-700',
                                  )}
                                >
                                  <HiOutlineComputerDesktop className="size-5" />
                                  <span className="text-[10px] font-bold">CONTENT</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => form.setValue('position', 'BETWEEN_POSTS')}
                                  className={cn(
                                    'w-full h-16 rounded-lg border-2 flex items-center justify-center gap-2',
                                    watchedValues.position === 'BETWEEN_POSTS'
                                      ? 'border-primary-500 bg-primary-500/10'
                                      : 'border-neutral-200 dark:border-neutral-700',
                                  )}
                                >
                                  <HiOutlineRectangleStack className="size-5" />
                                  <span className="text-[10px] font-bold">FEED</span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => form.setValue('position', 'SIDEBAR')}
                                className={cn(
                                  'w-full h-full rounded-lg border-2 flex flex-col items-center justify-center gap-2',
                                  watchedValues.position === 'SIDEBAR'
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-neutral-200 dark:border-neutral-700',
                                )}
                              >
                                <HiOutlineDevicePhoneMobile className="size-5" />
                                <span className="text-[10px] font-bold [writing-mode:vertical-lr]">
                                  SIDEBAR
                                </span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => form.setValue('position', 'FOOTER')}
                              className={cn(
                                'w-full h-8 rounded-lg border-2 flex items-center justify-center gap-2',
                                watchedValues.position === 'FOOTER'
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-neutral-200 dark:border-neutral-700',
                              )}
                            >
                              <span className="text-[9px] font-bold">FOOTER</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اندازه نمایش</FormLabel>
                      <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder="انتخاب اندازه" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SMALL">کوچک</SelectItem>
                          <SelectItem value="MEDIUM">متوسط</SelectItem>
                          <SelectItem value="LARGE">بزرگ</SelectItem>
                          <SelectItem value="CUSTOM">سفارشی</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4 anim-fade-in">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاریخ شروع</FormLabel>
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
                        <FormLabel>تاریخ پایان</FormLabel>
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
                        <FormLabel>اولویت</FormLabel>
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
                      <FormItem className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-white/50 p-4 dark:bg-neutral-800/50">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="size-5"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">فعال بودن تبلیغ</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-5 mt-6 border-t border-neutral-200/60">
              {activeTab !== 'content' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'schedule' ? 'placement' : 'content')}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border"
                >
                  مرحله قبلی
                </button>
              ) : (
                <div />
              )}
              {activeTab !== 'schedule' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'content' ? 'placement' : 'schedule')}
                  className="h-10 px-6 text-xs font-semibold rounded-xl bg-primary-500 text-white"
                >
                  مرحله بعد
                </button>
              ) : (
                <SubmitButton isSubmitting={form.formState.isSubmitting} />
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-0 border border-neutral-200/60 rounded-2xl p-5 bg-neutral-50/40 dark:bg-neutral-900/20 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-neutral-500">پیش‌نمایش زنده</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                LIVE
              </span>
            </div>
            <div className="overflow-hidden rounded-xl bg-neutral-950/5 min-h-[160px] flex items-center justify-center p-3">
              {previewAd.imageUrl ? (
                <BannerADS ad={previewAd} variant="minimal" showAdLabel className="w-full" />
              ) : (
                <div className="text-center py-8 px-4">
                  <HiOutlineMegaphone className="size-10 mx-auto text-neutral-300 mb-2" />
                  <div className="text-neutral-400 text-[10px]">در انتظار محتوا...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
