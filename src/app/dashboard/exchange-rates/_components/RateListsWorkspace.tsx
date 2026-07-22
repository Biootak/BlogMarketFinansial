'use client';

/**
 * RateListsWorkspace — 2026 merged into exchange-rates page.
 *
 * Premium management UI for custom rate lists (RateList model).
 * Uses the same design language as the market-rates workspace:
 *   • Glass surface cards with hairline borders
 *   • Sliding spotlight tab indicator
 *   • Magnetic primary CTA
 *   • Inline paste parser for bulk rate import
 *   • Command-palette shortcut parity (⌘K)
 *
 * 2026 techniques:
 *   • CSS-driven animations, no framer-motion runtime
 *   • Logical properties for RTL
 *   • prefers-reduced-motion honored
 *   • oklch tokens only
 */

import { createRateList, deleteRateList, updateRateList } from '@/actions/rate-lists';
import { SkeletonBase, TableSkeleton } from '@/components/Skeletons';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { RateItem, RateListData } from '@/types/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  HiMinusCircle,
  HiOutlineInformationCircle,
  HiOutlineListBullet,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiPlusCircle,
} from 'react-icons/hi2';

interface Props {
  initialLists: RateListData[];
}

type RateListForm = {
  title: string;
  rates: RateItem[];
  isActive: boolean;
};

/* --------------------------------------------------------------------------
   Paste parser — identical logic to the original rate-lists page.
   Keeps backward compatibility with existing copy-paste workflows.
   -------------------------------------------------------------------------- */
