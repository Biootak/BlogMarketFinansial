'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import {
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getExchangeRates,
} from '@/actions/exchange-rates';
import type { ExchangeRateData, RateType } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Loading from '@/components/Loading';

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
  } = useForm<ExchangeRateFormValues>();

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
        toast({
          title: 'موفقیت',
          description: result.message,
        });
        setExchangeRates([...exchangeRates, result.data!]);
        setShowCreateModal(false);
        reset();
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: 'خطایی در ایجاد ارز رخ داد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
      console.error('Error creating exchange rate:', error);
    }
  };

  const handleEditSubmit: SubmitHandler<ExchangeRateFormValues> = async (data) => {
    if (!editingExchangeRate) return;

    const result = await updateExchangeRate(editingExchangeRate.id, data);

    if (result.success) {
      toast({
        title: 'موفقیت',
        description: result.message,
      });
      setExchangeRates(
        exchangeRates.map((rate) => (rate.id === editingExchangeRate.id ? result.data! : rate)),
      );
      setEditingExchangeRate(null);
      reset();
    } else {
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این ارز را حذف کنید؟')) {
      const result = await deleteExchangeRate(id);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: result.message,
        });
        setExchangeRates(exchangeRates.filter((rate) => rate.id !== id));
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleImageUpload = (urls: string[]) => {
    setValue('imageUrl', urls[0]);
  };

  const handleImageRemove = () => {
    setValue('imageUrl', null);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 rtl" dir="rtl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8 text-right text-gray-800 dark:text-gray-100">
        مدیریت ارزها
      </h1>

      <div className="mb-4">
        <Button onClick={() => setShowCreateModal(true)}>افزودن ارز جدید</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">تصویر</TableHead>
            <TableHead className="text-right">نام ارز</TableHead>
            <TableHead className="text-right">نماد</TableHead>
            <TableHead className="text-right">نوع نرخ</TableHead>
            <TableHead className="text-right">نرخ خرید</TableHead>
            <TableHead className="text-right">نرخ فروش</TableHead>
            <TableHead className="text-right">نرخ پرچون</TableHead>
            <TableHead className="text-right">نرخ عمده</TableHead>
            <TableHead className="text-right">توضیحات</TableHead>
            <TableHead className="text-right">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exchangeRates.map((exchangeRate) => (
            <TableRow key={exchangeRate.id}>
              <TableCell>
                {exchangeRate.imageUrl && (
                  <img
                    src={exchangeRate.imageUrl}
                    alt={exchangeRate.currency}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
              </TableCell>
              <TableCell>{exchangeRate.name}</TableCell>
              <TableCell>{exchangeRate.currency}</TableCell>
              <TableCell>
                {exchangeRate.rateType === 'BUY_SELL' ? 'خرید/فروش' : 'پرچون/عمده'}
              </TableCell>
              <TableCell>{exchangeRate.buyRate}</TableCell>
              <TableCell>{exchangeRate.sellRate}</TableCell>
              <TableCell>{exchangeRate.singleRate}</TableCell>
              <TableCell>{exchangeRate.bulkRate}</TableCell>
              <TableCell>{exchangeRate.description}</TableCell>
              <TableCell className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingExchangeRate(exchangeRate);
                    reset();
                  }}
                >
                  ویرایش
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(exchangeRate.id)}
                >
                  حذف
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px] p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>افزودن ارز جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام ارز</Label>
              <Input
                id="name"
                {...register('name', { required: 'نام ارز الزامی است' })}
                placeholder="نام ارز"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">نماد</Label>
              <Input
                id="currency"
                {...register('currency', { required: 'نماد الزامی است' })}
                placeholder="EUR/USD"
              />
              {errors.currency && <p className="text-red-500 text-sm">{errors.currency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateType">نوع نرخ</Label>
              <Select
                onValueChange={(value: RateType) => setValue('rateType', value)}
                defaultValue="BUY_SELL"
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع نرخ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY_SELL">خرید/فروش</SelectItem>
                  <SelectItem value="SINGLE_BULK">پرچون/عمده</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rateType === 'BUY_SELL' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="buyRate">نرخ خرید</Label>
                  <Input id="buyRate" {...register('buyRate')} placeholder="نرخ خرید" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellRate">نرخ فروش</Label>
                  <Input id="sellRate" {...register('sellRate')} placeholder="نرخ فروش" />
                </div>
              </>
            )}
            {rateType === 'SINGLE_BULK' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="singleRate">نرخ پرچون</Label>
                  <Input id="singleRate" {...register('singleRate')} placeholder="نرخ پرچون" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkRate">نرخ عمده</Label>
                  <Input id="bulkRate" {...register('bulkRate')} placeholder="نرخ عمده" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">توضیحات</Label>
              <Input id="description" {...register('description')} placeholder="توضیحات" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">تصویر</Label>
              <ImageUploader onImageUpload={handleImageUpload} onImageRemove={handleImageRemove} />
            </div>
            <DialogFooter>
              <Button type="submit">ایجاد ارز</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingExchangeRate} onOpenChange={() => setEditingExchangeRate(null)}>
        <DialogContent className="sm:max-w-[425px] p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش ارز</DialogTitle>
          </DialogHeader>
          {editingExchangeRate && (
            <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام ارز</Label>
                <Input
                  id="name"
                  defaultValue={editingExchangeRate.name}
                  {...register('name', { required: 'نام ارز الزامی است' })}
                  placeholder="نام ارز"
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">نماد</Label>
                <Input
                  id="currency"
                  defaultValue={editingExchangeRate.currency}
                  {...register('currency', { required: 'نماد الزامی است' })}
                  placeholder="EUR/USD"
                />
                {errors.currency && (
                  <p className="text-red-500 text-sm">{errors.currency.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rateType">نوع نرخ</Label>
                <Select
                  onValueChange={(value: RateType) => setValue('rateType', value)}
                  defaultValue={editingExchangeRate.rateType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نوع نرخ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY_SELL">خرید/فروش</SelectItem>
                    <SelectItem value="SINGLE_BULK">پرچون/عمده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rateType === 'BUY_SELL' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="buyRate">نرخ خرید</Label>
                    <Input
                      id="buyRate"
                      defaultValue={editingExchangeRate.buyRate || ''}
                      {...register('buyRate')}
                      placeholder="نرخ خرید"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellRate">نرخ فروش</Label>
                    <Input
                      id="sellRate"
                      defaultValue={editingExchangeRate.sellRate || ''}
                      {...register('sellRate')}
                      placeholder="نرخ فروش"
                    />
                  </div>
                </>
              )}
              {rateType === 'SINGLE_BULK' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="singleRate">نرخ پرچون</Label>
                    <Input
                      id="singleRate"
                      defaultValue={editingExchangeRate.singleRate || ''}
                      {...register('singleRate')}
                      placeholder="نرخ پرچون"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkRate">نرخ عمده</Label>
                    <Input
                      id="bulkRate"
                      defaultValue={editingExchangeRate.bulkRate || ''}
                      {...register('bulkRate')}
                      placeholder="نرخ عمده"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="description">توضیحات</Label>
                <Input
                  id="description"
                  defaultValue={editingExchangeRate.description || ''}
                  {...register('description')}
                  placeholder="توضیحات"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">تصویر</Label>
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  initialPreviews={
                    editingExchangeRate.imageUrl ? [editingExchangeRate.imageUrl] : []
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">ذخیره تغییرات</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeRatesPage;
