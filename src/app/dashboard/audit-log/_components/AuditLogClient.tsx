'use client';

/**
 * AuditLogClient — 2026 Immutable Audit Trail
 *
 * طراحی: Mercury-style high-density table
 * ویژگی‌ها:
 * - Server-side pagination از طریق URL params
 * - Filter: جستجو + نوع موجودیت + بازه تاریخ
 * - Detail Sheet با metadata JSON viewer
 * - Action badge با رنگ‌بندی semantic
 * - Sticky header با backdrop blur
 * - Export CSV
 */

import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Activity, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import s from './AuditLogClient.module.css';

type AuditLog = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
  exchangeId: string | null;
};

type Props = {
  logs: AuditLog[];
  total: number;
  totalPages: number;
  currentPage: number;
  entityTypes: string[];
  currentSearch: string;
  currentEntityType: string;
  currentDateFrom: string;
  currentDateTo: string;
};

function getActionVariant(action: string): string {
  if (action.startsWith('KYC')) return s.badgeBlue;
  if (action.startsWith('DEAL') || action.startsWith('CURRENCY_DEAL')) return s.badgeEmerald;
  if (action.startsWith('EXCHANGE') || action.startsWith('SETTLEMENT')) return s.badgeAmber;
  if (action.startsWith('FRAUD') || action.startsWith('SECURITY')) return s.badgeRose;
  if (action.startsWith('TRANSFER') || action.startsWith('PAYMENT')) return s.badgeViolet;
  return s.badgeGray;
}

