'use client';

/**
 * KycWizard — ویزارد احراز هویت چند مرحله‌ای
 *
 * مرحله ۰: مقدمه + وضعیت فعلی
 * مرحله ۱: اطلاعات پایه (نام، شناسه ملی، تاریخ تولد، تلفن)
 * مرحله ۲: آپلود مدارک (سلفی، مدرک جلو/پشت)
 * مرحله ۳: تأیید و ارسال
 *
 * آپلود به صورت data URL ذخیره می‌شود تا نیازی به storage service نباشد.
 * در production، جایگزین با UploadThing / S3 pre-signed URL شود.
 */

import { submitKycBasicInfo, submitKycDocuments, type KycRecordRow } from '@/actions/kyc-onboarding';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ClipboardList,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
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
}

type DocState = {
  selfieUrl: string;
  docFrontUrl: string;
  docBackUrl: string;
};

export default function KycWizard({ initialRecord }: Props) {
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
  const [docs, setDocs] = useState<DocState>({ selfieUrl: '', docFrontUrl: '', docBackUrl: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selfieRef = useRef<HTMLInputElement>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof DocState,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم فایل نباید بیش از ۵ مگابایت باشد');
      return;
    }
    const dataUrl = await readFile(file);
    setDocs((d) => ({ ...d, [field]: dataUrl }));
    setError(null);
  }

  function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      fullName: (fd.get('fullName') as string).trim(),
      nationalId: (fd.get('nationalId') as string).trim(),
      dateOfBirth: (fd.get('dateOfBirth') as string).trim(),
      phone: (fd.get('phone') as string).trim(),
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
    if (!docs.selfieUrl) { setError('عکس سلفی الزامی است'); return; }
    if (!docs.docFrontUrl) { setError('تصویر روی مدرک الزامی است'); return; }
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
                  مدارک شما برای بررسی به تیم ما ارسال شد. معمولاً در کمتر از ۲۴ ساعت نتیجه اطلاع می‌یابید.
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

  // ── رد شده → امکان تلاش مجدد ────────────────────────────────
  const rejectedBanner =
    initialRecord?.status === 'REJECTED' ? (
      <div className={`${s.statusBanner} ${s.statusBannerRejected}`}>
        <ShieldAlert size={22} strokeWidth={1.5} aria-hidden />
        <div>
          <div className={s.statusTitle}>درخواست رد شد</div>
          <div className={s.statusDesc}>
            {initialRecord.rejectedReason ?? 'مدارک نامعتبر بود. لطفاً مجدداً تلاش کنید.'}
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
                <div className={s.errorMsg} role="alert">{error}</div>
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
                    <ChevronLeft size={16} style={{ transform: 'scaleX(-1)' }} aria-hidden />
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
                  {docs.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docs.selfieUrl} alt="پیش‌نمایش سلفی" className={s.uploadPreview} />
                  ) : (
                    <>
                      <Camera size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        عکس سلفی در حالی که مدرک را کنار صورت نگه داشته‌اید
                        <br />
                        <span style={{ color: 'var(--ds-primary)' }}>انتخاب فایل</span> یا بکشید و رها کنید
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
                  {docs.docFrontUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docs.docFrontUrl} alt="پیش‌نمایش روی مدرک" className={s.uploadPreview} />
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        تصویر روی کارت ملی / پاسپورت
                        <br />
                        <span style={{ color: 'var(--ds-primary)' }}>انتخاب فایل</span>
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
                  {docs.docBackUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docs.docBackUrl} alt="پیش‌نمایش پشت مدرک" className={s.uploadPreview} />
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1} className={s.uploadIcon} aria-hidden />
                      <p className={s.uploadText}>
                        تصویر پشت کارت (در صورت وجود)
                        <br />
                        <span style={{ color: 'var(--ds-primary)' }}>انتخاب فایل</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className={s.errorMsg} role="alert">{error}</div>
              )}

              <div className={s.footer}>
                <button
                  type="button"
                  className={s.backBtn}
                  onClick={() => setStep(0)}
                >
                  برگشت
                </button>
                <button type="submit" className={s.primaryBtn}>
                  <ChevronLeft size={16} style={{ transform: 'scaleX(-1)' }} aria-hidden />
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
                <span>نام: <strong>{basicInfo.fullName}</strong></span>
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
              <div className={s.errorMsg} role="alert">{error}</div>
            )}

            <div className={s.footer}>
              <button
                type="button"
                className={s.backBtn}
                onClick={() => setStep(1)}
              >
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
