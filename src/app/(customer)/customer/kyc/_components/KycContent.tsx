'use client';

import { submitKycDocument } from '@/actions/customer-portal';
import type { CustomerKycRecord, CustomerProfile } from '@/actions/customer-portal';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { AlertTriangle, CheckCircle2, Clock, FileText, ShieldCheck, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './KycContent.module.css';

interface Props {
  profile: CustomerProfile;
  records: CustomerKycRecord[];
}

const KYC_LEVEL_LABEL: Record<string, string> = {
  NONE: 'بدون تأیید',
  LEVEL_1: 'سطح ۱ — مدرک هویتی',
  LEVEL_2: 'سطح ۲ — تأیید چهره',
  LEVEL_3: 'سطح ۳ — کامل',
};

const KYC_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'شروع نشده',
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  EXPIRED: 'منقضی',
};

const DOC_TYPE_OPTIONS = [
  { value: 'NATIONAL_ID', label: 'کارت ملی' },
  { value: 'PASSPORT', label: 'پاسپورت' },
  { value: 'RESIDENCE_PERMIT', label: 'اجازه اقامت' },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="w-5 h-5" aria-hidden />;
    case 'PENDING':
      return <Clock className="w-5 h-5" aria-hidden />;
    case 'REJECTED':
    case 'EXPIRED':
      return <AlertTriangle className="w-5 h-5" aria-hidden />;
    default:
      return <ShieldCheck className="w-5 h-5" aria-hidden />;
  }
}

export default function KycContent({ profile, records }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [docType, setDocType] = useState<string>('NATIONAL_ID');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const canSubmit =
    profile.kycStatus !== 'APPROVED' &&
    profile.kycStatus !== 'PENDING' &&
    (profile.status === 'PROSPECT' || profile.status === 'ACTIVE');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!docNumber.trim()) {
      setError('شماره مدرک الزامی است');
      return;
    }
    if (!fileUrl.trim()) {
      setError('آدرس فایل مدرک الزامی است');
      return;
    }

    startTransition(async () => {
      const result = await submitKycDocument({
        docType,
        docNumber: docNumber.trim(),
        fileUrl: fileUrl.trim(),
      });
      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className={s.root}>
      {/* Current KYC status */}
      <div className={s.statusCard} data-status={profile.kycStatus}>
        <div className={s.statusIcon} data-status={profile.kycStatus}>
          <StatusIcon status={profile.kycStatus} />
        </div>
        <div className={s.statusBody}>
          <span className={s.statusTitle}>
            وضعیت احراز هویت: {KYC_STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}
          </span>
          <span className={s.statusLevel}>
            سطح تأیید: {KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
          </span>
          {profile.kycStatus === 'REJECTED' && (
            <span className={s.statusHint}>
              درخواست شما رد شد. مدارک را دوباره ارسال کنید یا با پشتیبانی تماس بگیرید.
            </span>
          )}
          {profile.kycStatus === 'APPROVED' && profile.exchange.requireKyc && (
            <span className={s.statusHint} data-variant="success">
              حساب شما تأیید شده است — می‌توانید از همه امکانات استفاده کنید.
            </span>
          )}
        </div>
      </div>

      {/* Steps */}
      <Section title="مراحل احراز هویت">
        <div className={s.steps}>
          {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((level, idx) => {
            const levelNum = idx + 1;
            const currentNum =
              profile.kycLevel === 'NONE' ? 0 : Number(profile.kycLevel.replace('LEVEL_', ''));
            const isDone = currentNum >= levelNum;
            const isCurrent = currentNum === levelNum - 1 && profile.kycStatus !== 'APPROVED';
            return (
              <div key={level} className={s.step} data-done={isDone} data-current={isCurrent}>
                <div className={s.stepNum} aria-hidden>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : levelNum}
                </div>
                <div className={s.stepBody}>
                  <span className={s.stepTitle}>{KYC_LEVEL_LABEL[level]}</span>
                  {level === 'LEVEL_1' && (
                    <span className={s.stepDesc}>ارسال کپی کارت ملی، پاسپورت یا اجازه اقامت</span>
                  )}
                  {level === 'LEVEL_2' && (
                    <span className={s.stepDesc}>تأیید چهره با سلفی در کنار مدرک</span>
                  )}
                  {level === 'LEVEL_3' && (
                    <span className={s.stepDesc}>بررسی نهایی توسط تیم انطباق</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Submit form */}
      {canSubmit && !success && (
        <Section title="ارسال مدرک جدید">
          <form onSubmit={handleSubmit} className={s.form} noValidate>
            <div className={s.formRow}>
              <label htmlFor="docType" className={s.label}>
                نوع مدرک
              </label>
              <select
                id="docType"
                className={s.select}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                disabled={isPending}
              >
                {DOC_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.formRow}>
              <label htmlFor="docNumber" className={s.label}>
                شماره مدرک
              </label>
              <input
                id="docNumber"
                type="text"
                className={s.input}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸"
                disabled={isPending}
                autoComplete="off"
                maxLength={30}
                required
              />
            </div>

            <div className={s.formRow}>
              <label htmlFor="fileUrl" className={s.label}>
                آدرس فایل مدرک
              </label>
              <input
                id="fileUrl"
                type="url"
                className={s.input}
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                disabled={isPending}
                autoComplete="off"
                required
              />
              <span className={s.hint}>فایل را ابتدا آپلود کنید و آدرس آن را وارد کنید</span>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
                {error}
              </div>
            )}

            <button type="submit" className={s.submitBtn} disabled={isPending}>
              <Upload className="w-4 h-4" aria-hidden />
              {isPending ? 'در حال ارسال...' : 'ارسال مدارک'}
            </button>
          </form>
        </Section>
      )}

      {success && (
        <div className={s.successBox} role="status">
          <CheckCircle2 className="w-5 h-5" aria-hidden />
          مدارک با موفقیت ارسال شد و در صف بررسی قرار گرفت.
        </div>
      )}

      {/* History */}
      <Section title="سابقه درخواست‌ها">
        {records.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="سابقه‌ای وجود ندارد"
            description="تا به حال هیچ مدرکی ارسال نشده است"
          />
        ) : (
          <div className={s.historyList}>
            {records.map((rec) => (
              <div key={rec.id} className={s.historyRow} data-status={rec.status}>
                <div className={s.historyIcon} data-status={rec.status} aria-hidden>
                  <StatusIcon status={rec.status} />
                </div>
                <div className={s.historyBody}>
                  <span className={s.historyTitle}>
                    {KYC_LEVEL_LABEL[rec.level]} — {rec.docType}
                  </span>
                  {rec.docNumber && <span className={s.historyMeta}>شماره: {rec.docNumber}</span>}
                  {rec.rejectReason && (
                    <span className={s.historyReject}>دلیل رد: {rec.rejectReason}</span>
                  )}
                  {rec.expiresAt && (
                    <span className={s.historyMeta}>
                      انقضا: {new Intl.DateTimeFormat('fa-IR').format(rec.expiresAt)}
                    </span>
                  )}
                </div>
                <div className={s.historyRight}>
                  <span className={s.historyStatus} data-status={rec.status}>
                    {KYC_STATUS_LABEL[rec.status] ?? rec.status}
                  </span>
                  <span className={s.historyDate}>
                    {new Intl.DateTimeFormat('fa-IR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }).format(rec.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
