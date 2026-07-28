'use client';

/**
 * KycOnboardingClient — 2026 Progressive KYC Wizard (Million-Dollar Redesign)
 *
 * ۳ گام: اطلاعات پایه → آپلود مدارک (drag-drop واقعی) → تأیید نهایی
 * Status views: PENDING / APPROVED / REJECTED
 * - File upload واقعی از /api/upload (نه URL دستی) — از ImageUploader مشترک
 * - Drag & Drop + camera capture
 * - Preview تصاویر قبل از ارسال
 * - Spring micro-interactions
 * - همهٔ ۵ state: loading / empty / error / success / disabled
 */

import {
  type KycRecordRow,
  submitKycBasicInfo,
  submitKycDocuments,
} from '@/actions/kyc-onboarding';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
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
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState, useTransition } from 'react';
import s from './KycOnboardingClient.module.css';

type Props = { initialRecord: KycRecordRow | null };

type FormData = {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  phone: string;
};

type DocFiles = {
  selfieUrl: string;
  docFrontUrl: string;
  docBackUrl: string;
};

const STEPS = [
  { id: 1, label: 'اطلاعات پایه', Icon: User },
  { id: 2, label: 'مدارک', Icon: FileText },
  { id: 3, label: 'تأیید', Icon: ShieldCheck },
];

const STATUS_CONFIG = {
  PENDING: {
    Icon: Clock,
    status: 'PENDING' as const,
    title: 'در حال بررسی',
    desc: 'مدارک شما دریافت شده و در صف بررسی تیم ماست. معمولاً ۲۴ تا ۴۸ ساعت طول می‌کشد.',
  },
  APPROVED: {
    Icon: BadgeCheck,
    status: 'APPROVED' as const,
    title: 'هویت تأیید شد',
    desc: 'حساب شما با موفقیت تأیید شده است. اکنون به تمام خدمات مالی دسترسی کامل دارید.',
  },
  REJECTED: {
    Icon: XCircle,
    status: 'REJECTED' as const,
    title: 'مدارک رد شد',
    desc: 'متأسفانه مدارک ارسالی مورد تأیید قرار نگرفت. لطفاً مدارک معتبرتری ارسال کنید.',
  },
};

