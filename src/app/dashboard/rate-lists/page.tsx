'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { HiOutlinePencil, HiOutlineTrash, HiPlusCircle, HiMinusCircle, HiOutlineListBullet } from 'react-icons/hi2';
import type { RateListData, RateItem } from '@/types/types';
import { createRateList, updateRateList, deleteRateList, getRateLists } from '@/actions/rate-lists';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HiOutlineInformationCircle } from 'react-icons/hi2';
import { TableSkeleton, SkeletonBase } from '@/components/Skeletons';
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
  ActionButton,
  PrimaryActionButton,
  EmptyState,
  FilterSelect,
} from '@/components/Dashboard/shared/DashboardTableWrapper';

const parseCurrencyRates = async (text: string): Promise<RateItem[]> => {
  const rates: RateItem[] = [];
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);

  // تبدیل اعداد فارسی/عربی به انگلیسی
  const toEnglishNum = (str: string) =>
    str.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
       .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));

  // حذف ایموجی‌ها و پرچم‌ها
  const cleanEmojis = (str: string) =>
    str.replace(/[\u{1F1E0}-\u{1F1FF}]|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

  // استخراج همه اعداد از رشته
  const extractNumbers = (str: string) => {
    const nums = toEnglishNum(str).match(/[\d,\.]+/g);
    return nums ? nums.map((n) => n.replace(/,/g, '')) : [];
  };

  // الگوهای مختلف برای تشخیص
  const patterns = [
    // الگو 1: "دلار: خرید 58000 فروش 59000" یا "دلار خرید: 58000 فروش: 59000"
    /^(.+?)[\s:]+خرید[\s:]*([۰-۹٠-٩\d,\.]+)[\s\-\|]*فروش[\s:]*([۰-۹٠-٩\d,\.]+)/i,
    // الگو 2: "خرید: 58000 فروش: 59000" بدون اسم (اسم از خط قبل)
    /^خرید[\s:]*([۰-۹٠-٩\d,\.]+)[\s\-\|]*فروش[\s:]*([۰-۹٠-٩\d,\.]+)/i,
    // الگو 3: "دلار 58000 / 59000" یا "دلار 58000 - 59000"
    /^([^\d۰-۹٠-٩]+?)\s*([۰-۹٠-٩\d,\.]+)\s*[\/\-\|]\s*([۰-۹٠-٩\d,\.]+)$/,
    // الگو 4: "دلار    58000    59000" (تب یا فاصله زیاد)
    /^([^\d۰-۹٠-٩]+?)\s{2,}([۰-۹٠-٩\d,\.]+)\s+([۰-۹٠-٩\d,\.]+)$/,
  ];

  let currentTitle = '';

  for (let i = 0; i < lines.length; i++) {
    const line = cleanEmojis(lines[i]);
    if (!line) continue;

    let matched = false;

    // تست الگوی 1 و 3 و 4 (با اسم)
    for (const pattern of [patterns[0], patterns[2], patterns[3]]) {
      const match = line.match(pattern);
      if (match) {
        const [, title, buy, sell] = match;
        const cleanTitle = title.replace(/[:：\-\s]+$/g, '').trim();
        if (cleanTitle) {
          rates.push({
            title: cleanTitle,
            value: `خرید: ${toEnglishNum(buy).replace(/,/g, '')} | فروش: ${toEnglishNum(sell).replace(/,/g, '')}`,
          });
          matched = true;
          currentTitle = '';
          break;
        }
      }
    }

    if (matched) continue;

    // تست الگوی 2 (بدون اسم - از خط قبل)
    const pattern2Match = line.match(patterns[1]);
    if (pattern2Match && currentTitle) {
      const [, buy, sell] = pattern2Match;
      rates.push({
        title: currentTitle,
        value: `خرید: ${toEnglishNum(buy).replace(/,/g, '')} | فروش: ${toEnglishNum(sell).replace(/,/g, '')}`,
      });
      currentTitle = '';
      continue;
    }

    // اگه خط فقط متن بود (بدون عدد یا با عدد کم)، احتمالاً اسم ارزه
    const numbers = extractNumbers(line);
    const textPart = line.replace(/[\d۰-۹٠-٩,\.\s\-\/\|:：]+/g, '').trim();

    if (numbers.length === 0 && textPart.length > 0 && textPart.length < 50) {
      currentTitle = textPart.replace(/[:：]+$/g, '').trim();
    }
    // اگه دو عدد داریم و اسم قبلی هست
    else if (numbers.length >= 2 && currentTitle) {
      rates.push({
        title: currentTitle,
        value: `خرید: ${numbers[0]} | فروش: ${numbers[1]}`,
      });
      currentTitle = '';
    }
    // اگه دو عدد داریم و متن هم داریم
    else if (numbers.length >= 2 && textPart.length > 0) {
      rates.push({
        title: textPart.replace(/[:：]+$/g, '').trim(),
        value: `خرید: ${numbers[0]} | فروش: ${numbers[1]}`,
      });
    }
  }

  return rates;
};

