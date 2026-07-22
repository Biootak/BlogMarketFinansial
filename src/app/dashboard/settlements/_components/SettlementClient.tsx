'use client';

import { approveSettlement, markSettlementPaid, type SettlementRow } from '@/actions/settlement';
import { DataTable } from '@/components/Dashboard/primitives/DataTable';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { StatCard } from '@/components/Dashboard/primitives/StatCard';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleDollarSign } from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './SettlementClient.module.css';

type Props = { settlements: SettlementRow[] };

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const STATUS_CSS: Record<string, string> = {
  PENDING: s.pending,
  APPROVED: s.approved,
  PAID: s.paid,
  REJECTED: s.cancelled,
  CANCELLED: s.cancelled,
};

function fmtAFN(val: string): string {
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val) / 100); // stored in cents
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SettlementClient({ settlements: initial }: Props) {
  const [rows, setRows] = useState<SettlementRow[]>(initial);
  const [tab, setTab] = useState<'all' | 'PENDING' | 'APPROVED' | 'PAID'>('all');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const totalPaid = useMemo(
    () => rows.filter((r) => r.status === 'PAID').reduce((sum, r) => sum + Number(r.exchangeNet), 0),
    [rows],
  );

  const handleApprove = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await approveSettlement(id);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r));
    });
  }, []);

  const handlePaid = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await markSettlementPaid(id);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'PAID' } : r));
    });
  }, []);

  const columns = [
    {
      key: 'exchange',
      header: 'صرافی',
      render: (r: SettlementRow) => (
        <span style={{ fontSize: 'var(--ds-text-sm)', fontWeight: 500 }}>{r.exchangeName}</span>
      ),
    },
    {
      key: 'period',
      header: 'دوره',
      render: (r: SettlementRow) => (
        <span style={{ fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtDate(r.periodStart)} — {fmtDate(r.periodEnd)}
        </span>
      ),
    },
    {
      key: 'totalVolume',
      header: 'حجم',
      render: (r: SettlementRow) => <span className={s.amount}>{fmtAFN(r.totalVolume)}</span>,
    },
    {
      key: 'dealCount',
      header: 'معاملات',
      render: (r: SettlementRow) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Intl.NumberFormat('fa-IR').format(r.dealCount)}
        </span>
      ),
    },
    {
      key: 'platformFee',
      header: 'کارمزد پلتفرم',
      render: (r: SettlementRow) => <span className={s.amount}>{fmtAFN(r.platformFee)}</span>,
    },
    {
      key: 'exchangeNet',
      header: 'خالص صراف',
      render: (r: SettlementRow) => <span className={s.amount}>{fmtAFN(r.exchangeNet)}</span>,
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r: SettlementRow) => (
        <Badge className={`${s.statusBadge} ${STATUS_CSS[r.status] ?? s.pending}`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (r: SettlementRow) => (
        <div className={s.actionCell}>
          {r.status === 'PENDING' && (
            <Button size="sm" disabled={isPending} onClick={() => handleApprove(r.id)}>
              تأیید
            </Button>
          )}
          {r.status === 'APPROVED' && (
            <Button size="sm" disabled={isPending} onClick={() => handlePaid(r.id)}>
              ثبت پرداخت
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="تسویه‌حساب صرافی‌ها"
        description="مدیریت و پرداخت تسویه‌های دوره‌ای"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'تسویه‌حساب' }]}
      />

      <StatGrid cols={3} gap="md" className="mb-5">
        <StatCard label="مجموع تسویه‌ها" value={rows.length} format="persian" />
        <StatCard label="در انتظار" value={rows.filter((r) => r.status === 'PENDING').length} format="persian" />
        <StatCard label="پرداخت شده (AFN)" value={totalPaid / 100} format="compact" />
      </StatGrid>

      {error && <div className={s.errorBanner} role="alert">{error}</div>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className={s.tabs}>
        <TabsList>
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="PENDING">در انتظار</TabsTrigger>
          <TabsTrigger value="APPROVED">تأیید شده</TabsTrigger>
          <TabsTrigger value="PAID">پرداخت شده</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        ariaLabel="تسویه‌حساب صرافی‌ها"
        empty={
          <EmptyState
            icon={CircleDollarSign}
            title="تسویه‌ای ثبت نشده"
            description="هنوز هیچ دوره تسویه‌ای محاسبه نشده است."
          />
        }
      />
    </div>
  );
}
