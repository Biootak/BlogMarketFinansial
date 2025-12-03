'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineMegaphone } from 'react-icons/hi2';
import {
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
} from '@/actions/advertisementActions';
import type { Advertisement, AdSize, AdPosition, CustomAdDimensions } from '@/types/types';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import SubmitButton from '@/components/SubmitButton';
import LoadingMore from '@/components/LoadingMore';
import { AdvertisementsSkeleton } from '@/components/Skeletons';
import {
  DashboardPageHeader,
  DashboardSearchInput,
  DashboardTableContainer,
  DashboardTable,
  DashboardTableHeader,
  DashboardTableHead,
  DashboardTableBody,
  DashboardTableRow,
  DashboardTableCell,
  StatusBadge,
  ActionButton,
  PrimaryActionButton,
  EmptyState,
} from '@/components/Dashboard/shared/DashboardTableWrapper';

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
  customDimensions: z.object({
    width: z.string().optional(),
    height: z.string().optional(),
    aspectRatio: z.string().optional(),
  }).optional(),
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
    [toast]
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 p-4 sm:p-6 lg:p-8 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-950/20" dir="rtl">
      <DashboardPageHeader title="مدیریت تبلیغات" description="مشاهده و مدیریت تبلیغات سایت">
        <DashboardSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="جستجوی تبلیغ..."
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <PrimaryActionButton onClick={openNewAdDialog}>
              <HiOutlinePlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span>افزودن تبلیغ</span>
            </PrimaryActionButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
            <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
              <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {editingAd ? 'ویرایش تبلیغ' : 'افزودن تبلیغ جدید'}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
              <AdvertisementForm form={form} onSubmit={onSubmit} />
            </div>
          </DialogContent>
        </Dialog>
      </DashboardPageHeader>

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
                <DashboardTableHead hidden>وضعیت</DashboardTableHead>
                <DashboardTableHead>عملیات</DashboardTableHead>
              </tr>
            </DashboardTableHeader>
            <DashboardTableBody>
              {ads.map((ad) => (
                <DashboardTableRow key={ad.id}>
                  <DashboardTableCell>
                    <div className="relative h-16 w-28 overflow-hidden rounded-xl ring-1 ring-neutral-200/60 dark:ring-neutral-700/50">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                    <StatusBadge
                      status={ad.isActive ? 'فعال' : 'غیرفعال'}
                      variant={ad.isActive ? 'success' : 'default'}
                    />
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

  const inputClassName = 'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';
  const selectClassName = 'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">عنوان</FormLabel>
                <FormControl>
                  <Input placeholder="عنوان تبلیغ" {...field} className={inputClassName} />
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">اندازه تبلیغ</FormLabel>
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
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="customDimensions.width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">عرض سفارشی</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: 300px یا 100%" {...field} className={inputClassName} />
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
                  <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ارتفاع سفارشی</FormLabel>
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
                  <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نسبت تصویر</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: 16/9" {...field} className={inputClassName} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">موقعیت تبلیغ</FormLabel>
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
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">توضیحات</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  placeholder="توضیحات تبلیغ"
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
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">لینک</FormLabel>
              <FormControl>
                <Input placeholder="لینک تبلیغ" {...field} className={inputClassName} />
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
              <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تصویر تبلیغ</FormLabel>
              <FormControl>
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  initialPreviews={field.value ? [field.value] : []}
                  folder="ads"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تاریخ شروع</FormLabel>
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تاریخ پایان</FormLabel>
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
                <FormLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ترتیب نمایش</FormLabel>
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
                    className="h-5 w-5 rounded-md border-neutral-300 text-primary-600 transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  />
                </FormControl>
                <FormLabel className="!mt-0 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  فعال بودن تبلیغ
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4">
          <SubmitButton isSubmitting={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}
