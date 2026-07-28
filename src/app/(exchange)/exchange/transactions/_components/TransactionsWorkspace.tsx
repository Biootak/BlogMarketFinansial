/**
 * TransactionsWorkspace — orchestrator لیست تراکنش‌های صراف.
 *
 * ساختار جدید (v2026):
 *   1. TransactionKpiRibbon  → 4 KPI متراكم در بالا
 *   2. TransactionCommandStrip → tabs + search + sort + new button + status chips
 *   3. TransactionRow list → متراكم، rail رنگی، tone-aware
 *   4. TransactionDrawer → ثبت تراکنش (از CommandStrip)
 *   5. TransactionEmptyState → حالت خالی
 *   6. Pagination → صفحه‌بندی ساده
 *
 * منطق فیلتر: هم client-side (سریع برای ۵۰ ردیف) و هم آماده برای server-side.
 * Server-side (با searchParams در page.tsx) در آینده بهینه می‌شود.
 */

'use client';

import type { CustomerRow } from '@/actions/exchange-customers';
import { type TransactionRow, getTransactions } from '@/actions/exchange-transactions';
import { TX_KIND_FA } from '@/lib/exchange-labels';
import {
  type SortKey,
  TransactionCommandStrip,
} from './TransactionCommandStrip';
import { TransactionDrawer } from './TransactionDrawer';
import { TransactionEmptyState } from './TransactionEmptyState';
import { TransactionKpiRibbon } from './TransactionKpiRibbon';
import { TransactionRow as TransactionRowItem } from './TransactionRow';
import {
  type TxRowEnriched,
  aggregateRows,
  enrichRows,
} from '@/lib/exchange-tx-formatters';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import s from './TransactionsWorkspace.module.css';

const PAGE_SIZE = 25;

interface Props {
  exchangeId: string;
  initialRows: TransactionRow[];
  total: number;
  customers: CustomerRow[];
  staffRole: string;
  primaryCurrency: string;
}

