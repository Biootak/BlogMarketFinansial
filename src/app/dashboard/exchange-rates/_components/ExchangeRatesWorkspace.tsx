// src/app/dashboard/exchange-rates/_components/ExchangeRatesWorkspace.tsx
// 2026-06-20: Client wrapper — Toolbar + Table + Drawer + State

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { RateRowData } from './ExchangeRateRow';
import ExchangeRatesTable from './ExchangeRatesTable';
import ExchangeRatesToolbar, { type SourceFilter, type GroupFilter } from './ExchangeRatesToolbar';
import RateEditorDrawer from './RateEditorDrawer';

interface Props {
  initialRows: RateRowData[];
}

export default function ExchangeRatesWorkspace({ initialRows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<RateRowData | null>(null);

  const handleAdd = useCallback(() => {
    setEditRow(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((row: RateRowData) => {
    setEditRow(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: RateRowData) => {
      const ok = window.confirm(`نرخ «${row.displayNameFa}» حذف شود؟ این عملیات برگشت‌پذیر نیست.`);
      if (!ok) return;
      const { deleteMarketRate } = await import('@/actions/market-rates');
      const result = await deleteMarketRate(row.id);
      if (result.success) {
        router.refresh();
      } else {
        window.alert(result.error.message);
      }
    },
    [router],
  );

  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    // یک tick صبر کن تا animation drawer کامل بشه قبل از reset
    setTimeout(() => setEditRow(null), 200);
  }, []);

  // نتیجهٔ فیلتر برای نمایش شمارنده
  const filteredCount = initialRows.filter((r) => {
    if (source !== 'all' && r.provider !== source) return false;
    if (group !== 'all' && r.group !== group) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.displayNameFa.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q);
  }).length;

  return (
    <>
      <ExchangeRatesToolbar
        query={query}
        onQueryChange={setQuery}
        source={source}
        onSourceChange={setSource}
        group={group}
        onGroupChange={setGroup}
        onAddClick={handleAdd}
        totalShown={filteredCount}
        totalAll={initialRows.length}
      />

      <ExchangeRatesTable
        rows={initialRows}
        query={query}
        source={source}
        group={group}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <RateEditorDrawer
        open={drawerOpen}
        mode={editRow ? 'edit' : 'create'}
        initialRow={editRow}
        onClose={handleCloseDrawer}
        onSaved={handleSaved}
      />
    </>
  );
}
