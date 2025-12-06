'use client';

import {
  createExchangeRate,
  deleteExchangeRate,
  getExchangeRates,
  updateExchangeRate,
} from '@/actions/exchange-rates';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { ExchangeRatesSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { ExchangeRateData, RateType } from '@/types/types';
import type React from 'react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Pencil, Plus, Trash2, DollarSign } from 'lucide-react';

interface ExchangeRateFormValues {
  name: string;
  currency: string;
  rateType: RateType;
  buyRate: string;
  sellRate: string;
  singleRate: string;
  bulkRate: string;
  imageUrl: string | null;
  description: string | null;
}

const ExchangeRatesPage: React.FC = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingExchangeRate, setEditingExchangeRate] = useState<ExchangeRateData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExchangeRateFormValues>({
    defaultValues: { rateType: 'BUY_SELL' },
  });

  const rateType = watch('rateType');

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      const result = await getExchangeRates();
      setExchangeRates(result);
      setIsLoading(false);
    };
    fetchRates();
  }, []);

  const handleCreateSubmit: SubmitHandler<ExchangeRateFormValues> = async (data) => {
    try {
      const result = await createExchangeRate(data);
      if (result.success) {
        toast({ title: 'موفقیت', description: result.message });
        setExchangeRates([...exchangeRates, result.data!]);
        setShowCreateModal(false);
        reset();
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (_error: any) {
      toast({ title: 'خطا', description: 'خطایی در ایجاد ارز رخ داد.', variant: 'destructive' });
    }
  };

  const handleEditSubmit: SubmitHandler<ExchangeRateFormValues> = async (data) => {
    if (!editingExchangeRate) return;
    const result = await updateExchangeRate(editingExchangeRate.id, data);
    if (result.success) {
      toast({ title: 'موفقیت', description: result.message });
      setExchangeRates(
        exchangeRates.map((rate) => (rate.id === editingExchangeRate.id ? result.data! : rate)),
      );
      setEditingExchangeRate(null);
      reset();
    } else {
      toast({ title: 'خطا', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این ارز را حذف کنید؟')) {
      const result = await deleteExchangeRate(id);
      if (result.success) {
        toast({ title: 'موفقیت', description: result.message });
        setExchangeRates(exchangeRates.filter((rate) => rate.id !== id));
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    }
  };

  const handleImageUpload = (urls: string[]) => setValue('imageUrl', urls[0]);
  const handleImageRemove = () => setValue('imageUrl', null);

  const handleEdit = (exchangeRate: ExchangeRateData) => {
    const sanitizedExchangeRate = Object.fromEntries(
      Object.entries(exchangeRate).map(([key, value]) => [key, value === null ? '' : value]),
    ) as ExchangeRateFormValues;
    setEditingExchangeRate(exchangeRate);
    reset(sanitizedExchangeRate);
  };

  if (isLoading) return <ExchangeRatesSkeleton />;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-6 lg:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20"
      dir="rtl"
    >
      {/* Header Section with Glass Effect */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            مدیریت ارزها
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            مشاهده و مدیریت نرخ ارزها و رمزارزها
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] dark:from-blue-500 dark:to-blue-600"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Plus className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative">افزودن ارز جدید</span>
        </button>
      </div>

      {exchangeRates.length === 0 ? (
        <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-200/60 bg-white/60 p-12 shadow-xl shadow-slate-200/50 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-slate-950/50">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full gradient-neutral-br p-8 dark:from-slate-800 dark:to-slate-700">
              <DollarSign className="h-16 w-16 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">ارزی یافت نشد</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                هنوز هیچ ارزی در سیستم ثبت نشده است. برای شروع یک ارز جدید اضافه کنید.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 dark:shadow-slate-950/50">
          {/* Grid Layout for Cards */}
          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exchangeRates.map((exchangeRate) => (
              <div
                key={exchangeRate.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:scale-[1.02] hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-200/40 dark:border-slate-800/60 dark:from-slate-900 dark:to-slate-800/50 dark:shadow-slate-950/40 dark:hover:border-blue-700/60 dark:hover:shadow-blue-900/40"
              >
                {/* Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Content */}
                <div className="relative space-y-5">
                  {/* Icon & Badge Row */}
                  <div className="flex items-start justify-between">
                    {/* Currency Icon */}
                    <div className="relative">
                      {exchangeRate.imageUrl ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-lg ring-2 ring-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl dark:ring-slate-800">
                          <img
                            src={exchangeRate.imageUrl}
                            alt={exchangeRate.currency}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:from-blue-200 group-hover:to-blue-300 dark:from-blue-900/50 dark:to-blue-800/50 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/60">
                          <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </div>

                    {/* Rate Type Badge */}
                    <span className="inline-flex items-center rounded-xl bg-gradient-to-l from-blue-100 to-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm dark:from-blue-900/40 dark:to-blue-800/40 dark:text-blue-300">
                      {exchangeRate.rateType === 'BUY_SELL' ? 'خرید/فروش' : 'پرچون/عمده'}
                    </span>
                  </div>

                  {/* Currency Info */}
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {exchangeRate.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {exchangeRate.currency}
                    </p>
                  </div>

                  {/* Rates Display */}
                  <div className="space-y-2.5 rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/50">
                    {exchangeRate.rateType === 'BUY_SELL' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            نرخ خرید
                          </span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {exchangeRate.buyRate || '-'}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-l from-transparent via-slate-300 to-transparent dark:via-slate-700" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            نرخ فروش
                          </span>
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            {exchangeRate.sellRate || '-'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            نرخ پرچون
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {exchangeRate.singleRate || '-'}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-l from-transparent via-slate-300 to-transparent dark:via-slate-700" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            نرخ عمده
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {exchangeRate.bulkRate || '-'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEdit(exchangeRate)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/40 active:scale-[0.98] dark:from-blue-500 dark:to-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>ویرایش</span>
                    </button>
                    <button
                      onClick={() => handleDelete(exchangeRate.id)}
                      className="flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-rose-600 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-rose-300 hover:bg-rose-50 hover:shadow-md active:scale-[0.98] dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="max-h-[95vh] sm:max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-900/95"
          dir="rtl"
        >
          <DialogHeader className="border-b border-slate-200/60 gradient-neutral-l px-6 py-6 dark:border-slate-800/60 dark:from-slate-900 dark:to-slate-900">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              افزودن ارز جدید
            </DialogTitle>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              اطلاعات ارز یا رمزارز جدید را وارد کنید
            </p>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(handleCreateSubmit)}
            className="max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-160px)] space-y-6 overflow-y-auto p-6"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  نام ارز
                </Label>
                <Input
                  {...register('name', { required: 'نام ارز الزامی است' })}
                  placeholder="مثال: دلار آمریکا"
                  className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                />
                {errors.name && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  نماد ارز
                </Label>
                <Input
                  {...register('currency', { required: 'ارز الزامی است' })}
                  placeholder="مثال: USD"
                  className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                />
                {errors.currency && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.currency.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                نوع نرخ
              </Label>
              <Select
                onValueChange={(value: RateType) => {
                  setValue('rateType', value);
                  if (value === 'SINGLE_BULK') {
                    setValue('buyRate', '');
                    setValue('sellRate', '');
                  } else {
                    setValue('singleRate', '');
                    setValue('bulkRate', '');
                  }
                }}
                defaultValue="BUY_SELL"
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30">
                  <SelectValue placeholder="انتخاب نوع نرخ" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200/60 bg-white dark:border-slate-700/60 dark:bg-slate-800">
                  <SelectItem value="BUY_SELL" className="rounded-lg">
                    خرید/فروش
                  </SelectItem>
                  <SelectItem value="SINGLE_BULK" className="rounded-lg">
                    پرچون/عمده
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rateType !== 'SINGLE_BULK' && (
              <div className="grid gap-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-rose-50/50 p-5 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-rose-950/20 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    نرخ خرید
                  </Label>
                  <Input
                    {...register('buyRate')}
                    placeholder="مثال: 42,500"
                    className="h-12 rounded-xl border-emerald-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-emerald-900/40 dark:bg-slate-900/60 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                    نرخ فروش
                  </Label>
                  <Input
                    {...register('sellRate')}
                    placeholder="مثال: 43,000"
                    className="h-12 rounded-xl border-rose-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-rose-900/40 dark:bg-slate-900/60 dark:focus:border-rose-500 dark:focus:ring-rose-900/30"
                  />
                </div>
              </div>
            )}

            {rateType === 'SINGLE_BULK' && (
              <div className="grid gap-6 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-5 dark:border-blue-900/30 dark:from-blue-950/20 dark:to-purple-950/20 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    نرخ پرچون
                  </Label>
                  <Input
                    {...register('singleRate')}
                    placeholder="مثال: 42,500"
                    className="h-12 rounded-xl border-blue-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-blue-900/40 dark:bg-slate-900/60 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                    نرخ عمده
                  </Label>
                  <Input
                    {...register('bulkRate')}
                    placeholder="مثال: 42,000"
                    className="h-12 rounded-xl border-purple-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-purple-900/40 dark:bg-slate-900/60 dark:focus:border-purple-500 dark:focus:ring-purple-900/30"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                توضیحات
              </Label>
              <Input
                {...register('description')}
                placeholder="توضیحات اختیاری درباره این ارز"
                className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                تصویر نماد
              </Label>
              <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  folder="general"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] dark:from-blue-500 dark:to-blue-600"
              >
                ایجاد ارز جدید
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingExchangeRate} onOpenChange={() => setEditingExchangeRate(null)}>
        <DialogContent
          className="max-h-[95vh] sm:max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-900/95"
          dir="rtl"
        >
          <DialogHeader className="border-b border-slate-200/60 gradient-neutral-l px-6 py-6 dark:border-slate-800/60 dark:from-slate-900 dark:to-slate-900">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              ویرایش ارز
            </DialogTitle>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              اطلاعات ارز را ویرایش کنید
            </p>
          </DialogHeader>
          {editingExchangeRate && (
            <form
              onSubmit={handleSubmit(handleEditSubmit)}
              className="max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-160px)] space-y-6 overflow-y-auto p-6"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نام ارز
                  </Label>
                  <Input
                    {...register('name', { required: 'نام ارز الزامی است' })}
                    placeholder="مثال: دلار آمریکا"
                    className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                  />
                  {errors.name && (
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نماد ارز
                  </Label>
                  <Input
                    {...register('currency', { required: 'ارز الزامی است' })}
                    placeholder="مثال: USD"
                    className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                  />
                  {errors.currency && (
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      {errors.currency.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  نوع نرخ
                </Label>
                <Select
                  onValueChange={(value: RateType) => {
                    setValue('rateType', value);
                    if (value === 'SINGLE_BULK') {
                      setValue('buyRate', '');
                      setValue('sellRate', '');
                    } else {
                      setValue('singleRate', '');
                      setValue('bulkRate', '');
                    }
                  }}
                  defaultValue={editingExchangeRate.rateType}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30">
                    <SelectValue placeholder="انتخاب نوع نرخ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200/60 bg-white dark:border-slate-700/60 dark:bg-slate-800">
                    <SelectItem value="BUY_SELL" className="rounded-lg">
                      خرید/فروش
                    </SelectItem>
                    <SelectItem value="SINGLE_BULK" className="rounded-lg">
                      پرچون/عمده
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rateType !== 'SINGLE_BULK' && (
                <div className="grid gap-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-rose-50/50 p-5 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-rose-950/20 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      نرخ خرید
                    </Label>
                    <Input
                      {...register('buyRate')}
                      placeholder="مثال: 42,500"
                      className="h-12 rounded-xl border-emerald-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-emerald-900/40 dark:bg-slate-900/60 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                      نرخ فروش
                    </Label>
                    <Input
                      {...register('sellRate')}
                      placeholder="مثال: 43,000"
                      className="h-12 rounded-xl border-rose-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-rose-900/40 dark:bg-slate-900/60 dark:focus:border-rose-500 dark:focus:ring-rose-900/30"
                    />
                  </div>
                </div>
              )}

              {rateType === 'SINGLE_BULK' && (
                <div className="grid gap-6 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-5 dark:border-blue-900/30 dark:from-blue-950/20 dark:to-purple-950/20 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      نرخ پرچون
                    </Label>
                    <Input
                      {...register('singleRate')}
                      placeholder="مثال: 42,500"
                      className="h-12 rounded-xl border-blue-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-blue-900/40 dark:bg-slate-900/60 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                      نرخ عمده
                    </Label>
                    <Input
                      {...register('bulkRate')}
                      placeholder="مثال: 42,000"
                      className="h-12 rounded-xl border-purple-200/60 bg-white/90 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-purple-900/40 dark:bg-slate-900/60 dark:focus:border-purple-500 dark:focus:ring-purple-900/30"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  توضیحات
                </Label>
                <Input
                  {...register('description')}
                  placeholder="توضیحات اختیاری درباره این ارز"
                  className="h-12 rounded-xl border-slate-200/60 bg-white/80 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تصویر نماد
                </Label>
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
                  <ImageUploader
                    onImageUpload={handleImageUpload}
                    onImageRemove={handleImageRemove}
                    initialPreviews={
                      editingExchangeRate.imageUrl ? [editingExchangeRate.imageUrl] : []
                    }
                    folder="general"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] dark:from-blue-500 dark:to-blue-600"
                >
                  ذخیره تغییرات
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeRatesPage;