export default function TransactionsWorkspace({
  exchangeId,
  initialRows,
  total,
  customers,
  staffRole,
  primaryCurrency,
}: Props) {
  const [rows, setRows] = useState<TransactionRow[]>(initialRows);
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const canAdd = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  // ── Enrich (memoize) ──────────────────────────────────────────────────
  const enriched: TxRowEnriched[] = useMemo(() => enrichRows(rows), [rows]);
  const aggregate = useMemo(
    () => aggregateRows(enriched, primaryCurrency),
    [enriched, primaryCurrency],
  );

  // ── counts per kind (برای badge در tabs) ──────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of enriched) {
      c[r.kind] = (c[r.kind] ?? 0) + 1;
    }
    return c;
  }, [enriched]);

  // ── Filter (client) ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched;
    if (kindFilter !== 'all') {
      list = list.filter((r) => r.kind === kindFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          (r.customerName ?? '').toLowerCase().includes(q) ||
          (r.customerPhone ?? '').includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.createdAtFull.toLowerCase().includes(q),
      );
    }
    // sort
    const sorted = [...list];
    if (sort === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === 'oldest') sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === 'amount') sorted.sort((a, b) => b.amount - a.amount);
    else if (sort === 'customer')
      sorted.sort((a, b) =>
        (a.customerName ?? '').localeCompare(b.customerName ?? '', 'fa-IR'),
      );
    return sorted;
  }, [enriched, kindFilter, statusFilter, query, sort]);

  // ── Pagination ────────────────────────────────────────────────────────
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = kindFilter !== 'all' || statusFilter !== 'all' || query.length > 0;

  // ── Load more (server-side برای صفحات بعد) ──────────────────────────
  const hasMore = rows.length < total && page * PAGE_SIZE >= rows.length - 5;
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const result = await getTransactions(exchangeId, {
      limit: 50,
      offset: rows.length,
    });
    setLoadingMore(false);
    if (result.rows.length > 0) {
      setRows((prev) => [...prev, ...result.rows]);
    }
  }, [exchangeId, rows.length, loadingMore, hasMore]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleKindChange = useCallback((k: string) => {
    setKindFilter(k);
    setPage(1);
  }, []);
  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s);
    setPage(1);
  }, []);
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setPage(1);
  }, []);
  const handleSortChange = useCallback((s: SortKey) => {
    setSort(s);
    setPage(1);
  }, []);
  const clearFilters = useCallback(() => {
    setKindFilter('all');
    setStatusFilter('all');
    setQuery('');
    setPage(1);
  }, []);

  return (
    <div className={s.root} dir="rtl">
      {/* ── 1. KPI Ribbon — signature moment ──────────────────────── */}
      <TransactionKpiRibbon aggregate={aggregate} />

      {/* ── 2. Command Strip — tabs + search + new button ─────────── */}
      <TransactionCommandStrip
        kindFilter={kindFilter}
        statusFilter={statusFilter}
        query={query}
        sort={sort}
        counts={counts}
        totalCount={enriched.length}
        canAdd={canAdd}
        onKindChange={handleKindChange}
        onStatusChange={handleStatusChange}
        onQueryChange={handleQueryChange}
        onSortChange={handleSortChange}
        onAddClick={() => setDrawerOpen(true)}
      />

      {/* ── 3. Active filter indicator (زیر command strip) ─────────── */}
      {hasFilter && (
        <div className={s.activeBar}>
          <span className={s.activeLabel}>
            نمایش {pageRows.length} از {totalFiltered} تراکنش
            {kindFilter !== 'all' && (
              <span className={s.activeChip}>
                نوع: {TX_KIND_FA[kindFilter] ?? kindFilter}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className={s.activeChip}>
                وضعیت: {statusFilter}
              </span>
            )}
            {query && (
              <span className={s.activeChip}>
                جستجو: «{query}»
              </span>
            )}
          </span>
          <button type="button" className={s.clearLink} onClick={clearFilters}>
            پاک کردن همه
          </button>
        </div>
      )}

      {/* ── 4. List / Empty ──────────────────────────────────────── */}
      {pageRows.length === 0 ? (
        <TransactionEmptyState
          canAdd={canAdd}
          onAddClick={() => setDrawerOpen(true)}
          hasFilter={hasFilter}
          onClearFilter={clearFilters}
        />
      ) : (
        <section className={s.listWrap} aria-label="لیست تراکنش‌ها">
          <div className={s.listHead} role="row">
            <span className={s.headCell} aria-hidden />
            <span className={s.headCell} aria-hidden />
            <span className={s.headCell}>مشتری / نوع</span>
            <span className={`${s.headCell} ${s.headCellRight}`}>مبلغ / وضعیت</span>
          </div>
          <ol className={s.list}>
            {pageRows.map((row, i) => (
              <TransactionRowItem key={row.id} row={row} index={i} />
            ))}
          </ol>
        </section>
      )}

      {/* ── 5. Pagination ────────────────────────────────────────── */}
      {totalPages > 1 && (
        <nav className={s.pagination} aria-label="صفحه‌بندی">
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="صفحه قبلی"
          >
            <ChevronRight size={14} aria-hidden />
            <span>قبلی</span>
          </button>
          <span className={s.pageInfo}>
            صفحه {page} از {totalPages}
          </span>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="صفحه بعدی"
          >
            <span>بعدی</span>
            <ChevronLeft size={14} aria-hidden />
          </button>
        </nav>
      )}

      {/* ── 6. Load more server (اگر داده بیشتر باشد) ────────────── */}
      {hasMore && !hasFilter && page === totalPages && (
        <div className={s.loadMore}>
          <button
            type="button"
            className={s.loadMoreBtn}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 size={14} className={s.spin} aria-hidden />}
            {loadingMore ? 'در حال بارگذاری…' : `بارگذاری ${Math.max(0, total - rows.length)} تراکنش دیگر`}
          </button>
        </div>
      )}

      {/* ── 7. Drawer (ثبت تراکنش) ──────────────────────────────── */}
      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        exchangeId={exchangeId}
        customers={customers}
        onCreated={(tx) => setRows((prev) => [tx, ...prev])}
      />
    </div>
  );
}
