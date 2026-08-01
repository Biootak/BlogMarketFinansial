// src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx
// 2026-07-29: Toolbar — search + source segmented + group filter + add CTA.
// Uses custom select chevron and clean focus styles. RTL-safe via logical props.

'use client';

import { SegmentedControl } from '@/components/ds';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlinePlus } from 'react-icons/hi2';

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
  registryTotal?: number;
}

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: 'همه گروه‌ها',
  afghan: 'محلی',
  'iran-forex': 'فارکس',
  'iran-coin': 'سکه',
  'iran-gold': 'طلا',
  global: 'جهانی',
  minor: 'سایر',
};

const selectStyle: React.CSSProperties = {
  height: '2.4rem',
  width: 'auto',
  minWidth: '9rem',
  paddingInlineStart: '0.85rem',
  paddingInlineEnd: '0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--ds-text-primary)',
  background: 'var(--ds-canvas-subtle)',
  border: '1px solid var(--ds-border-subtle)',
  borderRadius: 'var(--ds-radius-md)',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
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
  registryTotal,
}: ToolbarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleQueryChange = (v: string) => {
    setLocalQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onQueryChange(v), 280);
  };

  const coverage =
    typeof registryTotal === 'number' && registryTotal > 0 && typeof totalAll === 'number'
      ? Math.round((totalAll / registryTotal) * 100)
      : null;

  return (
    <div
      className="flex flex-col backdrop-blur-sm gap-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
      role="search"
      aria-label="فیلتر و جستجوی نرخ‌ها"
    >
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: '12rem' }}>
          <HiOutlineMagnifyingGlass
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
            placeholder="جستجو بر اساس نام یا نماد…"
            aria-label="جستجوی نرخ‌ها"
            className="w-full outline-none transition-colors"
            style={{
              height: '2.4rem',
              paddingInlineStart: '2.4rem',
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
            { value: 'auto', label: 'زنده' },
            { value: 'manual', label: 'دستی' },
          ]}
          ariaLabel="فیلتر منبع"
        />

        {/* Group select */}
        <Select value={group} onValueChange={(v) => onGroupChange(v as GroupFilter)} dir="rtl">
          <SelectTrigger
            aria-label="فیلتر گروه"
            style={selectStyle}
            className="flex items-center justify-between gap-2"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(GROUP_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Counter */}
        <div
          className="flex items-center"
          style={{ gap: '0.4rem', fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)' }}
          aria-live="polite"
        >
          <span className="tabular-nums">
            {(totalShown ?? 0).toLocaleString('fa-IR')}
            <span style={{ opacity: 0.5 }}> / </span>
            {(totalAll ?? 0).toLocaleString('fa-IR')}
          </span>
          <span>نرخ</span>
          {coverage !== null && (
            <span className="font-semibold" style={{ color: 'var(--ds-brand-500)' }}>
              · پوشش {coverage.toLocaleString('fa-IR')}٪
            </span>
          )}
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onAddClick}
        className="inline-flex items-center justify-center font-semibold transition-all"
        style={{
          height: '2.4rem',
          paddingInline: 'var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-inverse)',
          background: 'var(--ds-brand-500)',
          borderRadius: 'var(--ds-radius-md)',
          boxShadow: 'var(--ds-shadow-sm)',
          border: 'none',
          cursor: 'pointer',
          gap: '0.4rem',
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
        افزودن دستی
      </button>
    </div>
  );
}
