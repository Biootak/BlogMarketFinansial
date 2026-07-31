'use client';

/**
 * ApplyExchangeForm — ثبت‌نام صرافی (2026 redesign)
 *
 * ساختار:
 *  §1. Step indicator — ۳ مرحله با line connector
 *  §2. شناسایی — نام، slug، شهر، مجوز
 *  §3. تماس — تلفن، ایمیل، آدرس
 *  §4. تنظیمات — سقف روزانه، کارمزد، KYC switch
 *  §5. CTA submit
 *
 * ویژگی‌ها:
 *  - CustomSwitch از @/components/ui به‌جای native checkbox
 *  - Input و Textarea از @/components/ui
 *  - useTransition → double-submit prevention
 *  - RTL-first · DS tokens · no hex
 *  - Error inline + root error alert
 *  - Keyboard nav + ARIA
 *  - Mobile-first
 */

import { applyForExchange } from '@/actions/exchanges';
import { CustomSwitch } from '@/components/ui/CustomSwitch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Settings2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { type SubmitHandler, useForm, Controller } from 'react-hook-form';
import s from './ApplyExchangeForm.module.css';

interface FormValues {
  name: string;
  slug: string;
  city: string;
  licenseNo: string;
  phone: string;
  email: string;
  address: string;
  dailyLimitAf: number;
  platformFee: number;
  requireKyc: boolean;
}

const STEPS = [
  { id: 1, label: 'شناسایی', icon: Building2 },
  { id: 2, label: 'تماس', icon: Phone },
  { id: 3, label: 'تنظیمات', icon: Settings2 },
] as const;

