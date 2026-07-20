'use client';

/**
 * ExchangesWorkspace — جدول + drawer مدیریت صراف‌ها.
 *
 * OWNER/ADMIN پلتفرم از اینجا صراف‌ها را ایجاد، ویرایش، تأیید و مکث می‌کند.
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
  PageHeader,
} from '@/components/Dashboard/primitives';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  PauseCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import ExchangeDrawer from './ExchangeDrawer';
import s from './ExchangesWorkspace.module.css';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال', cls: s.badgeActive },
  PENDING: { label: 'در انتظار', cls: s.badgePending },
  SUSPENDED: { label: 'معلق', cls: s.badgeSuspended },
  CLOSED: { label: 'بسته', cls: s.badgeClosed },
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
        alert(result.error.message);
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
      alert(result.error.message);
    }
  }, [deleteTarget]);

  const columns: Column<ExchangeRow>[] = [
    {
      key: 'name',
      header: 'نام صرافی',
      render: (r) => (
        <div className={s.nameCell}>
          <div className={s.nameIcon}>
            <Building2 className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <div className={s.nameText}>{r.name}</div>
            <div className={s.slugText}>/{r.slug}</div>
          </div>
        </div>
      ),
      width: '220px',
    },
    {
      key: 'city',
      header: 'شهر',
      render: (r) => r.city ?? '—',
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r) => {
        const s2 = STATUS_MAP[r.status] ?? { label: r.status, cls: '' };
        return <span className={`${s.badge} ${s2.cls}`}>{s2.label}</span>;
      },
    },
    {
      key: 'platformFee',
      header: 'کارمزد پلتفرم',
      render: (r) => <span className="tabular-nums">{r.platformFee.toFixed(2)}٪</span>,
    },
    {
      key: 'customers',
      header: 'مشتریان',
      render: (r) => (
        <span className="tabular-nums">
          {new Intl.NumberFormat('fa-IR').format(r._count?.Customer ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      render: (r) => (
        <div className={s.actions}>
          {r.status !== 'ACTIVE' && (
            <button
              type="button"
              className={s.actionBtn}
              title="تأیید و فعال‌سازی"
              onClick={() => handleStatusChange(r.id, 'ACTIVE')}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />
            </button>
          )}
          {r.status === 'ACTIVE' && (
            <button
              type="button"
              className={s.actionBtn}
              title="معلق کردن"
              onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
            >
              <PauseCircle className="w-4 h-4 text-amber-600" aria-hidden />
            </button>
          )}
          <Link href={`/dashboard/exchanges/${r.id}`} className={s.actionBtn} title="مشاهده جزئیات">
            <CircleDot className="w-4 h-4" aria-hidden />
          </Link>
          <button
            type="button"
            className={s.actionBtn}
            title="ویرایش"
            onClick={() => {
              setEditRow(r);
              setDrawerOpen(true);
            }}
          >
            <PencilLine className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionDanger}`}
            title="حذف"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const stats = {
    all: rows.length,
    active: rows.filter((r) => r.status === 'ACTIVE').length,
    pending: rows.filter((r) => r.status === 'PENDING').length,
    suspended: rows.filter((r) => r.status === 'SUSPENDED').length,
  };

  return (
    <>
      {/* Stats strip */}
      <div className={s.statsStrip}>
        {[
          { label: 'کل صراف‌ها', value: stats.all, filter: 'all' },
          { label: 'فعال', value: stats.active, filter: 'ACTIVE' },
          { label: 'در انتظار', value: stats.pending, filter: 'PENDING' },
          { label: 'معلق', value: stats.suspended, filter: 'SUSPENDED' },
        ].map((s2) => (
          <button
            key={s2.filter}
            type="button"
            className={`${s.statCard} ${statusFilter === s2.filter ? s.statCardActive : ''}`}
            onClick={() => setStatusFilter(s2.filter)}
          >
            <span className={s.statValue}>{new Intl.NumberFormat('fa-IR').format(s2.value)}</span>
            <span className={s.statLabel}>{s2.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            placeholder="جستجو نام، slug، شهر…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی صراف"
          />
        </div>
        <button
          type="button"
          className={s.addBtn}
          onClick={() => {
            setEditRow(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="w-4 h-4" aria-hidden />
          <span>صراف جدید</span>
        </button>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          ariaLabel="لیست صراف‌ها"
          empty={
            <EmptyState
              title="صرافی یافت نشد"
              description={query ? 'جستجوی شما نتیجه‌ای ندارد.' : 'اولین صرافی را اضافه کنید.'}
            />
          }
        />
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <ExchangeDrawer
          open={drawerOpen}
          initialData={editRow}
          saving={saving}
          onClose={() => {
            setDrawerOpen(false);
            setEditRow(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف صرافی"
        description={`صرافی «${deleteTarget?.name ?? ''}» و تمام داده‌های آن (مشتریان، تراکنش‌ها) برای همیشه حذف می‌شوند. این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