const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
};


const RateListsPage = () => {
  const [rateLists, setRateLists] = useState<RateListData[]>([]);
  const [filteredRateLists, setFilteredRateLists] = useState<RateListData[]>([]);
  const [filterOptions, setFilterOptions] = useState({ search: '', currency: 'all', sortBy: 'newest', dateRange: 'all' });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRateList, setEditingRateList] = useState<RateListData | null>(null);
  const { toast } = useToast();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<RateListData>({
    defaultValues: { title: '', rates: [{ title: '', value: '' }], isActive: true },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'rates' });

  const handleRatePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    try {
      const rates = await parseCurrencyRates(text);
      if (rates.length > 0) {
        replace(rates);
        toast({ title: 'موفقیت', description: `${rates.length} نرخ ارز با موفقیت اضافه شد`, variant: 'success' });
      } else {
        toast({ title: 'خطا', description: 'هیچ نرخ ارزی در متن یافت نشد', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطا', description: 'خطا در پردازش نرخ‌های ارز', variant: 'destructive' });
    }
  };

  const handleCreateSubmit = async (data: RateListData) => {
    try {
      const result = await createRateList(data);
      if (result.success) {
        toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت ایجاد شد' });
        setRateLists([...rateLists, result.data!]);
        setShowCreateModal(false);
        reset();
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطا', description: 'خطا در ایجاد لیست نرخ', variant: 'destructive' });
    }
  };

  const handleEditSubmit = async (data: RateListData) => {
    if (!editingRateList) return;
    try {
      const result = await updateRateList(editingRateList.id!, data);
      if (result.success) {
        toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت به‌روزرسانی شد' });
        setRateLists(rateLists.map((list) => (list.id === editingRateList.id ? result.data! : list)));
        setEditingRateList(null);
        reset();
      } else {
        toast({ title: 'خطا', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطا', description: 'خطا در به‌روزرسانی لیست نرخ', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این لیست نرخ اطمینان دارید؟')) {
      try {
        const result = await deleteRateList(id);
        if (result.success) {
          toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت حذف شد' });
          setRateLists(rateLists.filter((list) => list.id !== id));
        } else {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'خطا', description: 'خطا در حذف لیست نرخ', variant: 'destructive' });
      }
    }
  };

  useEffect(() => {
    const loadRateLists = async () => {
      try {
        const data = await getRateLists();
        setRateLists(data);
      } catch (error) {
        toast({ title: 'خطا', description: 'خطا در بارگیری لیست‌های نرخ', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadRateLists();
  }, []);

  useEffect(() => {
    if (fields.length === 0) append({ title: '', value: '' });
  }, [append, fields.length]);


  useEffect(() => {
    let result = [...rateLists];
    if (filterOptions.search) {
      const searchLower = filterOptions.search.toLowerCase();
      result = result.filter((list) => list.title.toLowerCase().includes(searchLower) || list.rates.some((rate) => rate.title.toLowerCase().includes(searchLower) || rate.value.toLowerCase().includes(searchLower)));
    }
    if (filterOptions.dateRange !== 'all') {
      const getDateLimit = () => {
        const now = new Date();
        switch (filterOptions.dateRange) {
          case 'today': now.setHours(0, 0, 0, 0); return now;
          case 'week': now.setDate(now.getDate() - 7); return now;
          case 'month': now.setMonth(now.getMonth() - 1); return now;
          default: return new Date(0);
        }
      };
      result = result.filter((list) => new Date(list.updatedAt || '') > getDateLimit());
    }
    result.sort((a, b) => {
      switch (filterOptions.sortBy) {
        case 'newest': return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
        case 'oldest': return new Date(a.updatedAt || '').getTime() - new Date(b.updatedAt || '').getTime();
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        default: return 0;
      }
    });
    setFilteredRateLists(result);
  }, [filterOptions, rateLists]);

  const currencyOptions = [
    { value: 'all', label: 'همه ارزها' }, { value: 'USD', label: 'دلار' }, { value: 'EUR', label: 'یورو' },
    { value: 'GBP', label: 'پوند' }, { value: 'AED', label: 'درهم' }, { value: 'TRY', label: 'لیر' },
  ];
  const dateOptions = [
    { value: 'all', label: 'همه زمان‌ها' }, { value: 'today', label: 'امروز' },
    { value: 'week', label: 'هفته اخیر' }, { value: 'month', label: 'ماه اخیر' },
  ];
  const sortOptions = [
    { value: 'newest', label: 'جدیدترین' }, { value: 'oldest', label: 'قدیمی‌ترین' },
    { value: 'title-asc', label: 'عنوان (صعودی)' }, { value: 'title-desc', label: 'عنوان (نزولی)' },
  ];

  const inputClassName = 'h-11 rounded-xl border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';

  if (isLoading) return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBase className="h-7 w-44 rounded-lg" />
          <SkeletonBase className="h-4 w-56 rounded-md" />
        </div>
        <SkeletonBase className="h-10 w-36 rounded-xl" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-3 sm:p-5 lg:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardPageHeader title="مدیریت لیست‌های نرخ" description="مشاهده و مدیریت لیست‌های نرخ ارز">
          <DashboardSearchInput value={filterOptions.search} onChange={(v) => setFilterOptions((p) => ({ ...p, search: v }))} placeholder="جستجو..." />
          <FilterSelect value={filterOptions.currency} onChange={(v) => setFilterOptions((p) => ({ ...p, currency: v }))} options={currencyOptions} />
          <FilterSelect value={filterOptions.dateRange} onChange={(v) => setFilterOptions((p) => ({ ...p, dateRange: v }))} options={dateOptions} />
          <FilterSelect value={filterOptions.sortBy} onChange={(v) => setFilterOptions((p) => ({ ...p, sortBy: v }))} options={sortOptions} />
          <PrimaryActionButton onClick={() => setShowCreateModal(true)}>
            <HiPlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>افزودن لیست نرخ</span>
          </PrimaryActionButton>
        </DashboardPageHeader>

        {filteredRateLists.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-12 text-center shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/80">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-700 dark:to-slate-800">
              <HiOutlineListBullet className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">لیست نرخی یافت نشد</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">هنوز هیچ لیست نرخی در سیستم ثبت نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredRateLists.map((rateList) => (
              <div
                key={rateList.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-800/90 dark:hover:shadow-slate-900/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate">
                        {rateList.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(rateList.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingRateList(rateList); reset(rateList); }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                      >
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rateList.id!)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200/40 bg-slate-50/50 p-3 dark:border-slate-700/40 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <div className="h-1 w-1 rounded-full bg-slate-400" />
                      <span>نرخ‌های ثبت شده</span>
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                      {rateList.rates.slice(0, 4).map((rate, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/40 bg-white/60 px-3 py-2 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/60"
                        >
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {rate.title}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                            {rate.value}
                          </span>
                        </div>
                      ))}
                      {rateList.rates.length > 4 && (
                        <div className="flex items-center justify-center rounded-lg border border-blue-200/40 bg-blue-50/50 px-3 py-2 dark:border-blue-800/40 dark:bg-blue-950/30">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            + {rateList.rates.length - 4} مورد دیگر
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>فعال</span>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {rateList.rates.length} نرخ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreateModal || !!editingRateList} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); setEditingRateList(null); reset(); } }}>
        <DialogContent className="max-h-[95vh] sm:max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/95" dir="rtl">
          <DialogHeader className="border-b border-slate-200/60 bg-gradient-to-l from-slate-50/80 to-white/80 px-5 py-5 sm:px-7 sm:py-6 backdrop-blur-sm dark:border-slate-700/50 dark:from-slate-800/80 dark:to-slate-800/80">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-50 dark:to-slate-300">
              {editingRateList ? 'ویرایش لیست نرخ' : 'افزودن لیست نرخ جدید'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(editingRateList ? handleEditSubmit : handleCreateSubmit)} className="max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)] overflow-y-auto p-5 sm:p-7">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">عنوان لیست</Label>
                <Input 
                  {...register('title', { required: 'عنوان لیست الزامی است' })} 
                  placeholder="مثل کردیت کارت یا نرخ بازار تهران" 
                  className="h-12 rounded-xl border-slate-200/60 bg-white/80 px-4 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-950/50" 
                />
                {errors.title && <p className="text-xs font-medium text-red-500 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.title.message}
                </p>}
              </div>

              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">نرخ‌ها</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-all duration-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950">
                            <HiOutlineInformationCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs rounded-xl border-slate-200/60 bg-white/95 p-3.5 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/95">
                          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">می‌توانید نرخ‌ها را از اکسل کپی و در فیلد پیست کنید.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { replace([]); append({ title: '', value: '' }); }} 
                      className="h-9 rounded-xl border-red-200/60 bg-white/80 text-red-600 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-950/50"
                    >
                      <HiOutlineTrash className="ml-1.5 h-4 w-4" />حذف همه
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ title: '', value: '' })}
                      className="h-9 rounded-xl border-slate-200/60 bg-white/80 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:border-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                    >
                      <HiPlusCircle className="ml-1.5 h-4 w-4" />افزودن نرخ
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-72 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-slate-100/50 p-4 shadow-inner dark:border-slate-700/50 dark:from-slate-900/80 dark:to-slate-800/50">
                  <div className="space-y-2.5">
                    {fields.map((field, index) => (
                      <div key={field.id} className="group flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/90">
                        <Input 
                          {...register(`rates.${index}.title` as const)} 
                          placeholder="عنوان نرخ" 
                          className="h-11 flex-1 rounded-lg border-slate-200/60 bg-white/80 px-3.5 text-sm transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-950/50" 
                          onPaste={handleRatePaste} 
                        />
                        <Input 
                          {...register(`rates.${index}.value` as const)} 
                          placeholder="مقدار نرخ" 
                          className="h-11 flex-1 rounded-lg border-slate-200/60 bg-white/80 px-3.5 text-sm transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:focus:border-blue-500 dark:focus:ring-blue-950/50" 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { remove(index); if (fields.length === 1) append({ title: '', value: '' }); }} 
                          className="h-11 w-11 shrink-0 rounded-lg text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <HiMinusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="mt-7">
              <Button 
                type="submit" 
                className="h-12 w-full rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 dark:from-blue-500 dark:to-blue-600 dark:shadow-blue-500/20 dark:hover:shadow-blue-500/30"
              >
                {editingRateList ? 'ذخیره تغییرات' : 'ایجاد لیست'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateListsPage;
