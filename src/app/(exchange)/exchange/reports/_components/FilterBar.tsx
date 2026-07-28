'use client';

/**
 * FilterBar — toolbar فیلترهای بالای جدول transactions.
 *
 * از shared components موجود استفاده می‌کند:
 *   - CurrencySelect (premium dropdown با search + keyboard)
 *   - DatePickerWithRange (تقویم سفارشی فارسی، popover-based)
 *
 * URL query params برای sync با server state (replace).
 * Client Component — controlled state + router interactions.
 */

import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import type { Day, DayRange } from '@hassanmojab/react-modern-calendar-datepicker';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import s from './FilterBar.module.css';

const CURRENCY_OPTIONS: Array<{ value: string; code: string; label: string }> = [
  { value: 'AFN', code: 'AFN', label: 'افغانی' },
  { value: 'USD', code: 'USD', label: 'دلار آمریکا' },
  { value: 'EUR', code: 'EUR', label: 'یورو' },
  { value: 'IRR', code: 'IRR', label: 'ریال ایران' },
  { value: 'AED', code: 'AED', label: 'درهم امارات' },
  { value: 'GBP', code: 'GBP', label: 'پوند بریتانیا' },
  { value: 'PKR', code: 'PKR', label: 'روپیه پاکستان' },
  { value: 'SAR', code: 'SAR', label: 'ریال عربستان' },
  { value: 'TRY', code: 'TRY', label: 'لیر ترکیه' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'BUY', label: 'خرید' },
  { value: 'SELL', label: 'فروش' },
  { value: 'TRANSFER', label: 'حواله' },
];

// ── helpers: convert between ISO yyyy-mm-dd string and Day {year, month, day}

function isoToDay(iso: string): Day | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function dayToIso(d: Day | null | undefined): string {
  if (!d) return '';
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function rangeToIso(r: DayRange | null): { from: string; to: string } | null {
  if (!r?.from || !r?.to) return null;
  return { from: dayToIso(r.from), to: dayToIso(r.to) };
}

interface Props {
  className?: string;
}

export default function FilterBar({ className }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [currency, setCurrency] = useState(params.get('currency') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');

  // DatePickerWithRange expects a single DayRange; keep null when no filter
  const [range, setRange] = useState<DayRange | null>(() => {
    const f = isoToDay(params.get('from') ?? '');
    const t = isoToDay(params.get('to') ?? '');
    if (f && t) return { from: f, to: t };
    return null;
  });

  // sync state when URL changes externally
  useEffect(() => {
    setSearch(params.get('q') ?? '');
    setCurrency(params.get('currency') ?? '');
    setType(params.get('type') ?? '');
    const f = isoToDay(params.get('from') ?? '');
    const t = isoToDay(params.get('to') ?? '');
    if (f && t) setRange({ from: f, to: t });
    else setRange(null);
  }, [params]);

  const apply = (next: {
    q?: string;
    currency?: string;
    type?: string;
    from?: string;
    to?: string;
  }) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v && v.length > 0) merged.set(k, v);
      else merged.delete(k);
    });
    merged.delete('page');
    startTransition(() => {
      router.replace(`?${merged.toString()}`);
    });
  };

  const onRangeChange = (r: DayRange | null) => {
    setRange(r);
    const iso = rangeToIso(r);
    apply({ from: iso?.from, to: iso?.to });
  };

  const clear = () => {
    setSearch('');
    setCurrency('');
    setType('');
    setRange(null);
    startTransition(() => {
      router.replace('?');
    });
  };

  const hasFilters = !!(search || currency || type || range);

  return (
    <div className={`${s.bar} ${className ?? ''}`} role="search" aria-label="فیلترها">
      <div className={s.searchWrap}>
        <span className={s.searchIcon} aria-hidden>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="search"
          className={s.search}
          placeholder="جست‌وجو..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply({ q: search });
          }}
          aria-label="جست‌وجو"
        />
      </div>

      <div className={s.selectGroup}>
        <div className={s.currencyWrap}>
          <CurrencySelect
            items={[
              { value: '', code: '✦', label: 'همهٔ ارزها' },
              ...CURRENCY_OPTIONS,
            ]}
            value={currency}
            onChange={(v) => {
              setCurrency(v);
              apply({ currency: v });
            }}
            ariaLabel="ارز"
            size="compact"
            searchPlaceholder="جستجوی ارز..."
          />
        </div>

        <div className={s.typeGroup} role="radiogroup" aria-label="نوع معامله">
          {TYPE_OPTIONS.map((opt) => {
            const isActive = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={s.typeBtn}
                data-active={isActive || undefined}
                onClick={() => {
                  setType(opt.value);
                  apply({ type: opt.value });
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={s.dateGroup}>
        <DatePickerWithRange
          date={range}
          onDateChange={onRangeChange}
          locale="fa-IR"
        />
      </div>

      {hasFilters && (
        <button type="button" className={s.clearBtn} onClick={clear} aria-label="پاک کردن فیلترها">
          <X size={12} strokeWidth={2} aria-hidden />
          پاک کردن
        </button>
      )}
    </div>
  );
}
