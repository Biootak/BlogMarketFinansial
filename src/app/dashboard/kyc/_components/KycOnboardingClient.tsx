'use client';

/**
 * KycOnboardingClient — 2026 Progressive KYC wizard
 * ۳ گام: اطلاعات پایه → مدارک → تأیید نهایی
 * Status views: PENDING / APPROVED / REJECTED
 */

import {
  type KycRecordRow,
  submitKycBasicInfo,
  submitKycDocuments,
} from '@/actions/kyc-onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './KycOnboardingClient.module.css';

type Props = { initialRecord: KycRecordRow | null };

type FormData = {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  phone: string;
  selfieUrl: string;
  docFrontUrl: string;
  docBackUrl: string;
};

const STEPS = [
  { id: 1, label: 'اطلاعات پایه', Icon: User },
  { id: 2, label: 'مدارک', Icon: FileText },
  { id: 3, label: 'تأیید نهایی', Icon: CheckCircle2 },
];

const STATUS_CONFIG = {
  PENDING: {
    Icon: Clock,
    colorVar: 'var(--ds-status-pending-fg)',
    bgVar: 'var(--ds-status-pending-bg)',
    borderVar: 'var(--ds-status-pending-border)',
    title: 'در حال بررسی',
    desc: 'مدارک شما دریافت شده و در صف بررسی است. معمولاً ۲۴ تا ۴۸ ساعت طول می‌کشد.',
  },
  APPROVED: {
    Icon: BadgeCheck,
    colorVar: 'var(--ds-status-success-fg)',
    bgVar: 'var(--ds-status-success-bg)',
    borderVar: 'var(--ds-status-success-border)',
    title: 'هویت تأیید شد',
    desc: 'حساب شما تأیید شده و می‌توانید از تمام خدمات مالی استفاده کنید.',
  },
  REJECTED: {
    Icon: XCircle,
    colorVar: 'var(--ds-status-error-fg)',
    bgVar: 'var(--ds-status-error-bg)',
    borderVar: 'var(--ds-status-error-border)',
    title: 'مدارک رد شد',
    desc: 'متأسفانه مدارک ارسالی تأیید نشد. لطفاً مدارک معتبر ارسال کنید.',
  },
};

