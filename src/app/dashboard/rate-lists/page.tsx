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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HiOutlineInformationCircle } from 'react-icons/hi2';
import Loading from '@/components/Loading';
import { loadPatternsFromDB, savePatternsGroupToDB } from '@/actions/currency-patterns';

const parseCurrencyRates = async (text: string): Promise<RateItem[]> => {
  console.log('=== شروع پردازش متن ===');
  console.log('متن ورودی:', text);

  const rates: RateItem[] = [];
  let currentTitle = '';

  // تقسیم متن به خطوط و حذف خطوط خالی
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  console.log('تعداد خطوط:', lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`\nپردازش خط ${i + 1}:`, line);

    // تشخیص عنوان با استفاده از پرچم کشورها
    const countryFlags = '🇺🇲|🇪🇺|🇬🇧|🇨🇭|🇦🇺|🇨🇦|🇷🇺|🇦🇪|🇸🇦|🇹🇷|🇮🇷|🇮🇳|🇵🇰';
    if (new RegExp(countryFlags, 'u').test(line)) {
      // حذف ایموجی‌ها و دونقطه و تمیز کردن عنوان
      currentTitle = line.replace(new RegExp(countryFlags, 'gu'), '').replace(':', '').trim();
      console.log('عنوان جدید یافت شد:', currentTitle);
      continue;
    }

    // تشخیص نرخ‌های خرید و فروش
    if (line.includes('خرید:') && line.includes('فروش:')) {
      try {
        console.log('خط حاوی نرخ یافت شد:', line);

        // تبدیل اعداد فارسی به انگلیسی
        const persianToEnglish = (str: string) => {
          return str.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728));
        };

        // استخراج نرخ‌های خرید و فروش
        const buyMatch = line.match(/خرید:\s*([\d۰-۹\.,]+)/);
        const sellMatch = line.match(/فروش:\s*([\d۰-۹\.,]+)/);

        if (buyMatch && sellMatch) {
          const buyRate = persianToEnglish(buyMatch[1].trim());
          const sellRate = persianToEnglish(sellMatch[1].trim());

          console.log('نرخ خرید:', buyRate);
          console.log('نرخ فروش:', sellRate);

          if (currentTitle && buyRate && sellRate) {
            const rateItem = {
              title: currentTitle,
              value: `خرید: ${buyRate} | فروش: ${sellRate}`,
            };
            rates.push(rateItem);
            console.log('نرخ جدید اضافه شد:', rateItem);
          }
        }
      } catch (error) {
        console.error('خطا در پردازش خط:', error);
      }
    }
  }

  console.log('=== پایان پردازش ===');
  console.log('تعداد نرخ‌های استخراج شده:', rates.length);
  console.log('نرخ‌های نهایی:', rates);

  return rates;
};

const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'نامشخص';
  const d = new Date(date);
  // تبدیل به تاریخ شمسی
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat('fa-IR', options).format(d);
};

