'use client';

/**
 * AuditLogClient — 2026 Immutable Audit Trail
 *
 * طراحی: اتاق کنترل امنیتی — Linear × Vercel × Mercury
 *
 * ویژگی‌ها:
 * - Glass KPI strip: تعداد رویداد امروز، FRAUD، KYC، EXCHANGE
 * - Tabs: All / KYC / Deal / Exchange / Security / Transfer
 * - Sticky frosted toolbar با Search + Select + DateRange + Export
 * - Timeline feed: هر ردیف یک سند — click → Detail Sheet
 * - Detail Sheet: glass panel با copy-to-clipboard، JSON viewer، badge header
 * - Empty state با canonical EmptyState primitive
 * - Server-side pagination با ellipsis
 * - بدون hex — فقط DS tokens + at-* tokens
 */

import { MillionDollarEmpty, PageHeader } from '@/components/Dashboard/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Network,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { exportAuditLogs } from '../_actions/exportAuditLog';

import s from './AuditLogClient.module.css';

/* ─────────────────────────────── Types ─────────────────────────────────── */

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
  currentCategory: string;
};

type ActionCategory = 'all' | 'kyc' | 'deal' | 'exchange' | 'security' | 'transfer';

/* ────────────────────────── Action Classification ──────────────────────── */

function getCategory(action: string): ActionCategory {
  if (action.startsWith('KYC')) return 'kyc';
  if (action.startsWith('DEAL') || action.startsWith('CURRENCY_DEAL')) return 'deal';
  if (action.startsWith('EXCHANGE') || action.startsWith('SETTLEMENT')) return 'exchange';
  if (action.startsWith('FRAUD') || action.startsWith('SECURITY')) return 'security';
  if (action.startsWith('TRANSFER') || action.startsWith('PAYMENT')) return 'transfer';
  return 'all';
}

function getActionVariant(action: string) {
  const cat = getCategory(action);
  return {
    kyc: s.badgeBlue,
    deal: s.badgeEmerald,
    exchange: s.badgeAmber,
    security: s.badgeRose,
    transfer: s.badgeViolet,
    all: s.badgeGray,
  }[cat];
}

function getActionDot(action: string) {
  const cat = getCategory(action);
  return {
    kyc: s.dotBlue,
    deal: s.dotEmerald,
    exchange: s.dotAmber,
    security: s.dotRose,
    transfer: s.dotViolet,
    all: s.dotGray,
  }[cat];
}

function getKpiAccent(cat: Exclude<ActionCategory, 'all'>): string {
  return {
    kyc: s.kpiBlue,
    deal: s.kpiEmerald,
    exchange: s.kpiAmber,
    security: s.kpiRose,
    transfer: s.kpiViolet,
  }[cat];
}

/* ───────────────────────────── Formatters ───────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

/* ──────────────────────────── Copy Helper ───────────────────────────────── */

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(null), 1800);
    });
  }, []);
  return { copied, copy };
}

/* ─────────────────────────────── KPI Strip ─────────────────────────────── */

const KPI_DEFS: {
  key: Exclude<ActionCategory, 'all'>;
  label: string;
  icon: React.ElementType;
  prefix: string[];
}[] = [
  { key: 'kyc', label: 'احراز هویت', icon: UserCheck, prefix: ['KYC'] },
  { key: 'deal', label: 'معاملات', icon: ArrowUpDown, prefix: ['DEAL', 'CURRENCY_DEAL'] },
  { key: 'exchange', label: 'صرافی/تسویه', icon: Wallet, prefix: ['EXCHANGE', 'SETTLEMENT'] },
  { key: 'security', label: 'امنیتی', icon: ShieldAlert, prefix: ['FRAUD', 'SECURITY'] },
  { key: 'transfer', label: 'انتقال/پرداخت', icon: Network, prefix: ['TRANSFER', 'PAYMENT'] },
];

function computeKpiCounts(logs: AuditLog[]): Record<Exclude<ActionCategory, 'all'>, number> {
  const counts = { kyc: 0, deal: 0, exchange: 0, security: 0, transfer: 0 };
  for (const l of logs) {
    const cat = getCategory(l.action);
    if (cat !== 'all') counts[cat]++;
  }
  return counts;
}

/* ─────────────────────────── Pagination ────────────────────────────────── */

