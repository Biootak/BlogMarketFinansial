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
  MillionDollarEmpty,
  PageHeader,
} from '@/components/Dashboard/primitives';
import { SearchInput } from '@/components/Dashboard/primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { formatFaNumber } from '@/lib/fa-number';
import { PencilLine, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
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

  const openEdit = useCallback((r: TransferProviderRow) => {
    setEditRow(r);
    setDrawerOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditRow(null);
    setDrawerOpen(true);
  }, []);

  // ─── Desktop columns ──────────────────────────────────────────
  const columns: Column<TransferProviderRow>[] = [
    {
      key: 'name',
      header: 'نام / slug',
      render: (r) => (
        <div className={s.nameCell}>
          <div className={s.cellName}>{r.name}</div>
          <div className={s.cellSlug}>{r.slug}</div>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'نوع',
      collapse: true,
      render: (r) => (
        <span className={s.kindBadge} data-kind={r.kind}>
          {KIND_FA[r.kind] ?? r.kind}
        </span>
      ),
    },
    {
      key: 'spreadPercent',
      header: 'اسپرد٪',
      collapse: true,
      render: (r) => <span className={s.numCell}>{r.spreadPercent.toFixed(2)}٪</span>,
    },
    {
      key: 'flatFeeToman',
      header: 'کارمزد ثابت',
      collapse: true,
      render: (r) => (
        <span className={s.numCell}>
          {r.flatFeeToman > 0 ? `${formatFaNumber(r.flatFeeToman)} ت` : '—'}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'منبع',
      collapse: true,
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
      width: 110,
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
          <span className={s.toggleLabel}>{r.active ? 'فعال' : 'غیرفعال'}</span>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 88,
      render: (r) =>
        r.exchangeId ? (
          /* صرافی بیرونی — فقط toggle، بدون ویرایش/حذف */
          <span className={s.readonlyTag}>فقط نمایش</span>
        ) : (
          <div className={s.actions}>
            <button
              type="button"
              className={s.actionBtn}
              onClick={() => openEdit(r)}
              aria-label={`ویرایش ${r.name}`}
            >
              <PencilLine className={s.actionIcon} aria-hidden />
            </button>
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionBtnDanger}`}
              onClick={() => setDeleteTarget(r)}
              aria-label={`حذف ${r.name}`}
            >
              <Trash2 className={s.actionIcon} aria-hidden />
            </button>
          </div>
        ),
    },
  ];

  return (
    <div className={s.root}>
      <PageHeader
        variant="compact"
        title="صرافی‌های جدول مقایسه"
        description="مدیریت provider های نرخ که در صفحه /money-transfer نمایش داده می‌شوند"
        breadcrumb={[{ label: 'داشبورد' }, { label: 'صرافی‌های مقایسه' }]}
        actions={
          <button type="button" className={s.addBtn} onClick={openAdd}>
            <Plus className={s.addBtnIcon} aria-hidden />
            <span>افزودن provider</span>
          </button>
        }
      />

      {/* ── Stats ── */}
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

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="جستجو در نام یا slug…"
          ariaLabel="جستجو در صرافی‌ها"
        />

        <div className={s.filterRow}>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className={s.filterTrigger} aria-label="فیلتر نوع">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نوع‌ها</SelectItem>
              <SelectItem value="SARAJI">صرافی</SelectItem>
              <SelectItem value="ONLINE">آنلاین</SelectItem>
              <SelectItem value="BANK">بانک</SelectItem>
              <SelectItem value="CRYPTO">رمزارز</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={scopeFilter}
            onValueChange={(v) => setScopeFilter(v as 'all' | 'platform' | 'exchange')}
          >
            <SelectTrigger className={s.filterTrigger} aria-label="فیلتر منبع">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه منابع</SelectItem>
              <SelectItem value="platform">پلتفرم</SelectItem>
              <SelectItem value="exchange">صرافی‌ها</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <MillionDollarEmpty
          variant="search"
          tone="primary"
          eyebrow="ارائه‌دهندگان"
          title="صرافی‌ای یافت نشد"
          description="هنوز هیچ صرافی‌ای برای جدول مقایسه ثبت نشده یا فیلتر شما نتیجه‌ای ندارد."
          primaryAction={
            <button type="button" className={s.addBtn} onClick={openAdd}>
              <Plus className={s.addBtnIcon} aria-hidden />
              <span>افزودن اولین provider</span>
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop: DataTable (hidden on mobile via CSS) */}
          <div className={s.desktopTable}>
            <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
          </div>

          {/* Mobile: card list */}
          <div className={s.mobileCards}>
            {filtered.map((r) => (
              <div key={r.id} className={`${s.card} ${r.active ? s.cardActive : s.cardInactive}`}>
                {/* Card top row */}
                <div className={s.cardRow}>
                  <div className={s.cardLeft}>
                    <span className={s.cardName}>{r.name}</span>
                    <span className={s.cardSlug}>{r.slug}</span>
                  </div>
                  <div className={s.cardRight}>
                    {/* Toggle */}
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
                      <span>{r.active ? 'فعال' : 'غیرفعال'}</span>
                    </button>
                  </div>
                </div>

                {/* Card meta chips */}
                <div className={s.cardMeta}>
                  <span className={s.kindBadge} data-kind={r.kind}>
                    {KIND_FA[r.kind] ?? r.kind}
                  </span>
                  <span
                    className={`${s.sourceBadge} ${r.exchangeId ? s.sourceBadgeExchange : s.sourceBadgePlatform}`}
                  >
                    {r.exchangeId ? 'صرافی' : 'پلتفرم'}
                  </span>
                  {r.spreadPercent > 0 && (
                    <span className={s.metaNum}>{r.spreadPercent.toFixed(2)}٪ اسپرد</span>
                  )}
                  {r.flatFeeToman > 0 && (
                    <span className={s.metaNum}>{formatFaNumber(r.flatFeeToman)} ت کارمزد</span>
                  )}
                </div>

                {/* Card footer: actions — only for platform providers */}
                {!r.exchangeId && (
                  <div className={s.cardActions}>
                    <button
                      type="button"
                      className={s.cardActionBtn}
                      onClick={() => openEdit(r)}
                      aria-label={`ویرایش ${r.name}`}
                    >
                      <PencilLine className={s.actionIcon} aria-hidden />
                      <span>ویرایش</span>
                    </button>
                    <button
                      type="button"
                      className={`${s.cardActionBtn} ${s.cardActionBtnDanger}`}
                      onClick={() => setDeleteTarget(r)}
                      aria-label={`حذف ${r.name}`}
                    >
                      <Trash2 className={s.actionIcon} aria-hidden />
                      <span>حذف</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
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
