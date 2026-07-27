'use client';

/**
 * KycContent — «گیت اعتماد» (Trust Gate)
 * ----------------------------------------------------------------------------
 *  - Trust Hero:   status card بزرگ با rail رنگی + ۳ progress cell
 *  - Level Funnel: سه سطح به‌صورت progress rail (LEVEL_1 → 2 → 3) با نشانگر جاری
 *  - Submit Form:  فرم در یک کارت با فیلدهای استاندارد
 *  - History:      دفتر مدارک ارسال‌شده با rail عمودی
 */

import { submitKycDocument } from '@/actions/customer-portal';
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
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileText,
  IdCard,
  ScanFace,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './KycContent.module.css';

interface Props {
  profile: CustomerProfile;
  records: CustomerKycRecord[];
}

const DOC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NATIONAL_ID', label: 'کارت ملی' },
  { value: 'PASSPORT', label: 'پاسپورت' },
  { value: 'RESIDENCE_PERMIT', label: 'اجازه اقامت' },
];

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

  const kycKey = KYC_STATUS_CSSKEY[profile.kycStatus] ?? 'warning';
  const currentNum =
    profile.kycLevel === 'NONE' ? 0 : Number(profile.kycLevel.replace('LEVEL_', ''));

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
    <div className={s.root} dir="rtl">
      {/* ── Trust Hero ──────────────────────────────────────────────── */}
      <section className={s.hero} data-tone={kycKey} aria-label="وضعیت احراز هویت">
        <StatusRail variant={kycKey} />
        <div className={s.heroInner}>
          <div className={s.heroTop}>
            <div className={s.heroIcon} aria-hidden>
              <ShieldCheck size={16} />
            </div>
            <div className={s.heroHead}>
              <span className={s.heroEyebrow}>
                <LiveDot size={4} tone={kycKey === 'approved' ? 'success' : kycKey === 'danger' ? 'danger' : 'warning'} />
                گیت اعتماد
              </span>
              <h2 className={s.heroTitle}>
                {STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}
              </h2>
              <span className={s.heroSub}>
                {KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
              </span>
            </div>
            <div className={s.heroProgress} aria-label={`پیشرفت: ${currentNum} از ۳`}>
              <span className={s.heroProgressValue}>{faNum(currentNum)}</span>
              <span className={s.heroProgressSlash}>/</span>
              <span className={s.heroProgressMax}>۳</span>
            </div>
          </div>

          <div className={s.heroCells}>
            <div className={s.heroCell} data-tone={profile.kycStatus === 'NOT_STARTED' ? 'danger' : 'success'}>
              <span className={s.heroCellLabel}>مدرک هویتی</span>
              <span className={s.heroCellValue}>
                {profile.kycStatus === 'NOT_STARTED' ? 'ارسال نشده' : 'ارسال شده'}
              </span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 2 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>تأیید چهره</span>
              <span className={s.heroCellValue}>
                {currentNum >= 2 ? 'تکمیل' : 'در انتظار'}
              </span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 3 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>انطباق نهایی</span>
              <span className={s.heroCellValue}>
                {currentNum >= 3 ? 'تأیید شد' : 'در انتظار'}
              </span>
            </div>
          </div>

          {profile.kycStatus === 'REJECTED' && (
            <div className={s.heroNote} data-tone="danger">
              <AlertTriangle size={11} aria-hidden />
              درخواست قبلی رد شد — مدارک جدید ارسال کنید یا با پشتیبانی تماس بگیرید.
            </div>
          )}
          {profile.kycStatus === 'APPROVED' && (
            <div className={s.heroNote} data-tone="success">
              <CheckCircle2 size={11} aria-hidden />
              حساب شما تأیید شد — همهٔ امکانات فعال است.
            </div>
          )}
          {profile.kycStatus === 'PENDING' && (
            <div className={s.heroNote} data-tone="warning">
              <LiveDot size={4} tone="warning" />
              مدارک شما در صف بررسی است — معمولاً کمتر از ۲۴ ساعت.
            </div>
          )}
        </div>
      </section>

      {/* ── Level Funnel ────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={ScanFace} title="مسیر احراز هویت" sub="۳ مرحلهٔ متوالی" />
        <ol className={s.funnel}>
          {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((level, idx) => {
            const levelNum = idx + 1;
            const isDone = currentNum >= levelNum;
            const isCurrent = currentNum === levelNum - 1 && profile.kycStatus !== 'APPROVED';
            const icon = idx === 0 ? IdCard : idx === 1 ? ScanFace : ShieldCheck;
            const Icon = icon;
            return (
              <li
                key={level}
                className={s.funnelStep}
                data-done={isDone}
                data-current={isCurrent}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span className={s.funnelDot} aria-hidden>
                  {isDone ? <CheckCircle2 size={11} /> : isCurrent ? <LiveDot size={6} tone="warning" /> : <Icon size={11} />}
                </span>
                <div className={s.funnelMain}>
                  <span className={s.funnelTitle}>{KYC_LEVEL_LABEL[level]}</span>
                  <span className={s.funnelDesc}>
                    {level === 'LEVEL_1' && 'کارت ملی، پاسپورت یا اجازه اقامت'}
                    {level === 'LEVEL_2' && 'سلفی در کنار مدرک شناسایی'}
                    {level === 'LEVEL_3' && 'بررسی نهایی توسط تیم انطباق'}
                  </span>
                </div>
                <span className={s.funnelState} data-done={isDone} data-current={isCurrent}>
                  {isDone ? 'تکمیل' : isCurrent ? 'جاری' : 'بعدی'}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Submit Form ────────────────────────────────────────────── */}
      {canSubmit && !success && (
        <section className={s.section}>
          <SectionHeader icon={Upload} title="ارسال مدرک جدید" sub="یک مرحلهٔ جدید به مسیر اضافه کنید" />
          <form onSubmit={handleSubmit} className={s.form} noValidate>
            <div className={s.formGrid}>
              <div className={s.formField}>
                <label htmlFor="docType" className={s.formLabel}>
                  نوع مدرک
                </label>
                <div className={s.selectWrap}>
                  <select
                    id="docType"
                    className={s.formControl}
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
                  <span className={s.selectChevron} aria-hidden>
                    ▾
                  </span>
                </div>
              </div>

              <div className={s.formField}>
                <label htmlFor="docNumber" className={s.formLabel}>
                  شماره مدرک
                </label>
                <input
                  id="docNumber"
                  type="text"
                  className={s.formControl}
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸"
                  disabled={isPending}
                  autoComplete="off"
                  maxLength={30}
                  required
                  dir="ltr"
                />
              </div>

              <div className={s.formField} data-span="full">
                <label htmlFor="fileUrl" className={s.formLabel}>
                  آدرس فایل مدرک (HTTPS)
                </label>
                <input
                  id="fileUrl"
                  type="url"
                  className={s.formControl}
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={isPending}
                  autoComplete="off"
                  required
                  dir="ltr"
                />
                <span className={s.formHint}>
                  فایل را در سرویس مورد اعتماد آپلود کنید و آدرس HTTPS آن را اینجا وارد کنید
                </span>
              </div>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertTriangle size={12} aria-hidden />
                {error}
              </div>
            )}

            <div className={s.formFoot}>
              <button type="submit" className={s.submitBtn} disabled={isPending}>
                <Upload size={11} aria-hidden />
                {isPending ? 'در حال ارسال...' : 'ارسال مدارک'}
              </button>
            </div>
          </form>
        </section>
      )}

      {success && (
        <div className={s.successBox} role="status">
          <CheckCircle2 size={12} aria-hidden />
          مدارک با موفقیت ارسال شد و در صف بررسی قرار گرفت.
        </div>
      )}

      {/* ── History ─────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={FileText}
          title="سابقهٔ مدارک"
          sub={`${faNum(records.length)} مدرک ثبت‌شده`}
        />
        {records.length === 0 ? (
          <EmptyHint
            icon={FileText}
            title="سابقه‌ای وجود ندارد"
            description="تا به حال هیچ مدرکی ارسال نشده است"
          />
        ) : (
          <ol className={s.historyList}>
            {records.map((rec, i) => {
              const statusKey = KYC_STATUS_CSSKEY[rec.status] ?? 'warning';
              return (
                <li
                  key={rec.id}
                  className={s.historyRow}
                  data-status={rec.status}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <StatusRail variant={statusKey} />
                  <span className={s.historyIcon} aria-hidden>
                    <KycStatusIcon status={rec.status} />
                  </span>
                  <div className={s.historyMain}>
                    <div className={s.historyTopRow}>
                      <span className={s.historyDocType}>
                        {DOC_TYPE_LABEL[rec.docType] ?? rec.docType}
                      </span>
                      <span className={s.historyLevel}>
                        {KYC_LEVEL_LABEL[rec.level] ?? rec.level}
                      </span>
                    </div>
                    {rec.docNumber && (
                      <span className={s.historyDocNumber} dir="ltr">
                        شماره: {rec.docNumber}
                      </span>
                    )}
                    {rec.rejectReason && (
                      <span className={s.historyReject}>دلیل رد: {rec.rejectReason}</span>
                    )}
                    {rec.expiresAt && (
                      <span className={s.historyMeta}>انقضا: {faDate(rec.expiresAt)}</span>
                    )}
                  </div>
                  <div className={s.historyRight}>
                    <StatusPill variant={statusKey}>
                      <CircleDot size={8} aria-hidden style={{ marginInlineEnd: '0.3em' }} />
                      {STATUS_LABEL[rec.status] ?? rec.status}
                    </StatusPill>
                    <span className={s.historyDate} title={faDateTime(rec.createdAt)}>
                      {faDate(rec.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