export function KycOnboardingClient({ initialRecord }: Props) {
  const [record, setRecord] = useState<KycRecordRow | null>(initialRecord);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<FormData>({
    fullName: '',
    nationalId: '',
    dateOfBirth: '',
    phone: '',
    selfieUrl: '',
    docFrontUrl: '',
    docBackUrl: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }, []);

  const handleStep1 = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await submitKycBasicInfo({
        fullName: data.fullName,
        nationalId: data.nationalId,
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setStep(2);
    });
  }, [data]);

  const handleStep2 = useCallback(() => {
    startTransition(async () => {
      setError(null);
      if (!data.selfieUrl || !data.docFrontUrl) {
        setError('لطفاً عکس سلفی و تصویر روی مدرک را وارد کنید');
        return;
      }
      const res = await submitKycDocuments({
        selfieUrl: data.selfieUrl,
        docFrontUrl: data.docFrontUrl,
        docBackUrl: data.docBackUrl || undefined,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setStep(3);
    });
  }, [data]);

  const handleFinish = useCallback(() => {
    setRecord({
      id: 'optimistic',
      fullName: data.fullName,
      selfieUrl: data.selfieUrl,
      docFrontUrl: data.docFrontUrl,
      docBackUrl: data.docBackUrl || null,
      submittedAt: new Date(),
      reviewedAt: null,
      rejectedReason: null,
      status: 'PENDING',
    });
  }, [data]);

  // ── Status views ──────────────────────────────────────────────────────────
  if (record && record.status !== 'NONE') {
    const cfg = STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG];
    if (!cfg) return null;
    const StatusIcon = cfg.Icon;
    return (
      <div className={s.page}>
        <div className={s.statusCard}>
          <div
            className={s.statusIconWrap}
            style={{ background: cfg.bgVar, border: `1px solid ${cfg.borderVar}` }}
          >
            <StatusIcon size={36} style={{ color: cfg.colorVar }} aria-hidden />
          </div>
          <h1 className={s.statusTitle}>{cfg.title}</h1>
          <p className={s.statusDesc}>{cfg.desc}</p>

          {record.status === 'REJECTED' && record.rejectedReason && (
            <div className={s.statusReason}>
              <strong>دلیل رد:</strong> {record.rejectedReason}
            </div>
          )}

          {record.status === 'REJECTED' && (
            <Button
              onClick={() => {
                setRecord(null);
                setStep(1);
                setError(null);
              }}
              variant="default"
            >
              ارسال مجدد مدارک
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  const stepState = (id: number) => (id < step ? 'done' : id === step ? 'active' : 'pending');

  return (
    <div className={s.page}>
      <div className={s.wizardCard}>
        {/* Stepper */}
        <div className={s.stepper} role="list" aria-label="مراحل احراز هویت">
          {STEPS.map((st) => {
            const state = stepState(st.id);
            const StepIcon = st.Icon;
            return (
              <div key={st.id} className={`${s.stepItem} ${state}`} role="listitem">
                <div className={`${s.stepDot} ${state}`}>
                  {state === 'done' ? (
                    <CheckCircle2 size={16} aria-hidden />
                  ) : (
                    <StepIcon size={14} aria-hidden />
                  )}
                </div>
                <span className={`${s.stepLabel} ${state}`}>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1 — Basic info */}
        {step === 1 && (
          <div className={s.form}>
            <div>
              <h2 className={s.formTitle}>اطلاعات پایه</h2>
              <p className={s.formDesc}>
                این اطلاعات به‌صورت امن ذخیره و برای تأیید هویت استفاده می‌شود.
              </p>
            </div>

            {error && (
              <div className={s.error} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.fieldGroup}>
              <div className={s.field}>
                <label htmlFor="fullName" className={s.label}>
                  نام کامل
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={data.fullName}
                  onChange={handleChange}
                  placeholder="علی احمدی"
                  autoComplete="name"
                  aria-required="true"
                />
              </div>
              <div className={s.field}>
                <label htmlFor="nationalId" className={s.label}>
                  شناسه ملی / تذکره
                </label>
                <Input
                  id="nationalId"
                  name="nationalId"
                  value={data.nationalId}
                  onChange={handleChange}
                  placeholder="شماره تذکره یا شناسه ملی"
                  dir="ltr"
                  aria-required="true"
                />
              </div>
              <div className={s.field}>
                <label htmlFor="dateOfBirth" className={s.label}>
                  تاریخ تولد
                </label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={data.dateOfBirth}
                  onChange={handleChange}
                  placeholder="۱۳۷۰/۰۱/۰۱"
                  dir="ltr"
                  aria-required="true"
                />
                <span className={s.inputHint}>فرمت: ۱۴۰۰/۰۱/۰۱</span>
              </div>
              <div className={s.field}>
                <label htmlFor="phone" className={s.label}>
                  شماره موبایل
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={data.phone}
                  onChange={handleChange}
                  placeholder="+93700000000"
                  dir="ltr"
                  aria-required="true"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Documents */}
        {step === 2 && (
          <div className={s.form}>
            <div>
              <h2 className={s.formTitle}>آپلود مدارک</h2>
              <p className={s.formDesc}>
                لینک‌های HTTPS تصاویر مدرک خود را وارد کنید. فایل‌ها باید روی سرور شما آپلود شده
                باشند.
              </p>
            </div>

            {error && (
              <div className={s.error} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.fieldGroup}>
              <div className={s.field}>
                <label htmlFor="selfieUrl" className={s.label}>
                  عکس سلفی
                </label>
                <Input
                  id="selfieUrl"
                  name="selfieUrl"
                  value={data.selfieUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  dir="ltr"
                  type="url"
                  aria-required="true"
                />
              </div>
              <div className={s.field}>
                <label htmlFor="docFrontUrl" className={s.label}>
                  روی مدرک
                </label>
                <Input
                  id="docFrontUrl"
                  name="docFrontUrl"
                  value={data.docFrontUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  dir="ltr"
                  type="url"
                  aria-required="true"
                />
              </div>
              <div className={s.field}>
                <label htmlFor="docBackUrl" className={s.label}>
                  پشت مدرک{' '}
                  <span style={{ color: 'var(--ds-text-muted)', fontWeight: 400 }}>(اختیاری)</span>
                </label>
                <Input
                  id="docBackUrl"
                  name="docBackUrl"
                  value={data.docBackUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  dir="ltr"
                  type="url"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className={s.form}>
            <div>
              <h2 className={s.formTitle}>بررسی نهایی</h2>
              <p className={s.formDesc}>
                اطلاعات زیر را بررسی کنید. پس از تأیید، مدارک برای بررسی ادمین ارسال می‌شوند.
              </p>
            </div>

            <div className={s.reviewGrid}>
              {[
                { key: 'نام', val: data.fullName },
                { key: 'شناسه', val: data.nationalId },
                { key: 'تاریخ تولد', val: data.dateOfBirth },
                { key: 'موبایل', val: data.phone },
                { key: 'سلفی', val: data.selfieUrl ? '✓ آپلود شده' : '—' },
                { key: 'مدرک (رو)', val: data.docFrontUrl ? '✓ آپلود شده' : '—' },
              ].map(({ key, val }) => (
                <div key={key} className={s.reviewRow}>
                  <span className={s.reviewKey}>{key}</span>
                  <span className={s.reviewVal}>{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className={s.footer}>
          <span className={s.stepHint}>
            گام {step} از {STEPS.length}
          </span>

          <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={isPending}
              >
                <ArrowRight size={14} aria-hidden />
                قبلی
              </Button>
            )}

            {step < 3 && (
              <Button
                size="sm"
                onClick={step === 1 ? handleStep1 : handleStep2}
                disabled={isPending}
              >
                {isPending ? 'در حال ارسال...' : 'بعدی'}
                {!isPending && <ArrowLeft size={14} aria-hidden />}
              </Button>
            )}

            {step === 3 && (
              <Button size="sm" onClick={handleFinish} disabled={isPending}>
                <ShieldCheck size={14} aria-hidden />
                ارسال برای تأیید
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
