/**
 * CustomerDirectory — Grid کارت‌های مشتری (Cockpit).
 *
 * کامپوننت controlled: state فیلتر/سورت/انتخاب از parent می‌آید
 * (CustomerCockpit مالک useCustomerFilters است).
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { EmptyState } from '@/components/Dashboard/primitives';
import { Search, UserPlus, Users } from 'lucide-react';
import { useMemo } from 'react';
import {
  KYC_FILTERS,
  STATUS_FILTERS,
  type CustomerSort,
  type CustomerSortKey,
} from '@/lib/customer-segments';
import { formatNumber } from '@/lib/customer-format';
import { CustomerCard } from './CustomerCard';
import s from './CustomerDirectory.module.css';

export interface CustomerDirectoryFilters {
  query: string;
  status: 'all' | 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
  kycLevel: 'all' | 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  risk: 'all' | 'low' | 'medium' | 'high';
  city: 'all' | string;
}

interface Props {
  rows: CustomerRow[];
  canWrite: boolean;
  sorted: CustomerRow[];
  filters: CustomerDirectoryFilters;
  cityOptions: string[];
  sort: CustomerSort;
  selectedIds: Set<string>;
  onFiltersChange: (
    update: (prev: CustomerDirectoryFilters) => CustomerDirectoryFilters,
  ) => void;
  onSortChange: (sort: CustomerSort) => void;
  onToggleSort: (key: CustomerSortKey) => void;
  onToggleSelected: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onResetFilters: () => void;
  onAdd: () => void;
  onSelectCustomer: (customer: CustomerRow) => void;
  onEditCustomer: (customer: CustomerRow) => void;
}

const SORT_OPTIONS: { key: CustomerSortKey; label: string }[] = [
  { key: 'createdAt', label: 'تاریخ ثبت' },
  { key: 'fullName', label: 'نام' },
  { key: 'riskScore', label: 'امتیاز ریسک' },
  { key: 'phone', label: 'تلفن' },
];

export function CustomerDirectory({
  rows,
  canWrite,
  sorted,
  filters,
  cityOptions,
  sort,
  selectedIds,
  onFiltersChange,
  onSortChange,
  onToggleSelected,
  onSelectAll,
  onClearSelection,
  onResetFilters,
  onAdd,
  onSelectCustomer,
  onEditCustomer,
}: Props) {
  const allSelected = useMemo(
    () => sorted.length > 0 && selectedIds.size === sorted.length,
    [sorted, selectedIds],
  );

  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.kycLevel !== 'all' ? 1 : 0) +
    (filters.risk !== 'all' ? 1 : 0) +
    (filters.city !== 'all' ? 1 : 0);

  return (
    <section className={s.root} aria-label="دایرکتوری مشتریان">
      {/* ── Toolbar (filters + sort + add) ────────────────────────────── */}
      <div className={s.toolbar}>
        {/* Search */}
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            type="search"
            placeholder="جستجو نام، تلفن، شهر…"
            value={filters.query}
            onChange={(e) =>
              onFiltersChange((p) => ({ ...p, query: e.target.value }))
            }
            aria-label="جستجوی مشتری"
          />
        </div>

        {/* Status pills */}
        <div className={s.filterGroup} role="tablist" aria-label="وضعیت">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filters.status === f.key}
              data-active={filters.status === f.key || undefined}
              className={s.filterPill}
              onClick={() => onFiltersChange((p) => ({ ...p, status: f.key }))}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* KYC select */}
        <select
          className={s.select}
          value={filters.kycLevel}
          onChange={(e) =>
            onFiltersChange((p) => ({ ...p, kycLevel: e.target.value as CustomerDirectoryFilters['kycLevel'] }))
          }
          aria-label="سطح KYC"
        >
          {KYC_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Risk select */}
        <select
          className={s.select}
          value={filters.risk}
          onChange={(e) =>
            onFiltersChange((p) => ({ ...p, risk: e.target.value as CustomerDirectoryFilters['risk'] }))
          }
          aria-label="سطح ریسک"
        >
          <option value="all">همه ریسک‌ها</option>
          <option value="low">کم‌ریسک</option>
          <option value="medium">متوسط</option>
          <option value="high">پرریسک</option>
        </select>

        {/* City select */}
        {cityOptions.length > 0 && (
          <select
            className={s.select}
            value={filters.city}
            onChange={(e) => onFiltersChange((p) => ({ ...p, city: e.target.value }))}
            aria-label="شهر"
          >
            <option value="all">همه شهرها</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          className={s.select}
          value={`${sort.key}:${sort.dir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(':') as [
              CustomerSortKey,
              'asc' | 'desc',
            ];
            onSortChange({ key: k, dir: d });
          }}
          aria-label="مرتب‌سازی"
        >
          {SORT_OPTIONS.map((o) => (
            <optgroup key={o.key} label={o.label}>
              <option value={`${o.key}:asc`}>{o.label} (صعودی)</option>
              <option value={`${o.key}:desc`}>{o.label} (نزولی)</option>
            </optgroup>
          ))}
        </select>

        {canWrite && (
          <button type="button" className={s.addBtn} onClick={onAdd}>
            <UserPlus size={14} aria-hidden />
            <span>افزودن</span>
          </button>
        )}
      </div>

      {/* ── Sub-bar: count + active filter reset + select-all ─────────── */}
      <div className={s.subbar}>
        <span className={s.count}>
          <Users size={13} aria-hidden />
          <span>
            {formatNumber(sorted.length)} از {formatNumber(rows.length)} مشتری
          </span>
        </span>

        {activeFilterCount > 0 && (
          <button type="button" className={s.resetBtn} onClick={onResetFilters}>
            پاک کردن فیلترها ({formatNumber(activeFilterCount)})
          </button>
        )}

        <div className={s.selectAllWrap}>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              className={s.resetBtn}
              onClick={onClearSelection}
            >
              لغو انتخاب ({formatNumber(selectedIds.size)})
            </button>
          ) : sorted.length > 0 ? (
            <button type="button" className={s.resetBtn} onClick={onSelectAll}>
              انتخاب همه
            </button>
          ) : null}
        </div>

        <span className={s.sortHint}>
          مرتب‌سازی: {SORT_OPTIONS.find((o) => o.key === sort.key)?.label}{' '}
          {sort.dir === 'asc' ? '↑' : '↓'}
        </span>
      </div>

      {/* ── Grid or empty ─────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className={s.emptyWrap}>
          <EmptyState
            icon={filters.query ? Search : Users}
            title={filters.query ? 'نتیجه‌ای یافت نشد' : 'هنوز مشتری ثبت نشده'}
            description={
              filters.query || activeFilterCount > 0
                ? 'فیلترها را تغییر دهید یا جستجوی جدیدی انجام دهید.'
                : 'اولین مشتری صرافی را اضافه کنید تا فعالیت اینجا نمایان شود.'
            }
            action={
              filters.query || activeFilterCount > 0 ? (
                <button type="button" className={s.resetBtn} onClick={onResetFilters}>
                  پاک کردن فیلترها
                </button>
              ) : canWrite ? (
                <button type="button" className={s.addBtn} onClick={onAdd}>
                  <UserPlus size={14} aria-hidden /> افزودن اولین مشتری
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div
          className={s.grid}
          role="list"
          aria-label="کارت‌های مشتری"
          aria-multiselectable="true"
        >
          {sorted.map((c) => (
            <div
              key={c.id}
              role="listitem"
              onClick={() => onSelectCustomer(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCustomer(c);
                }
              }}
              className={s.gridItem}
            >
              <CustomerCard
                customer={c}
                selected={selectedIds.has(c.id)}
                canSelect
                onSelect={onToggleSelected}
                onClick={canWrite ? onEditCustomer : onSelectCustomer}
              />
            </div>
          ))}
        </div>
      )}

      {/* Hidden flag for select-all telemetry */}
      <span data-all={allSelected || undefined} className={s.allSelectedFlag} aria-hidden />
    </section>
  );
}

export default CustomerDirectory;
