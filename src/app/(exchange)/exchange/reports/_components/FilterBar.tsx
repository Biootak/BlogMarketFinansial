'use client';

/**
 * FilterBar — toolbar فیلترهای جدول transactions.
 *
 * Controlled component — همه state از بیرون می‌آید.
 * هیچ router/navigation نیست تا scroll-to-top ایجاد نشود.
 */

import { SearchInput } from '@/components/Dashboard/primitives';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { type DateRange, PersianDateRangePicker } from '@/components/ui/PersianDateRangePicker';
import { X } from 'lucide-react';
import s from './FilterBar.module.css';

export interface FilterState {
  search: string;
  currency: string;
  type: string;
  range: DateRange | null;
}

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

// مقادیر باید با TX_KINDS در exchange-transactions.ts دقیقاً یکی باشند
const TYPE_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'DEPOSIT', label: 'واریز' },
  { value: 'WITHDRAWAL', label: 'برداشت' },
  { value: 'EXCHANGE', label: 'صرافی' },
  { value: 'TRANSFER', label: 'انتقال' },
  { value: 'FEE', label: 'کارمزد' },
];

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  className?: string;
}

export default function FilterBar({ value, onChange, className }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  const hasFilters = !!(value.search || value.currency || value.type || value.range);

  return (
    <div className={`${s.bar} ${className ?? ''}`} role="search" aria-label="فیلترها">
      <div className={s.searchWrap}>
        <SearchInput
          value={value.search}
          onChange={(v) => set({ search: v })}
          placeholder="جست‌وجو در تراکنش‌ها..."
          className="w-full"
        />
      </div>

      <div className={s.selectGroup}>
        <div className={s.currencyWrap}>
          <CurrencySelect
            items={[{ value: '', code: '✦', label: 'همهٔ ارزها' }, ...CURRENCY_OPTIONS]}
            value={value.currency}
            onChange={(v) => set({ currency: v })}
            ariaLabel="ارز"
            size="compact"
            searchPlaceholder="جستجوی ارز..."
          />
        </div>

        <div className={s.typeGroup} role="radiogroup" aria-label="نوع معامله">
          {TYPE_OPTIONS.map((opt) => {
            const isActive = value.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={s.typeBtn}
                data-active={isActive || undefined}
                onClick={() => set({ type: opt.value })}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={s.dateGroup}>
        <PersianDateRangePicker value={value.range} onChange={(range) => set({ range })} />
      </div>

      {hasFilters && (
        <button
          type="button"
          className={s.clearBtn}
          onClick={() => onChange({ search: '', currency: '', type: '', range: null })}
          aria-label="پاک کردن فیلترها"
        >
          <X size={12} strokeWidth={2} aria-hidden />
          پاک کردن
        </button>
      )}
    </div>
  );
}
