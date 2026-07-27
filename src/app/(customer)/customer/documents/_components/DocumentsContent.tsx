'use client';

/**
 * DocumentsContent — «آرشیو مدارک» (Document Vault)
 * ----------------------------------------------------------------------------
 *  - Summary Strip:    سه KPI تعداد (کل، تأییدشده، در انتظار)
 *  - Documents Ledger: دفتر مدارک با rail رنگی + KV داخلی
 *  - Empty hint + CTA
 */

import type { CustomerKycRecord, CustomerProfile } from '@/actions/customer-portal';
import {
  DOC_TYPE_LABEL,
  KYC_LEVEL_LABEL,
  KYC_STATUS_CSSKEY,
  STATUS_LABEL,
  faDate,
  faDateTime,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  EmptyHint,
  KycStatusIcon,
  LiveDot,
  SectionHeader,
  StatusPill,
  StatusRail,
} from '@/app/(customer)/customer/_lib/customer-ui';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Files,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import s from './DocumentsContent.module.css';

interface Props {
  profile: CustomerProfile;
  kycRecords: CustomerKycRecord[];
}

export default function DocumentsContent({ profile, kycRecords }: Props) {
  const approvedCount = kycRecords.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = kycRecords.filter((r) => r.status === 'PENDING').length;
  const rejectedCount = kycRecords.filter(
    (r) => r.status === 'REJECTED' || r.status === 'EXPIRED',
  ).length;

  return (
    <div className={s.root} dir="rtl">
      {/* ── Summary Strip ────────────────────────────────────────────── */}
      <section className={s.summary} aria-label="خلاصهٔ مدارک">
        <article className={s.summaryCard} data-tone="neutral">
          <span className={s.summaryIcon} aria-hidden>
            <Files size={12} />
          </span>
          <div className={s.summaryBody}>
            <span className={s.summaryLabel}>تعداد کل</span>
            <span className={s.summaryValue}>{faNum(kycRecords.length)}</span>
            <span className={s.summarySub}>مدرک ثبت‌شده</span>
          </div>
        </article>
        <article className={s.summaryCard} data-tone="success">
          <span className={s.summaryIcon} aria-hidden>
            <CheckCircle2 size={12} />
          </span>
          <div className={s.summaryBody}>
            <span className={s.summaryLabel}>تأییدشده</span>
            <span className={s.summaryValue}>{faNum(approvedCount)}</span>
            <span className={s.summarySub}>مدرک معتبر</span>
          </div>
        </article>
        <article className={s.summaryCard} data-tone="warning">
          <span className={s.summaryIcon} aria-hidden>
            <Clock size={12} />
          </span>
          <div className={s.summaryBody}>
            <span className={s.summaryLabel}>در انتظار</span>
            <span className={s.summaryValue}>{faNum(pendingCount)}</span>
            <span className={s.summarySub}>در حال بررسی</span>
          </div>
        </article>
        <article className={s.summaryCard} data-tone="danger">
          <span className={s.summaryIcon} aria-hidden>
            <ShieldCheck size={12} />
          </span>
          <div className={s.summaryBody}>
            <span className={s.summaryLabel}>رد / منقضی</span>
            <span className={s.summaryValue}>{faNum(rejectedCount)}</span>
            <span className={s.summarySub}>نیاز به اقدام</span>
          </div>
        </article>
      </section>

      {/* ── Documents Ledger ─────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={FileText}
          title="مدارک ارسال‌شده"
          sub={`${faNum(kycRecords.length)} مدرک`}
        />
        {kycRecords.length === 0 ? (
          <EmptyHint
            icon={FileText}
            title="مدرکی ارسال نشده"
            description="برای احراز هویت، مدارک خود را از صفحه KYC ارسال کنید"
            action={
              <Link href="/customer/kyc" className={s.ctaPrimary}>
                رفتن به احراز هویت
              </Link>
            }
          />
        ) : (
          <ol className={s.docList}>
            {kycRecords.map((rec, i) => {
              const statusKey = KYC_STATUS_CSSKEY[rec.status] ?? 'warning';
              return (
                <li
                  key={rec.id}
                  className={s.docRow}
                  data-status={rec.status}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <StatusRail variant={statusKey} />
                  <span className={s.docIcon} aria-hidden>
                    <KycStatusIcon status={rec.status} />
                  </span>
                  <div className={s.docMain}>
                    <div className={s.docTopRow}>
                      <span className={s.docType}>
                        {DOC_TYPE_LABEL[rec.docType] ?? rec.docType}
                      </span>
                      <span className={s.docLevel}>
                        {KYC_LEVEL_LABEL[rec.level] ?? rec.level}
                      </span>
                    </div>
                    <div className={s.docKvGrid}>
                      {rec.docNumber && (
                        <div className={s.docKv}>
                          <span className={s.docKvLabel}>شماره مدرک</span>
                          <span className={s.docKvValue} dir="ltr">
                            {rec.docNumber}
                          </span>
                        </div>
                      )}
                      {rec.fileUrl && (
                        <div className={s.docKv}>
                          <span className={s.docKvLabel}>فایل</span>
                          <a
                            href={rec.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.docFileLink}
                          >
                            <span>مشاهده</span>
                            <ExternalLink size={10} aria-hidden />
                          </a>
                        </div>
                      )}
                      {rec.expiresAt && (
                        <div className={s.docKv}>
                          <span className={s.docKvLabel}>انقضا</span>
                          <span className={s.docKvValue}>{faDate(rec.expiresAt)}</span>
                        </div>
                      )}
                      <div className={s.docKv}>
                        <span className={s.docKvLabel}>تاریخ ارسال</span>
                        <span className={s.docKvValue} title={faDateTime(rec.createdAt)}>
                          {faDate(rec.createdAt)}
                        </span>
                      </div>
                    </div>
                    {rec.rejectReason && (
                      <div className={s.docReject}>
                        <span className={s.docRejectLabel}>دلیل رد:</span>
                        <span>{rec.rejectReason}</span>
                      </div>
                    )}
                  </div>
                  <div className={s.docRight}>
                    <StatusPill variant={statusKey}>
                      <LiveDot
                        size={4}
                        tone={
                          statusKey === 'approved'
                            ? 'success'
                            : statusKey === 'danger'
                              ? 'danger'
                              : 'warning'
                        }
                      />
                      {STATUS_LABEL[rec.status] ?? rec.status}
                    </StatusPill>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {(profile.kycStatus === 'NOT_STARTED' ||
        profile.kycStatus === 'REJECTED' ||
        profile.kycStatus === 'EXPIRED') && (
        <section className={s.ctaSection} aria-label="اقدام بعدی">
          <div className={s.ctaCard}>
            <div className={s.ctaBody}>
              <strong className={s.ctaTitle}>
                {profile.kycStatus === 'NOT_STARTED'
                  ? 'ارسال مدارک هویتی'
                  : 'ارسال مجدد مدارک'}
              </strong>
              <p className={s.ctaText}>
                {profile.kycStatus === 'NOT_STARTED'
                  ? 'برای فعال‌سازی کامل حساب، مدارک هویتی خود را ارسال کنید.'
                  : 'برای رفع مشکل احراز هویت، مدارک جدید ارسال کنید.'}
              </p>
            </div>
            <Link href="/customer/kyc" className={s.ctaPrimary}>
              ارسال مدرک جدید
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
