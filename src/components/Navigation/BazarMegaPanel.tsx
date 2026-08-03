'use client';
import { type ParsedRateItem, groupRateItems } from '@/lib/rateItem';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { RateListData } from '@/types/types';
import { ArrowUpRight, Banknote, Coins, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

interface BazarMegaPanelProps {
  rateLists: RateListData[];
  /** لینک پایه برای مشاهده همه. پیش‌فرض `/money-transfer`. */
  viewAllHref?: string;
  /** callback برای بستن پنل (مثلاً وقتی روی لینک کلیک شد). */
  onNavigate?: () => void;
}

interface CategoryColumn {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  bgClass: string;
  textClass: string;
  /** کلیدواژه برای فیلتر عنوان آیتم */
  itemFilter?: (title: string) => boolean;
  /** کلیدواژه برای فیلتر عنوان لیست منبع */
  listFilter?: (title: string) => boolean;
  /** آیا در ستون فقط لیست‌های فیلترشده، یا همه نمایش داده بشه */
  scope: 'lists' | 'items';
  limit: number;
}

const CURRENCY_REGEX =
  /دلار|یورو|پوند|درهم|لیر|فرانک|افغانی|ین|روبل|ریال|usd|eur|gbp|aed|chf|cny|jpy|afghani/i;
const GOLD_REGEX = /طلا|سکه|گرم|انس|نقره|gold|coin|silver/i;

const COLUMNS: CategoryColumn[] = [
  {
    id: 'forex',
    title: 'ارز آزاد',
    description: 'دلار، یورو و سایر ارزها',
    icon: <Banknote className="h-3.5 w-3.5" strokeWidth={2.25} />,
    accent: '#10b981',
    bgClass: 'bg-emerald-500/8',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    itemFilter: (t) => CURRENCY_REGEX.test(t),
    scope: 'items',
    limit: 6,
  },
  {
    id: 'gold',
    title: 'طلا و سکه',
    description: 'نرخ لحظه‌ای بازار داخلی',
    icon: <Coins className="h-3.5 w-3.5" strokeWidth={2.25} />,
    accent: '#f59e0b',
    bgClass: 'bg-amber-500/8',
    textClass: 'text-amber-700 dark:text-amber-300',
    itemFilter: (t) => GOLD_REGEX.test(t),
    scope: 'items',
    limit: 6,
  },
  {
    id: 'sara',
    title: 'صرافی‌ها',
    description: 'سارای شاهزاده، نرخ تهران، رسمی',
    icon: <Banknote className="h-3.5 w-3.5" strokeWidth={2.25} />,
    accent: '#06b6d4',
    bgClass: 'bg-cyan-500/8',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    listFilter: (t) => /سارا|شاهزاده|sara|shahzadeh|تهران|tehran|ملی|melli|صرافی/i.test(t),
    scope: 'lists',
    limit: 4,
  },
];

export default function BazarMegaPanel({
  rateLists,
  viewAllHref = '/money-transfer',
  onNavigate,
}: BazarMegaPanelProps) {
  const grouped = useMemo(() => {
    const active = (rateLists ?? []).filter((l) => l?.isActive);
    return groupRateItems(active.map((l) => ({ id: l.id, title: l.title, rates: l.rates })));
  }, [rateLists]);

  /* ---------- build columns ---------- */
  const columns = useMemo(() => {
    return COLUMNS.map((col) => {
      if (col.scope === 'lists') {
        // کل لیست‌هایی که فیلتر col.listFilter را pass می‌کنن
        const matched = grouped.byList.filter((l) =>
          col.listFilter ? col.listFilter(l.title) : true,
        );
        const items: Array<ParsedRateItem & { sourceListId: string; sourceListTitle: string }> = [];
        for (const list of matched) {
          for (const item of list.items) {
            items.push({ ...item, sourceListId: list.id, sourceListTitle: list.title });
            if (items.length >= col.limit) break;
          }
          if (items.length >= col.limit) break;
        }
        return { col, items };
      }
      // scope: items — فقط آیتم‌هایی که فیلتر itemFilter را pass می‌کنن
      const items = grouped.flat
        .filter((it) => (col.itemFilter ? col.itemFilter(it.title) : true))
        .slice(0, col.limit);
      return { col, items };
    });
  }, [grouped]);

  const totalItems = grouped.flat.length;

  if (totalItems === 0) {
    return (
      <div className="px-5 py-8 text-center text-[12px] text-neutral-500 dark:text-neutral-400">
        فعلاً لیست نرخ فعالی برای نمایش وجود ندارد.
      </div>
    );
  }

  return (
    <div className="relative isolate">
      {/* aurora bg */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(closest-side, rgba(94,106,230,0.35), transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-12 -start-12 h-40 w-40 rounded-full blur-3xl opacity-25"
          style={{
            background: 'radial-gradient(closest-side, rgba(16,185,129,0.3), transparent 70%)',
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[color:var(--hairline)]">
        {columns.map(({ col, items }, _colIdx) => (
          <div
            key={col.id}
            className="flex flex-col gap-2 sm:gap-2.5 px-4 sm:px-5 py-3.5 sm:py-4 min-w-0"
          >
            {/* Column header */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-lg shrink-0',
                  col.bgClass,
                  col.textClass,
                )}
                aria-hidden
              >
                {col.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[12px] sm:text-[12.5px] font-bold text-neutral-900 dark:text-white leading-tight">
                  {col.title}
                </h3>
                <p className="text-[10px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5 truncate">
                  {col.description}
                </p>
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <p className="text-[10.5px] text-neutral-400 dark:text-neutral-500 italic">
                آیتمی موجود نیست
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5 stagger-children">
                {items.map((it, i) => (
                  <li key={`${col.id}-${i}-${it.title}`}>
                    <Link
                      href={`/money-transfer?currency=${encodeURIComponent(it.title)}&type=INTERNATIONAL_TRANSFER#contact`}
                      onClick={onNavigate}
                      className={cn(
                        'group/item flex items-center gap-2 sm:gap-2.5',
                        'py-1.5 px-2 rounded-lg',
                        'transition-colors duration-150',
                        'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      )}
                    >
                      <span
                        className="inline-block h-1 w-1 rounded-full shrink-0"
                        style={{ backgroundColor: col.accent }}
                        aria-hidden
                      />
                      <span className="text-[11.5px] sm:text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1 min-w-0">
                        {it.title}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {it.isPair && it.sell ? (
                          <>
                            <span
                              className="text-[10px] sm:text-[11px] font-bold tabular-nums inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"
                              dir="ltr"
                              style={{ unicodeBidi: 'isolate' }}
                            >
                              <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                              {it.buyNum > 0
                                ? toPersianNumber(formatNumber(it.buyNum))
                                : (it.buy ?? '—')}
                            </span>
                            <span className="text-neutral-300 dark:text-neutral-600 text-[10px]">
                              /
                            </span>
                            <span
                              className="text-[10px] sm:text-[11px] font-bold tabular-nums inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400"
                              dir="ltr"
                              style={{ unicodeBidi: 'isolate' }}
                            >
                              <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                              {it.sellNum > 0
                                ? toPersianNumber(formatNumber(it.sellNum))
                                : (it.sell ?? '—')}
                            </span>
                          </>
                        ) : (
                          <span
                            className="text-[10.5px] sm:text-[11.5px] font-bold tabular-nums text-neutral-700 dark:text-neutral-300"
                            dir="ltr"
                            style={{ unicodeBidi: 'isolate' }}
                          >
                            {it.buyNum > 0
                              ? toPersianNumber(formatNumber(it.buyNum))
                              : (it.buy ?? '—')}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight
                        className="h-3 w-3 text-neutral-300 dark:text-neutral-600 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200 shrink-0 rtl:rotate-180"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          'px-4 sm:px-5 py-2.5 sm:py-3',
          'border-t border-[color:var(--hairline)]',
          'bg-neutral-50/40 dark:bg-neutral-950/30',
        )}
      >
        <span className="text-[10px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
          {toPersianNumber(formatNumber(totalItems))} نرخ فعال از{' '}
          {toPersianNumber(formatNumber(grouped.byList.length))} لیست
        </span>
        <Link
          href={viewAllHref}
          onClick={onNavigate}
          className={cn(
            'inline-flex items-center gap-1.5',
            'h-7 px-3 rounded-full',
            'text-[10.5px] sm:text-[11px] font-semibold',
            'bg-primary-500/10 text-primary-700 dark:text-primary-300',
            'hover:bg-primary-500/15',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
          )}
        >
          <span>مشاهده همه</span>
          <ArrowUpRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