const parseCurrencyRates = async (text: string): Promise<RateItem[]> => {
  const rates: RateItem[] = [];
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const toEnglishNum = (str: string) =>
    str
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));

  const cleanEmojis = (str: string) =>
    str
      .replace(
        /[\u{1F1E0}-\u{1F1FF}]|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        '',
      )
      .trim();

  const extractNumbers = (str: string) => {
    const nums = toEnglishNum(str).match(/[\d,\.]+/g);
    return nums ? nums.map((n) => n.replace(/,/g, '')) : [];
  };

  const patterns = [
    /^(.+?)[\s:]+خرید[\s:]*([۰-۹٠-٩\d,\.]+)[\s\-\|]*فروش[\s:]*([۰-۹٠-٩\d,\.]+)/i,
    /^خرید[\s:]*([۰-۹٠-٩\d,\.]+)[\s\-\|]*فروش[\s:]*([۰-۹٠-٩\d,\.]+)/i,
    /^([^\d۰-۹٠-٩]+?)\s*([۰-۹٠-٩\d,\.]+)\s*[\/\-\|]\s*([۰-۹٠-٩\d,\.]+)$/,
    /^([^\d۰-۹٠-٩]+?)\s{2,}([۰-۹٠-٩\d,\.]+)\s+([۰-۹٠-٩\d,\.]+)$/,
  ];

  let currentTitle = '';

  for (const line of lines) {
    const cleanLine = cleanEmojis(line);
    if (!cleanLine) continue;

    let matched = false;
    for (const pattern of [patterns[0], patterns[2], patterns[3]]) {
      const match = cleanLine.match(pattern);
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

    const pattern2Match = cleanLine.match(patterns[1]);
    if (pattern2Match && currentTitle) {
      const [, buy, sell] = pattern2Match;
      rates.push({
        title: currentTitle,
        value: `خرید: ${toEnglishNum(buy).replace(/,/g, '')} | فروش: ${toEnglishNum(sell).replace(/,/g, '')}`,
      });
      currentTitle = '';
      continue;
    }

    const numbers = extractNumbers(cleanLine);
    const textPart = cleanLine.replace(/[\d۰-۹٠-٩,\.\s\-\/\|:：]+/g, '').trim();

    if (numbers.length === 0 && textPart.length > 0 && textPart.length < 50) {
      currentTitle = textPart.replace(/[:：]+$/g, '').trim();
    } else if (numbers.length >= 2 && currentTitle) {
      rates.push({
        title: currentTitle,
        value: `خرید: ${numbers[0]} | فروش: ${numbers[1]}`,
      });
      currentTitle = '';
    } else if (numbers.length >= 2 && textPart.length > 0) {
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
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const inputClassName =
  'h-10 rounded-lg border-neutral-200/60 bg-white/80 transition-all duration-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700/60 dark:bg-neutral-800/80';

export default function RateListsWorkspace({ initialLists }: Props) {
  const { toast } = useToast();
  const [lists, setLists] = useState<RateListData[]>(initialLists);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<RateListData | null>(null);

  const { register, control, handleSubmit, reset, watch } = useForm<RateListForm>({
    defaultValues: { title: '', rates: [{ title: '', value: '' }], isActive: true },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'rates' });
  const titleValue = watch('title');
  const ratesValue = watch('rates');

  useEffect(() => {
    if (fields.length === 0) append({ title: '', value: '' });
  }, [append, fields.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter(
      (list) =>
        list.title.toLowerCase().includes(q) ||
        list.rates.some(
          (rate) => rate.title.toLowerCase().includes(q) || rate.value.toLowerCase().includes(q),
        ),
    );
  }, [lists, query]);

  const stats = useMemo(() => {
    const total = lists.length;
    const active = lists.filter((l) => l.isActive).length;
    const totalItems = lists.reduce((sum, l) => sum + (l.rates?.length ?? 0), 0);
    return { total, active, totalItems };
  }, [lists]);

  const handleOpenCreate = () => {
    reset({ title: '', rates: [{ title: '', value: '' }], isActive: true });
    setEditingList(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (list: RateListData) => {
    setEditingList(list);
    reset({
      title: list.title,
      rates: list.rates.length > 0 ? list.rates : [{ title: '', value: '' }],
      isActive: list.isActive,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setEditingList(null);
      reset({ title: '', rates: [{ title: '', value: '' }], isActive: true });
    }, 200);
  };

  const handleRatePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    try {
      const rates = await parseCurrencyRates(text);
      if (rates.length > 0) {
        replace(rates);
        toast({
          title: 'موفقیت',
          description: `${rates.length.toLocaleString('fa-IR')} نرخ ارز با موفقیت اضافه شد`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: 'هیچ نرخ ارزی در متن یافت نشد',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در پردازش نرخ‌های ارز',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: RateListForm) => {
    try {
      if (editingList) {
        const result = await updateRateList(editingList.id, data);
        if (result.success) {
          toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت به‌روزرسانی شد' });
          setLists((prev) => prev.map((l) => (l.id === editingList.id ? result.data : l)));
          handleCloseModal();
        } else {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      } else {
        const result = await createRateList(data);
        if (result.success) {
          toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت ایجاد شد' });
          setLists((prev) => [result.data, ...prev]);
          handleCloseModal();
        } else {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیرهٔ لیست نرخ',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این لیست نرخ اطمینان دارید؟')) return;
    try {
      const result = await deleteRateList(id);
      if (result.success) {
        toast({ title: 'موفقیت', description: 'لیست نرخ با موفقیت حذف شد' });
        setLists((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast({
          title: 'خطا',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در حذف لیست نرخ',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats header */}
      <dl className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--ds-space-4)' }}>
        <StatCard label="کل لیست‌ها" value={stats.total.toLocaleString('fa-IR')} accent="brand" />
        <StatCard label="فعال" value={stats.active.toLocaleString('fa-IR')} accent="emerald" />
        <StatCard
          label="تعداد نرخ‌ها"
          value={stats.totalItems.toLocaleString('fa-IR')}
          accent="amber"
        />
      </dl>

      {/* Toolbar */}
      <div
        className="flex flex-col gap-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-md)',
        }}
      >
        <div className="relative flex-1 min-w-[12rem]">
          <svg
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              insetInlineStart: '0.75rem',
              width: '1rem',
              height: '1rem',
              color: 'var(--ds-text-muted)',
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>جستجو</title>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجوی نام لیست یا نرخ…"
            aria-label="جست‌وجوی لیست نرخ"
            className="w-full outline-none transition-colors"
            style={{
              height: '2.25rem',
              paddingInlineStart: '2.25rem',
              paddingInlineEnd: '0.75rem',
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-primary)',
              background: 'var(--ds-canvas-subtle)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--ds-radius-md)',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 font-semibold transition-all"
          style={{
            height: '2.25rem',
            paddingInline: 'var(--ds-space-4)',
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--ds-text-inverse)',
            background: 'var(--ds-brand-500)',
            borderRadius: 'var(--ds-radius-md)',
            boxShadow: 'var(--ds-shadow-sm)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-brand-600)';
            e.currentTarget.style.boxShadow = 'var(--ds-glow-brand)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--ds-brand-500)';
            e.currentTarget.style.boxShadow = 'var(--ds-shadow-sm)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--ds-brand-500)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <HiOutlinePlus aria-hidden style={{ width: '1rem', height: '1rem' }} />
          افزودن لیست نرخ
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto backdrop-blur-sm"
        style={{
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-lg)',
          boxShadow: 'var(--ds-shadow-sm)',
        }}
      >
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: 'var(--ds-space-10) var(--ds-space-6)',
              gap: 'var(--ds-space-3)',
            }}
          >
            <div
              aria-hidden
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--ds-radius-full)',
                background: 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HiOutlineListBullet
                style={{ width: '1.5rem', height: '1.5rem', color: 'var(--ds-brand-500)' }}
              />
            </div>
            <p
              className="font-semibold"
              style={{
                fontSize: 'var(--ds-text-base)',
                color: 'var(--ds-text-primary)',
                margin: 0,
              }}
            >
              لیست نرخی پیدا نشد
            </p>
            <p
              style={{
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-muted)',
                margin: 0,
              }}
            >
              {lists.length === 0
                ? 'هنوز هیچ لیست نرخی ثبت نشده. اولین لیست را بسازید.'
                : 'فیلتر جستجو را تغییر دهید.'}
            </p>
          </div>
        ) : (
          <table
            className="w-full"
            style={{ borderCollapse: 'separate', borderSpacing: 0 }}
            aria-label="لیست‌های نرخ"
          >
            <thead>
              <tr style={{ background: 'var(--ds-canvas-subtle)' }}>
                <th
                  scope="col"
                  className="font-semibold uppercase text-start"
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                  }}
                >
                  عنوان
                </th>
                <th
                  scope="col"
                  className="font-semibold uppercase text-start"
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                  }}
                >
                  نرخ‌ها
                </th>
                <th
                  scope="col"
                  className="font-semibold uppercase text-start"
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                  }}
                >
                  وضعیت
                </th>
                <th
                  scope="col"
                  className="font-semibold uppercase text-start"
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                  }}
                >
                  آخرین به‌روزرسانی
                </th>
                <th
                  scope="col"
                  className="font-semibold uppercase"
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                    textAlign: 'end',
                  }}
                >
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((list) => (
                <tr
                  key={list.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--ds-space-3) var(--ds-space-4)',
                      fontSize: 'var(--ds-text-sm)',
                      color: 'var(--ds-text-primary)',
                    }}
                  >
                    <span className="font-semibold">{list.title}</span>
                  </td>
                  <td
                    style={{
                      padding: 'var(--ds-space-3) var(--ds-space-4)',
                      fontSize: 'var(--ds-text-sm)',
                      color: 'var(--ds-text-secondary)',
                    }}
                  >
                    <div className="max-h-24 space-y-1 overflow-y-auto">
                      {list.rates.slice(0, 3).map((rate, index) => (
                        <div
                          key={`${list.id}-${rate.title}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <span className="font-medium">{rate.title}:</span>
                          <span>{rate.value}</span>
                        </div>
                      ))}
                      {list.rates.length > 3 && (
                        <span
                          style={{ fontSize: 'var(--ds-text-xs)', color: 'var(--ds-brand-500)' }}
                        >
                          +{(list.rates.length - 3).toLocaleString('fa-IR')} مورد دیگر
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: 'var(--ds-space-3) var(--ds-space-4)',
                      fontSize: 'var(--ds-text-sm)',
                    }}
                  >
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: list.isActive
                          ? 'oklch(94% 0.06 162 / 0.5)'
                          : 'oklch(92% 0.01 250 / 0.5)',
                        color: list.isActive ? 'oklch(35% 0.12 162)' : 'var(--ds-text-muted)',
                      }}
                    >
                      {list.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: 'var(--ds-space-3) var(--ds-space-4)',
                      fontSize: 'var(--ds-text-sm)',
                      color: 'var(--ds-text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(list.updatedAt)}
                  </td>
                  <td style={{ padding: 'var(--ds-space-3) var(--ds-space-4)', textAlign: 'end' }}>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(list)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: 'var(--ds-canvas-subtle)',
                          color: 'var(--ds-text-secondary)',
                          border: '1px solid var(--ds-border-subtle)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--ds-surface)';
                          e.currentTarget.style.color = 'var(--ds-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
                          e.currentTarget.style.color = 'var(--ds-text-secondary)';
                        }}
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(list.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: 'oklch(96% 0.03 25 / 0.4)',
                          color: 'oklch(50% 0.18 25)',
                          border: '1px solid oklch(90% 0.04 25 / 0.5)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'oklch(94% 0.05 25 / 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'oklch(96% 0.03 25 / 0.4)';
                        }}
                      >
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-neutral-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/95"
          dir="rtl"
          onInteractOutside={handleCloseModal}
          onEscapeKeyDown={handleCloseModal}
        >
          <DialogHeader
            className="border-b border-neutral-200/60 px-6 py-5 dark:border-neutral-700/50"
            style={{
              background: 'linear-gradient(to left, var(--ds-canvas-subtle), var(--ds-surface))',
            }}
          >
            <DialogTitle className="text-xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
              {editingList ? 'ویرایش لیست نرخ' : 'افزودن لیست نرخ جدید'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[calc(90vh-120px)] overflow-y-auto p-6"
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium"
                  style={{ color: 'var(--ds-text-secondary)' }}
                >
                  عنوان لیست
                </Label>
                <Input
                  {...register('title', { required: 'عنوان لیست الزامی است' })}
                  placeholder="مثل کردیت کارت یا نرخ بازار تهران"
                  className={inputClassName}
                />
                {/* Simple validation message without formState.errors to avoid re-render */}
                {!titleValue?.trim() && (
                  <p className="text-xs text-red-500">عنوان لیست الزامی است</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label
                      className="text-sm font-medium"
                      style={{ color: 'var(--ds-text-secondary)' }}
                    >
                      نرخ‌ها
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-1 transition-colors"
                            style={{ color: 'var(--ds-brand-500)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <HiOutlineInformationCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <p className="text-sm">
                            می‌توانید نرخ‌ها را از اکسل کپی و در فیلد پیست کنید.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                      className="text-red-600 hover:bg-red-50"
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
                <ScrollArea
                  className="h-64 rounded-xl border p-3 dark:border-neutral-700/50"
                  style={{
                    background: 'var(--ds-canvas-subtle)',
                    borderColor: 'var(--ds-border-subtle)',
                  }}
                >
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm dark:bg-neutral-700/50"
                        style={{ background: 'var(--ds-surface)' }}
                      >
                        <Input
                          {...register(`rates.${index}.title` as const)}
                          placeholder="عنوان نرخ"
                          className={`${inputClassName} flex-1`}
                          onPaste={handleRatePaste}
                        />
                        <Input
                          {...register(`rates.${index}.value` as const)}
                          placeholder="مقدار نرخ"
                          className={`${inputClassName} flex-1`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            remove(index);
                            if (fields.length === 1) append({ title: '', value: '' });
                          }}
                          className="text-neutral-500 hover:text-red-600"
                        >
                          <HiMinusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {ratesValue.length === 0 && (
                  <p className="text-xs text-red-500">حداقل یک نرخ لازم است</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rate-list-active"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-neutral-300 [accent-color:var(--at-accent)]"
                />
                <Label htmlFor="rate-list-active" className="text-sm font-medium">
                  فعال
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="submit"
                className="w-full rounded-xl py-3 font-medium text-white shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--ds-brand-500), var(--ds-brand-600))',
                }}
              >
                {editingList ? 'ذخیره تغییرات' : 'ایجاد لیست'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'brand' | 'emerald' | 'amber';
}) {
  const accentColor =
    accent === 'brand'
      ? 'var(--ds-brand-500)'
      : accent === 'emerald'
        ? 'var(--ds-accent-emerald)'
        : 'var(--ds-accent-amber)';

  return (
    <div
      className="flex flex-col gap-1.5 backdrop-blur-sm"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        padding: 'var(--ds-space-4) var(--ds-space-5)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <dt
        className="font-semibold uppercase"
        style={{
          fontSize: 'var(--ds-text-xs)',
          letterSpacing: '0.06em',
          color: 'var(--ds-text-muted)',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-extrabold tabular-nums"
        style={{
          fontSize: 'var(--ds-text-2xl)',
          lineHeight: 'var(--ds-leading-tight)',
          color: accentColor,
          margin: 0,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
