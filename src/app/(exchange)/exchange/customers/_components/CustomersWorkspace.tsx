'use client';

/**
 * CustomersWorkspace — مدیریت مشتریان صراف.
 * جدول + جستجو + drawer افزودن/ویرایش + تغییر وضعیت.
 */

import {
  type CustomerRow,
  createCustomer,
  setCustomerStatus,
  updateCustomer,
} from '@/actions/exchange-customers';
import { type Column, DataTable, EmptyState } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { PencilLine, Plus, Search, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import CustomerDrawer from './CustomerDrawer';
import s from './CustomersWorkspace.module.css';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال', cls: s.badgeActive },
  PROSPECT: { label: 'احتمالی', cls: s.badgePending },
  FROZEN: { label: 'مسدود', cls: s.badgeSuspended },
  CLOSED: { label: 'بسته', cls: s.badgeClosed },
};

const KYC_MAP: Record<string, string> = {
  NONE: '—',
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
};

interface Props {
  exchangeId: string;
  initialRows: CustomerRow[];
  totalCount: number;
  staffRole: string;
}

export default function CustomersWorkspace({
  exchangeId,
  initialRows,
  totalCount: _totalCount,
  staffRole,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.nationalId ?? '').includes(q) ||
        (r.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      const result = editRow
        ? await updateCustomer(exchangeId, editRow.id, data)
        : await createCustomer(exchangeId, data);
      setSaving(false);
      if (result.success) {
        setDrawerOpen(false);
        setEditRow(null);
        router.refresh();
      } else {
        // U6-fix: جایگزینی alert() با toast
        toast({ variant: 'destructive', title: 'خطا', description: result.error.message });
      }
    },
    [editRow, exchangeId, router, toast],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: 'ACTIVE' | 'FROZEN' | 'CLOSED') => {
      const result = await setCustomerStatus(exchangeId, id, status);
      if (result.success) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)),
        );
      }
    },
    [exchangeId],
  );

  const columns: Column<CustomerRow>[] = [
    {
      key: 'fullName',
      header: 'مشتری',
      render: (r) => (
        <Link
          href={`/exchange/customers/${r.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--at-accent)',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'text-decoration-color 120ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.textDecorationColor = 'currentColor';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.textDecorationColor = 'transparent';
              }}
            >
              {r.fullName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--at-fg-subtle)',
                direction: 'ltr',
                textAlign: 'right',
              }}
            >
              {r.phone}
            </div>
          </div>
        </Link>
      ),
      width: '200px',
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
        const st = STATUS_MAP[r.status] ?? { label: r.status, cls: '' };
        return <span className={`${s.badge} ${st.cls}`}>{st.label}</span>;
      },
    },
    {
      key: 'kycLevel',
      header: 'KYC',
      render: (r) => <span className={s.kycBadge}>{KYC_MAP[r.kycLevel] ?? r.kycLevel}</span>,
    },
    {
      key: 'riskScore',
      header: 'ریسک',
      render: (r) => (
        <span
          className="tabular-nums"
          style={{ color: r.riskScore > 70 ? 'oklch(50% 0.15 25)' : 'var(--at-fg-subtle)' }}
        >
          {r.riskScore}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            width: '120px',
            render: (r: CustomerRow) => (
              <div className={s.actions}>
                {r.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    className={s.actionBtn}
                    title="فعال‌سازی"
                    onClick={() => handleStatusChange(r.id, 'ACTIVE')}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
                {r.status === 'ACTIVE' && (
                  <button
                    type="button"
                    className={s.actionBtn}
                    title="مسدود کردن"
                    onClick={() => handleStatusChange(r.id, 'FROZEN')}
                  >
                    <UserX className="w-4 h-4 text-amber-600" />
                  </button>
                )}
                <button
                  type="button"
                  className={s.actionBtn}
                  title="ویرایش"
                  onClick={() => {
                    setEditRow(r);
                    setDrawerOpen(true);
                  }}
                >
                  <PencilLine className="w-4 h-4" />
                </button>
              </div>
            ),
          } as Column<CustomerRow>,
        ]
      : []),
  ];

  const stats = {
    all: rows.length,
    active: rows.filter((r) => r.status === 'ACTIVE').length,
    prospect: rows.filter((r) => r.status === 'PROSPECT').length,
    frozen: rows.filter((r) => r.status === 'FROZEN').length,
  };

  return (
    <>
      <div className={s.statsStrip}>
        {[
          { label: 'کل', value: stats.all, filter: 'all' },
          { label: 'فعال', value: stats.active, filter: 'ACTIVE' },
          { label: 'احتمالی', value: stats.prospect, filter: 'PROSPECT' },
          { label: 'مسدود', value: stats.frozen, filter: 'FROZEN' },
        ].map((item) => (
          <button
            key={item.filter}
            type="button"
            className={`${s.statCard} ${statusFilter === item.filter ? s.statCardActive : ''}`}
            onClick={() => setStatusFilter(item.filter)}
          >
            <span className={s.statValue}>{new Intl.NumberFormat('fa-IR').format(item.value)}</span>
            <span className={s.statLabel}>{item.label}</span>
          </button>
        ))}
      </div>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            placeholder="جستجو نام، شماره، کد ملی…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی مشتری"
          />
        </div>
        {canEdit && (
          <button
            type="button"
            className={s.addBtn}
            onClick={() => {
              setEditRow(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>مشتری جدید</span>
          </button>
        )}
      </div>

      <div className={s.tableWrap}>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          ariaLabel="لیست مشتریان"
          empty={
            <EmptyState
              title="مشتری‌ای یافت نشد"
              description={query ? 'جستجوی شما نتیجه‌ای ندارد.' : 'اولین مشتری را اضافه کنید.'}
            />
          }
        />
      </div>

      {drawerOpen && (
        <CustomerDrawer
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
    </>
  );
}
