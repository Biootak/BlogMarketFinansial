'use client';

/**
 * FlowFilters — premium inline filter rail for the ledger.
 *
 * Live-filtering rebuild (2026): filters apply the moment you touch them —
 * no «اعمال فیلتر» button. Direction chips, currency/exchange selects and
 * the date range commit immediately; search is debounced by the parent.
 * A «پاکسازی» pill appears only while a filter is active.
 *
 * The rail wraps instead of scrolling horizontally, so nothing is ever
 * truncated or hidden at any width.
 *
 * Tokens only. RTL safe.
 */

import { LEDGER_CURRENCIES } from '@/actions/ledger-constants';
import { SearchInput } from '@/components/Dashboard/primitives';
import type { DateRange } from '@/components/ui/PersianDateRangePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eraser, ListFilter } from 'lucide-react';
import type { ReactNode } from 'react';
import s from './FlowFilters.module.css';

export interface FlowFiltersProps {
  direction: 'ALL' | 'CREDIT' | 'DEBIT' | undefined;
  onDirectionChange: (v: 'ALL' | 'CREDIT' | 'DEBIT' | undefined) => void;
  currency: string | undefined;
  onCurrencyChange: (v: string | undefined) => void;
  exchangeId: string | undefined;
  onExchangeChange: (v: string | undefined) => void;
  exchanges: { id: string; name: string }[];
  dateRange: DateRange | null;
  onDateRangeChange: (v: DateRange | null) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  datePickerSlot?: ReactNode;
  loading?: boolean;
}

const directionLabel: Record<'ALL' | 'CREDIT' | 'DEBIT', string> = {
  ALL: 'همه',
  CREDIT: 'واریز',
  DEBIT: 'برداشت',
};

const currencySymbol: Record<string, string> = {
  AFN: '؋',
  USD: '$',
  EUR: '€',
  IRR: '﷼',
  INR: '₹',
  PKR: '₨',
};

function chipIcon(text: string): string {
  return currencySymbol[text] ?? text.charAt(0);
}

export function FlowFilters({
  direction,
  onDirectionChange,
  currency,
  onCurrencyChange,
  exchangeId,
  onExchangeChange,
  exchanges,
  search,
  onSearchChange,
  onReset,
  hasActiveFilters,
  datePickerSlot,
  loading,
}: FlowFiltersProps) {
  return (
    <div className={s.root} dir="rtl">
      <div className={s.chipRow}>
        <div className={s.chipGroup}>
          <span className={s.groupLabel}>جهت</span>
          <div className={s.chipPair}>
            {(['ALL', 'CREDIT', 'DEBIT'] as const).map((d) => {
              const active = (direction ?? 'ALL') === d;
              return (
                <button
                  key={d}
                  type="button"
                  className={`${s.chip} ${active ? s.chipActive : ''} ${
                    d === 'CREDIT' ? s.chipUp : d === 'DEBIT' ? s.chipDown : ''
                  }`}
                  aria-pressed={active}
                  onClick={() => onDirectionChange(d === 'ALL' ? undefined : d)}
                >
                  <span className={s.chipDot} />
                  {directionLabel[d]}
                </button>
              );
            })}
          </div>
        </div>

        <div className={s.divider} aria-hidden />

        <div className={s.chipGroup}>
          <span className={s.groupLabel}>ارز</span>
          <Select
            value={currency ?? ''}
            onValueChange={(v) => onCurrencyChange(v === 'ALL' ? undefined : v)}
          >
            <SelectTrigger className={s.select} aria-label="فیلتر ارز">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه ارزها</SelectItem>
              {LEDGER_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className={s.currencyPill}>
                    <span className={s.currencyIcon}>{chipIcon(c)}</span>
                    {c}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={s.divider} aria-hidden />

        <div className={s.chipGroup}>
          <span className={s.groupLabel}>صرافی</span>
          <Select
            value={exchangeId ?? ''}
            onValueChange={(v) => onExchangeChange(v === 'ALL' ? undefined : v)}
          >
            <SelectTrigger className={s.select} aria-label="فیلتر صرافی">
              <SelectValue placeholder="همه صرافی‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه صرافی‌ها</SelectItem>
              {exchanges.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={s.divider} aria-hidden />

        {datePickerSlot}

        <div className={s.searchWrap}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="جستجو در توضیحات، نام، شناسه..."
            className={s.search}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className={s.resetBtn}
            aria-label="پاک‌سازی فیلترها"
            title="پاک‌سازی فیلترها"
          >
            <Eraser size={13} strokeWidth={1.75} />
            <span>پاک‌سازی</span>
          </button>
        )}
      </div>

      {/* Status strip — minimal, only while a fetch is in flight */}
      <div className={s.statusRow} aria-live="polite">
        {loading ? (
          <span className={s.loading}>
            <span className={s.loadingDot} aria-hidden />
            در حال به‌روزرسانی…
          </span>
        ) : hasActiveFilters ? (
          <span className={s.liveHint}>
            <ListFilter size={11} strokeWidth={2} aria-hidden />
            فیلتر زنده اعمال شد
          </span>
        ) : (
          <span className={s.allHint}>همهٔ تراکنش‌ها</span>
        )}
      </div>
    </div>
  );
}
