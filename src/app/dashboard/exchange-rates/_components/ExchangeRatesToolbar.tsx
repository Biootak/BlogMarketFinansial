// src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx
// 2026-06-20: نوار ابزار با جست‌وجو + SegmentedControl + CTA
'use client';

import { SegmentedControl } from '@/components/ds';
import { Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SourceFilter = 'all' | 'auto' | 'manual';
export type GroupFilter =
  | 'all'
  | 'afghan'
  | 'iran-forex'
  | 'iran-coin'
  | 'iran-gold'
  | 'global'
  | 'minor';

interface ToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  source: SourceFilter;
  onSourceChange: (s: SourceFilter) => void;
  group: GroupFilter;
  onGroupChange: (g: GroupFilter) => void;
  onAddClick: () => void;
  totalShown?: number;
  totalAll?: number;
}

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: 'همه گروه‌ها',
  afghan: 'افغان',
  'iran-forex': 'فارکس ایران',
  'iran-coin': 'سکه',
  'iran-gold': 'طلا',
  global: 'جهانی',
  minor: 'سایر',
};

export default function ExchangeRatesToolbar({
  query,
  onQueryChange,
  source,
  onSourceChange,
  group,
  onGroupChange,
  onAddClick,
  totalShown,
  totalAll,
}: ToolbarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // وقتی query از بیرون reset شد، local را هم sync کن
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleQueryChange = (v: string) => {
    setLocalQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onQueryChange(v), 300);
  };

  return (
    <div
      className="flex flex-col gap-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
      style={{
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
      }}
      role="search"
      aria-label="ابزار فیلتر نرخ‌ها"
    >
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[12rem]">
          <Search
            aria-hidden
            style={{
              position: 'absolute',
              insetInlineStart: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              color: 'var(--ds-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="جست‌وجوی نام یا نماد…"
            aria-label="جست‌وجوی نرخ"
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

        {/* Source segmented */}
        <SegmentedControl
          value={source}
          onChange={(v) => onSourceChange(v as SourceFilter)}
          options={[
            { value: 'all', label: 'همه' },
            { value: 'auto', label: 'خودکار' },
            { value: 'manual', label: 'دستی' },
          ]}
          ariaLabel="فیلتر منبع"
        />

        {/* Group select */}
        <select
          value={group}
          onChange={(e) => onGroupChange(e.target.value as GroupFilter)}
          aria-label="فیلتر گروه"
          className="outline-none cursor-pointer"
          style={{
            height: '2.25rem',
            paddingInlineStart: '0.75rem',
            paddingInlineEnd: '2.25rem',
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--ds-text-primary)',
            background: 'var(--ds-canvas-subtle)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 'var(--ds-radius-md)',
          }}
        >
          {Object.entries(GROUP_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {/* Result counter (اختیاری) */}
        {typeof totalShown === 'number' && typeof totalAll === 'number' && (
          <span
            aria-live="polite"
            style={{
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {totalShown.toLocaleString('fa-IR')} از {totalAll.toLocaleString('fa-IR')}
          </span>
        )}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onAddClick}
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
        <Plus aria-hidden style={{ width: '1rem', height: '1rem' }} />
        افزودن نرخ جدید
      </button>
    </div>
  );
}
