// src/app/dashboard/exchange-rates/_components/ExchangeRatesWorkspace.tsx
// 2026-07-29: Catalog (quick-add) + Toolbar + Table + Drawer orchestration.

'use client';

import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { getDashboardUnitLabel } from '../_lib/unit-labels';
import CurrencyCatalog, { type CatalogEntry } from './CurrencyCatalog';
import type { RateRowData } from './ExchangeRateRow';
import ExchangeRatesTable from './ExchangeRatesTable';
import ExchangeRatesToolbar, { type GroupFilter, type SourceFilter } from './ExchangeRatesToolbar';
import LeadRateHero from './LeadRateHero';
import RateEditorDrawer from './RateEditorDrawer';

interface Props {
  initialRows: RateRowData[];
}

export default function ExchangeRatesWorkspace({ initialRows }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<RateRowData | null>(null);
  const [prefill, setPrefill] = useState<CatalogEntry | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RateRowData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddManual = useCallback(() => {
    setEditRow(null);
    setPrefill(null);
    setDrawerOpen(true);
  }, []);

  const handleAddFromCatalog = useCallback((entry: CatalogEntry) => {
    setEditRow(null);
    setPrefill(entry);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((row: RateRowData) => {
    setEditRow(row);
    setPrefill(null);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback((row: RateRowData) => {
    setDeleteTarget(row);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { deleteMarketRate } = await import('@/actions/market-rates');
    const result = await deleteMarketRate(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.success) {
      toast({ title: 'نرخ حذف شد', description: deleteTarget.displayNameFa, variant: 'success' });
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'خطا', description: result.error.message });
    }
  }, [deleteTarget, router, toast]);

  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => {
      setEditRow(null);
      setPrefill(null);
    }, 200);
  }, []);

  // Result count
  const filteredCount = useMemo(
    () =>
      initialRows.filter((r) => {
        if (source !== 'all' && r.provider !== source) return false;
        if (group !== 'all' && r.group !== group) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return r.displayNameFa.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q);
      }).length,
    [initialRows, source, group, query],
  );

  // Lead rate selection — prefer afghan group > iran-forex > first active
  const leadRate = useMemo(() => {
    const priority =
      initialRows.find((r) => r.group === 'afghan' && r.active) ??
      initialRows.find((r) => r.symbol === 'AFGHANI_AFN' && r.active) ??
      initialRows.find((r) => r.symbol === 'IRAN_USD' && r.active) ??
      initialRows.find((r) => r.active);
    if (!priority) return null;

    const raw = priority.singleRate
      ? Number.parseFloat(priority.singleRate) / priority.divisor
      : null;
    return {
      symbol: priority.symbol,
      displayNameFa: priority.displayNameFa,
      group: (priority.group ?? 'minor') as Parameters<typeof LeadRateHero>[0]['group'],
      value: raw,
      unitLabel: getDashboardUnitLabel(priority.unit),
      changePercent: 0, // not provided in current data; would need a snapshot diff
      updatedAt:
        priority.updatedAt instanceof Date ? priority.updatedAt : new Date(priority.updatedAt),
      sparkline: [],
    };
  }, [initialRows]);

  return (
    <>
      {/* Lead rate hero + catalog */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 'var(--ds-space-5)',
        }}
      >
        {leadRate && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
              gap: 'var(--ds-space-4)',
            }}
          >
            <LeadRateHero {...leadRate} />
          </div>
        )}

        <CurrencyCatalog
          existingRows={initialRows}
          onAdd={handleAddFromCatalog}
          onEdit={handleEdit}
        />
      </div>

      <ExchangeRatesToolbar
        query={query}
        onQueryChange={setQuery}
        source={source}
        onSourceChange={setSource}
        group={group}
        onGroupChange={setGroup}
        onAddClick={handleAddManual}
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
        prefill={prefill}
        onClose={handleCloseDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف نرخ"
        description={`نرخ «${deleteTarget?.displayNameFa ?? ''}» حذف شود؟ این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف شود"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