// ── Main Component ──────────────────────────────────────────────────────────
export function KycOnboardingClient({ initialRecord }: Props) {
  const [record, setRecord] = useState<KycRecordRow | null>(initialRecord);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormData>({
    fullName: '',
    nationalId: '',
    dateOfBirth: '',
    phone: '',
  });

  const [docs, setDocs] = useState<DocFiles>({
    selfieUrl: '',
    docFrontUrl: '',
    docBackUrl: '',
  });

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }, []);

  const handleStep1 = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await submitKycBasicInfo(form);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setStep(2);
    });
  }, [form]);

  const handleStep2 = useCallback(() => {
    if (!docs.selfieUrl || !docs.docFrontUrl) {
      setError('لطفاً عکس سلفی و تصویر روی مدرک را آپلود کنید');
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await submitKycDocuments({
        selfieUrl: docs.selfieUrl,
        docFrontUrl: docs.docFrontUrl,
        docBackUrl: docs.docBackUrl || undefined,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setStep(3);
    });
  }, [docs]);

  const handleFinish = useCallback(() => {
    setRecord({
      id: 'optimistic',
      fullName: form.fullName,
      selfieUrl: docs.selfieUrl,
      docFrontUrl: docs.docFrontUrl,
      docBackUrl: docs.docBackUrl || null,
      submittedAt: new Date(),
      reviewedAt: null,
      rejectedReason: null,
      status: 'PENDING',
    });
  }, [form, docs]);

  // ── Status Views ────────────────────────────────────────────────────────
  if (record && record.status !== 'NONE') {
    const cfg = STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG];
    if (!cfg) return null;
    const StatusIcon = cfg.Icon;
    return (
      <div className={s.page}>
        <div className={s.statusCard} data-status={cfg.status}>
          <div className={s.statusIconRing} aria-hidden>
            <div className={s.statusIconInner}>
              <StatusIcon size={32} aria-hidden />
            </div>
          </div>

          <div className={s.statusBadge} data-status={cfg.status}>
            {cfg.status === 'PENDING' && 'در انتظار بررسی'}
            {cfg.status === 'APPROVED' && 'تأیید شده'}
            {cfg.status === 'REJECTED' && 'رد شده'}
          </div>

          <h1 className={s.statusTitle}>{cfg.title}</h1>
          <p className={s.statusDesc}>{cfg.desc}</p>

          {record.status === 'REJECTED' && record.rejectedReason && (
            <div className={s.statusReason}>
              <AlertCircle size={14} aria-hidden />
              <span>{record.rejectedReason}</span>
            </div>
          )}

          {record.status === 'PENDING' && (
            <div className={s.statusTimeline}>
              <div className={s.timelineItem} data-done="true">
                <CheckCircle2 size={14} aria-hidden />
                <span>اطلاعات پایه ثبت شد</span>
              </div>
              <div className={s.timelineItem} data-done="true">
                <CheckCircle2 size={14} aria-hidden />
                <span>مدارک آپلود شد</span>
              </div>
              <div className={s.timelineItem} data-done="false">
                <Clock size={14} aria-hidden />
                <span>در انتظار بررسی تیم</span>
              </div>
            </div>
          )}

          {record.status === 'REJECTED' && (
            <Button
              className={s.retryBtn}
              onClick={() => {
                setRecord(null);
                setStep(1);
                setError(null);
              }}
            >
              <Upload size={15} aria-hidden />
              ارسال مجدد مدارک
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────
  const stepState = (id: number) => (id < step ? 'done' : id === step ? 'active' : 'pending');

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerEyebrow}>
          <ShieldCheck size={14} aria-hidden />
          <span>احراز هویت</span>
        </div>
        <h1 className={s.headerTitle}>تأیید هویت</h1>
        <p className={s.headerDesc}>
          اطلاعات شما رمزنگاری‌شده ذخیره می‌شود. بررسی معمولاً ۲۴ ساعت طول می‌کشد.
        </p>
      </div>

      <div className={s.wizardCard}>
        {/* ── Stepper ── */}
        <div className={s.stepper} aria-label="مراحل احراز هویت">
          {STEPS.map((st, i) => {
            const state = stepState(st.id);
            const StepIcon = st.Icon;
            return (
              <div key={st.id} className={`${s.stepItem} ${s[`stepItem_${state}`]}`}>
                {i > 0 && (
                  <div
                    className={`${s.stepConnector} ${stepState(st.id - 1) === 'done' ? s.stepConnectorDone : ''}`}
                    aria-hidden
                  />
                )}
                <div
                  className={`${s.stepDot} ${s[`stepDot_${state}`]}`}
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={15} aria-hidden />
                  ) : (
                    <StepIcon size={14} aria-hidden />
                  )}
                </div>
                <span className={`${s.stepLabel} ${s[`stepLabel_${state}`]}`}>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>اطلاعات پایه</h2>
              <p className={s.formDesc}>
                این اطلاعات به‌صورت ایمن ذخیره و برای احراز هویت استفاده می‌شود.
              </p>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={15} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.fieldGrid}>
              <div className={s.fieldCol}>
                <label htmlFor="fullName" className={s.fieldLabel}>
                  نام کامل
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleFormChange}
                  placeholder="علی احمدی"
                  autoComplete="name"
                  aria-required="true"
                  className={s.fieldInput}
                />
              </div>
              <div className={s.fieldCol}>
                <label htmlFor="nationalId" className={s.fieldLabel}>
                  شماره تذکره / کارت ملی
                </label>
                <Input
                  id="nationalId"
                  name="nationalId"
                  value={form.nationalId}
                  onChange={handleFormChange}
                  placeholder="شماره تذکره یا شناسه ملی"
                  dir="ltr"
                  aria-required="true"
                  className={s.fieldInput}
                />
              </div>
              <div className={s.fieldCol}>
                <label htmlFor="dateOfBirth" className={s.fieldLabel}>
                  تاریخ تولد
                </label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleFormChange}
                  placeholder="۱۳۷۰/۰۱/۰۱"
                  dir="ltr"
                  aria-required="true"
                  className={s.fieldInput}
                />
                <span className={s.fieldHint}>فرمت: سال/ماه/روز</span>
              </div>
              <div className={s.fieldCol}>
                <label htmlFor="phone" className={s.fieldLabel}>
                  شماره موبایل
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="+93700000000"
                  dir="ltr"
                  aria-required="true"
                  className={s.fieldInput}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ── */}
        {step === 2 && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>آپلود مدارک</h2>
              <p className={s.formDesc}>تصویر واضح و خوانا از مدارک خود را آپلود کنید.</p>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={15} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.uploadGrid}>
              <ImageUploader
                key={`selfie-${docs.selfieUrl}`}
                initialPreviews={docs.selfieUrl ? [docs.selfieUrl] : []}
                onImageUpload={(urls: string[]) =>
                  setDocs((d) => ({ ...d, selfieUrl: urls[0] ?? '' }))
                }
                onImageRemove={() => setDocs((d) => ({ ...d, selfieUrl: '' }))}
                maxFiles={1}
                multiple={false}
                folder="kyc"
                thumbSize="lg"
                label="عکس سلفی"
                hint="عکس با کیفیت از صورت خود بگیرید"
                disabled={isPending}
              />
              <ImageUploader
                key={`front-${docs.docFrontUrl}`}
                initialPreviews={docs.docFrontUrl ? [docs.docFrontUrl] : []}
                onImageUpload={(urls: string[]) =>
                  setDocs((d) => ({ ...d, docFrontUrl: urls[0] ?? '' }))
                }
                onImageRemove={() => setDocs((d) => ({ ...d, docFrontUrl: '' }))}
                maxFiles={1}
                multiple={false}
                folder="kyc"
                thumbSize="lg"
                label="روی مدرک"
                hint="تصویر واضح جلو کارت ملی / تذکره"
                disabled={isPending}
              />
              <ImageUploader
                key={`back-${docs.docBackUrl}`}
                initialPreviews={docs.docBackUrl ? [docs.docBackUrl] : []}
                onImageUpload={(urls: string[]) =>
                  setDocs((d) => ({ ...d, docBackUrl: urls[0] ?? '' }))
                }
                onImageRemove={() => setDocs((d) => ({ ...d, docBackUrl: '' }))}
                maxFiles={1}
                multiple={false}
                folder="kyc"
                thumbSize="lg"
                label="پشت مدرک"
                hint="اختیاری — پشت کارت ملی / تذکره"
                disabled={isPending}
              />
            </div>

            <div className={s.uploadNotice}>
              <ShieldCheck size={14} aria-hidden />
              <span>تصاویر شما رمزنگاری‌شده ذخیره و فقط برای بررسی توسط تیم استفاده می‌شوند.</span>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>بررسی و ارسال</h2>
              <p className={s.formDesc}>
                اطلاعات زیر را بررسی کنید. پس از تأیید، پرونده شما ارسال می‌شود.
              </p>
            </div>

            <div className={s.reviewGrid}>
              {[
                { label: 'نام کامل', value: form.fullName },
                { label: 'شماره تذکره / کارت ملی', value: form.nationalId },
                { label: 'تاریخ تولد', value: form.dateOfBirth },
                { label: 'موبایل', value: form.phone },
              ].map(({ label, value }) => (
                <div key={label} className={s.reviewRow}>
                  <span className={s.reviewLabel}>{label}</span>
                  <span className={s.reviewValue}>{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className={s.docPreviews}>
              {docs.selfieUrl && (
                <div className={s.docPreviewItem}>
                  <div className={s.docThumb}>
                    <Image
                      src={docs.selfieUrl}
                      alt="سلفی"
                      fill
                      className={s.docThumbImg}
                      unoptimized
                    />
                    <CheckCircle2 className={s.docThumbCheck} size={16} aria-hidden />
                  </div>
                  <span className={s.docThumbLabel}>سلفی</span>
                </div>
              )}
              {docs.docFrontUrl && (
                <div className={s.docPreviewItem}>
                  <div className={s.docThumb}>
                    <Image
                      src={docs.docFrontUrl}
                      alt="روی مدرک"
                      fill
                      className={s.docThumbImg}
                      unoptimized
                    />
                    <CheckCircle2 className={s.docThumbCheck} size={16} aria-hidden />
                  </div>
                  <span className={s.docThumbLabel}>روی مدرک</span>
                </div>
              )}
              {docs.docBackUrl && (
                <div className={s.docPreviewItem}>
                  <div className={s.docThumb}>
                    <Image
                      src={docs.docBackUrl}
                      alt="پشت مدرک"
                      fill
                      className={s.docThumbImg}
                      unoptimized
                    />
                    <CheckCircle2 className={s.docThumbCheck} size={16} aria-hidden />
                  </div>
                  <span className={s.docThumbLabel}>پشت مدرک</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer Nav ── */}
        <div className={s.footer}>
          <span className={s.stepCounter}>
            گام {step} از {STEPS.length}
          </span>
          <div className={s.footerActions}>
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
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
                {isPending ? 'در حال پردازش...' : 'بعدی'}
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
