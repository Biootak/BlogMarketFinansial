'use client';

import {
  createAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
} from '@/actions/advertisementActions';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import LoadingMore from '@/components/LoadingMore';
import { AdvertisementsSkeleton } from '@/components/Skeletons';
import SubmitButton from '@/components/SubmitButton';
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
import { useToast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Advertisement, CustomAdDimensions } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Trash2, Megaphone } from 'lucide-react';
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

    const validateCustomDimensions = (dimensions: any): CustomAdDimensions | undefined => {
      if (typeof dimensions === 'object' && dimensions !== null) {
        const { width, height, aspectRatio } = dimensions;
        return {
          width: width ?? undefined,
          height: height ?? undefined,
          aspectRatio: aspectRatio ?? undefined,
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
      customDimensions: validateCustomDimensions(ad.customDimensions),
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
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-6 md:p-8 lg:p-10 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30"
      dir="rtl"
    >
      {/* Header Section with Glass Effect */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              مدیریت تبلیغات
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              مشاهده و مدیریت تبلیغات سایت با رابط کاربری پیشرفته
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:min-w-[280px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی تبلیغ..."
                className="h-11 w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 pr-10 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
              />
              <svg
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button
                  onClick={openNewAdDialog}
                  className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] dark:from-blue-500 dark:to-blue-600 dark:shadow-blue-500/20 dark:hover:shadow-blue-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Plus className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="relative">افزودن تبلیغ</span>
                </button>
              </DialogTrigger>
              <DialogContent
                className="max-h-[95vh] sm:max-h-[90vh] w-[calc(100%-1rem)] max-w-3xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/95"
                dir="rtl"
              >
                <DialogHeader className="border-b border-slate-200/60 gradient-neutral-l px-6 py-5 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-800">
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingAd ? 'ویرایش تبلیغ' : 'افزودن تبلیغ جدید'}
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[calc(95vh-100px)] sm:max-h-[calc(90vh-120px)] overflow-y-auto p-6">
                  <AdvertisementForm form={form} onSubmit={onSubmit} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {isLoading && page === 1 ? (
        <AdvertisementsSkeleton />
      ) : ads.length === 0 ? (
        <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-slate-200/60 bg-white/60 p-8 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/60">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full gradient-neutral-br dark:from-slate-700 dark:to-slate-800">
              <Megaphone className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              تبلیغی یافت نشد
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              هنوز هیچ تبلیغی در سیستم ثبت نشده است.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 shadow-xl backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/60">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 bg-gradient-to-l from-slate-50/80 to-white/80 dark:border-slate-700/50 dark:from-slate-800/80 dark:to-slate-800/80">
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    تصویر
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    عنوان
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    اندازه
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    موقعیت
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    وضعیت
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                {ads.map((ad, index) => (
                  <tr
                    key={ad.id}
                    className="group transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="relative h-16 w-28 overflow-hidden rounded-xl shadow-md ring-1 ring-slate-200/60 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:ring-blue-400/50 dark:ring-slate-700/50 dark:group-hover:ring-blue-500/50">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholder-small.png';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                        {ad.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {sizeLabels[ad.size] || ad.size}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {positionLabels[ad.position] || ad.position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${
                          ad.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {ad.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(ad)}
                          className="group/btn flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100 hover:shadow-md active:scale-95 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        >
                          <Pencil className="h-4 w-4 transition-transform duration-300 group-hover/btn:rotate-12" />
                          <span>ویرایش</span>
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="group/btn flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-red-100 hover:shadow-md active:scale-95 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                          <Trash2 className="h-4 w-4 transition-transform duration-300 group-hover/btn:rotate-12" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-4 p-4 lg:hidden">
            {ads.map((ad, index) => (
              <div
                key={ad.id}
                className="group overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/80"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-4">
                  <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-slate-200/60 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg dark:ring-slate-700/50">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/placeholder-small.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {ad.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {sizeLabels[ad.size]}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold ${
                          ad.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {ad.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-200/60 pt-4 dark:border-slate-700/50">
                  <button
                    onClick={() => handleEdit(ad)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100 active:scale-95 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>ویرایش</span>
                  </button>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-red-100 active:scale-95 dark:bg-red-900/30 dark:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {isLoading && page > 1 && (
            <div className="border-t border-slate-200/60 bg-slate-50/50 p-6 text-center dark:border-slate-700/50 dark:bg-slate-800/50">
              <LoadingMore message="در حال دریافت تبلیغات بیشتر..." />
            </div>
          )}
          <div ref={infiniteScrollRef} style={{ height: '1px' }} />
        </div>
      )}
    </div>
  );
}

function AdvertisementForm({
  form,
  onSubmit,
}: { form: any; onSubmit: (data: AdvertisementFormData) => Promise<void> }) {
  const handleImageUpload = (urls: string[]) => {
    form.setValue('imageUrl', urls[0]);
  };

  const handleImageRemove = () => {
    form.setValue('imageUrl', '');
  };

  const inputClassName =
    'h-11 text-sm rounded-xl border border-slate-200/60 bg-white/80 px-4 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';
  const selectClassName =
    'h-11 text-sm rounded-xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title & Size Section */}
        <div className="space-y-6 rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white/50 p-6 shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-800/30">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">اطلاعات اصلی</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    عنوان تبلیغ
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="عنوان تبلیغ را وارد کنید"
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
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    اندازه تبلیغ
                  </FormLabel>
                  <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={selectClassName}>
                        <SelectValue placeholder="انتخاب اندازه تبلیغ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SMALL">100% * 65 (کوچک)</SelectItem>
                      <SelectItem value="MEDIUM">160 * 65 (متوسط)</SelectItem>
                      <SelectItem value="LARGE">1280 * 250 (بزرگ)</SelectItem>
                      <SelectItem value="CUSTOM">سفارشی</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {form.watch('size') === 'CUSTOM' && (
            <div className="grid gap-5 rounded-lg border border-blue-200/60 bg-blue-50/30 p-4 dark:border-blue-800/50 dark:bg-blue-900/20 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="customDimensions.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      ارتفاع سفارشی
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: 250px" {...field} className={inputClassName} />
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
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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

        {/* Position & Description Section */}
        <div className="space-y-6 rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white/50 p-6 shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-800/30">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">موقعیت و توضیحات</h3>
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  موقعیت تبلیغ
                </FormLabel>
                <Select dir="rtl" onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={selectClassName}>
                      <SelectValue placeholder="انتخاب موقعیت تبلیغ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="HEADER">سربرگ</SelectItem>
                    <SelectItem value="FOOTER">پاورقی</SelectItem>
                    <SelectItem value="SIDEBAR">نوار کناری</SelectItem>
                    <SelectItem value="IN_CONTENT">داخل محتوا</SelectItem>
                    <SelectItem value="BETWEEN_POSTS">بین پست‌ها</SelectItem>
                    <SelectItem value="CUSTOM">سفارشی</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  توضیحات
                </FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    placeholder="توضیحات تبلیغ را وارد کنید..."
                    className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Link & Image Section */}
        <div className="space-y-6 rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white/50 p-6 shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-800/30">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">لینک و تصویر</h3>
          <FormField
            control={form.control}
            name="linkUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  لینک تبلیغ
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} className={inputClassName} />
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
                <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تصویر تبلیغ
                </FormLabel>
                <FormControl>
                  <div className="rounded-xl border border-slate-200/60 bg-white/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
                    <ImageUploader
                      onImageUpload={handleImageUpload}
                      onImageRemove={handleImageRemove}
                      initialPreviews={field.value ? [field.value] : []}
                      folder="ads"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date & Settings Section */}
        <div className="space-y-6 rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white/50 p-6 shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-800/30">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">تاریخ و تنظیمات</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاریخ شروع
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
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاریخ پایان
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
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    ترتیب نمایش
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} className={inputClassName} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    وضعیت
                  </FormLabel>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 px-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:border-slate-600">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-5 w-5 rounded-md border-slate-300 text-blue-600 transition-all duration-300 hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700"
                      />
                    </FormControl>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      فعال بودن تبلیغ
                    </span>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 border-t border-slate-200/60 pt-6 dark:border-slate-700/50">
          <SubmitButton isSubmitting={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}
