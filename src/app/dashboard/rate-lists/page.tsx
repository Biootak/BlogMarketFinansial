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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      <DashboardPageHeader title="مدیریت لیست‌های نرخ" description="مشاهده و مدیریت لیست‌های نرخ ارز">
        <DashboardSearchInput value={filterOptions.search} onChange={(v) => setFilterOptions((p) => ({ ...p, search: v }))} placeholder="جستجو..." />
        <FilterSelect value={filterOptions.currency} onChange={(v) => setFilterOptions((p) => ({ ...p, currency: v }))} options={currencyOptions} />
        <FilterSelect value={filterOptions.dateRange} onChange={(v) => setFilterOptions((p) => ({ ...p, dateRange: v }))} options={dateOptions} />
        <FilterSelect value={filterOptions.sortBy} onChange={(v) => setFilterOptions((p) => ({ ...p, sortBy: v }))} options={sortOptions} />
        <PrimaryActionButton onClick={() => setShowCreateModal(true)}>
          <HiPlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span>افزودن لیست نرخ</span>
        </PrimaryActionButton>
      </DashboardPageHeader>

      {filteredRateLists.length === 0 ? (
        <DashboardTableContainer>
          <EmptyState title="لیست نرخی یافت نشد" description="هنوز هیچ لیست نرخی در سیستم ثبت نشده است." icon={<HiOutlineListBullet className="h-8 w-8 text-neutral-400" />} />
        </DashboardTableContainer>
      ) : (
        <DashboardTableContainer>
          <DashboardTable>
            <DashboardTableHeader>
              <tr>
                <DashboardTableHead>عنوان</DashboardTableHead>
                <DashboardTableHead>نرخ‌ها</DashboardTableHead>
                <DashboardTableHead hidden>آخرین به‌روزرسانی</DashboardTableHead>
                <DashboardTableHead>عملیات</DashboardTableHead>
              </tr>
            </DashboardTableHeader>
            <DashboardTableBody>
              {filteredRateLists.map((rateList) => (
                <DashboardTableRow key={rateList.id}>
                  <DashboardTableCell>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{rateList.title}</span>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="max-h-24 space-y-1 overflow-y-auto pr-2">
                      {rateList.rates.slice(0, 3).map((rate, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{rate.title}:</span>
                          <span className="text-neutral-500 dark:text-neutral-400">{rate.value}</span>
                        </div>
                      ))}
                      {rateList.rates.length > 3 && (
                        <span className="text-xs text-primary-500">+{rateList.rates.length - 3} مورد دیگر</span>
                      )}
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell hidden>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(rateList.updatedAt)}</span>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex items-center gap-2">
                      <ActionButton variant="edit" onClick={() => { setEditingRateList(rateList); reset(rateList); }}>
                        <HiOutlinePencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">ویرایش</span>
                      </ActionButton>
                      <ActionButton variant="delete" onClick={() => handleDelete(rateList.id!)}>
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


      <Dialog open={showCreateModal || !!editingRateList} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); setEditingRateList(null); reset(); } }}>
        <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95" dir="rtl">
          <DialogHeader className="border-b border-neutral-200/60 bg-gradient-to-l from-neutral-50 to-white px-6 py-5 dark:border-neutral-700/50 dark:from-neutral-800 dark:to-neutral-800">
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {editingRateList ? 'ویرایش لیست نرخ' : 'افزودن لیست نرخ جدید'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(editingRateList ? handleEditSubmit : handleCreateSubmit)} className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">عنوان لیست</Label>
                <Input {...register('title', { required: 'عنوان لیست الزامی است' })} placeholder="مثل کردیت کارت یا نرخ بازار تهران" className={inputClassName} />
                {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ‌ها</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <HiOutlineInformationCircle className="h-4 w-4 text-primary-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <p className="text-sm">می‌توانید نرخ‌ها را از اکسل کپی و در فیلد پیست کنید.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { replace([]); append({ title: '', value: '' }); }} className="text-red-600 hover:bg-red-50">
                      <HiOutlineTrash className="ml-1 h-4 w-4" />حذف همه
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', value: '' })}>
                      <HiPlusCircle className="ml-1 h-4 w-4" />افزودن نرخ
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 dark:border-neutral-700/50 dark:bg-neutral-800/50">
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm dark:bg-neutral-700/50">
                        <Input {...register(`rates.${index}.title` as const)} placeholder="عنوان نرخ" className={`${inputClassName} flex-1`} onPaste={handleRatePaste} />
                        <Input {...register(`rates.${index}.value` as const)} placeholder="مقدار نرخ" className={`${inputClassName} flex-1`} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => { remove(index); if (fields.length === 1) append({ title: '', value: '' }); }} className="text-neutral-500 hover:text-red-600">
                          <HiMinusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" className="w-full rounded-xl bg-gradient-to-l from-primary-500 to-primary-600 py-3 font-medium text-white shadow-lg">
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
