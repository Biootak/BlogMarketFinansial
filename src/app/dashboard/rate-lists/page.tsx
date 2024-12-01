'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { RateListData, RateItem } from '@/types/types';
import { createRateList, updateRateList, deleteRateList, getRateLists } from '@/actions/rate-lists';
import { useToast } from '@/components/ui/use-toast';
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
import { HiOutlinePencil, HiOutlineTrash, HiPlusCircle, HiMinusCircle } from 'react-icons/hi2';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RateListsPage() {
  const [rateLists, setRateLists] = useState<RateListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRateList, setEditingRateList] = useState<RateListData | null>(null);
  const { toast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateListData>({
    defaultValues: {
      title: '',
      rates: [{ title: '', value: '' }],
      isActive: true,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'rates',
  });

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const lines = pastedData.split(/[\n\r]/).filter(line => line.trim());
    
    if (lines.length > 1) {
      const newRates = lines.map(line => {
        const [title, value] = line.split(/[,\t:|]/).map(part => part.trim());
        return { title: title || '', value: value || '' };
      });
      
      // حذف ردیف فعلی و اضافه کردن ردیف‌های جدید
      remove(index);
      replace(newRates);
      
      toast({
        title: 'موفقیت',
        description: `${newRates.length} نرخ جدید اضافه شد`,
      });
    }
  };

  const handleCreateSubmit = async (data: RateListData) => {
    try {
      const result = await createRateList(data);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'لیست نرخ با موفقیت ایجاد شد',
        });
        setRateLists([...rateLists, result.data!]);
        setShowCreateModal(false);
        reset();
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد لیست نرخ',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (data: RateListData) => {
    if (!editingRateList) return;

    try {
      const result = await updateRateList(editingRateList.id!, data);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'لیست نرخ با موفقیت به‌روزرسانی شد',
        });
        setRateLists(
          rateLists.map((list) => (list.id === editingRateList.id ? result.data! : list)),
        );
        setEditingRateList(null);
        reset();
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در به‌روزرسانی لیست نرخ',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این لیست نرخ اطمینان دارید؟')) {
      try {
        const result = await deleteRateList(id);
        if (result.success) {
          toast({
            title: 'موفقیت',
            description: 'لیست نرخ با موفقیت حذف شد',
          });
          setRateLists(rateLists.filter((list) => list.id !== id));
        } else {
          toast({
            title: 'خطا',
            description: result.message,
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'خطا',
          description: 'خطا در حذف لیست نرخ',
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    const loadRateLists = async () => {
      try {
        const data = await getRateLists();
        setRateLists(data);
      } catch (error) {
        toast({
          title: 'خطا',
          description: 'خطا در بارگیری لیست‌های نرخ',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadRateLists();
  }, []);

  if (isLoading) return <div>در حال بارگیری...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 rtl" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">مدیریت لیست‌های نرخ</h1>

      <div className="mb-4">
        <Button onClick={() => setShowCreateModal(true)}>افزودن لیست نرخ جدید</Button>
      </div>

      <div className="border rounded-lg" dir="rtl">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>نرخ‌ها</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLists.map((rateList) => (
                <TableRow key={rateList.id}>
                  <TableCell>{rateList.title}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {rateList.rates.map((rate, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="font-medium">{rate.title}:</span>
                          <span>{rate.value}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        rateList.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {rateList.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRateList(rateList);
                          reset(rateList);
                        }}
                      >
                        
                        <HiOutlinePencil className="ml-1" />
                        ویرایش
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rateList.id!)}
                      >
                        <HiOutlineTrash className="ml-1" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog
        open={showCreateModal || !!editingRateList}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingRateList(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRateList ? 'ویرایش لیست نرخ' : 'افزودن لیست نرخ جدید'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(editingRateList ? handleEditSubmit : handleCreateSubmit)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان لیست</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'عنوان لیست الزامی است' })}
                  className="mt-1"
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>نرخ‌ها</Label>
                  <p className="text-sm text-gray-500">برای افزودن چندین نرخ، از اکسل کپی و در فیلد عنوان پیست کنید</p>
                </div>
                <ScrollArea className="h-64 border rounded-lg p-4">
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2 space-x-reverse">
                        <Input
                          {...register(`rates.${index}.title` as const, {
                            required: 'عنوان نرخ الزامی است',
                          })}
                          placeholder="عنوان نرخ"
                          className="flex-1"
                          onPaste={(e) => handlePaste(e, index)}
                        />
                        <Input
                          {...register(`rates.${index}.value` as const, {
                            required: 'مقدار نرخ الزامی است',
                          })}
                          placeholder="مقدار"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => remove(index)}
                          className="flex-shrink-0"
                        >
                          <HiMinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ title: '', value: '' })}
                  className="mt-2"
                >
                  <HiPlusCircle className="ml-1" />
                  افزودن نرخ جدید
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit">{editingRateList ? 'ذخیره تغییرات' : 'ایجاد لیست'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
