'use client';

import type { CustomerKycRecord, CustomerProfile } from '@/actions/customer-portal';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import s from './DocumentsContent.module.css';

interface Props {
  profile: CustomerProfile;
  kycRecords: CustomerKycRecord[];
}

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'شروع نشده',
  PENDING: 'در بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  EXPIRED: 'منقضی',
};

const DOC_TYPE_LABEL: Record<string, string> = {
  NATIONAL_ID: 'کارت ملی',
  PASSPORT: 'پاسپورت',
  RESIDENCE_PERMIT: 'اجازه اقامت',
};

const LEVEL_LABEL: Record<string, string> = {
  NONE: 'بدون سطح',
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="w-4 h-4" aria-hidden />;
    case 'PENDING':
      return <Clock className="w-4 h-4" aria-hidden />;
    default:
      return <AlertTriangle className="w-4 h-4" aria-hidden />;
  }
}

export default function DocumentsContent({ profile, kycRecords }: Props) {
  return (
    <div className={s.root}>
      {/* Overview */}
      <div className={s.overview}>
        <div className={s.overviewItem}>
          <span className={s.overviewLabel}>وضعیت KYC</span>
          <span className={s.overviewBadge} data-status={profile.kycStatus}>
            {STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}
          </span>
        </div>
        <div className={s.overviewItem}>
          <span className={s.overviewLabel}>سطح تأیید</span>
          <span className={s.overviewValue}>
            {LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
          </span>
        </div>
        <div className={s.overviewItem}>
          <span className={s.overviewLabel}>تعداد مدارک</span>
          <span className={s.overviewValue}>
            {new Intl.NumberFormat('fa-IR').format(kycRecords.length)}
          </span>
        </div>
      </div>

      {/* Documents list */}
      <Section title="مدارک ارسال‌شده">
        {kycRecords.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="مدرکی ارسال نشده"
            description="برای احراز هویت مدارک خود را از صفحه KYC ارسال کنید"
            action={
              <Link href="/customer/kyc" style={{ color: 'var(--at-accent)', fontWeight: 600 }}>
                رفتن به احراز هویت
              </Link>
            }
          />
        ) : (
          <div className={s.docList}>
            {kycRecords.map((rec) => (
              <div key={rec.id} className={s.docCard} data-status={rec.status}>
                <div className={s.docHeader}>
                  <div className={s.docIcon} data-status={rec.status} aria-hidden>
                    <StatusIcon status={rec.status} />
                  </div>
                  <div className={s.docMeta}>
                    <span className={s.docType}>{DOC_TYPE_LABEL[rec.docType] ?? rec.docType}</span>
                    <span className={s.docLevel}>{LEVEL_LABEL[rec.level]}</span>
                  </div>
                  <span className={s.docStatus} data-status={rec.status}>
                    {STATUS_LABEL[rec.status] ?? rec.status}
                  </span>
                </div>

                <div className={s.docBody}>
                  {rec.docNumber && (
                    <div className={s.docRow}>
                      <span className={s.docRowLabel}>شماره مدرک</span>
                      <span className={s.docRowValue} dir="ltr">
                        {rec.docNumber}
                      </span>
                    </div>
                  )}
                  {rec.fileUrl && (
                    <div className={s.docRow}>
                      <span className={s.docRowLabel}>فایل</span>
                      <a
                        href={rec.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.docFileLink}
                      >
                        مشاهده فایل
                        <ExternalLink className="w-3 h-3" aria-hidden />
                      </a>
                    </div>
                  )}
                  {rec.rejectReason && (
                    <div className={s.docRow}>
                      <span className={s.docRowLabel}>دلیل رد</span>
                      <span className={s.docRowReject}>{rec.rejectReason}</span>
                    </div>
                  )}
                  {rec.expiresAt && (
                    <div className={s.docRow}>
                      <span className={s.docRowLabel}>انقضا</span>
                      <span className={s.docRowValue}>
                        {new Intl.DateTimeFormat('fa-IR').format(rec.expiresAt)}
                      </span>
                    </div>
                  )}
                  <div className={s.docRow}>
                    <span className={s.docRowLabel}>تاریخ ارسال</span>
                    <span className={s.docRowValue}>
                      {new Intl.DateTimeFormat('fa-IR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }).format(rec.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* CTA if no docs yet or rejected */}
      {(profile.kycStatus === 'NOT_STARTED' ||
        profile.kycStatus === 'REJECTED' ||
        profile.kycStatus === 'EXPIRED') && (
        <div className={s.cta}>
          <p className={s.ctaText}>
            {profile.kycStatus === 'NOT_STARTED'
              ? 'برای فعال‌سازی کامل حساب، مدارک هویتی خود را ارسال کنید.'
              : 'برای رفع مشکل احراز هویت، مدارک جدید ارسال کنید.'}
          </p>
          <Link href="/customer/kyc" className={s.ctaBtn}>
            ارسال مدرک جدید
          </Link>
        </div>
      )}
    </div>
  );
}