export default function ApplyExchangeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState(1);

  const {
    register,
    handleSubmit,
    setError,
    control,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      slug: '',
      city: '',
      licenseNo: '',
      phone: '',
      email: '',
      address: '',
      dailyLimitAf: 5_000_000,
      platformFee: 0.5,
      requireKyc: true,
    },
  });

  /** پیش به مرحله بعد با validation */
  const goNext = async () => {
    const stepFields: Record<number, (keyof FormValues)[]> = {
      1: ['name', 'slug', 'city'],
      2: ['phone', 'email', 'address'],
      3: ['dailyLimitAf', 'platformFee'],
    };
    const valid = await trigger(stepFields[activeStep]);
    if (valid && activeStep < 3) setActiveStep((s) => s + 1);
  };

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    startTransition(async () => {
      const result = await applyForExchange({
        name: values.name,
        slug: values.slug,
        city: values.city,
        licenseNo: values.licenseNo || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        dailyLimitAf: Number(values.dailyLimitAf) || 0,
        platformFee: Number(values.platformFee) || 0,
        requireKyc: Boolean(values.requireKyc),
      });
      if (result.success) {
        const id = result.data?.id ?? '';
        router.push(`/apply-exchange/success${id ? `?id=${encodeURIComponent(id)}` : ''}`);
      } else {
        if (result.error.code === 'DUPLICATE_SLUG') {
          setError('slug', { message: result.error.message });
          setActiveStep(1);
        } else {
          setError('root', { message: result.error.message });
        }
      }
    });
  };

  return (
    <div className={s.shell}>
      {/* Ambient field */}
      <div className={s.ambient} aria-hidden />

      {/* ── Header ── */}
      <header className={s.head}>
        <span className={s.eyebrow}>
          <Globe size={12} strokeWidth={2} aria-hidden />
          پلتفرم صرافی‌های افغانستان
        </span>
        <h1 className={s.title}>ثبت‌نام صرافی</h1>
        <p className={s.subtitle}>
          اطلاعات صرافی خود را در ۳ مرحله وارد کنید — تیم ما ظرف ۴۸ ساعت بررسی می‌کند.
        </p>
      </header>

      {/* ── Step indicator ── */}
      <nav className={s.steps} aria-label="مراحل ثبت‌نام">
        {STEPS.map((step, i) => {
          const isDone = activeStep > step.id;
          const isActive = activeStep === step.id;
          const Icon = step.icon;
          return (
            <div key={step.id} className={s.stepWrap}>
              <button
                type="button"
                className={`${s.stepNode} ${isDone ? s.stepDone : isActive ? s.stepActive : s.stepIdle}`}
                onClick={() => isDone && setActiveStep(step.id)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`مرحله ${step.id}: ${step.label}${isDone ? ' — تکمیل شد' : ''}`}
              >
                {isDone ? (
                  <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden />
                ) : (
                  <Icon size={14} strokeWidth={2} aria-hidden />
                )}
              </button>
              <span className={`${s.stepLabel} ${isActive ? s.stepLabelActive : ''}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`${s.stepLine} ${isDone ? s.stepLineDone : ''}`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className={s.form} noValidate>

        {/* ── Step 1: شناسایی ── */}
        {activeStep === 1 && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <Building2 size={16} strokeWidth={2} aria-hidden className={s.sectionIcon} />
              <span className={s.sectionTitle}>اطلاعات صرافی</span>
            </div>

            <div className={s.grid2}>
              {/* نام */}
              <div className={s.field}>
                <label htmlFor="ex-name" className={s.label}>
                  نام صرافی <span className={s.req} aria-label="الزامی">*</span>
                </label>
                <Input
                  id="ex-name"
                  placeholder="صرافی کابل"
                  aria-invalid={!!errors.name}
                  {...register('name', {
                    required: 'نام صرافی الزامی است',
                    minLength: { value: 2, message: 'حداقل ۲ کاراکتر' },
                  })}
                />
                {errors.name && <span className={s.error} role="alert">{errors.name.message}</span>}
              </div>

              {/* slug */}
              <div className={s.field}>
                <label htmlFor="ex-slug" className={s.label}>
                  نام کوتاه (URL) <span className={s.req} aria-label="الزامی">*</span>
                </label>
                <Input
                  id="ex-slug"
                  dir="ltr"
                  placeholder="kabul-exchange"
                  aria-invalid={!!errors.slug}
                  {...register('slug', {
                    required: 'نام کوتاه الزامی است',
                    pattern: { value: /^[a-z0-9-]+$/, message: 'فقط حروف انگلیسی کوچک، عدد و خط تیره' },
                    minLength: { value: 2, message: 'حداقل ۲ کاراکتر' },
                  })}
                />
                {errors.slug
                  ? <span className={s.error} role="alert">{errors.slug.message}</span>
                  : <span className={s.hint}>financialmarket.page/exchanges/<em>نام-کوتاه</em></span>}
              </div>

              {/* شهر */}
              <div className={s.field}>
                <label htmlFor="ex-city" className={s.label}>
                  شهر <span className={s.req} aria-label="الزامی">*</span>
                </label>
                <Input
                  id="ex-city"
                  placeholder="کابل"
                  aria-invalid={!!errors.city}
                  {...register('city', { required: 'شهر الزامی است' })}
                />
                {errors.city && <span className={s.error} role="alert">{errors.city.message}</span>}
              </div>

              {/* مجوز */}
              <div className={s.field}>
                <label htmlFor="ex-license" className={s.label}>
                  شماره مجوز <span className={s.optional}>(اختیاری)</span>
                </label>
                <Input
                  id="ex-license"
                  dir="ltr"
                  placeholder="AF-EX-0000"
                  {...register('licenseNo')}
                />
              </div>
            </div>

            <div className={s.stepActions}>
              <button type="button" className={s.nextBtn} onClick={goNext}>
                مرحله بعد
                <span aria-hidden>←</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: تماس ── */}
        {activeStep === 2 && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <Phone size={16} strokeWidth={2} aria-hidden className={s.sectionIcon} />
              <span className={s.sectionTitle}>اطلاعات تماس</span>
            </div>

            <div className={s.grid2}>
              {/* تلفن */}
              <div className={s.field}>
                <label htmlFor="ex-phone" className={s.label}>
                  شماره تماس
                </label>
                <Input
                  id="ex-phone"
                  type="tel"
                  dir="ltr"
                  placeholder="+93 70 000 0000"
                  {...register('phone')}
                />
              </div>

              {/* ایمیل */}
              <div className={s.field}>
                <label htmlFor="ex-email" className={s.label}>
                  ایمیل
                </label>
                <Input
                  id="ex-email"
                  type="email"
                  dir="ltr"
                  placeholder="info@exchange.af"
                  aria-invalid={!!errors.email}
                  {...register('email', {
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'ایمیل معتبر وارد کنید' },
                  })}
                />
                {errors.email && <span className={s.error} role="alert">{errors.email.message}</span>}
              </div>
            </div>

            {/* آدرس — full width */}
            <div className={s.field}>
              <label htmlFor="ex-address" className={s.label}>
                <MapPin size={13} strokeWidth={2} aria-hidden />
                آدرس دقیق شعبه اصلی
              </label>
              <Textarea
                id="ex-address"
                rows={3}
                placeholder="کابل، چهراهی صدارت، کوچه …"
                {...register('address')}
              />
            </div>

            <div className={s.stepActions}>
              <button
                type="button"
                className={s.backBtn}
                onClick={() => setActiveStep(1)}
              >
                <span aria-hidden>→</span>
                مرحله قبل
              </button>
              <button type="button" className={s.nextBtn} onClick={goNext}>
                مرحله بعد
                <span aria-hidden>←</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: تنظیمات ── */}
        {activeStep === 3 && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <Settings2 size={16} strokeWidth={2} aria-hidden className={s.sectionIcon} />
              <span className={s.sectionTitle}>تنظیمات عملیاتی</span>
              <span className={s.sectionHint}>اختیاری — تیم ما در صورت نیاز تنظیم می‌کند</span>
            </div>

            <div className={s.grid2}>
              {/* سقف روزانه */}
              <div className={s.field}>
                <label htmlFor="ex-dailyLimit" className={s.label}>
                  سقف معامله روزانه (افغانی)
                </label>
                <Input
                  id="ex-dailyLimit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100_000}
                  dir="ltr"
                  aria-invalid={!!errors.dailyLimitAf}
                  {...register('dailyLimitAf', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'سقف نمی‌تواند منفی باشد' },
                  })}
                />
                {errors.dailyLimitAf
                  ? <span className={s.error} role="alert">{errors.dailyLimitAf.message}</span>
                  : <span className={s.hint}>پیش‌فرض: ۵,۰۰۰,۰۰۰ افغانی</span>}
              </div>

              {/* کارمزد */}
              <div className={s.field}>
                <label htmlFor="ex-platformFee" className={s.label}>
                  کارمزد پلتفرم (٪)
                </label>
                <Input
                  id="ex-platformFee"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={50}
                  step={0.1}
                  dir="ltr"
                  aria-invalid={!!errors.platformFee}
                  {...register('platformFee', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'کارمزد نمی‌تواند منفی باشد' },
                    max: { value: 50, message: 'کارمزد بیش از ۵۰٪ مجاز نیست' },
                  })}
                />
                {errors.platformFee
                  ? <span className={s.error} role="alert">{errors.platformFee.message}</span>
                  : <span className={s.hint}>پیش‌فرض: ۰.۵٪ از هر معامله</span>}
              </div>
            </div>

            {/* KYC switch */}
            <div className={s.switchRow}>
              <div className={s.switchText}>
                <span className={s.switchLabel}>الزام احراز هویت مشتریان</span>
                <span className={s.switchDesc}>
                  مشتریان قبل از انجام تراکنش باید KYC تأیید شده داشته باشند.
                </span>
              </div>
              <Controller
                name="requireKyc"
                control={control}
                render={({ field }) => (
                  <CustomSwitch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="الزام احراز هویت مشتریان"
                  />
                )}
              />
            </div>

            {/* خطای کلی */}
            {errors.root && (
              <div className={s.rootError} role="alert">
                <AlertCircle size={16} strokeWidth={2} aria-hidden />
                {errors.root.message}
              </div>
            )}

            <div className={s.stepActions}>
              <button
                type="button"
                className={s.backBtn}
                onClick={() => setActiveStep(2)}
              >
                <span aria-hidden>→</span>
                مرحله قبل
              </button>
              <button
                type="submit"
                className={s.submitBtn}
                disabled={isPending}
                aria-busy={isPending || undefined}
              >
                {isPending
                  ? <Loader2 size={16} className={s.spinner} aria-hidden />
                  : <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden />}
                {isPending ? 'در حال ارسال…' : 'ارسال درخواست'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
