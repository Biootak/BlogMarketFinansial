'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import {
  getExchangeRates,
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
} from '@/actions/exchange-rates';
import type { ExchangeRateData } from '@/types/types';
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
import Loading from '@/components/Loading';

interface ExchangeRateFormValues {
  name: string;
  currency: string;
  buyRate: number;
  sellRate: number;
  imageUrl: string | null;
  minimumAmount: string | null;
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
  } = useForm<ExchangeRateFormValues>();

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
            <TableHead>تصویر</TableHead>
            <TableHead>نام</TableHead>
            <TableHead>ارز</TableHead>
            <TableHead>نرخ خرید</TableHead>
            <TableHead>نرخ فروش</TableHead>
            <TableHead>حداقل مبلغ</TableHead>
            <TableHead>عملیات</TableHead>
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
              <TableCell>{exchangeRate.buyRate}</TableCell>
              <TableCell>{exchangeRate.sellRate}</TableCell>
              <TableCell>{exchangeRate.minimumAmount}</TableCell>
              <TableCell className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingExchangeRate(exchangeRate);
                    reset(exchangeRate);
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
              <Label htmlFor="name">نام</Label>
              <Input
                id="name"
                {...register('name', { required: 'نام الزامی است' })}
                placeholder="نام"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">ارز</Label>
              <Input
                id="currency"
                {...register('currency', { required: 'ارز الزامی است' })}
                placeholder="ارز"
              />
              {errors.currency && <p className="text-red-500 text-sm">{errors.currency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyRate">نرخ خرید</Label>
              <Input
                id="buyRate"
                type="number"
                {...register('buyRate', {
                  required: 'نرخ خرید الزامی است',
                  valueAsNumber: true,
                })}
                placeholder="نرخ خرید"
              />
              {errors.buyRate && <p className="text-red-500 text-sm">{errors.buyRate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellRate">نرخ فروش</Label>
              <Input
                id="sellRate"
                type="number"
                {...register('sellRate', {
                  required: 'نرخ فروش الزامی است',
                  valueAsNumber: true,
                })}
                placeholder="نرخ فروش"
              />
              {errors.sellRate && <p className="text-red-500 text-sm">{errors.sellRate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumAmount">حداقل مبلغ</Label>
              <Input
                id="minimumAmount"
                {...register('minimumAmount', {
                  required: 'حداقل مبلغ الزامی است',
                })}
                placeholder=" حداقل مبلغ"
              />
              {errors.sellRate && <p className="text-red-500 text-sm">{errors.sellRate.message}</p>}
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
                <Label htmlFor="name">نام</Label>
                <Input
                  id="name"
                  defaultValue={editingExchangeRate.name}
                  {...register('name', { required: 'نام الزامی است' })}
                  placeholder="نام"
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">ارز</Label>
                <Input
                  id="currency"
                  defaultValue={editingExchangeRate.currency}
                  {...register('currency', { required: 'ارز الزامی است' })}
                  placeholder="ارز"
                />
                {errors.currency && (
                  <p className="text-red-500 text-sm">{errors.currency.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyRate">نرخ خرید</Label>
                <Input
                  id="buyRate"
                  type="number"
                  defaultValue={editingExchangeRate.buyRate}
                  {...register('buyRate', {
                    required: 'نرخ خرید الزامی است',
                    valueAsNumber: true,
                  })}
                  placeholder="نرخ خرید"
                />
                {errors.buyRate && <p className="text-red-500 text-sm">{errors.buyRate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellRate">نرخ فروش</Label>
                <Input
                  id="sellRate"
                  type="number"
                  defaultValue={editingExchangeRate.sellRate}
                  {...register('sellRate', {
                    required: 'نرخ فروش الزامی است',
                    valueAsNumber: true,
                  })}
                  placeholder="نرخ فروش"
                />
                {errors.sellRate && (
                  <p className="text-red-500 text-sm">{errors.sellRate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumAmount">حداقل مبلغ</Label>
                <Input
                  id="minimumAmount"
                  {...register('minimumAmount', {
                    required: 'حداقل مبلغ الزامی است',
                  })}
                  placeholder=" حداقل مبلغ"
                />
                {errors.sellRate && (
                  <p className="text-red-500 text-sm">{errors.sellRate.message}</p>
                )}
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