function getActionDot(action: string): string {
  if (action.startsWith('KYC')) return s.dotBlue;
  if (action.startsWith('DEAL') || action.startsWith('CURRENCY_DEAL')) return s.dotEmerald;
  if (action.startsWith('EXCHANGE') || action.startsWith('SETTLEMENT')) return s.dotAmber;
  if (action.startsWith('FRAUD') || action.startsWith('SECURITY')) return s.dotRose;
  if (action.startsWith('TRANSFER') || action.startsWith('PAYMENT')) return s.dotViolet;
  return s.dotGray;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** CSV export helper */
function downloadCsv(logs: AuditLog[]) {
  const header = 'زمان,کنشگر,نقش,اقدام,موجودیت,IP';
  const rows = logs.map((l) =>
    [
      formatDate(l.createdAt),
      l.actorId ?? '',
      l.actorRole ?? '',
      l.action,
      l.entityType ?? '',
      l.ip ?? '',
    ]
      .map((v) => `"${v}"`)
      .join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogClient({
  logs,
  total,
  totalPages,
  currentPage,
  entityTypes,
  currentSearch,
  currentEntityType,
  currentDateFrom,
  currentDateTo,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Local state for controlled inputs (flush to URL on submit/change)
  const [searchInput, setSearchInput] = useState(currentSearch);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      params.delete('page'); // reset page on filter change
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams],
  );

  const goPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(page));
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    startTransition(() => router.push('?'));
  }, [router]);

  const hasFilters = !!(currentSearch || currentEntityType || currentDateFrom || currentDateTo);

  return (
    <div className={s.root}>
      <PageHeader
        title="گزارش ممیزی"
        description={`${new Intl.NumberFormat('fa-IR').format(total)} رویداد ثبت شده`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'گزارش ممیزی' }]}
      />

      {/* ── Filter bar ── */}
      <div className={s.filterBar}>
        {/* Search */}
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            placeholder="جستجو در اقدامات…"
            value={searchInput}
            aria-label="جستجو"
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateParams({ search: searchInput });
            }}
          />
        </div>

        {/* Entity type */}
        <select
          className={s.entitySelect}
          value={currentEntityType}
          onChange={(e) => updateParams({ entityType: e.target.value })}
          aria-label="فیلتر نوع موجودیت"
        >
          <option value="">همه موجودیت‌ها</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          className={s.dateInput}
          value={currentDateFrom}
          aria-label="از تاریخ"
          onChange={(e) => updateParams({ dateFrom: e.target.value })}
        />

        {/* Date to */}
        <input
          type="date"
          className={s.dateInput}
          value={currentDateTo}
          aria-label="تا تاریخ"
          onChange={(e) => updateParams({ dateTo: e.target.value })}
        />

        {/* Clear */}
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className={s.clearBtn}
            aria-label="پاک کردن فیلترها"
          >
            <X size={14} aria-hidden />
            پاک
          </Button>
        )}

        {/* Export */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCsv(logs)}
          className={s.exportBtn}
          aria-label="دانلود CSV"
        >
          <Download size={14} aria-hidden />
          CSV
        </Button>
      </div>

      {/* ── Table ── */}
      <div className={`${s.tableWrap} ${isPending ? s.tableLoading : ''}`}>
        <table className={s.table} aria-label="گزارش ممیزی" aria-busy={isPending}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th}>زمان</th>
              <th className={s.th}>کنشگر</th>
              <th className={s.th}>اقدام</th>
              <th className={s.th}>موجودیت</th>
              <th className={s.th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className={s.emptyRow}>
                  <Activity size={20} aria-hidden />
                  <span>هیچ رویدادی در این بازه ثبت نشده</span>
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                className={s.tr}
                onClick={() => setSelectedLog(log)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedLog(log)}
                role="button"
                aria-label={`جزئیات رویداد ${log.action}`}
              >
                <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                  <span className={s.dateCell}>{formatDate(log.createdAt)}</span>
                </td>
                <td className={s.td}>
                  <div className={s.actorCell}>
                    <span className={s.actorId} dir="ltr">
                      {log.actorId ? `${log.actorId.slice(0, 8)}…` : '—'}
                    </span>
                    {log.actorRole && <span className={s.actorRole}>{log.actorRole}</span>}
                  </div>
                </td>
                <td className={s.td}>
                  <div className={s.actionCell}>
                    <span className={`${s.actionDot} ${getActionDot(log.action)}`} aria-hidden />
                    <Badge className={`${s.actionBadge} ${getActionVariant(log.action)}`}>
                      {log.action}
                    </Badge>
                  </div>
                </td>
                <td className={s.td}>
                  {log.entityType ? <span className={s.entity}>{log.entityType}</span> : '—'}
                </td>
                <td className={s.td} dir="ltr">
                  <span className={s.ip}>{log.ip ?? '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={s.pagination}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goPage(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            aria-label="صفحه قبل"
          >
            <ChevronRight size={15} aria-hidden />
          </Button>

          <div className={s.pageNumbers}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => goPage(p)}
                  disabled={isPending}
                  className={`${s.pageBtn} ${p === currentPage ? s.pageBtnActive : ''}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                >
                  {new Intl.NumberFormat('fa-IR').format(p)}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => goPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={15} aria-hidden />
          </Button>

          <span className={s.pageInfo} aria-live="polite">
            {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
            {new Intl.NumberFormat('fa-IR').format(totalPages)}
          </span>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <SheetContent dir="rtl" side="left" className={s.detailSheet}>
          {selectedLog && (
            <>
              <SheetHeader className={s.detailHeader}>
                <div
                  className={`${s.actionDot} ${s.actionDotLg} ${getActionDot(selectedLog.action)}`}
                  aria-hidden
                />
                <SheetTitle className={s.detailTitle}>{selectedLog.action}</SheetTitle>
              </SheetHeader>

              <div className={s.detailBody}>
                {/* Meta grid */}
                <div className={s.metaGrid}>
                  {[
                    { key: 'زمان', val: formatDate(selectedLog.createdAt) },
                    { key: 'کنشگر', val: selectedLog.actorId ?? '—', ltr: true },
                    { key: 'نقش', val: selectedLog.actorRole ?? '—' },
                    { key: 'موجودیت', val: selectedLog.entityType ?? '—' },
                    { key: 'شناسه موجودیت', val: selectedLog.entityId ?? '—', ltr: true },
                    { key: 'IP', val: selectedLog.ip ?? '—', ltr: true },
                    { key: 'صرافی', val: selectedLog.exchangeId?.slice(0, 12) ?? '—', ltr: true },
                  ].map(({ key, val, ltr }) => (
                    <div key={key} className={s.metaItem}>
                      <span className={s.metaKey}>{key}</span>
                      <span className={s.metaVal} dir={ltr ? 'ltr' : undefined}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* JSON metadata */}
                {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                  <div className={s.metaJson}>
                    <p className={s.jsonLabel}>متادیتا</p>
                    <pre className={s.jsonPre}>{JSON.stringify(selectedLog.meta, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