const RateListsPage = () => {
  const [rateLists, setRateLists] = useState<RateListData[]>([]);
  const [filteredRateLists, setFilteredRateLists] = useState<RateListData[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    search: '',
    currency: 'all',
    sortBy: 'newest',
    dateRange: 'all', // all, today, week, month
  });
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

  const handleRatePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');

    try {
      console.log('=== شروع پردازش پیست ===');
      console.log('متن ورودی:', text);

      const rates = await parseCurrencyRates(text);
      console.log('نرخ‌های پردازش شده:', rates);

      if (rates.length > 0) {
        console.log('در حال ذخیره نرخ‌ها...');
        replace(rates);
        toast({
          title: 'موفقیت',
          description: `${rates.length} نرخ ارز با موفقیت اضافه شد`,
          variant: 'success',
        });
        console.log('نرخ‌ها با موفقیت ذخیره شدند');
      } else {
        console.log('هیچ نرخی یافت نشد');
        toast({
          title: 'خطا',
          description: 'هیچ نرخ ارزی در متن یافت نشد',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('خطا در پردازش نرخ‌ها:', error);
      toast({
        title: 'خطا',
        description: 'خطا در پردازش نرخ‌های ارز',
        variant: 'destructive',
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

  // اضافه کردن تابع فیلتر
  const applyFilters = () => {
    let result = [...rateLists];

    // فیلتر جستجو
    if (filterOptions.search) {
      const searchLower = filterOptions.search.toLowerCase();
      result = result.filter(
        (list) =>
          list.title.toLowerCase().includes(searchLower) ||
          list.rates.some(
            (rate) =>
              rate.title.toLowerCase().includes(searchLower) ||
              rate.value.toLowerCase().includes(searchLower),
          ),
      );
    }

    // فیلتر نوع ارز
    if (filterOptions.currency !== 'all') {
      const currencyMap: { [key: string]: string[] } = {
        USD: ['دلار', 'دالر آمریکا', 'USD'],
        EUR: ['یورو', 'EUR'],
        GBP: ['پوند', 'GBP'],
        AED: ['درهم', 'AED'],
        TRY: ['لیر', 'لیره', 'TRY'],
        IRR: ['تومان', 'ریال', 'IRR'],
        PKR: ['کلدار', 'روپیه پاکستان', 'PKR'],
        INR: ['روپیه هند', 'INR'],
        RUB: ['روبل', 'RUB'],
        CHF: ['فرانک', 'CHF'],
        AUD: ['دلار استرالیا', 'AUD'],
        CAD: ['دلار کانادا', 'CAD'],
        SAR: ['ریال سعودی', 'SAR'],
      };

      const currencyKeywords = currencyMap[filterOptions.currency] || [];
      const hasMatchingCurrency = result.some((list) =>
        list.rates.some((rate) =>
          currencyKeywords.some((keyword) =>
            rate.title.toLowerCase().includes(keyword.toLowerCase()),
          ),
        ),
      );

      if (!hasMatchingCurrency) {
        return [];
      }
    }

    // فیلتر تاریخ
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      const getDateLimit = () => {
        switch (filterOptions.dateRange) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
          case 'week':
            const week = new Date();
            week.setDate(week.getDate() - 7);
            return week;
          case 'month':
            const month = new Date();
            month.setMonth(month.getMonth() - 1);
            return month;
          default:
            return new Date(0);
        }
      };
      const dateLimit = getDateLimit();
      result = result.filter((list) => new Date(list.updatedAt || '') > dateLimit);
    }

    // مرتب‌سازی
    result.sort((a, b) => {
      switch (filterOptions.sortBy) {
        case 'newest':
          return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
        case 'oldest':
          return new Date(a.updatedAt || '').getTime() - new Date(b.updatedAt || '').getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'rates-count':
          return b.rates.length - a.rates.length;
        default:
          return 0;
      }
    });

    setFilteredRateLists(result);
  };

  // اعمال فیلترها هر بار که فیلترها یا لیست اصلی تغییر می‌کند
  useEffect(() => {
    applyFilters();
  }, [filterOptions, rateLists]);

  if (isLoading) return <Loading />;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 rtl" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">مدیریت لیست‌های نرخ</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
        >
          <HiPlusCircle className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          افزودن لیست نرخ
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* جستجو */}
          <Input
            placeholder="جستجو در عنوان و نرخ‌ها..."
            value={filterOptions.search}
            onChange={(e) => setFilterOptions((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full sm:w-64 text-right"
            dir="rtl"
          />

          {/* فیلتر نوع ارز */}
          <select
            className="border rounded-md p-2 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right appearance-none relative bg-white"
            value={filterOptions.currency}
            onChange={(e) => setFilterOptions((prev) => ({ ...prev, currency: e.target.value }))}
            dir="rtl"
            style={{ backgroundPosition: '0.5rem center' }}
          >
            <option value="all">همه ارزها</option>
            <option value="USD">دلار</option>
            <option value="EUR">یورو</option>
            <option value="GBP">پوند</option>
            <option value="AED">درهم</option>
            <option value="TRY">لیر</option>
            <option value="IRR">تومان</option>
            <option value="PKR">کلدار</option>
            <option value="INR">روپیه هند</option>
            <option value="RUB">روبل</option>
            <option value="CHF">فرانک</option>
            <option value="AUD">دلار استرالیا</option>
            <option value="CAD">دلار کانادا</option>
            <option value="SAR">ریال سعودی</option>
          </select>

          {/* فیلتر بازه زمانی */}
          <select
            className="border rounded-md p-2 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right appearance-none relative bg-white"
            value={filterOptions.dateRange}
            onChange={(e) => setFilterOptions((prev) => ({ ...prev, dateRange: e.target.value }))}
            dir="rtl"
            style={{ backgroundPosition: '0.5rem center' }}
          >
            <option value="all">همه زمان‌ها</option>
            <option value="today">امروز</option>
            <option value="week">هفته اخیر</option>
            <option value="month">ماه اخیر</option>
          </select>

          {/* مرتب‌سازی */}
          <select
            className="border rounded-md p-2 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right appearance-none relative bg-white"
            value={filterOptions.sortBy}
            onChange={(e) => setFilterOptions((prev) => ({ ...prev, sortBy: e.target.value }))}
            dir="rtl"
            style={{ backgroundPosition: '0.5rem center' }}
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="title-asc">عنوان (صعودی)</option>
            <option value="title-desc">عنوان (نزولی)</option>
            <option value="rates-count">تعداد نرخ‌ها</option>
          </select>
        </div>
      </div>

      {/* نمایش موبایل */}
      <div className="md:hidden space-y-4">
        {filteredRateLists.map((rateList) => (
          <div key={rateList.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{rateList.title}</h3>
              <span className="text-xs text-gray-500">{formatDate(rateList.updatedAt)}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-[200px] overflow-y-auto">
              {rateList.rates.map((rate, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm font-medium">{rate.title}</span>
                  <span className="text-sm text-gray-600">{rate.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setEditingRateList(rateList);
                  reset(rateList);
                }}
              >
                <HiOutlinePencil className="ml-1 h-4 w-4" />
                ویرایش
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleDelete(rateList.id!)}
              >
                <HiOutlineTrash className="ml-1 h-4 w-4" />
                حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* نمایش دسکتاپ و تبلت */}
      <div className="hidden md:block border rounded-lg">
        <ScrollArea className="h-[calc(100vh-22rem)]">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">عنوان</TableHead>
                <TableHead className="w-2/4">نرخ‌ها</TableHead>
                <TableHead className="w-1/4">آخرین به‌روزرسانی</TableHead>
                <TableHead className="w-1/8">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRateLists.map((rateList) => (
                <TableRow key={rateList.id}>
                  <TableCell className="align-top py-4">{rateList.title}</TableCell>
                  <TableCell className="align-top py-4">
                    <div className="max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 pr-2">
                      <div className="space-y-1.5">
                        {rateList.rates.map((rate, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="font-medium min-w-[100px]">{rate.title}:</span>
                            <span>{rate.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4 text-sm text-gray-500">
                    {formatDate(rateList.updatedAt)}
                  </TableCell>
                  <TableCell className="align-top py-4">
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
            <DialogTitle>
              {editingRateList ? 'ویرایش لیست نرخ' : 'افزودن لیست نرخ جدید'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(editingRateList ? handleEditSubmit : handleCreateSubmit)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان لیست</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'عنوان لیست الزامی است' })}
                  className="mt-1"
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
                              <p className="font-medium border-b pb-1 text-blue-900">
                                راهنمای درج سریع نرخ‌ها
                              </p>
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
                                  <p>- دلار 50000</p>
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
                                <p>- دلار 50000</p>
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
                          onPaste={(e) => handleRatePaste(e)}
                        />
                        <Input
                          {...register(`rates.${index}.value` as const, {
                            required: 'مقدار نرخ الزامی است',
                          })}
                          placeholder="مقدار نرخ"
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
};

export default RateListsPage;
