'use client';

/**
 * KycWizard — ویزارد احراز هویت چند مرحله‌ای
 *
 * مرحله ۱: اطلاعات پایه (نام، شناسه ملی، تاریخ تولد، تلفن)
 * مرحله ۲: آپلود مدارک (سلفی، مدرک جلو/پشت) — S3 presigned URL
 * مرحله ۳: تأیید و ارسال
 */

import { getPresignedUrl } from '@/actions/S3Actions';
import {
  type KycRecordRow,
  submitKycBasicInfo,
  submitKycDocuments,
} from '@/actions/kyc-onboarding';
import { normalizeDigits } from '@/lib/utils';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ClipboardList,
  Loader2,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import s from './kyc.module.css';

const STEPS = [
  { label: 'اطلاعات', icon: ClipboardList },
  { label: 'مدارک', icon: Camera },
  { label: 'تأیید', icon: BadgeCheck },
];

interface Props {
  initialRecord: KycRecordRow | null;
  /** آیا کاربر شماره تلفن تأیید‌شده در پروفایل دارد؟ برای warning OTP */
  hasPhone: boolean;
}

type DocState = {
  selfieUrl: string;
  docFrontUrl: string;
  docBackUrl: string;
};

/** نام فایل ایمن برای S3 — حروف/اعداد/نقطه/خط‌فاصله */
function safeFileName(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safe = /^[a-zA-Z0-9._-]+$/.test(ext) ? ext : 'jpg';
  return `kyc-${Date.now()}.${safe}`;
}

