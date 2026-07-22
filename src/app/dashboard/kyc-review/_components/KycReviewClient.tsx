'use client';

/**
 * KycReviewClient — 2026 Admin KYC Review Queue
 *
 * طراحی: Mercury-inspired high-density admin table + document preview sheet
 * ویژگی‌ها:
 * - جدول با sticky header و hover states
 * - Document preview در Sheet (نه tab جدید) با ImageFallback
 * - Status chips با رنگ semantic
 * - Approve / Reject با confirmation dialog
 * - KPI counter در بالا
 * - spring micro-interactions روی row hover و دکمه‌ها
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import { reviewKycRecord } from '@/actions/kyc-onboarding';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CheckCircle2,
  Eye,
  FileText,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
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

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** نام مخفف برای آواتار */
function initials(name: string | null | undefined): string {
  if (!name) return '؟';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return name.slice(0, 2);
}

/** Image preview با fallback */
function DocImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={s.imgFallback} aria-label={alt}>
        <FileText size={32} aria-hidden />
        <span>بارگذاری ناموفق</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={s.docImg}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export function KycReviewClient({ records: initial }: Props) {
  const [rows, setRows] = useState<KycRow[]>(initial);
  const [rejectTarget, setRejectTarget] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewRow, setPreviewRow] = useState<KycRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(
    (row: KycRow) => {
      startTransition(async () => {
        setError(null);
        const res = await reviewKycRecord({ userId: row.userId, approved: true });
        if (!res.success) { setError(res.error.message); return; }
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        // اگر preview همین row بود ببند
        setPreviewRow((prev) => prev?.id === row.id ? null : prev);
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
        rejectedReason: rejectReason.trim() || 'اطلاعات ناقص یا نادرست',
      });
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setPreviewRow((prev) => prev?.id === rejectTarget.id ? null : prev);
      setRejectTarget(null);
      setRejectReason('');
    });
  }, [rejectTarget, rejectReason]);

  const docCount = (row: KycRow) =>
    [row.selfieUrl, row.docFrontUrl, row.docBackUrl].filter(Boolean).length;

  return (
    <div className={s.root}>
      <PageHeader
        title="بررسی درخواست‌های KYC"
        description={`${rows.length} درخواست در صف بررسی`}
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'بررسی KYC' }]}
      />

      {/* ── KPI strip ── */}
      <div className={s.kpiStrip} role="status" aria-label="خلاصه صف KYC">
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>{rows.length}</span>
          <span className={s.kpiLabel}>در انتظار بررسی</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>
            {rows.filter((r) => r.docFrontUrl || r.docBackUrl || r.selfieUrl).length}
          </span>
          <span className={s.kpiLabel}>با مدرک کامل</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>
            {rows.filter((r) => !r.docFrontUrl && !r.docBackUrl && !r.selfieUrl).length}
          </span>
          <span className={s.kpiLabel}>بدون مدرک</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className={s.errorBanner} role="alert">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="همه KYC‌ها بررسی شدند"
          description="درخواست جدیدی در صف نیست."
        />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="صف بررسی KYC">
            <thead>
              <tr>
                <th className={s.th}>متقاضی</th>
                <th className={s.th}>تماس</th>
                <th className={s.th}>تاریخ ارسال</th>
                <th className={s.th}>مدارک</th>
                <th className={s.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={s.tr}>
                  {/* Applicant */}
                  <td className={s.td}>
                    <div className={s.applicant}>
                      <div className={s.avatar} aria-hidden>
                        {initials(row.fullName ?? row.user?.name)}
                      </div>
                      <div className={s.applicantInfo}>
                        <span className={s.applicantName}>
                          {row.fullName ?? row.user?.name ?? '—'}
                        </span>
                        <span className={s.applicantEmail}>{row.user?.email ?? '—'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className={s.td}>
                    <span className={s.phone} dir="ltr">{row.user?.phone ?? '—'}</span>
                  </td>

                  {/* Date */}
                  <td className={s.td}>
                    <span className={s.date}>{formatDate(row.submittedAt)}</span>
                  </td>

                  {/* Docs chip */}
                  <td className={s.td}>
                    <button
                      type="button"
                      className={`${s.docsChip} ${docCount(row) > 0 ? s.docsChipHasDocs : s.docsChipNoDocs}`}
                      onClick={() => setPreviewRow(row)}
                      aria-label={`پیش‌نمایش ${docCount(row)} مدرک`}
                      disabled={docCount(row) === 0}
                    >
                      <Eye size={13} aria-hidden />
                      {docCount(row)} مدرک
                    </button>
                  </td>

                  {/* Actions */}
                  <td className={s.td}>
                    <div className={s.actionCell}>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(row)}
                        disabled={isPending}
                        className={s.approveBtn}
                        aria-label={`تأیید ${row.fullName ?? ''}`}
                      >
                        <CheckCircle2 size={13} aria-hidden />
                        تأیید
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectTarget(row)}
                        disabled={isPending}
                        className={s.rejectBtn}
                        aria-label={`رد ${row.fullName ?? ''}`}
                      >
                        <XCircle size={13} aria-hidden />
                        رد
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Document Preview Sheet ── */}
      <Sheet open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <SheetContent dir="rtl" side="left" className={s.previewSheet}>
          {previewRow && (
            <>
              <SheetHeader className={s.previewHeader}>
                <div className={s.previewAvatar} aria-hidden>
                  <User size={20} aria-hidden />
                </div>
                <div>
                  <SheetTitle className={s.previewName}>
                    {previewRow.fullName ?? previewRow.user?.name ?? 'بدون نام'}
                  </SheetTitle>
                  <p className={s.previewEmail}>{previewRow.user?.email}</p>
                </div>
              </SheetHeader>

              <div className={s.previewBody}>
                {/* Selfie */}
                {previewRow.selfieUrl && (
                  <div className={s.docBlock}>
                    <p className={s.docBlockLabel}>سلفی</p>
                    <DocImage src={previewRow.selfieUrl} alt="سلفی متقاضی" />
                  </div>
                )}
                {/* Doc front */}
                {previewRow.docFrontUrl && (
                  <div className={s.docBlock}>
                    <p className={s.docBlockLabel}>روی مدرک</p>
                    <DocImage src={previewRow.docFrontUrl} alt="روی مدرک هویتی" />
                  </div>
                )}
                {/* Doc back */}
                {previewRow.docBackUrl && (
                  <div className={s.docBlock}>
                    <p className={s.docBlockLabel}>پشت مدرک</p>
                    <DocImage src={previewRow.docBackUrl} alt="پشت مدرک هویتی" />
                  </div>
                )}

                {/* Quick actions from preview */}
                <div className={s.previewActions}>
                  <Button
                    className={s.previewApproveBtn}
                    onClick={() => handleApprove(previewRow)}
                    disabled={isPending}
                  >
                    <CheckCircle2 size={15} aria-hidden />
                    تأیید هویت
                  </Button>
                  <Button
                    variant="outline"
                    className={s.previewRejectBtn}
                    onClick={() => { setRejectTarget(previewRow); setPreviewRow(null); }}
                    disabled={isPending}
                  >
                    <XCircle size={15} aria-hidden />
                    رد کردن
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Reject Dialog ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl" className={s.rejectDialog}>
          <DialogHeader>
            <DialogTitle>رد درخواست KYC</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            {rejectTarget && (
              <div className={s.rejectProfile}>
                <div className={s.rejectAvatar} aria-hidden>
                  {initials(rejectTarget.fullName ?? rejectTarget.user?.name)}
                </div>
                <span className={s.rejectName}>
                  {rejectTarget.fullName ?? rejectTarget.user?.name ?? '—'}
                </span>
              </div>
            )}
            <label className={s.dialogLabel} htmlFor="rejectReason">
              دلیل رد (اختیاری):
            </label>
            <textarea
              id="rejectReason"
              className={s.dialogTextarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="مدارک ناخوانا / اطلاعات ناقص / عکس تیره / …"
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
