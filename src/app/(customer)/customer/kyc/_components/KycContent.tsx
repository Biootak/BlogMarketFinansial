'use client';

/**
 * KycContent — «گیت اعتماد» (Trust Gate)
 * ----------------------------------------------------------------------------
 *  - Trust Hero:   status card بزرگ با rail رنگی + ۳ progress cell
 *  - Level Funnel: سه سطح به‌صورت progress rail (LEVEL_1 → 2 → 3) با نشانگر جاری
 *  - Submit Form:  فرم سطح‌بندی‌شده به انتخاب کاربر (tiered KYC):
 *                    LEVEL_1 = مدرک هویتی
 *                    LEVEL_2 = + سلفی تأیید چهره
 *                    LEVEL_3 = + شهر/آدرس و سند اثبات آدرس
 *                  همهٔ رکوردهای سطح انتخابی در یک تراکنش ساخته می‌شوند تا
 *                  یک‌جا برای بررسی بروند (بدون انتظار مرحله‌به‌مرحله).
 *  - Selfie-While-Pending: اگر مدرک در صف بررسی است، سلفی را می‌توان
 *                  همان‌موقع (بدون انتظار تأیید سطح قبل) ارسال کرد.
 *  - History:      دفتر مدارک ارسال‌شده با rail عمودی
 */

import { submitKycDocument, submitKycSelfie } from '@/actions/customer-portal';
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
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import { KYC_TIER_LIMITS } from '@/lib/kyc-tier';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileText,
  IdCard,
  MapPin,
  ScanFace,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import s from './KycContent.module.css';

interface Props {
  profile: CustomerProfile;
  records: CustomerKycRecord[];
}

const DOC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NATIONAL_ID', label: 'تذکره / کارت ملی' },
  { value: 'PASSPORT', label: 'پاسپورت' },
  { value: 'RESIDENCE_PERMIT', label: 'اجازه اقامت' },
];

type KycLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const faNumLimit = new Intl.NumberFormat('fa-IR');
function dailyLimitAf(level: KycLevel): string {
  return `${faNumLimit.format(KYC_TIER_LIMITS[level].dailyAf)} AFN روزانه`;
}

const LEVEL_OPTIONS: Array<{ value: KycLevel; title: string; desc: string }> = [
  {
    value: 'LEVEL_1',
    title: 'سطح ۱ — مدرک هویتی',
    desc: `نوع مدرک، شماره و تصویر مدرک — سقف ${dailyLimitAf('LEVEL_1')}`,
  },
  {
    value: 'LEVEL_2',
    title: 'سطح ۲ — تأیید چهره',
    desc: `سطح ۱ + سلفی — سقف ${dailyLimitAf('LEVEL_2')}`,
  },
  {
    value: 'LEVEL_3',
    title: 'سطح ۳ — اثبات آدرس',
    desc: `سطح ۲ + شهر و سند آدرس — سقف ${dailyLimitAf('LEVEL_3')}`,
  },
];

