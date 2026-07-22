'use client';

import { reviewKycRecord } from '@/actions/kyc-onboarding';
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
import { CheckCircle2, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './KycReviewClient.module.css';

type KycRow = {
  id: string;
  userId: string;
  fullName: string | null;
  submittedAt: string | null;
  selfieUrl: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  user: { name: string | null; email: string; phone: string | null } | null;
};

type Props = { records: KycRow[] };

export function KycReviewClient({ records: initial }: Props) {
  const [rows, setRows] = useState<KycRow[]>(initial);
  const [rejectTarget, setRejectTarget] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(
    (row: KycRow) => {
      startTransition(async () => {
        setError(null);
        const res = await reviewKycRecord({ userId: row.userId, approved: true });
        if (!res.success) { setError(res.error.message); return; }
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      });
    },
    [],
  );

  const handleRejectConfirm = useCallback(() => {
    if (!rejectTarget) return;
    startTransition(async () => {
      setError(null);
      const res = await reviewKycRecord({
        userId: rejectTarget.userId,
        approved: false,
        rejectedReason: rejectReason || 'اطلاعات ناقص یا نادرست',
      });
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    });
  }, [rejectTarget, rejectReason]);

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const columns = [
    {
      key: 'fullName',
      header: 'نام',
      render: (row: KycRow) => (
        <div className={s.nameCell}>
          <span className={s.name}>{row.fullName ?? row.user?.name ?? '—'}</span>
          <span className={s.email}>{row.user?.email ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'تلفن',
      render: (row: KycRow) => <span dir="ltr">{row.user?.phone ?? '—'}</span>,
    },
    {
      key: 'submittedAt',
      header: 'تاریخ ارسال',
      render: (row: KycRow) => formatDate(row.submittedAt),
    },
    {
      key: 'docs',
      header: 'مدارک',
      render: (row: KycRow) => (
        <div className={s.docsCell}>
          {row.selfieUrl && (
            <a href={row.selfieUrl} target="_blank" rel="noopener noreferrer" className={s.docLink}>
              <ExternalLink size={12} aria-hidden /> سلفی
            </a>
          )}
          {row.docFrontUrl && (
            <a href={row.docFrontUrl} target="_blank" rel="noopener noreferrer" className={s.docLink}>
              <ExternalLink size={12} aria-hidden /> روی مدرک
            </a>
          )}
          {row.docBackUrl && (
            <a href={row.docBackUrl} target="_blank" rel="noopener noreferrer" className={s.docLink}>
              <ExternalLink size={12} aria-hidden /> پشت مدرک
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row: KycRow) => (
        <div className={s.actionCell}>
          <Button
            size="sm"
            onClick={() => handleApprove(row)}
            disabled={isPending}
            className={s.approveBtn}
          >
            <CheckCircle2 size={14} aria-hidden /> تأیید
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejectTarget(row)}
            disabled={isPending}
            className={s.rejectBtn}
          >
            <XCircle size={14} aria-hidden /> رد
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="بررسی درخواست‌های KYC"
        description={`${rows.length} درخواست در انتظار بررسی`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی KYC' }]}
      />

      {error && (
        <div className={s.errorBanner} role="alert">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        ariaLabel="صف بررسی KYC"
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="همه KYC‌ها بررسی شدند"
            description="درخواست جدیدی در صف نیست."
          />
        }
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد درخواست KYC</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            <label className={s.dialogLabel} htmlFor="rejectReason">
              دلیل رد (اختیاری):
            </label>
            <textarea
              id="rejectReason"
              className={s.dialogTextarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="مدارک ناخوانا / اطلاعات ناقص / …"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isPending}
            >
              {isPending ? 'در حال ارسال...' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
