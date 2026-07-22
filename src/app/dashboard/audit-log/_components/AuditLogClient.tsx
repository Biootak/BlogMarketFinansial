'use client';

import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
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

type Props = { logs: AuditLog[] };

const PAGE_SIZE = 20;

function getActionVariant(action: string): string {
  if (action.startsWith('KYC')) return s.badgeBlue;
  if (action.startsWith('DEAL') || action.startsWith('CURRENCY_DEAL')) return s.badgeEmerald;
  if (action.startsWith('EXCHANGE') || action.startsWith('SETTLEMENT')) return s.badgeAmber;
  if (action.startsWith('FRAUD') || action.startsWith('SECURITY')) return s.badgeRose;
  return s.badgeGray;
}

export function AuditLogClient({ logs }: Props) {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType).filter(Boolean))),
    [logs],
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch = !search || l.action.toLowerCase().includes(search.toLowerCase());
      const matchEntity = !entityFilter || l.entityType === entityFilter;
      return matchSearch && matchEntity;
    });
  }, [logs, search, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <PageHeader
        title="گزارش ممیزی"
        description="تاریخچه تمام اقدامات حساس سیستم"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'گزارش ممیزی' }]}
      />

      {/* Filter bar */}
      <div className={s.filterBar}>
        <Input
          placeholder="جستجو در اقدامات…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={s.searchInput}
          aria-label="جستجو"
        />
        <select
          className={s.entitySelect}
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          aria-label="فیلتر نوع موجودیت"
        >
          <option value="">همه موجودیت‌ها</option>
          {entityTypes.map((t) => (
            <option key={t} value={t ?? ''}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table} aria-label="گزارش ممیزی">
          <thead>
            <tr>
              <th className={s.th}>زمان</th>
              <th className={s.th}>کنشگر</th>
              <th className={s.th}>نقش</th>
              <th className={s.th}>اقدام</th>
              <th className={s.th}>موجودیت</th>
              <th className={s.th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className={s.emptyRow}>
                  <Activity size={18} aria-hidden />
                  <span>هیچ رویدادی ثبت نشده</span>
                </td>
              </tr>
            )}
            {pageRows.map((log) => (
              <tr
                key={log.id}
                className={s.tr}
                onClick={() => setSelectedLog(log)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedLog(log)}
                role="button"
                aria-label={`جزئیات رویداد ${log.action}`}
              >
                <td className={s.td} style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatDate(log.createdAt)}
                </td>
                <td className={s.td} dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {log.actorId ? log.actorId.slice(0, 8) + '…' : '—'}
                </td>
                <td className={s.td}>{log.actorRole ?? '—'}</td>
                <td className={s.td}>
                  <Badge className={`${s.actionBadge} ${getActionVariant(log.action)}`}>
                    {log.action}
                  </Badge>
                </td>
                <td className={s.td}>{log.entityType ?? '—'}</td>
                <td className={s.td} dir="ltr">{log.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={s.pagination}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="صفحه قبل"
          >
            <ChevronRight size={15} aria-hidden />
          </Button>
          <span className={s.pageInfo}>
            صفحه {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
            {new Intl.NumberFormat('fa-IR').format(totalPages)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={15} aria-hidden />
          </Button>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <SheetContent dir="rtl" side="left">
          <SheetHeader>
            <SheetTitle>جزئیات رویداد</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className={s.sheetBody}>
              <div className={s.metaGrid}>
                {[
                  { key: 'اقدام', val: selectedLog.action },
                  { key: 'زمان', val: formatDate(selectedLog.createdAt) },
                  { key: 'کنشگر', val: selectedLog.actorId ?? '—', ltr: true },
                  { key: 'نقش', val: selectedLog.actorRole ?? '—' },
                  { key: 'موجودیت', val: selectedLog.entityType ?? '—' },
                  { key: 'شناسه موجودیت', val: selectedLog.entityId ?? '—', ltr: true },
                  { key: 'IP', val: selectedLog.ip ?? '—', ltr: true },
                ].map(({ key, val, ltr }) => (
                  <div key={key} className={s.metaItem}>
                    <span className={s.metaKey}>{key}</span>
                    <span className={s.metaVal} dir={ltr ? 'ltr' : undefined}>{val}</span>
                  </div>
                ))}
              </div>
              {selectedLog.meta && (
                <div className={s.metaJson}>
                  <p className={s.jsonLabel}>metadata</p>
                  <pre className={s.jsonPre}>{JSON.stringify(selectedLog.meta, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
