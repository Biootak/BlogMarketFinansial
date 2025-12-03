'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus, HiOutlineCurrencyDollar } from 'react-icons/hi2';
import {
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getExchangeRates,
} from '@/actions/exchange-rates';
import type { ExchangeRateData, RateType } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Loading from '@/components/Loading';
import {
  DashboardPageHeader,
  DashboardTableContainer,
  DashboardTable,
  DashboardTableHeader,
  DashboardTableHead,
  DashboardTableBody,
  DashboardTableRow,
  DashboardTableCell,
  ActionButton,
  PrimaryActionButton,
  EmptyState,
} from '@/components/Dashboard/shared/DashboardTableWrapper';

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

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<ExchangeRateFormValues>({
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
    } catch (error: any) {
      toast({ title: 'خطا', description: 'خطایی در ایجاد ارز رخ داد.', variant: 'destructive' });
    }
  };

  const handleEditSubmit: SubmitHandler<ExchangeRateFormValues> = async (data) => {
    if (!editingExchangeRate) return;
    const result = await updateExchangeRate(editingExchangeRate.id, data);
    if (result.success) {
      toast({ title: 'موفقیت', description: result.message });
      setExchangeRates(exchangeRates.map((rate) => (rate.id === editingExchangeRate.id ? result.data! : rate)));
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
      Object.entries(exchangeRate).map(([key, value]) => [key, value === null ? '' : value])
    ) as ExchangeRateFormValues;
    setEditingExchangeRate(exchangeRate);
    reset(sanitizedExchangeRate);
  };

  const inputClassName = 'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';

  if (isLoading) return <Loading />;


  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 p-4 sm:p-6 lg:p-8 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-950/20" dir="rtl">
      <DashboardPageHeader title="مدیریت ارزها" description="مشاهده و مدیریت نرخ ارزها">
        <PrimaryActionButton onClick={() => setShowCreateModal(true)}>
          <HiOutlinePlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span>افزودن ارز</span>
        </PrimaryActionButton>
      </DashboardPageHeader>

      {exchangeRates.length === 0 ? (
        <DashboardTableContainer>
          <EmptyState
            title="ارزی یافت نشد"
            description="هنوز هیچ ارزی در سیستم ثبت نشده است."
            icon={<HiOutlineCurrencyDollar className="h-8 w-8 text-neutral-400" />}
          />
        </DashboardTableContainer>
      ) : (
        <DashboardTableContainer>
          <DashboardTable>
            <DashboardTableHeader>
              <tr>
                <DashboardTableHead>نماد</DashboardTableHead>
                <DashboardTableHead>نام</DashboardTableHead>
                <DashboardTableHead hidden>ارز</DashboardTableHead>
                <DashboardTableHead hidden>نوع نرخ</DashboardTableHead>
                <DashboardTableHead>مقادیر</DashboardTableHead>
                <DashboardTableHead>عملیات</DashboardTableHead>
              </tr>
            </DashboardTableHeader>
            <DashboardTableBody>
              {exchangeRates.map((exchangeRate) => (
                <DashboardTableRow key={exchangeRate.id}>
                  <DashboardTableCell>
                    {exchangeRate.imageUrl ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white shadow-md dark:ring-neutral-700">
                        <img src={exchangeRate.imageUrl} alt={exchangeRate.currency} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
                        <HiOutlineCurrencyDollar className="h-5 w-5" />
                      </div>
                    )}
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{exchangeRate.name}</span>
                  </DashboardTableCell>
                  <DashboardTableCell hidden>
                    <span className="text-neutral-600 dark:text-neutral-400">{exchangeRate.currency}</span>
                  </DashboardTableCell>
                  <DashboardTableCell hidden>
                    <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      {exchangeRate.rateType === 'BUY_SELL' ? 'خرید/فروش' : 'پرچون/عمده'}
                    </span>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    {exchangeRate.rateType === 'BUY_SELL' ? (
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400">خرید: {exchangeRate.buyRate || '-'}</span>
                        <span className="text-red-600 dark:text-red-400">فروش: {exchangeRate.sellRate || '-'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 text-sm">
                        <span>پرچون: {exchangeRate.singleRate || '-'}</span>
                        <span>عمده: {exchangeRate.bulkRate || '-'}</span>
                      </div>
                    )}
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex items-center gap-2">
                      <ActionButton variant="edit" onClick={() => handleEdit(exchangeRate)}>
                        <HiOutlinePencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">ویرایش</span>
                      </ActionButton>
                      <ActionButton variant="delete" onClick={() => handleDelete(exchangeRate.id)}>
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">حذف</span>
                      </ActionButton>
                    </div>
                  </DashboardTableCell>
                </DashboardTableRow>
              ))}
            </DashboardTableBody>
          </DashboardTable>
        </DashboardTableContainer>
      )}


      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
          <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">افزودن ارز جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateSubmit)} className="max-h-[calc(90vh-120px)] space-y-5 overflow-y-auto p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نام ارز</Label>
                <Input {...register('name', { required: 'نام ارز الزامی است' })} placeholder="نام ارز" className={inputClassName} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ارز</Label>
                <Input {...register('currency', { required: 'ارز الزامی است' })} placeholder="تومان به افغانی" className={inputClassName} />
                {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نوع نرخ</Label>
              <Select onValueChange={(value: RateType) => { setValue('rateType', value); if (value === 'SINGLE_BULK') { setValue('buyRate', ''); setValue('sellRate', ''); } else { setValue('singleRate', ''); setValue('bulkRate', ''); } }} defaultValue="BUY_SELL">
                <SelectTrigger className={inputClassName}><SelectValue placeholder="انتخاب نوع نرخ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY_SELL">خرید/فروش</SelectItem>
                  <SelectItem value="SINGLE_BULK">پرچون/عمده</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rateType !== 'SINGLE_BULK' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ خرید</Label>
                  <Input {...register('buyRate')} placeholder="نرخ خرید" className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ فروش</Label>
                  <Input {...register('sellRate')} placeholder="نرخ فروش" className={inputClassName} />
                </div>
              </div>
            )}
            {rateType === 'SINGLE_BULK' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ پرچون</Label>
                  <Input {...register('singleRate')} placeholder="نرخ پرچون" className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ عمده</Label>
                  <Input {...register('bulkRate')} placeholder="نرخ عمده" className={inputClassName} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">توضیحات</Label>
              <Input {...register('description')} placeholder="توضیحات" className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تصویر</Label>
              <ImageUploader onImageUpload={handleImageUpload} onImageRemove={handleImageRemove} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 py-3 font-medium text-white shadow-lg">ایجاد ارز</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Edit Modal */}
      <Dialog open={!!editingExchangeRate} onOpenChange={() => setEditingExchangeRate(null)}>
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
          <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">ویرایش ارز</DialogTitle>
          </DialogHeader>
          {editingExchangeRate && (
            <form onSubmit={handleSubmit(handleEditSubmit)} className="max-h-[calc(90vh-120px)] space-y-5 overflow-y-auto p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نام ارز</Label>
                  <Input {...register('name', { required: 'نام ارز الزامی است' })} placeholder="نام ارز" className={inputClassName} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ارز</Label>
                  <Input {...register('currency', { required: 'ارز الزامی است' })} placeholder="تومان به دلار" className={inputClassName} />
                  {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نوع نرخ</Label>
                <Select onValueChange={(value: RateType) => { setValue('rateType', value); if (value === 'SINGLE_BULK') { setValue('buyRate', ''); setValue('sellRate', ''); } else { setValue('singleRate', ''); setValue('bulkRate', ''); } }} defaultValue={editingExchangeRate.rateType}>
                  <SelectTrigger className={inputClassName}><SelectValue placeholder="انتخاب نوع نرخ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY_SELL">خرید/فروش</SelectItem>
                    <SelectItem value="SINGLE_BULK">پرچون/عمده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rateType !== 'SINGLE_BULK' && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ خرید</Label>
                    <Input {...register('buyRate')} placeholder="نرخ خرید" className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ فروش</Label>
                    <Input {...register('sellRate')} placeholder="نرخ فروش" className={inputClassName} />
                  </div>
                </div>
              )}
              {rateType === 'SINGLE_BULK' && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ پرچون</Label>
                    <Input {...register('singleRate')} placeholder="نرخ پرچون" className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ عمده</Label>
                    <Input {...register('bulkRate')} placeholder="نرخ عمده" className={inputClassName} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">توضیحات</Label>
                <Input {...register('description')} placeholder="توضیحات" className={inputClassName} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تصویر</Label>
                <ImageUploader onImageUpload={handleImageUpload} onImageRemove={handleImageRemove} initialPreviews={editingExchangeRate.imageUrl ? [editingExchangeRate.imageUrl] : []} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 py-3 font-medium text-white shadow-lg">ذخیره تغییرات</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeRatesPage;
