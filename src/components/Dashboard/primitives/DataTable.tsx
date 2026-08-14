'use client';

import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { EmptyState } from './EmptyState';
import { DensityToggle, useTableDensity } from './TableToolbar';

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

/* Selection checkbox column — pinned to the checkbox width.
   Must be an inline style (NOT Tailwind basis-* utilities): dashboard.css
   defines `.dash2-table__cell { flex: 1 }` inside `@layer utilities` and loads
   after the Tailwind utilities, so its `flex: 1` shorthand silently overrides
   `shrink-0 grow-0 basis-10`. Inline style wins over every stylesheet rule,
   same mechanism as the col.width columns below. */
const CHECK_CELL_STYLE: CSSProperties = {
  flexBasis: '2.5rem',
  flexGrow: 0,
  flexShrink: 0,
};

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
  const { density, hydrated, toggleRendered } = useTableDensity();
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const isControlled = selectedKeys !== undefined;
  const currentSelected = isControlled ? (selectedKeys ?? []) : internalSelected;

  // Inject stagger animation keyframes once
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('data-table-stagger-anim')) {
      const style = document.createElement('style');
      style.id = 'data-table-stagger-anim';
      style.textContent = `
        @keyframes rowFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
    <div role="columnheader" className="dash2-table__cell" style={CHECK_CELL_STYLE}>
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
      style={{
        animation: `rowFadeIn 280ms cubic-bezier(0.22, 1, 0.36, 1) ${idx * 40}ms both`,
      }}
    >
      {selectable && (
        <div role="cell" className="dash2-table__cell" style={CHECK_CELL_STYLE}>
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
        <div role="cell" className="dash2-table__cell" style={CHECK_CELL_STYLE}>
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
      {/* Density toggle — shown when the page doesn't already render one in
          a TableToolbar above (avoids duplicating the control). */}
      {!toggleRendered && (
        <div className="dash2-table__densitybar" role="toolbar" aria-label="چگالی جدول">
          <DensityToggle />
        </div>
      )}
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
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="relative inline-flex size-4 cursor-pointer items-center justify-center"
    >
      <UICheckbox
        id={id}
        className="size-4"
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={onChange}
        aria-label={ariaLabel}
      />
    </label>
  );
}
