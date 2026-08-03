/**
 * useCustomerFilters — فیلترهای client-side برای cockpit مشتریان.
 *
 * centralized state: جستجو (debounced) + segment + KYC + risk + city.
 * نتیجه به‌صورت memoized برگردانده می‌شود.
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { useDebounce } from '@/hooks/useDebounce';
import { type CustomerSort, type SortDir, compareCustomers } from '@/lib/customer-segments';
import { useDeferredValue, useMemo, useState } from 'react';

export interface CustomerFilterState {
  query: string;
  status: 'all' | 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
  kycLevel: 'all' | 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  risk: 'all' | 'low' | 'medium' | 'high';
  city: 'all' | string;
}

export const INITIAL_FILTERS: CustomerFilterState = {
  query: '',
  status: 'all',
  kycLevel: 'all',
  risk: 'all',
  city: 'all',
};

const DEBOUNCE_MS = 200;

export function useCustomerFilters(rows: CustomerRow[]) {
  const [filters, setFilters] = useState<CustomerFilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<CustomerSort>({ key: 'createdAt', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // deferred query for input perf
  const deferredQuery = useDeferredValue(filters.query);
  const debouncedQuery = useDebounce(deferredQuery, DEBOUNCE_MS);

  // شهرهای موجود (deterministic order)
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.city) set.add(r.city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa-IR'));
  }, [rows]);

  // فیلتر
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.kycLevel !== 'all' && r.kycLevel !== filters.kycLevel) return false;
      if (filters.city !== 'all' && r.city !== filters.city) return false;
      if (filters.risk !== 'all') {
        const score = r.riskScore;
        if (filters.risk === 'high' && score <= 70) return false;
        if (filters.risk === 'medium' && (score <= 40 || score > 70)) return false;
        if (filters.risk === 'low' && score > 40) return false;
      }
      if (q) {
        return (
          r.fullName.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          (r.city ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filters.status, filters.kycLevel, filters.city, filters.risk, debouncedQuery]);

  // سورت
  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => compareCustomers(a, b, sort));
    return out;
  }, [filtered, sort]);

  // سورت toggling helper
  const toggleSort = (key: CustomerSort['key']) => {
    setSort((prev) => {
      if (prev.key === key) {
        const dir: SortDir = prev.dir === 'asc' ? 'desc' : 'asc';
        return { key, dir };
      }
      return { key, dir: 'asc' };
    });
  };

  // selection helpers
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sorted.map((r) => r.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    clearSelection();
  };

  return {
    filters,
    setFilters,
    sort,
    setSort,
    toggleSort,
    sorted,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    cityOptions,
    resetFilters,
  };
}