export default function KycWizard({ initialRecord, hasPhone }: Props) {
  // اگر قبلاً REJECTED شده، اطلاعات قبلی را pre-fill کن — کاربر نباید همه چیز را از اول وارد کند
  const isResubmit = initialRecord?.status === 'REJECTED';
  const [step, setStep] = useState<-1 | 0 | 1 | 2>(
    // اگر تأیید شده → نمایش وضعیت، در غیر این صورت ادامه wizard
    initialRecord?.status === 'APPROVED' ? -1 : 0,
  );
  const [basicInfo, setBasicInfo] = useState({
    fullName: initialRecord?.fullName ?? '',
    nationalId: '',
    dateOfBirth: '',
    phone: '',
  });
  const [docs, setDocs] = useState<DocState>({
    selfieUrl: initialRecord?.selfieUrl ?? '',
    docFrontUrl: initialRecord?.docFrontUrl ?? '',
    docBackUrl: initialRecord?.docBackUrl ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resubmitMode, setResubmitMode] = useState<'full' | 'docs'>(isResubmit ? 'docs' : 'full');

  const selfieRef = useRef<HTMLInputElement>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const [uploadingField, setUploadingField] = useState<keyof DocState | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, field: keyof DocState) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم فایل نباید بیش از ۵ مگابایت باشد');
      return;
    }
    setError(null);
    setUploadingField(field);
    try {
      // دریافت presigned URL از S3
      const presigned = await getPresignedUrl(safeFileName(file), file.type);
      if (!presigned.success) {
        setError(presigned.message);
        return;
      }
      // آپلود مستقیم به S3 با presigned URL
      const upload = await fetch(presigned.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!upload.ok) {
        setError('آپلود فایل با خطا مواجه شد. دوباره تلاش کنید.');
        return;
      }
      // URL نهایی بدون query string پرسش‌نامه‌های presigned
      const publicUrl = presigned.url.split('?')[0];
      setDocs((d) => ({ ...d, [field]: publicUrl }));
    } catch {
      setError('اتصال به سرویس ذخیره‌سازی ممکن نیست. دوباره تلاش کنید.');
    } finally {
      setUploadingField(null);
    }
  }

  function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      fullName: (fd.get('fullName') as string).trim(),
      nationalId: normalizeDigits((fd.get('nationalId') as string).trim()),
      dateOfBirth: normalizeDigits((fd.get('dateOfBirth') as string).trim()),
      phone: normalizeDigits((fd.get('phone') as string).trim()),
    };
    setError(null);

    startTransition(async () => {
      const res = await submitKycBasicInfo(data);
      if (res.success) {
        setBasicInfo(data);
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(res.error.message);
      }
    });
  }

  function handleStep2Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploadingField) {
      setError('لطفاً صبر کنید تا آپلود تمام شود');
      return;
    }
    if (!docs.selfieUrl) {
      setError('عکس سلفی الزامی است');
      return;
    }
    if (!docs.docFrontUrl) {
      setError('تصویر روی مدرک الزامی است');
      return;
    }
    setError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFinalSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await submitKycDocuments({
        selfieUrl: docs.selfieUrl,
        docFrontUrl: docs.docFrontUrl,
        docBackUrl: docs.docBackUrl || undefined,
      });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error.message);
      }
    });
  }

  // ── وضعیت تأیید شده ─────────────────────────────────────────
  if (initialRecord?.status === 'APPROVED') {
    return (
      <div className={s.root}>
        <div className={s.ambient} aria-hidden />
        <div className={s.container}>
          <div className={s.card}>
            <div className={`${s.statusBanner} ${s.statusBannerApproved}`}>
              <ShieldCheck size={22} strokeWidth={1.5} aria-hidden />
              <div>
                <div className={s.statusTitle}>احراز هویت تأیید شد ✓</div>
                <div className={s.statusDesc}>
                  {initialRecord.fullName ? `${initialRecord.fullName}، ` : ''}
                  هویت شما با موفقیت تأیید شده است و می‌توانید از تمام خدمات استفاده کنید.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── تأیید موفق (submit شد) ───────────────────────────────────
  if (success) {
    return (
      <div className={s.root}>
        <div className={s.ambient} aria-hidden />
        <div className={s.container}>
          <div className={s.card}>
            <div className={`${s.statusBanner} ${s.statusBannerPending}`}>
              <Shield size={22} strokeWidth={1.5} aria-hidden />
              <div>
                <div className={s.statusTitle}>مدارک با موفقیت ارسال شد</div>
                <div className={s.statusDesc}>
                  مدارک شما برای بررسی به تیم ما ارسال شد. معمولاً در کمتر از ۲۴ ساعت نتیجه اطلاع
                  می‌یابید.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── در انتظار بررسی ──────────────────────────────────────────
  if (initialRecord?.status === 'PENDING' && initialRecord.submittedAt) {
    return (
      <div className={s.root}>
        <div className={s.ambient} aria-hidden />
        <div className={s.container}>
          <div className={s.card}>
            <div className={`${s.statusBanner} ${s.statusBannerPending}`}>
              <Shield size={22} strokeWidth={1.5} aria-hidden />
              <div>
                <div className={s.statusTitle}>مدارک در حال بررسی است</div>
                <div className={s.statusDesc}>
                  مدارک شما دریافت شده و توسط تیم ما در حال بررسی است. تا ۲۴ ساعت منتظر بمانید.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── رد شده → امکان تلاش مجدد (با pre-fill اطلاعات قبلی) ────
  const rejectedBanner =
    initialRecord?.status === 'REJECTED' ? (
      <div className={`${s.statusBanner} ${s.statusBannerRejected}`}>
        <ShieldAlert size={22} strokeWidth={1.5} aria-hidden />
        <div style={{ flex: 1 }}>
          <div className={s.statusTitle}>درخواست قبلی رد شد</div>
          <div className={s.statusDesc}>
            {initialRecord.rejectedReason ?? 'مدارک نامعتبر بود. لطفاً مجدداً تلاش کنید.'}
          </div>
          {/* پیش‌نمایش مدارک قبلی — اگر موجود باشد */}
          {(initialRecord.selfieUrl ||
            initialRecord.docFrontUrl ||
            initialRecord.docBackUrl) && (
            <div className={s.rejectedThumbs} aria-label="مدارک ارسال‌شده قبلی">
              {initialRecord.selfieUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={initialRecord.selfieUrl}
                  alt="سلفی قبلی"
                  className={s.rejectedThumb}
                />
              )}
              {initialRecord.docFrontUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={initialRecord.docFrontUrl}
                  alt="مدرک جلو قبلی"
                  className={s.rejectedThumb}
                />
              )}
              {initialRecord.docBackUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={initialRecord.docBackUrl}
                  alt="مدرک پشت قبلی"
                  className={s.rejectedThumb}
                />
              )}
            </div>
          )}
          <div className={s.rejectedActions}>
            <button
              type="button"
              className={s.rejectedPrimary}
              onClick={() => {
                // فقط مدارک را دوباره ارسال کن — اطلاعات پایه معتبر است
                setResubmitMode('docs');
                setStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <RotateCcw size={14} aria-hidden />
              تلاش مجدد با اصلاح مدارک
            </button>
            <button
              type="button"
              className={s.rejectedSecondary}
              onClick={() => {
                // از ابتدا شروع کن
                setResubmitMode('full');
                setStep(0);
                setDocs({ selfieUrl: '', docFrontUrl: '', docBackUrl: '' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <X size={14} aria-hidden />
              شروع از ابتدا
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={s.root}>
      <div className={s.ambient} aria-hidden />
      <div className={s.container}>
        {/* ── Page Header ───────────────────────────────────── */}
        <header className={s.pageHeader}>
          <div className={s.headerIconWrap} aria-hidden>
            <Shield size={24} strokeWidth={1.5} />
          </div>
          <h1 className={s.pageTitle}>احراز هویت (KYC)</h1>
          <p className={s.pageSubtitle}>
            برای استفاده از خدمات مالی، مدارک هویتی خود را تأیید کنید.
          </p>
        </header>

        {/* ── Stepper ───────────────────────────────────────── */}
        <div className={s.stepper} aria-label="مراحل احراز هویت">
          {STEPS.map((st, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div
                key={st.label}
                className={`${s.stepItem} ${isDone ? s.stepItemDone : ''} ${isActive ? s.stepItemActive : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={s.stepCircle}>
                  {isDone ? <Check size={16} strokeWidth={3} aria-hidden /> : <span>{i + 1}</span>}
                </div>
                <span className={s.stepLabel}>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Phone Warning — OTP نیاز به شماره تلفن دارد ─── */}
        {!hasPhone && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-2)',
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              marginBlockEnd: 'var(--ds-space-4)',
              borderRadius: 'var(--ds-radius-md)',
              background: 'var(--ds-color-warning-surface, #fffcd0)',
              border: '1px solid var(--ds-color-warning-border, #d4a72c)',
              color: 'var(--ds-color-warning-text, #6e4f00)',
              fontSize: 'var(--ds-text-sm)',
              lineHeight: '1.5',
            }}
          >
            <ShieldAlert size={18} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
            <span>
              <strong>شماره تلفن ثبت نشده — </strong>
              برای تراکنش‌های بالای ۱۰۰٬۰۰۰ افغانی، کد تأیید SMS لازم است. لطفاً در{' '}
              <a href="/profile" style={{ color: 'inherit', textDecoration: 'underline' }}>
                پروفایل
              </a>{' '}
              شماره تلفن خود را اضافه کنید.
            </span>
          </div>
        )}

        {/* ── Rejected Banner ───────────────────────────────── */}
        {rejectedBanner && step === 0 && (
          <div style={{ marginBlockEnd: 'var(--ds-space-4)' }}>{rejectedBanner}</div>
        )}

        {/* ── Step 0: اطلاعات پایه ─────────────────────────── */}
        {step === 0 && (
          <div className={s.card}>
            <h2 className={s.cardTitle}>اطلاعات هویتی</h2>
            <form onSubmit={handleStep1Submit} className={s.form}>
              <div className={s.formGrid}>
                <div className={`${s.field} ${s.fieldFull}`}>
                  <label htmlFor="kyc-name" className={s.label}>
                    نام و نام خانوادگی
                  </label>
                  <input
                    id="kyc-name"
                    name="fullName"
                    className={s.input}
                    defaultValue={basicInfo.fullName}
                    required
                    minLength={3}
                    placeholder="مثال: احمد محمدی"
                  />
                </div>
                <div className={s.field}>
                  <label htmlFor="kyc-nid" className={s.label}>
                    شماره ملی / کارت شناسایی
                  </label>
                  <input
                    id="kyc-nid"
                    name="nationalId"
                    className={s.input}
                    required
                    dir="ltr"
                    placeholder="12345678"
                  />
                </div>
                <div className={s.field}>
                  <label htmlFor="kyc-dob" className={s.label}>
                    تاریخ تولد (شمسی)
                  </label>
                  <input
                    id="kyc-dob"
                    name="dateOfBirth"
                    className={s.input}
                    required
                    dir="ltr"
                    placeholder="۱۳۶۰/۰۱/۰۱"
                  />
                </div>
                <div className={s.field}>
                  <label htmlFor="kyc-phone" className={s.label}>
                    شماره تلفن
                  </label>
                  <input
                    id="kyc-phone"
                    name="phone"
                    className={s.input}
                    required
                    dir="ltr"
                    placeholder="+93 700 000 000"
                  />
                </div>
              </div>

              {error && (
                <div className={s.errorMsg} role="alert">
                  {error}
                </div>
              )}

              <div className={s.footer}>
                <button
                  type="submit"
                  className={s.primaryBtn}
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? (
                    <Loader2 size={16} className={s.spin} aria-hidden />
                  ) : (
                    <ChevronLeft size={16} aria-hidden />
                  )}
                  {isPending ? 'در حال ذخیره…' : 'مرحله بعد — آپلود مدارک'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 1: آپلود مدارک ──────────────────────────── */}
        {step === 1 && (
          <div className={s.card}>
            <h2 className={s.cardTitle}>آپلود مدارک</h2>
            <form onSubmit={handleStep2Submit} className={s.form}>
              {/* سلفی */}
              <div className={s.field}>
                <span className={s.uploadLabel}>عکس سلفی با مدرک *</span>
                <div className={s.uploadArea}>
                  <input
                    ref={selfieRef}
                    type="file"
                    accept="image/*"
                    className={s.uploadInput}
                    onChange={(e) => handleFileChange(e, 'selfieUrl')}
                    aria-label="آپلود عکس سلفی"
                  />
                  {uploadingField === 'selfieUrl' ? (
                    <>
                      <Loader2 size={24} className={s.spin} aria-hidden />
                      <p className={s.uploadText}>در حال آپلود…</p>
                    </>
                  ) : docs.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docs.selfieUrl} alt="پیش‌نمایش سلفی" className={s.uploadPreview} />
                  ) : (
                    <>
                      <Camera size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        عکس سلفی در حالی که مدرک را کنار صورت نگه داشته‌اید
                        <br />
                        <span style={{ color: 'var(--ds-brand-500)' }}>انتخاب فایل</span> یا بکشید و
                        رها کنید
                      </p>
                    </>
                  )}
                </div>
                <span className={s.fieldHint}>JPG یا PNG — حداکثر ۵ مگابایت</span>
              </div>

              {/* مدرک جلو */}
              <div className={s.field}>
                <span className={s.uploadLabel}>روی مدرک شناسایی *</span>
                <div className={s.uploadArea}>
                  <input
                    ref={frontRef}
                    type="file"
                    accept="image/*"
                    className={s.uploadInput}
                    onChange={(e) => handleFileChange(e, 'docFrontUrl')}
                    aria-label="آپلود روی مدرک"
                  />
                  {uploadingField === 'docFrontUrl' ? (
                    <>
                      <Loader2 size={24} className={s.spin} aria-hidden />
                      <p className={s.uploadText}>در حال آپلود…</p>
                    </>
                  ) : docs.docFrontUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={docs.docFrontUrl}
                      alt="پیش‌نمایش روی مدرک"
                      className={s.uploadPreview}
                    />
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        تصویر روی کارت ملی / پاسپورت
                        <br />
                        <span style={{ color: 'var(--ds-brand-500)' }}>انتخاب فایل</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* مدرک پشت */}
              <div className={s.field}>
                <span className={s.uploadLabel}>پشت مدرک شناسایی (اختیاری)</span>
                <div className={s.uploadArea}>
                  <input
                    ref={backRef}
                    type="file"
                    accept="image/*"
                    className={s.uploadInput}
                    onChange={(e) => handleFileChange(e, 'docBackUrl')}
                    aria-label="آپلود پشت مدرک"
                  />
                  {uploadingField === 'docBackUrl' ? (
                    <>
                      <Loader2 size={24} className={s.spin} aria-hidden />
                      <p className={s.uploadText}>در حال آپلود…</p>
                    </>
                  ) : docs.docBackUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={docs.docBackUrl}
                      alt="پیش‌نمایش پشت مدرک"
                      className={s.uploadPreview}
                    />
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        تصویر پشت کارت (در صورت وجود)
                        <br />
                        <span style={{ color: 'var(--ds-brand-500)' }}>انتخاب فایل</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className={s.errorMsg} role="alert">
                  {error}
                </div>
              )}

              <div className={s.footer}>
                <button type="button" className={s.backBtn} onClick={() => setStep(0)}>
                  برگشت
                </button>
                <button type="submit" className={s.primaryBtn}>
                  <ChevronLeft size={16} aria-hidden />
                  مرحله بعد — بررسی نهایی
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 2: تأیید نهایی ──────────────────────────── */}
        {step === 2 && (
          <div className={s.card}>
            <h2 className={s.cardTitle}>بررسی نهایی</h2>

            <ul className={s.featureList}>
              <li className={s.featureItem}>
                <span className={s.featureDot} aria-hidden />
                <span>
                  نام: <strong>{basicInfo.fullName}</strong>
                </span>
              </li>
              <li className={s.featureItem}>
                <span className={s.featureDot} aria-hidden />
                <span>سلفی: {docs.selfieUrl ? '✓ آپلود شد' : '✗'}</span>
              </li>
              <li className={s.featureItem}>
                <span className={s.featureDot} aria-hidden />
                <span>مدرک جلو: {docs.docFrontUrl ? '✓ آپلود شد' : '✗'}</span>
              </li>
              {docs.docBackUrl && (
                <li className={s.featureItem}>
                  <span className={s.featureDot} aria-hidden />
                  <span>مدرک پشت: ✓ آپلود شد</span>
                </li>
              )}
            </ul>

            {error && (
              <div className={s.errorMsg} role="alert">
                {error}
              </div>
            )}

            <div className={s.footer}>
              <button type="button" className={s.backBtn} onClick={() => setStep(1)}>
                برگشت
              </button>
              <button
                type="button"
                className={s.primaryBtn}
                disabled={isPending}
                onClick={handleFinalSubmit}
                aria-busy={isPending}
              >
                {isPending ? (
                  <Loader2 size={16} className={s.spin} aria-hidden />
                ) : (
                  <Check size={16} aria-hidden />
                )}
                {isPending ? 'در حال ارسال…' : 'ارسال مدارک برای بررسی'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
