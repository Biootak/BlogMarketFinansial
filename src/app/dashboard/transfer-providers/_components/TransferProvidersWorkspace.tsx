'use client';

/**
 * TransferProvidersWorkspace — مدیریت صراف‌های جدول مقایسه نرخ.
 *
 * OWNER/ADMIN از اینجا:
 *   - provider های پلتفرمی (بدون exchangeId) را ایجاد/ویرایش/حذف می‌کند
 *   - provider های صرافی‌ها (با exchangeId) را می‌بیند و فعال/غیرفعال می‌کند
 *   - ترتیب نمایش را drag-free با ورودی عددی تنظیم می‌کند
 */

import {
  type TransferProviderRow,
  createTransferProvider,
  deleteTransferProvider,
  toggleTransferProvider,
  updateTransferProvider,
} from '@/actions/transfer-providers';
import {
  type Column,
  ConfirmDialog,
  DataTable,
  EmptyState,
  MillionDollarEmpty,
  PageHeader,
} from '@/components/Dashboard/primitives';
import { toast } from '@/components/ui/use-toast';
import {
  Building2,
  CheckCircle2,
  Loader2,
  PencilLine,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import ProviderDrawer from './ProviderDrawer';
import s from './TransferProvidersWorkspace.module.css';

const KIND_FA: Record<string, string> = {
  SARAJI: 'صرافی',
  ONLINE: 'آنلاین',
  BANK: 'بانک',
  CRYPTO: 'رمزارز',
};

interface Props {
  initialRows: TransferProviderRow[];
}

export default function TransferProvidersWorkspace({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'platform' | 'exchange'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransferProviderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransferProviderRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (scopeFilter === 'platform' && r.exchangeId !== null) return false;
      if (scopeFilter === 'exchange' && r.exchangeId === null) return false;
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, kindFilter, scopeFilter]);

  const platformCount = useMemo(() => rows.filter((r) => r.exchangeId === null).length, [rows]);
  const exchangeCount = useMemo(() => rows.filter((r) => r.exchangeId !== null).length, [rows]);

  const handleToggle = useCallback((row: TransferProviderRow) => {
    startTransition(async () => {
      const res = await toggleTransferProvider(row.id, !row.active);
      if (res.success) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !row.active } : r)));
      } else {
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      }
    });
  }, []);

  const handleSave = useCallback(
    async (data: unknown): Promise<{ success: boolean; message?: string }> => {
      if (editRow) {
        const res = await updateTransferProvider(editRow.id, data);
        if (res.success) {
          setRows((prev) => prev.map((r) => (r.id === editRow.id ? res.data : r)));
          setDrawerOpen(false);
          setEditRow(null);
          return { success: true };
        }
        return { success: false, message: res.error.message };
      }
      const res = await createTransferProvider(data);
      if (res.success) {
        setRows((prev) => [res.data, ...prev]);
        setDrawerOpen(false);
        return { success: true };
      }
      return { success: false, message: res.error.message };
    },
    [editRow],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteTransferProvider(deleteTarget.id);
    setDeleting(false);
    if (res.success) {
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const columns: Column<TransferProviderRow>[] = [
    {
      key: 'name',
      header: 'نام / slug',
      render: (r) => (
        <div>
          <div className={s.cellName}>{r.name}</div>
          <div className={s.cellSlug}>{r.slug}</div>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'نوع',
      render: (r) => (
        <span className={s.kindBadge} data-kind={r.kind}>
          {KIND_FA[r.kind] ?? r.kind}
        </span>
      ),
    },
    {
      key: 'spreadPercent',
      header: 'اسپرد٪',
      render: (r) => <span className={s.numCell}>{r.spreadPercent.toFixed(2)}٪</span>,
    },
    {
      key: 'flatFeeToman',
      header: 'کارمزد ثابت',
      render: (r) => (
        <span className={s.numCell}>
          {r.flatFeeToman > 0 ? `${new Intl.NumberFormat('fa-IR').format(r.flatFeeToman)} ت` : '—'}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'منبع',
      render: (r) => (
        <span
          className={`${s.sourceBadge} ${r.exchangeId ? s.sourceBadgeExchange : s.sourceBadgePlatform}`}
        >
          {r.exchangeId ? 'صرافی' : 'پلتفرم'}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'وضعیت',
      render: (r) => (
        <button
          type="button"
          className={`${s.toggleBtn} ${r.active ? s.toggleBtnOn : ''}`}
          onClick={() => handleToggle(r)}
          disabled={isPending}
          aria-label={r.active ? 'غیرفعال کردن' : 'فعال کردن'}
          aria-pressed={r.active}
        >
          {r.active ? (
            <ToggleRight className={s.toggleIcon} aria-hidden />
          ) : (
            <ToggleLeft className={s.toggleIcon} aria-hidden />
          )}
          {r.active ? 'فعال' : 'غیرفعال'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className={s.actions}>
          {!r.exchangeId && (
            <button
              type="button"
              className={s.actionBtn}
              onClick={() => {
                setEditRow(r);
                setDrawerOpen(true);
              }}
              aria-label={`ویرایش ${r.name}`}
            >
              <PencilLine className={s.actionIcon} aria-hidden />
            </button>
          )}
          {!r.exchangeId && (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionBtnDanger}`}
              onClick={() => setDeleteTarget(r)}
              aria-label={`حذف ${r.name}`}
            >
              <Trash2 className={s.actionIcon} aria-hidden />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={s.root}>
      <PageHeader
        title="صرافی‌های جدول مقایسه"
        description="مدیریت provider های نرخ که در صفحه /money-transfer نمایش داده می‌شوند"
        breadcrumb={[{ label: 'داشبورد' }, { label: 'صرافی‌های مقایسه' }]}
        actions={
          <button
            type="button"
            className={s.addBtn}
            onClick={() => {
              setEditRow(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className={s.addBtnIcon} aria-hidden />
            افزودن provider
          </button>
        }
      />

      {/* Stats */}
      <div className={s.stats}>
        <div className={s.statItem}>
          <span className={s.statValue}>{rows.length}</span>
          <span className={s.statLabel}>کل</span>
        </div>
        <div className={s.statItem}>
          <span className={s.statValue}>{platformCount}</span>
          <span className={s.statLabel}>پلتفرم</span>
        </div>
        <div className={s.statItem}>
          <span className={s.statValue}>{exchangeCount}</span>
          <span className={s.statLabel}>صرافی‌ها</span>
        </div>
        <div className={s.statItem}>
          <span className={s.statValue}>{rows.filter((r) => r.active).length}</span>
          <span className={s.statLabel}>فعال</span>
        </div>
      </div>

      {/* Filters */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} aria-hidden />
          <input
            type="search"
            className={s.searchInput}
            placeholder="جستجو در نام یا slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجو در صرافی‌ها"
          />
        </div>

        <select
          className={s.filterSelect}
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          aria-label="فیلتر نوع"
        >
          <option value="all">همه نوع‌ها</option>
          <option value="SARAJI">صرافی</option>
          <option value="ONLINE">آنلاین</option>
          <option value="BANK">بانک</option>
          <option value="CRYPTO">رمزارز</option>
        </select>

        <select
          className={s.filterSelect}
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as 'all' | 'platform' | 'exchange')}
          aria-label="فیلتر منبع"
        >
          <option value="all">همه منابع</option>
          <option value="platform">پلتفرم</option>
          <option value="exchange">صرافی‌ها</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <MillionDollarEmpty
          variant="search"
          tone="primary"
          eyebrow="ارائه‌دهندگان"
          title="صرافی‌ای یافت نشد"
          description="هنوز هیچ صرافی‌ای برای جدول مقایسه ثبت نشده یا فیلتر شما نتیجه‌ای ندارد."
          primaryAction={
            <button
              type="button"
              className={s.addBtn}
              onClick={() => {
                setEditRow(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className={s.addBtnIcon} aria-hidden />
              افزودن اولین provider
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
      )}

      {/* Drawer */}
      <ProviderDrawer
        open={drawerOpen}
        editRow={editRow}
        onClose={() => {
          setDrawerOpen(false);
          setEditRow(null);
        }}
        onSave={handleSave}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="حذف صرافی"
        description={`آیا از حذف «${deleteTarget?.name ?? ''}» مطمئن هستید؟ این عمل برگشت‌ناپذیر است.`}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
