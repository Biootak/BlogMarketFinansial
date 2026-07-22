'use client';

import { DataTable } from '@/components/Dashboard/primitives/DataTable';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { resolveFraudReview } from './actions';
import s from './FraudReviewClient.module.css';

type FraudRow = {
  id: string;
  exchangeId: string;
  exchangeName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  txnId: string | null;
  reason: string;
  riskScore: number;
  status: string;
  createdAt: string;
};

type Props = { reviews: FraudRow[] };

function getRiskClass(score: number): string {
  if (score >= 70) return s.riskHigh;
  if (score >= 40) return s.riskMed;
  return s.riskLow;
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'پرریسک';
  if (score >= 40) return 'متوسط';
  return 'کم‌ریسک';
}

export function FraudReviewClient({ reviews: initial }: Props) {
  const [rows, setRows] = useState<FraudRow[]>(initial);
  const [target, setTarget] = useState<FraudRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleResolve = useCallback(() => {
    if (!target) return;
    startTransition(async () => {
      setError(null);
      const res = await resolveFraudReview(target.id, resolution);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      setTarget(null);
      setResolution('');
    });
  }, [target, resolution]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  const openCount = rows.length;
  const highCount = rows.filter((r) => r.riskScore >= 70).length;
  const medCount = rows.filter((r) => r.riskScore >= 40 && r.riskScore < 70).length;

  const columns = [
    {
      key: 'riskScore',
      header: 'ریسک',
      render: (row: FraudRow) => (
        <span className={`${s.riskBadge} ${getRiskClass(row.riskScore)}`}>
          <AlertTriangle size={11} aria-hidden />
          {getRiskLabel(row.riskScore)} ({new Intl.NumberFormat('fa-IR').format(row.riskScore)})
        </span>
      ),
    },
    {
      key: 'exchange',
      header: 'صرافی',
      render: (row: FraudRow) => (
        <span style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-secondary)' }}>
          {row.exchangeName}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'مشتری',
      render: (row: FraudRow) => (
        <div className={s.customerCell}>
          <span className={s.customerName}>{row.customerName ?? '—'}</span>
          {row.customerPhone && (
            <span className={s.customerPhone} dir="ltr">{row.customerPhone}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'دلیل',
      render: (row: FraudRow) => (
        <span className={s.reasonCell} title={row.reason}>{row.reason}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (row: FraudRow) => (
        <span style={{ fontSize: 'var(--ds-text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--ds-text-muted)' }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: FraudRow) => (
        <div className={s.actionCell}>
          <Button size="sm" variant="outline" onClick={() => setTarget(row)} disabled={isPending}>
            بررسی
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={s.page}>
      <PageHeader
        title="صف بررسی تقلب"
        description={`${new Intl.NumberFormat('fa-IR').format(openCount)} مورد باز`}
        eyebrow="فین‌تک — امنیت"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی تقلب' }]}
      />

      {/* Stats */}
      <div className={s.statsRow}>
        {[
          { label: 'موارد باز', value: openCount, color: 'var(--ds-text-primary)' },
          { label: 'پرریسک (≥۷۰)', value: highCount, color: 'var(--ds-status-error-fg)' },
          { label: 'متوسط (۴۰–۶۹)', value: medCount, color: 'var(--ds-status-pending-fg)' },
        ].map(({ label, value, color }) => (
          <div key={label} className={s.statCard}>
            <span className={s.statLabel}>{label}</span>
            <span className={s.statValue} style={{ color }}>
              {new Intl.NumberFormat('fa-IR').format(value)}
            </span>
          </div>
        ))}
      </div>

      {error && <div className={s.errorBanner} role="alert">{error}</div>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        ariaLabel="صف بررسی تقلب"
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="صف تقلب خالی است"
            description="هیچ موردی برای بررسی وجود ندارد."
          />
        }
      />

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>بررسی گزارش تقلب</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div
              className={`${s.riskBadge} ${target ? getRiskClass(target.riskScore) : ''}`}
              style={{ alignSelf: 'flex-start' }}
            >
              <AlertTriangle size={12} aria-hidden />
              {target && `${getRiskLabel(target.riskScore)} — امتیاز: ${target.riskScore}`}
            </div>
            <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-secondary)' }}>
              <strong>دلیل:</strong> {target?.reason}
            </p>
            <div>
              <label className={s.dialogLabel} htmlFor="resolution">
                نتیجه بررسی:
              </label>
              <textarea
                id="resolution"
                className={s.dialogTextarea}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                placeholder="تراکنش معتبر / رد شد / مسدود شد / …"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button onClick={handleResolve} disabled={isPending || !resolution}>
              {isPending ? 'در حال ثبت...' : 'ثبت نتیجه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
