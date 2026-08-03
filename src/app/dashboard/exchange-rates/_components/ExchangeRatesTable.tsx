// src/app/dashboard/exchange-rates/_components/ExchangeRatesTable.tsx
// 2026-07-29: Premium table with sort, filter (delegated to parent), RTL-safe
// columns, sticky header, hover affordance, and an inline empty state.

'use client';

import { useMemo, useState } from 'react';
import { HiChevronDown, HiChevronUp, HiOutlineCircleStack } from 'react-icons/hi2';
import ExchangeRateRow, { type RateRowData } from './ExchangeRateRow';
import type { GroupFilter, SourceFilter } from './ExchangeRatesToolbar';

interface TableProps {
  rows: RateRowData[];
  query: string;
  source: SourceFilter;
  group: GroupFilter;
  onEdit: (row: RateRowData) => void;
  onDelete: (row: RateRowData) => void;
}

type SortKey = 'priority' | 'displayNameFa' | 'updatedAt';
type SortDir = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey | null;
  label: string;
  sortable: boolean;
  align?: 'start' | 'end' | 'center';
  hideOn?: ('sm' | 'md' | 'lg')[];
}

const COLUMNS: ColumnDef[] = [
  { key: 'priority', label: 'اولویت', sortable: true },
  { key: 'displayNameFa', label: 'نام', sortable: true },
  { key: null, label: 'نماد', sortable: false, hideOn: ['sm'] },
  { key: null, label: 'گروه', sortable: false, hideOn: ['sm', 'md'] },
  { key: null, label: 'مقدار', sortable: false },
  { key: null, label: 'منبع', sortable: false, hideOn: ['sm', 'md'] },
  { key: null, label: 'وضعیت', sortable: false },
  { key: null, label: '', sortable: false, align: 'end' },
];

const hideClass = (hides?: ('sm' | 'md' | 'lg')[]) => {
  if (!hides?.length) return '';
  return hides.map((bp) => `${bp}:hidden`).join(' ');
};

export default function ExchangeRatesTable({
  rows,
  query,
  source,
  group,
  onEdit,
  onDelete,
}: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== 'all' && r.provider !== source) return false;
      if (group !== 'all' && r.group !== group) return false;
      if (!q) return true;
      return r.displayNameFa.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q);
    });
  }, [rows, query, source, group]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority') cmp = a.priority - b.priority;
      else if (sortKey === 'displayNameFa')
        cmp = a.displayNameFa.localeCompare(b.displayNameFa, 'fa-IR');
      else if (sortKey === 'updatedAt') cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          padding: 'var(--ds-space-10) var(--ds-space-6)',
          gap: 'var(--ds-space-3)',
          background: 'var(--ds-surface)',
          border: '1px dashed var(--ds-border-default)',
          borderRadius: 'var(--ds-radius-lg)',
        }}
      >
        <div
          aria-hidden
          style={{
            width: '3rem',
            height: '3rem',
            borderRadius: 'var(--ds-radius-full)',
            background: 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)',
            color: 'var(--ds-brand-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HiOutlineCircleStack style={{ width: '1.5rem', height: '1.5rem' }} />
        </div>
        <p
          className="font-semibold"
          style={{
            fontSize: 'var(--ds-text-base)',
            color: 'var(--ds-text-primary)',
            margin: 0,
          }}
        >
          نرخی با این فیلترها پیدا نشد
        </p>
        <p
          style={{
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--ds-text-muted)',
            margin: 0,
          }}
        >
          فیلترها را تغییر دهید یا از کاتالوگ بالا یک نرخ اضافه کنید.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto backdrop-blur-sm"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <table
        className="w-full"
        aria-label="جدول نرخ‌های بازار"
        aria-rowcount={sorted.length + 1}
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr style={{ background: 'var(--ds-canvas-subtle)' }}>
            {COLUMNS.map((col, i) => {
              const align = col.align ?? 'start';
              return (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: table column headers are static/positional — stable index
                  key={i}
                  scope="col"
                  aria-sort={
                    sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className={`font-semibold uppercase ${hideClass(col.hideOn)}`}
                  style={{
                    padding: 'var(--ds-space-3) var(--ds-space-4)',
                    fontSize: 'var(--ds-text-xs)',
                    letterSpacing: '0.06em',
                    color: 'var(--ds-text-muted)',
                    textAlign: align,
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--ds-border-subtle)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--ds-canvas-subtle)',
                    zIndex: 1,
                  }}
                >
                  {col.sortable && col.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key as SortKey)}
                      className="inline-flex items-center transition-colors"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: 'inherit',
                        font: 'inherit',
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        cursor: 'pointer',
                        gap: '0.25rem',
                      }}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <HiChevronUp aria-hidden style={{ width: '0.8rem', height: '0.8rem' }} />
                        ) : (
                          <HiChevronDown
                            aria-hidden
                            style={{ width: '0.8rem', height: '0.8rem' }}
                          />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <ExchangeRateRow key={row.id} row={row} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
