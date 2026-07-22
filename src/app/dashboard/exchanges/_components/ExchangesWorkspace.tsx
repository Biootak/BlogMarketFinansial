'use client';

/**
 * ExchangesWorkspace — 2026 Million-Dollar Exchange Management
 *
 * طراحی: Stripe Dashboard × Linear — hero KPI bar + card-grid + table hybrid
 * ویژگی‌ها:
 * - KPI strip فیلتر-قابل با عدد بزرگ و label کوچک
 * - searchbar + status filter pill
 * - جدول با avatar icon + badge status + action row
 * - Drawer برای ایجاد/ویرایش
 * - ConfirmDialog برای حذف
 */

import {
  type ExchangeRow,
  createExchange,
  deleteExchange,
  setExchangeStatus,
  updateExchange,
} from '@/actions/exchanges';
import {
  type Column,
  ConfirmDialog,
  DataTable,
  EmptyState,
} from '@/components/Dashboard/primitives';
import { toast } from '@/components/ui/use-toast';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  PauseCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import ExchangeDrawer from './ExchangeDrawer';
import s from './ExchangesWorkspace.module.css';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'فعال',      cls: s.badgeActive },
  PENDING:   { label: 'در انتظار', cls: s.badgePending },
  SUSPENDED: { label: 'معلق',      cls: s.badgeSuspended },
  CLOSED:    { label: 'بسته',      cls: s.badgeClosed },
};

interface Props {
  initialExchanges: ExchangeRow[];
}

export default function ExchangesWorkspace({ initialExchanges }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialExchanges);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExchangeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      const result = editRow ? await updateExchange(editRow.id, data) : await createExchange(data);
      setSaving(false);
      if (result.success) {
        setDrawerOpen(false);
        setEditRow(null);
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    },
    [editRow, router],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') => {
      const result = await setExchangeStatus(id, status);
      if (result.success) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteExchange(deleteTarget.id);
    setDeleting(false);
    if (result.success) {
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
    }
  }, [deleteTarget]);

  const stats = {
    all:       rows.length,
    active:    rows.filter((r) => r.status === 'ACTIVE').length,
    pending:   rows.filter((r) => r.status === 'PENDING').length,
    suspended: rows.filter((r) => r.status === 'SUSPENDED').length,
  };

  const kpiItems = [
    { id: 'all',       label: 'کل صراف‌ها',  value: stats.all,       accent: 'var(--ds-brand-500)' },
    { id: 'ACTIVE',    label: 'فعال',         value: stats.active,    accent: 'var(--nova-emerald, oklch(50% 0.14 145))' },
    { id: 'PENDING',   label: 'در انتظار',    value: stats.pending,   accent: 'var(--nova-amber, oklch(60% 0.16 70))' },
    { id: 'SUSPENDED', label: 'معلق',          value: stats.suspended, accent: 'var(--nova-rose, oklch(55% 0.18 25))' },
  ] as const;

  const columns: Column<ExchangeRow>[] = [
    {
      key: 'name',
      header: 'صرافی',
      render: (r) => (
        <div className={s.nameCell}>
          <div className={s.nameAvatar}>
            {r.name.slice(0, 1)}
          </div>
          <div className={s.nameInfo}>
            <span className={s.nameText}>{r.name}</span>
            <span className={s.slugText} dir="ltr">/{r.slug}</span>
          </div>
        </div>
      ),
      width: '240px',
    },
    {
      key: 'city',
      header: 'شهر',
      render: (r) => (
        <span className={s.cityCell}>{r.city ?? <span className={s.dash}>—</span>}</span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r) => {
        const sm = STATUS_MAP[r.status] ?? { label: r.status, cls: '' };
        return (
          <span className={`${s.badge} ${sm.cls}`}>
            <span className={s.badgeDot} aria-hidden />
            {sm.label}
          </span>
        );
      },
    },
    {
      key: 'platformFee',
      header: 'کارمزد',
      render: (r) => (
        <span className={s.feeCell} dir="ltr">
          {r.platformFee.toFixed(2)}٪
        </span>
      ),
    },
    {
      key: 'customers',
      header: 'مشتریان',
      render: (r) => (
        <span className={s.countCell}>
          {new Intl.NumberFormat('fa-IR').format(r._count?.Customer ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (r) => (
        <div className={s.actions}>
          {r.status !== 'ACTIVE' && (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionApprove}`}
              title="تأیید و فعال‌سازی"
              onClick={() => handleStatusChange(r.id, 'ACTIVE')}
            >
              <CheckCircle2 size={14} aria-hidden />
              فعال‌سازی
            </button>
          )}
          {r.status === 'ACTIVE' && (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionSuspend}`}
              title="معلق کردن"
              onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
            >
              <PauseCircle size={14} aria-hidden />
            </button>
          )}
          <Link
            href={`/dashboard/exchanges/${r.id}`}
            className={`${s.actionBtn} ${s.actionView}`}
            title="مشاهده جزئیات"
          >
            <ChevronRight size={14} aria-hidden />
          </Link>
          <button
            type="button"
            className={s.actionBtn}
            title="ویرایش"
            onClick={() => { setEditRow(r); setDrawerOpen(true); }}
          >
            <PencilLine size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionDanger}`}
            title="حذف"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={s.workspace}>
      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className={s.kpiStrip} role="list" aria-label="آمار صراف‌ها">
        {kpiItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={`${s.kpiCard} ${statusFilter === item.id ? s.kpiCardActive : ''}`}
            style={{ '--kpi-accent': item.accent } as React.CSSProperties}
            onClick={() => setStatusFilter(item.id)}
            aria-pressed={statusFilter === item.id}
          >
            <span className={s.kpiAccentBar} aria-hidden />
            <span className={s.kpiValue}>
              {new Intl.NumberFormat('fa-IR').format(item.value)}
            </span>
            <span className={s.kpiLabel}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            placeholder="جستجو نام، slug، شهر…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی صراف"
          />
        </div>

        {/* Status pills */}
        <div className={s.pills} role="group" aria-label="فیلتر وضعیت">
          {[
            { id: 'all', label: 'همه' },
            { id: 'ACTIVE', label: 'فعال' },
            { id: 'PENDING', label: 'در انتظار' },
            { id: 'SUSPENDED', label: 'معلق' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${s.pill} ${statusFilter === p.id ? s.pillActive : ''}`}
              onClick={() => setStatusFilter(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={s.addBtn}
          onClick={() => { setEditRow(null); setDrawerOpen(true); }}
        >
          <Plus size={14} aria-hidden />
          صراف جدید
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className={s.tableWrap}>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          ariaLabel="لیست صراف‌ها"
          empty={
            <EmptyState
              icon={Building2}
              title="صرافی یافت نشد"
              description={query ? 'جستجوی شما نتیجه‌ای ندارد.' : 'اولین صرافی را اضافه کنید.'}
              action={
                !query ? (
                  <button type="button" className={s.addBtn} onClick={() => { setEditRow(null); setDrawerOpen(true); }}>
                    <Plus size={14} aria-hidden /> صراف جدید
                  </button>
                ) : undefined
              }
            />
          }
        />
      </div>

      {/* ── Drawer ────────────────────────────────────────────────── */}
      {drawerOpen && (
        <ExchangeDrawer
          open={drawerOpen}
          initialData={editRow}
          saving={saving}
          onClose={() => { setDrawerOpen(false); setEditRow(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Delete confirm ────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="حذف صرافی"
        description={`صرافی «${deleteTarget?.name ?? ''}» و تمام داده‌های آن برای همیشه حذف می‌شوند. این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
