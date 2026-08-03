'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { type CSSProperties, type ReactNode, useCallback, useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';
import { useTableDensity } from './TableToolbar';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  width?: number | string;
  collapse?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string;
  loading?: boolean;
  empty?: ReactNode;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  className?: string;
  ariaLabel?: string;
}

const toWidth = (w: number | string | undefined): string | undefined =>
  w === undefined ? undefined : typeof w === 'number' ? `${w}px` : w;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  className,
  ariaLabel,
}: DataTableProps<T>) {
  const { density, hydrated } = useTableDensity();
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const isControlled = selectedKeys !== undefined;
  const currentSelected = isControlled ? (selectedKeys ?? []) : internalSelected;

  const keys = useMemo(() => {
    return rows.map((row, i) => {
      if (rowKey) return rowKey(row, i);
      const firstKey = columns[0]?.key;
      if (firstKey && typeof row === 'object' && row !== null && firstKey in row) {
        const v = (row as Record<string, unknown>)[firstKey];
        if (v !== undefined && v !== null) return String(v);
      }
      return String(i);
    });
  }, [rows, rowKey, columns]);

  const allSelected = selectable && rows.length > 0 && currentSelected.length === rows.length;
  const someSelected =
    selectable && currentSelected.length > 0 && currentSelected.length < rows.length;

  const updateSelection = useCallback(
    (next: string[]) => {
      if (!isControlled) setInternalSelected(next);
      onSelectionChange?.(next);
    },
    [isControlled, onSelectionChange],
  );

  const toggleAll = useCallback(
    () => updateSelection(allSelected ? [] : keys),
    [allSelected, keys, updateSelection],
  );
  const toggleOne = useCallback(
    (key: string) => {
      const set = new Set(currentSelected);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      updateSelection(Array.from(set));
    },
    [currentSelected, updateSelection],
  );

  const renderHeadCell = (col: Column<T>, extra?: ReactNode) => (
    <div
      key={col.key}
      role="columnheader"
      data-collapse={col.collapse ? '' : undefined}
      className={cn('dash2-table__cell', col.className)}
      style={col.width ? { flexBasis: toWidth(col.width), flexGrow: 0, flexShrink: 0 } : undefined}
    >
      {extra ?? col.header}
    </div>
  );

  const renderCell = (row: T, col: Column<T>, key: string | number) => {
    const v = col.render ? col.render(row) : defaultCell(row, col);
    return (
      <div
        key={key}
        role="cell"
        data-collapse={col.collapse ? '' : undefined}
        className={cn('dash2-table__cell', col.className)}
        style={
          col.width ? { flexBasis: toWidth(col.width), flexGrow: 0, flexShrink: 0 } : undefined
        }
      >
        {v}
      </div>
    );
  };

  const selectHead = selectable ? (
    <div role="columnheader" className="dash2-table__cell shrink-0 grow-0 basis-10">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={toggleAll}
        ariaLabel="انتخاب همه"
      />
    </div>
  ) : null;

  const renderRow = (row: T, key: string, selected: boolean, idx: number) => (
    <div
      key={key}
      role="row"
      className={cn('dash2-table__row', selected && 'bg-[color:var(--ds-color-surface-2)]')}
      data-density={hydrated ? density : 'compact'}
      aria-selected={selectable ? selected : undefined}
    >
      {selectable && (
        <div role="cell" className="dash2-table__cell shrink-0 grow-0 basis-10">
          <Checkbox
            checked={selected}
            onChange={() => toggleOne(key)}
            ariaLabel={`انتخاب ردیف ${idx + 1}`}
          />
        </div>
      )}
      {columns.map((col) => renderCell(row, col, col.key))}
    </div>
  );

  const renderSkeletonRow = (i: number) => (
    <div
      key={`sk-${i}`}
      role="row"
      className="dash2-table__row"
      data-density={hydrated ? density : 'compact'}
      aria-hidden
    >
      {selectable && (
        <div role="cell" className="dash2-table__cell shrink-0 grow-0 basis-10">
          <span className="dash2-skeleton block size-4 rounded" />
        </div>
      )}
      {columns.map((col) => (
        <div
          key={col.key}
          role="cell"
          data-collapse={col.collapse ? '' : undefined}
          className={cn('dash2-table__cell', col.className)}
        >
          <span className="dash2-skeleton block h-3.5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );

  let body: ReactNode;
  if (loading) {
    body = [0, 1, 2].map((i) => renderSkeletonRow(i));
  } else if (rows.length === 0) {
    body = (
      <div className="p-3">
        {empty ?? (
          <EmptyState title="موردی یافت نشد" description="برای شروع، یک مورد جدید ایجاد کنید." />
        )}
      </div>
    );
  } else {
    body = rows.map((row, i) => {
      const key = keys[i] ?? String(i);
      return renderRow(row, key, currentSelected.includes(key), i);
    });
  }

  return (
    <div
      className={cn('dash2-table', className)}
      role="table"
      aria-label={ariaLabel ?? 'جدول'}
      aria-busy={loading || undefined}
    >
      <div className="dash2-table__head" role="row">
        {selectHead}
        {columns.map((col) => renderHeadCell(col))}
      </div>
      <div role="rowgroup">{body}</div>
    </div>
  );
}

function defaultCell<T>(row: T, col: Column<T>): ReactNode {
  const value = (row as Record<string, unknown>)[col.key];
  return value === null || value === undefined ? '' : String(value);
}

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}

function Checkbox({ checked, indeterminate, onChange, ariaLabel }: CheckboxProps) {
  return (
    <label className="relative inline-flex size-4 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        className="peer absolute inset-0 size-4 cursor-pointer appearance-none rounded border border-[color:var(--ds-color-border-default)] bg-[color:var(--ds-color-surface)] transition-colors checked:border-[color:var(--ds-color-blue)] checked:bg-[color:var(--ds-color-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-color-blue)]"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      {(checked || indeterminate) && (
        <Check
          aria-hidden="true"
          className="pointer-events-none size-3 text-white"
          strokeWidth={3}
        />
      )}
    </label>
  );
}