function buildPageWindows(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AuditLogClient
   ═══════════════════════════════════════════════════════════════════════════ */

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
  currentCategory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [isExporting, setIsExporting] = useState(false);
  const { copied, copy } = useCopy();

  /* ── active tab driven by URL ── */
  const activeTab = (currentCategory as ActionCategory) || 'all';

  /* ── URL helpers ── */
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      params.delete('page');
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

  const setTab = useCallback(
    (cat: string) => {
      updateParams({ category: cat === 'all' ? '' : cat });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    startTransition(() => router.push('?'));
  }, [router]);

  const hasFilters = !!(
    currentSearch ||
    currentEntityType ||
    currentDateFrom ||
    currentDateTo ||
    currentCategory
  );

  /* ── Server-side filtered — no client filter needed ── */
  const filteredLogs = logs;

  /* ── KPI counts (current page snapshot — real totals come from server) ── */
  const kpiCounts = computeKpiCounts(logs);

  /* ── Today count ── */
  const todayCount = logs.filter((l) => isToday(l.createdAt)).length;

  /* ── Pagination windows ── */
  const pageWindows = buildPageWindows(currentPage, totalPages);

  /* ── Tab counts (current page) ── */
  const tabCounts: Record<ActionCategory, number> = {
    all: logs.length,
    kyc: kpiCounts.kyc,
    deal: kpiCounts.deal,
    exchange: kpiCounts.exchange,
    security: kpiCounts.security,
    transfer: kpiCounts.transfer,
  };

  /* ── Full export via server action ── */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportAuditLogs({
        search: currentSearch || undefined,
        entityType: currentEntityType || undefined,
        dateFrom: currentDateFrom || undefined,
        dateTo: currentDateTo || undefined,
        category: currentCategory || undefined,
      });
      if (result.success) {
        const blob = new Blob([`\uFEFF${result.csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  }, [currentSearch, currentEntityType, currentDateFrom, currentDateTo, currentCategory]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={s.root}>
        {/* ── Page Header ── */}
        <PageHeader
          variant="compact"
          title="گزارش ممیزی"
          description={`${new Intl.NumberFormat('fa-IR').format(total)} رویداد ثبت شده در سیستم`}
          breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'گزارش ممیزی' }]}
          icon="clipboard-list"
          accent="amber"
          actions={
            <div className={s.headerActions}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className={s.exportBtn}
                aria-label="دانلود CSV — همه رویدادها"
              >
                <Download size={14} aria-hidden />
                {isExporting ? 'در حال دریافت…' : 'خروجی CSV (کامل)'}
              </Button>
            </div>
          }
        />

        {/* ── Glass KPI Strip ── */}
        <div className={s.kpiStrip} role="region" aria-label="خلاصه آماری رویدادها">
          {/* Today */}
          <div className={`${s.kpiCard} ${s.kpiCardToday}`}>
            <div className={s.kpiIconWrap}>
              <Activity size={16} aria-hidden />
            </div>
            <div className={s.kpiBody}>
              <span className={s.kpiLabel}>امروز</span>
              <span className={s.kpiValue}>
                {new Intl.NumberFormat('fa-IR').format(todayCount)}
              </span>
            </div>
          </div>

          {/* Per-category */}
          {KPI_DEFS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`${s.kpiCard} ${getKpiAccent(key)} ${activeTab === key ? s.kpiCardActive : ''}`}
              onClick={() => setTab(activeTab === key ? 'all' : key)}
              aria-pressed={activeTab === key}
              aria-label={`فیلتر: ${label}`}
            >
              <div className={s.kpiIconWrap}>
                <Icon size={16} aria-hidden />
              </div>
              <div className={s.kpiBody}>
                <span className={s.kpiLabel}>{label}</span>
                <span className={s.kpiValue}>
                  {new Intl.NumberFormat('fa-IR').format(kpiCounts[key])}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Frosted Sticky Toolbar ── */}
        <div className={s.toolbar} role="search" aria-label="فیلتر رویدادها">
          <div className={s.toolbarStart}>
            {/* Search */}
            <div className={s.searchWrap}>
              <Search size={14} className={s.searchIcon} aria-hidden />
              <input
                className={s.searchInput}
                placeholder="جستجو در اقدامات…"
                value={searchInput}
                aria-label="جستجوی اقدام"
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateParams({ search: searchInput });
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  className={s.searchClear}
                  onClick={() => {
                    setSearchInput('');
                    updateParams({ search: '' });
                  }}
                  aria-label="پاک کردن جستجو"
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </div>

            {/* Entity Type */}
            <Select
              value={currentEntityType || 'all'}
              onValueChange={(v) => updateParams({ entityType: v === 'all' ? '' : v })}
            >
              <SelectTrigger className={s.entitySelect} aria-label="فیلتر نوع موجودیت">
                <SelectValue placeholder="همه موجودیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه موجودیت‌ها</SelectItem>
                {entityTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className={s.dateWrap}>
              <Calendar size={13} className={s.dateIcon} aria-hidden />
              <input
                type="date"
                className={s.dateInput}
                value={currentDateFrom}
                aria-label="از تاریخ"
                onChange={(e) => updateParams({ dateFrom: e.target.value })}
              />
              <span className={s.dateSep} aria-hidden>
                —
              </span>
              <input
                type="date"
                className={s.dateInput}
                value={currentDateTo}
                aria-label="تا تاریخ"
                onChange={(e) => updateParams({ dateTo: e.target.value })}
              />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className={s.clearBtn}
                aria-label="پاک کردن همه فیلترها"
              >
                <X size={13} aria-hidden />
                پاک
              </Button>
            )}
          </div>

          <div className={s.toolbarEnd}>
            {isPending && (
              <span className={s.pendingDot} aria-label="در حال بارگذاری" role="status" />
            )}
            <span className={s.resultCount} aria-live="polite">
              {new Intl.NumberFormat('fa-IR').format(filteredLogs.length)} رویداد
            </span>
          </div>
        </div>

        {/* ── Category Tabs ── */}
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className={s.tabsList} aria-label="دسته‌بندی رویدادها">
            {(
              [
                { value: 'all', label: 'همه', icon: Activity },
                { value: 'kyc', label: 'احراز هویت', icon: UserCheck },
                { value: 'deal', label: 'معاملات', icon: ArrowUpDown },
                { value: 'exchange', label: 'صرافی', icon: Wallet },
                { value: 'security', label: 'امنیت', icon: Shield },
                { value: 'transfer', label: 'انتقال', icon: Network },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className={s.tabsTrigger}>
                <Icon size={13} aria-hidden />
                <span>{label}</span>
                <span
                  className={`${s.tabCount} ${value === 'security' && tabCounts[value] > 0 ? s.tabCountAlert : ''}`}
                >
                  {new Intl.NumberFormat('fa-IR').format(tabCounts[value])}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ── Timeline Table ── */}
        <div
          className={`${s.tableWrap} ${isPending ? s.tableLoading : ''}`}
          aria-live="polite"
          aria-busy={isPending}
        >
          {filteredLogs.length === 0 ? (
            <MillionDollarEmpty
              variant={hasFilters ? 'search' : 'sparkles'}
              tone="primary"
              eyebrow="مرکز رویداد"
              title="رویدادی یافت نشد"
              description={
                hasFilters
                  ? 'فیلترهای فعلی نتیجه‌ای ندارند. برای مشاهدهٔ همه رویدادها فیلترها را پاک کنید.'
                  : 'هنوز هیچ رویدادی ثبت نشده است. وقتی کاربری عملیاتی انجام دهد، اینجا ثبت می‌شود.'
              }
              primaryAction={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    پاک کردن فیلترها
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <table className={s.table} aria-label="جدول رویدادهای ممیزی">
              <thead className={s.thead}>
                <tr>
                  <th className={s.th} scope="col">
                    زمان
                  </th>
                  <th className={s.th} scope="col">
                    کنشگر
                  </th>
                  <th className={s.th} scope="col">
                    اقدام
                  </th>
                  <th className={s.th} scope="col">
                    موجودیت
                  </th>
                  <th className={`${s.th} ${s.thIp}`} scope="col">
                    IP
                  </th>
                  <th className={`${s.th} ${s.thAction}`} scope="col">
                    <span className="sr-only">جزئیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`${s.tr} ${getCategory(log.action) === 'security' ? s.trSecurity : ''}`}
                    onClick={() => setSelectedLog(log)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedLog(log);
                    }}
                    aria-label={`رویداد: ${log.action}`}
                    style={{ '--row-index': idx } as React.CSSProperties}
                  >
                    {/* Time */}
                    <td className={s.td}>
                      <div className={s.timeCell}>
                        <span className={s.timeMain}>{formatDate(log.createdAt)}</span>
                        {isToday(log.createdAt) && <span className={s.timeBadgeToday}>امروز</span>}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className={s.td}>
                      <div className={s.actorCell}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={s.actorId} dir="ltr">
                              {log.actorId ? `${log.actorId.slice(0, 8)}…` : '—'}
                            </span>
                          </TooltipTrigger>
                          {log.actorId && (
                            <TooltipContent side="bottom" className={s.tooltip}>
                              <span dir="ltr">{log.actorId}</span>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {log.actorRole && <span className={s.actorRole}>{log.actorRole}</span>}
                      </div>
                    </td>

                    {/* Action */}
                    <td className={s.td}>
                      <div className={s.actionCell}>
                        <span
                          className={`${s.actionDot} ${getActionDot(log.action)}`}
                          aria-hidden
                        />
                        <Badge className={`${s.actionBadge} ${getActionVariant(log.action)}`}>
                          {log.action}
                        </Badge>
                      </div>
                    </td>

                    {/* Entity */}
                    <td className={s.td}>
                      {log.entityType ? (
                        <span className={s.entity}>{log.entityType}</span>
                      ) : (
                        <span className={s.emptyCell}>—</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className={`${s.td} ${s.tdIp}`} dir="ltr">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={s.ip}>{log.ip ?? '—'}</span>
                        </TooltipTrigger>
                        {log.ip && (
                          <TooltipContent side="bottom" className={s.tooltip}>
                            {log.ip}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </td>

                    {/* Row dropdown */}
                    <td className={`${s.td} ${s.tdAction}`} onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={s.rowBtn}
                            aria-label={`اقدامات ردیف ${log.action}`}
                            tabIndex={-1}
                          >
                            <MoreHorizontal size={15} aria-hidden />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="bottom"
                          className={s.dropdownContent}
                        >
                          <DropdownMenuLabel className={s.dropdownLabel}>اقدامات</DropdownMenuLabel>
                          <DropdownMenuSeparator className={s.dropdownSep} />

                          {/* View detail */}
                          <DropdownMenuItem
                            className={s.dropdownItem}
                            onSelect={() => setSelectedLog(log)}
                          >
                            <Eye size={14} className={s.dropdownIcon} aria-hidden />
                            مشاهده جزئیات
                          </DropdownMenuItem>

                          {/* Copy action */}
                          <DropdownMenuItem
                            className={s.dropdownItem}
                            onSelect={() => copy(log.action, `action-${log.id}`)}
                          >
                            <ClipboardCopy size={14} className={s.dropdownIcon} aria-hidden />
                            کپی اقدام
                          </DropdownMenuItem>

                          {/* Copy actor */}
                          {log.actorId && (
                            <DropdownMenuItem
                              className={s.dropdownItem}
                              onSelect={() => copy(log.actorId!, `actor-${log.id}`)}
                            >
                              <ClipboardCopy size={14} className={s.dropdownIcon} aria-hidden />
                              کپی شناسه کنشگر
                            </DropdownMenuItem>
                          )}

                          {/* Copy IP */}
                          {log.ip && (
                            <DropdownMenuItem
                              className={s.dropdownItem}
                              onSelect={() => copy(log.ip!, `ip-${log.id}`)}
                            >
                              <ClipboardCopy size={14} className={s.dropdownIcon} aria-hidden />
                              کپی آدرس IP
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className={s.dropdownSep} />

                          {/* Filter by this category */}
                          <DropdownMenuItem
                            className={s.dropdownItem}
                            onSelect={() => setTab(getCategory(log.action))}
                          >
                            <Filter size={14} className={s.dropdownIcon} aria-hidden />
                            فیلتر این دسته
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <nav className={s.pagination} aria-label="صفحه‌بندی">
            <Button
              size="sm"
              variant="outline"
              onClick={() => goPage(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className={s.pageNavBtn}
              aria-label="صفحه قبل"
            >
              <ChevronRight size={15} aria-hidden />
            </Button>

            <div className={s.pageNumbers} role="list">
              {pageWindows.map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className={s.pageEllipsis} aria-hidden>
                    <MoreHorizontal size={14} />
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goPage(p as number)}
                    disabled={isPending}
                    className={`${s.pageBtn} ${p === currentPage ? s.pageBtnActive : ''}`}
                    aria-current={p === currentPage ? 'page' : undefined}
                    aria-label={`صفحه ${p}`}
                  >
                    {new Intl.NumberFormat('fa-IR').format(p as number)}
                  </button>
                ),
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => goPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className={s.pageNavBtn}
              aria-label="صفحه بعد"
            >
              <ChevronLeft size={15} aria-hidden />
            </Button>

            <span className={s.pageInfo} aria-live="polite">
              صفحه {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
              {new Intl.NumberFormat('fa-IR').format(totalPages)}
            </span>
          </nav>
        )}

        {/* ══ Detail Modal — center glass dialog ══ */}
        <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
          <DialogPortal>
            {/* Overlay */}
            <DialogOverlay className={s.modalOverlay} />

            {/* Panel — Radix Content for focus-trap + Esc, styled via CSS Module */}
            <DialogPrimitive.Content
              aria-labelledby="audit-modal-title"
              dir="rtl"
              className={s.modalContent}
            >
              {selectedLog && (
                <>
                  {/* ── Modal Header ── */}
                  <div className={s.modalHeader}>
                    <div className={s.modalHeaderInner}>
                      {/* Accent dot */}
                      <span
                        className={`${s.modalDot} ${getActionDot(selectedLog.action)}`}
                        aria-hidden
                      />
                      <div className={s.modalHeaderText}>
                        <DialogTitle id="audit-modal-title" className={s.modalTitle}>
                          {selectedLog.action}
                        </DialogTitle>
                        <p className={s.modalSubtitle}>{formatDate(selectedLog.createdAt)}</p>
                      </div>
                      <Badge className={`${s.modalBadge} ${getActionVariant(selectedLog.action)}`}>
                        {getCategory(selectedLog.action) === 'security'
                          ? '⚠ امنیتی'
                          : getCategory(selectedLog.action) === 'kyc'
                            ? 'احراز هویت'
                            : getCategory(selectedLog.action) === 'deal'
                              ? 'معامله'
                              : getCategory(selectedLog.action) === 'exchange'
                                ? 'صرافی'
                                : getCategory(selectedLog.action) === 'transfer'
                                  ? 'انتقال'
                                  : 'سایر'}
                      </Badge>
                      {/* Close button */}
                      <DialogClose className={s.modalClose} aria-label="بستن">
                        <X size={15} aria-hidden />
                      </DialogClose>
                    </div>
                  </div>

                  {/* ── Security alert ── */}
                  {getCategory(selectedLog.action) === 'security' && (
                    <div className={s.securityAlert} role="alert">
                      <AlertTriangle size={15} aria-hidden />
                      <span>این رویداد نیازمند بررسی فوری امنیتی است</span>
                    </div>
                  )}

                  {/* ── Modal Body ── */}
                  <div className={s.modalBody}>
                    {/* Meta grid */}
                    <section className={s.sheetSection} aria-label="اطلاعات رویداد">
                      <h3 className={s.sectionLabel}>جزئیات رویداد</h3>
                      <div className={s.metaGrid}>
                        {[
                          { key: 'کنشگر', val: selectedLog.actorId, ltr: true, copyKey: 'actorId' },
                          { key: 'نقش', val: selectedLog.actorRole, ltr: false },
                          { key: 'نوع موجودیت', val: selectedLog.entityType, ltr: false },
                          {
                            key: 'شناسه موجودیت',
                            val: selectedLog.entityId,
                            ltr: true,
                            copyKey: 'entityId',
                          },
                          { key: 'آدرس IP', val: selectedLog.ip, ltr: true, copyKey: 'ip' },
                          {
                            key: 'صرافی',
                            val: selectedLog.exchangeId,
                            ltr: true,
                            copyKey: 'exchangeId',
                          },
                        ]
                          .filter(({ val }) => val)
                          .map(({ key, val, ltr, copyKey }) => (
                            <div key={key} className={s.metaRow}>
                              <span className={s.metaKey}>{key}</span>
                              <div className={s.metaValWrap}>
                                <span className={s.metaVal} dir={ltr ? 'ltr' : undefined}>
                                  {val}
                                </span>
                                {copyKey && val && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className={s.copyBtn}
                                        onClick={() =>
                                          copy(val as string, `${copyKey}-${selectedLog.id}`)
                                        }
                                        aria-label={`کپی ${key}`}
                                      >
                                        <ClipboardCopy size={12} aria-hidden />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className={s.tooltip}>
                                      {copied === `${copyKey}-${selectedLog.id}`
                                        ? '✓ کپی شد'
                                        : 'کپی'}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>

                    {/* JSON metadata */}
                    {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                      <section className={s.sheetSection} aria-label="متادیتای رویداد">
                        <div className={s.jsonHeader}>
                          <h3 className={s.sectionLabel}>متادیتا</h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={s.copyBtnSm}
                                onClick={() =>
                                  copy(
                                    JSON.stringify(selectedLog.meta, null, 2),
                                    `meta-${selectedLog.id}`,
                                  )
                                }
                                aria-label="کپی متادیتا"
                              >
                                <ClipboardCopy size={12} aria-hidden />
                                {copied === `meta-${selectedLog.id}` ? 'کپی شد' : 'کپی'}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className={s.tooltip}>
                              کپی JSON
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className={s.jsonBlock}>
                          <pre className={s.jsonPre}>
                            {JSON.stringify(selectedLog.meta, null, 2)}
                          </pre>
                        </div>
                      </section>
                    )}
                  </div>
                </>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
