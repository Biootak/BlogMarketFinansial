'use client';

import BannerADS from '@/components/BannerADS/BannerADS';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import LoadingMore from '@/components/LoadingMore';
import SubmitButton from '@/components/SubmitButton';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
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
import { cn, toPersianNumber } from '@/lib/utils';
import type { Advertisement, CustomAdDimensions } from '@/types/types';
import type { UseFormReturn } from 'react-hook-form';
import { HiOutlineComputerDesktop, HiOutlineDevicePhoneMobile, HiOutlineMegaphone, HiOutlineRectangleStack, HiOutlineWindow } from 'react-icons/hi2';
import { useState } from 'react';

export interface AdvertisementFormProps {
  form: UseFormReturn<AdvertisementFormData>;
  onSubmit: (data: AdvertisementFormData) => Promise<void>;
}

/* Re-export the schema + type so the page can import them from here */
import { z } from 'zod';

export const advertisementSchema = z.object({
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

export type AdvertisementFormData = z.infer<typeof advertisementSchema>;

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

export { sizeLabels, positionLabels };

/**
 * AdvertisementForm — ۳-step wizard با live preview sticky.
 *
 * Tab 1: content (title, description, link, image, imageFit)
 * Tab 2: placement (visual canvas + size)
 * Tab 3: schedule (dates, order, isActive)
 */
export function AdvertisementForm({ form, onSubmit }: AdvertisementFormProps) {
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
                  <div className="text-neutral-400 text-[10px]">در انتظار محتوا…</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}