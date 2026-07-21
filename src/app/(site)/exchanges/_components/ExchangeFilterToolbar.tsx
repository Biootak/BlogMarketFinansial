'use client';

// src/app/(site)/exchanges/_components/ExchangeFilterToolbar.tsx
// Client component — currency filter + sort controls for the exchanges comparison page.

import { ArrowUpDown, Filter } from 'lucide-react';
import { useState } from 'react';

const CURRENCIES = [
  { code: 'ALL', label: 'همه ارزها' },
  { code: 'USD', label: 'دلار' },
  { code: 'EUR', label: 'یورو' },
  { code: 'AED', label: 'درهم' },
  { code: 'GBP', label: 'پوند' },
  { code: 'AFN', label: 'افغانی' },
] as const;

const SORT_OPTIONS = [
  { value: 'name', label: 'بر اساس نام' },
  { value: 'buy_asc', label: 'کمترین نرخ خرید' },
  { value: 'buy_desc', label: 'بیشترین نرخ خرید' },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]['code'];
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

interface Props {
  totalCount: number;
}

export default function ExchangeFilterToolbar({ totalCount }: Props) {
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('ALL');
  const [activeSort, setActiveSort] = useState<SortValue>('name');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--ds-space-3)',
        width: '100%',
      }}
      role="toolbar"
      aria-label="فیلتر و مرتب‌سازی صرافی‌ها"
    >
      {/* Currency filter chips */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-2)', flex: 1 }}
        role="group"
        aria-label="فیلتر بر اساس ارز"
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: 'var(--ds-text-xs)',
            color: 'var(--ds-text-muted)',
            fontWeight: 'var(--ds-weight-medium)',
            paddingInlineEnd: 'var(--ds-space-2)',
          }}
          aria-hidden
        >
          <Filter size={13} />
          فیلتر:
        </span>

        {CURRENCIES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            aria-pressed={activeCurrency === code}
            onClick={() => setActiveCurrency(code)}
            style={{
              padding: '5px 13px',
              borderRadius: 'var(--ds-radius-full)',
              border: '1px solid',
              borderColor:
                activeCurrency === code ? 'var(--ds-brand-600)' : 'var(--ds-border-subtle)',
              background:
                activeCurrency === code
                  ? 'color-mix(in oklch, var(--ds-brand-600) 12%, transparent)'
                  : 'var(--ds-surface)',
              color: activeCurrency === code ? 'var(--ds-brand-700)' : 'var(--ds-text-secondary)',
              fontSize: 'var(--ds-text-xs)',
              fontWeight: 'var(--ds-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--ds-duration-fast) var(--ds-ease-out-quart)',
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort selector + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
        <label
          htmlFor="exchange-sort"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: 'var(--ds-text-xs)',
            color: 'var(--ds-text-muted)',
            fontWeight: 'var(--ds-weight-medium)',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowUpDown size={13} aria-hidden />
          مرتب‌سازی:
        </label>
        <select
          id="exchange-sort"
          value={activeSort}
          onChange={(e) => setActiveSort(e.target.value as SortValue)}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--ds-radius-sm)',
            border: '1px solid var(--ds-border-default)',
            background: 'var(--ds-surface)',
            color: 'var(--ds-text-primary)',
            fontSize: 'var(--ds-text-xs)',
            fontWeight: 'var(--ds-weight-medium)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            appearance: 'none',
            paddingInlineEnd: '24px',
          }}
          aria-label="مرتب‌سازی فهرست صرافی‌ها"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {totalCount > 0 && (
          <span
            style={{
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-text-muted)',
              whiteSpace: 'nowrap',
            }}
            aria-live="polite"
          >
            {totalCount} صرافی
          </span>
        )}
      </div>
    </div>
  );
}
