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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { HiOutlinePencil, HiOutlineTrash, HiPlusCircle, HiMinusCircle } from 'react-icons/hi2';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HiOutlineInformationCircle } from 'react-icons/hi2';

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

  const handleRatePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split(/[\n\r]+/).filter(line => line.trim());

    if (lines.length > 1) {
      // اگر بیش از یک خط پیست شده باشد
      const newRates = lines.map(line => {
        const { title, value } = extractTitleAndValue(line);
        return { title, value };
      }).filter(rate => rate.title || rate.value); // حذف موارد خالی

      // جایگزینی همه نرخ‌های موجود با نرخ‌های جدید
      replace(newRates);
    } else {
      // اگر فقط یک خط پیست شده باشد
      const { title, value } = extractTitleAndValue(pastedText);
      if (title || value) {
        const currentField = fields[index];
        if (!currentField.title && !currentField.value) {
          // اگر فیلد خالی است، مقدار را در همان فیلد قرار می‌دهیم
          replace(fields.map((field, i) => 
            i === index ? { title, value } : field
          ));
        } else {
          // اگر فیلد خالی نیست، یک فیلد جدید اضافه می‌کنیم
          append({ title, value });
        }
      }
    }
  };

  const extractTitleAndValue = (line: string): { title: string; value: string } => {
    // حذف فاصله‌های اضافی از ابتدا و انتها
    const trimmedLine = line.trim();
    
    // جدا کردن عنوان و مقدار با الگوهای مختلف
    const patterns = [
      // الگو: عنوان | مقدار
      { regex: /^(.+?)\s*[\|:,]\s*([\d.,\/]+)\s*$/ },
      // الگو: عنوان با چند نقطه و مقدار
      { regex: /^(.+?)\.+\s*([\d.,\/]+)\s*$/ },
      // الگو: عنوان و مقدار با فاصله
      { regex: /^(.+?)\s+([\d.,\/]+)\s*$/ },
    ];

    for (const pattern of patterns) {
      const matches = trimmedLine.match(pattern.regex);
      if (matches) {
        const title = matches[1].trim();
        const value = extractValueFromText(matches[2]);
        if (title && value) {
          return { title, value };
        }
      }
    }

    // اگر هیچ الگویی مطابقت نداشت
    return { title: trimmedLine, value: '' };
  };

  const extractValueFromText = (text: string): string => {
    // تبدیل اعداد فارسی به انگلیسی
    const persianToEnglish = (str: string) => {
      const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return str.replace(/[۰-۹]/g, d => persianNumbers.indexOf(d).toString());
    };

    // پاکسازی و نرمال‌سازی متن
    const cleanText = persianToEnglish(text)
      .replace(/[^\d.,]/g, '') // حذف همه کاراکترها به جز اعداد، نقطه و کاما
      .replace(/,/g, '') // حذف کاما
      .replace(/\.(?=.*\.)/g, '') // حذف همه نقطه‌ها به جز آخرین نقطه
      .trim();

    return cleanText || '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const lines = pastedData.split(/[\n\r]/).filter(line => line.trim());
    
    if (lines.length > 1) {
      const newRates = lines.map(line => {
        const { title, value } = extractTitleAndValue(line);
        return { title, value };
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

  const handleTitlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const titles = pastedData.split(/[\n\r]/).filter(line => line.trim());
    
    if (titles.length > 1) {
      // اول همه نرخ‌های موجود رو پاک می‌کنیم
      replace([]);
      
      // برای هر عنوان یک نرخ جدید اضافه می‌کنیم
      titles.forEach(title => {
        append({ title: title.trim(), value: '' });
      });
      
      toast({
        title: 'موفقیت',
        description: `${titles.length} نرخ جدید اضافه شد`,
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

  useEffect(() => {
    if (fields.length === 0) {
      append({ title: '', value: '' });
    }
  }, [append, fields.length]);

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
                   <div className="h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                     <div className="space-y-1 px-1">
                       {rateList.rates.map((rate, index) => (
                         <div key={index} className="flex items-center gap-2 text-sm">
                           <span className="font-medium whitespace-nowrap">{rate.title}:</span>
                           <span className="whitespace-nowrap">{rate.value}</span>
                         </div>
                       ))}
                     </div>
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
                  onPaste={handleTitlePaste}
                  placeholder="مثل کردیت کارت یا نرخ بازار تهران "
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-medium">نرخ‌ها</Label>
                    <div className="hidden sm:block">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-blue-50"
                              type="button"
                            >
                              <HiOutlineInformationCircle className="h-6 w-6 text-blue-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="z-[9999] w-[280px] p-3 bg-white shadow-lg rounded-lg border border-blue-100" 
                            side="bottom"
                            sideOffset={5}
                            align="start"
                          >
                            <div className="space-y-2 text-sm">
                              <p className="font-medium border-b pb-1 text-blue-900">راهنمای درج سریع نرخ‌ها</p>
                              <div className="space-y-1.5">
                                <p>۱. از اکسل یا هر برنامه دیگر، لیست نرخ‌ها را کپی کنید</p>
                                <p>۲. در فیلد نرخ پیست (Ctrl+V) کنید</p>
                                <p>۳. هر خط به صورت خودکار به یک نرخ جدید تبدیل می‌شود</p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded-md">
                                <p className="font-medium mb-1.5">فرمت‌های قابل قبول:</p>
                                <div className="space-y-1 pr-2 text-xs">
                                  <p>- دلار | 50000</p>
                                  <p>- دلار : 50000</p>
                                  <p>- دلار , 50000</p>
                                  <p>- دلار  50000</p>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="sm:hidden">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-blue-50"
                            type="button"
                          >
                            <HiOutlineInformationCircle className="h-6 w-6 text-blue-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-right">راهنمای درج سریع نرخ‌ها</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <p>۱. از اکسل یا هر برنامه دیگر، لیست نرخ‌ها را کپی کنید</p>
                              <p>۲. در فیلد نرخ پیست (Ctrl+V) کنید</p>
                              <p>۳. هر خط به صورت خودکار به یک نرخ جدید تبدیل می‌شود</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium mb-2">فرمت‌های قابل قبول:</p>
                              <div className="space-y-1.5 pr-3">
                                <p>- دلار | 50000</p>
                                <p>- دلار : 50000</p>
                                <p>- دلار , 50000</p>
                                <p>- دلار  50000</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        replace([]);
                        append({ title: '', value: '' });
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <HiOutlineTrash className="ml-1 h-4 w-4" />
                      حذف همه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ title: '', value: '' })}
                    >
                      <HiPlusCircle className="ml-1 h-4 w-4" />
                      افزودن نرخ
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-25rem)] rounded-lg border bg-gray-50/50">
                  <div className="space-y-2 p-3 min-h-[300px]">
                    {fields.map((field, index) => (
                      <div 
                        key={field.id} 
                        className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm border border-gray-100" 
                        dir="rtl"
                      >
                        <Input
                          {...register(`rates.${index}.title` as const, {
                            required: 'عنوان نرخ الزامی است',
                          })}
                          placeholder="مثال: دلار | 50000 یا دلار: 50000"
                          className="flex-1 text-right bg-gray-50/50 focus:bg-white transition-colors"
                          dir="rtl"
                          onPaste={(e) => handleRatePaste(e, index)}
                        />
                        <Input
                          {...register(`rates.${index}.value` as const, {
                            required: 'مقدار نرخ الزامی است',
                          })}
                          placeholder="مقدار"
                          className="flex-1 text-right bg-gray-50/50 focus:bg-white transition-colors"
                          dir="rtl"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            remove(index);
                            if (fields.length === 1) {
                              append({ title: '', value: '' });
                            }
                          }}
                          className="flex-shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <HiMinusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