export default function KycContent({ profile, records }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // سطح انتخابی کاربر — پیش‌فرض سطح ۱
  const [level, setLevel] = useState<KycLevel>('LEVEL_1');

  // سطح ۱ — مدرک هویتی
  const [docType, setDocType] = useState<string>('NATIONAL_ID');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const handleImageUpload = useCallback((urls: string[]) => setFileUrl(urls[0] ?? ''), []);
  const handleImageRemove = useCallback(() => setFileUrl(''), []);

  // سطح ۲ — سلفی
  const [selfieUrl, setSelfieUrl] = useState('');
  const handleSelfieUpload = useCallback((urls: string[]) => setSelfieUrl(urls[0] ?? ''), []);
  const handleSelfieRemove = useCallback(() => setSelfieUrl(''), []);

  // سطح ۳ — آدرس
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [addressDocUrl, setAddressDocUrl] = useState('');
  const handleAddressDocUpload = useCallback(
    (urls: string[]) => setAddressDocUrl(urls[0] ?? ''),
    [],
  );
  const handleAddressDocRemove = useCallback(() => setAddressDocUrl(''), []);

  const canSubmit =
    profile.kycStatus !== 'APPROVED' &&
    profile.kycStatus !== 'PENDING' &&
    (profile.status === 'PROSPECT' || profile.status === 'ACTIVE');

  // آیا رکورد LEVEL_2 (سلفی) قبلاً ارسال شده / در صف بررسی است؟
  const hasPendingLevel2 = records.some((r) => r.level === 'LEVEL_2' && r.status === 'PENDING');
  const hasLevel2Record = records.some((r) => r.level === 'LEVEL_2');
  // سلفی را می‌توان «همان‌موقع» (وقتی مدرک در صف بررسی است) ارسال کرد
  const canSubmitSelfieWhilePending =
    profile.kycStatus === 'PENDING' && !hasPendingLevel2 && !hasLevel2Record;

  const kycKey = KYC_STATUS_CSSKEY[profile.kycStatus] ?? 'warning';
  const currentNum =
    profile.kycLevel === 'NONE' ? 0 : Number(profile.kycLevel.replace('LEVEL_', ''));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // اعتبارسنجی سمت کلاینت — هماهنگ با اسکیمای سرور
    if (!docNumber.trim()) {
      setError('شماره مدرک الزامی است');
      return;
    }
    if (!fileUrl.trim()) {
      setError('تصویر مدرک را آپلود کنید');
      return;
    }
    if ((level === 'LEVEL_2' || level === 'LEVEL_3') && !selfieUrl.trim()) {
      setError('برای این سطح، سلفی (تأیید چهره) الزامی است');
      return;
    }
    if (level === 'LEVEL_3') {
      if (!city.trim()) {
        setError('برای سطح ۳، شهر الزامی است');
        return;
      }
      if (!address.trim()) {
        setError('برای سطح ۳، آدرس الزامی است');
        return;
      }
      if (!addressDocUrl.trim()) {
        setError('برای سطح ۳، تصویر سند اثبات آدرس الزامی است');
        return;
      }
    }

    startTransition(async () => {
      const result = await submitKycDocument({
        level,
        docType,
        docNumber: docNumber.trim(),
        fileUrl: fileUrl.trim(),
        selfieUrl: level !== 'LEVEL_1' ? selfieUrl.trim() : undefined,
        city: level === 'LEVEL_3' ? city.trim() : undefined,
        address: level === 'LEVEL_3' ? address.trim() : undefined,
        addressDocUrl: level === 'LEVEL_3' ? addressDocUrl.trim() : undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  function handleSelfieSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selfieUrl.trim()) {
      setError('تصویر سلفی را آپلود کنید');
      return;
    }
    startTransition(async () => {
      const result = await submitKycSelfie({ selfieUrl: selfieUrl.trim() });
      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  const levelTitle =
    LEVEL_OPTIONS.find((l) => l.value === level)?.title ?? KYC_LEVEL_LABEL[level] ?? level;

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
                <LiveDot
                  size={4}
                  tone={
                    kycKey === 'approved' ? 'success' : kycKey === 'danger' ? 'danger' : 'warning'
                  }
                />
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
            <div
              className={s.heroCell}
              data-tone={profile.kycStatus === 'NOT_STARTED' ? 'danger' : 'success'}
            >
              <span className={s.heroCellLabel}>مدرک هویتی</span>
              <span className={s.heroCellValue}>
                {profile.kycStatus === 'NOT_STARTED' ? 'ارسال نشده' : 'ارسال شده'}
              </span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 2 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>تأیید چهره</span>
              <span className={s.heroCellValue}>{currentNum >= 2 ? 'تکمیل' : 'در انتظار'}</span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 3 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>انطباق نهایی</span>
              <span className={s.heroCellValue}>{currentNum >= 3 ? 'تأیید شد' : 'در انتظار'}</span>
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
          {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((lvl, idx) => {
            const levelNum = idx + 1;
            const isDone = currentNum >= levelNum;
            const isCurrent = currentNum === levelNum - 1 && profile.kycStatus !== 'APPROVED';
            const icon = idx === 0 ? IdCard : idx === 1 ? ScanFace : ShieldCheck;
            const Icon = icon;
            return (
              <li
                key={lvl}
                className={s.funnelStep}
                data-done={isDone}
                data-current={isCurrent}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span className={s.funnelDot} aria-hidden>
                  {isDone ? (
                    <CheckCircle2 size={11} />
                  ) : isCurrent ? (
                    <LiveDot size={6} tone="warning" />
                  ) : (
                    <Icon size={11} />
                  )}
                </span>
                <div className={s.funnelMain}>
                  <span className={s.funnelTitle}>{KYC_LEVEL_LABEL[lvl]}</span>
                  <span className={s.funnelDesc}>
                    {lvl === 'LEVEL_1' && 'تذکره، کارت ملی، پاسپورت یا اجازه اقامت'}
                    {lvl === 'LEVEL_2' && 'سلفی در کنار مدرک شناسایی'}
                    {lvl === 'LEVEL_3' && 'بررسی نهایی توسط تیم انطباق'}
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

      {/* ── Selfie while pending ───────────────────────────────────── */}
      {canSubmitSelfieWhilePending && !success && (
        <section className={s.section}>
          <SectionHeader
            icon={ScanFace}
            title="تأیید چهره (سلفی)"
            sub="سلفی را همان‌موقع ارسال کنید تا همراه مدارک شما بررسی شود"
          />
          <form onSubmit={handleSelfieSubmit} className={s.form} noValidate>
            <div className={s.formGrid}>
              <div className={s.formField} data-span="full">
                <ImageUploader
                  initialPreviews={selfieUrl ? [selfieUrl] : []}
                  onImageUpload={handleSelfieUpload}
                  onImageRemove={handleSelfieRemove}
                  maxFiles={1}
                  multiple={false}
                  folder="kyc"
                  thumbSize="xl"
                  label="سلفی در کنار مدرک شناسایی"
                  hint="عکس واضح از چهره در کنار مدرک — JPG، PNG، WebP"
                  disabled={isPending}
                />
                <span className={s.formHint}>
                  بدون نیاز به انتظار — سلفی همراه مدارک در حال بررسی شما دیده می‌شود.
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
                {isPending ? 'در حال ارسال...' : 'ارسال سلفی'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Submit Form ────────────────────────────────────────────── */}
      {canSubmit && !success && (
        <section className={s.section}>
          <SectionHeader
            icon={Upload}
            title="ارسال مدارک"
            sub="سطح احراز هویت را انتخاب کنید — هر سطح امکانات بیشتری باز می‌کند"
          />
          <form onSubmit={handleSubmit} className={s.form} noValidate>
            {/* انتخاب سطح */}
            <div className={s.formField}>
              <span className={s.formLabel}>سطح احراز هویت</span>
              <div className={s.levelPicker} role="group" aria-label="سطح احراز هویت">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={s.levelCard}
                    aria-pressed={level === opt.value}
                    disabled={isPending}
                    onClick={() => setLevel(opt.value)}
                  >
                    <span className={s.levelCardTitle}>
                      {opt.value === 'LEVEL_3' ? <MapPin size={12} /> : opt.value === 'LEVEL_2' ? <ScanFace size={12} /> : <IdCard size={12} />}
                      {opt.title}
                    </span>
                    <span className={s.levelCardDesc}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* سطح ۱ — مدرک هویتی */}
            <div className={s.formGrid}>
              <div className={s.formField}>
                <label htmlFor="docType" className={s.formLabel}>
                  نوع مدرک
                </label>
                <Select value={docType} onValueChange={setDocType} disabled={isPending}>
                  <SelectTrigger id="docType" className={`${s.formControl} ${s.formSelectTrigger}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <ImageUploader
                  initialPreviews={fileUrl ? [fileUrl] : []}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  maxFiles={1}
                  multiple={false}
                  folder="kyc"
                  thumbSize="xl"
                  label="تصویر مدرک"
                  hint="تصویر واضح از مدرک انتخاب‌شده — JPG، PNG، WebP، GIF، SVG"
                  disabled={isPending}
                />
                <span className={s.formHint}>
                  فایل به‌صورت امن در سرور ما ذخیره می‌شود و فقط برای بررسی توسط تیم استفاده می‌شود.
                </span>
              </div>
            </div>

            {/* سطح ۲ — سلفی */}
            {(level === 'LEVEL_2' || level === 'LEVEL_3') && (
              <div className={s.formGrid}>
                <div className={s.formField} data-span="full">
                  <ImageUploader
                    initialPreviews={selfieUrl ? [selfieUrl] : []}
                    onImageUpload={handleSelfieUpload}
                    onImageRemove={handleSelfieRemove}
                    maxFiles={1}
                    multiple={false}
                    folder="kyc"
                    thumbSize="xl"
                    label="سلفی در کنار مدرک (تأیید چهره)"
                    hint="عکس واضح از چهره در کنار مدرک شناسایی — JPG، PNG، WebP"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {/* سطح ۳ — آدرس */}
            {level === 'LEVEL_3' && (
              <div className={s.formGrid}>
                <div className={s.formField}>
                  <label htmlFor="city" className={s.formLabel}>
                    شهر
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={s.formControl}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: کابل"
                    disabled={isPending}
                    autoComplete="address-level2"
                    maxLength={120}
                    required
                  />
                </div>
                <div className={s.formField}>
                  <label htmlFor="address" className={s.formLabel}>
                    آدرس کامل
                  </label>
                  <input
                    id="address"
                    type="text"
                    className={s.formControl}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: ناحیه ۳، خیابان …"
                    disabled={isPending}
                    autoComplete="street-address"
                    maxLength={300}
                    required
                  />
                </div>
                <div className={s.formField} data-span="full">
                  <ImageUploader
                    initialPreviews={addressDocUrl ? [addressDocUrl] : []}
                    onImageUpload={handleAddressDocUpload}
                    onImageRemove={handleAddressDocRemove}
                    maxFiles={1}
                    multiple={false}
                    folder="kyc"
                    thumbSize="xl"
                    label="سند اثبات آدرس (قبض برق، گاز، اینترنت و…)"
                    hint="قبض یا سندی که نام و آدرس شما روی آن باشد — JPG، PNG، WebP"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertTriangle size={12} aria-hidden />
                {error}
              </div>
            )}

            <div className={s.formFoot}>
              <button type="submit" className={s.submitBtn} disabled={isPending}>
                <Upload size={11} aria-hidden />
                {isPending ? 'در حال ارسال...' : `ارسال برای بررسی — ${levelTitle}`}
              </button>
            </div>
          </form>
        </section>
      )}

      {success && (
        <output className={s.successBox}>
          <CheckCircle2 size={12} aria-hidden />
          مدارک با موفقیت ارسال شد و در صف بررسی قرار گرفت.
        </output>
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
