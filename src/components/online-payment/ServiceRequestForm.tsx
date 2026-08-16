'use client';

/**
 * ServiceRequestForm — Wise / Stripe / Linear grade, 2026
 *
 * Architecture changes vs. previous version:
 *  - Step 1: Amount + currency (Wise: amount-first) + service type selection
 *  - Step 2: Personal info + service-specific conditional fields (Linear: grid-row reveal)
 *  - Step 3: Urgency + contact method + description + trust bar + submit (Stripe: near-button trust)
 *
 * UX patterns applied:
 *  - Amount-first: user anchors value before choosing service type
 *  - Stripe inline errors: left-border + plain text, no icon, fires on blur
 *  - Linear progressive disclosure: grid-template-rows transition on conditional sections
 *  - Mercury labels: uppercase + letter-spacing, no icons
 *  - Stripe submit 4-state: idle / loading / error-shake / success
 *  - Trust bar: always visible on Step 3, immediately above submit
 *  - Auto-expanding textarea
 */

import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import {
  type ServiceRequestClientInput,
  createServiceRequest,
} from '@/actions/serviceRequestActions';
import { type CurrencyGroup, CurrencySelect } from '@/components/ui/CurrencySelect';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ServiceRequestFormData, ServiceRequestSchema } from '@/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  GraduationCap,
  KeyRound,
  Mail,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import s from './ServiceRequestForm.module.css';

// ─── Constants ────────────────────────────────────────────────────────────── //

type ServiceType = ServiceRequestFormData['serviceType'];

interface ServiceOption {
  value: ServiceType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
}

interface CurrencyOption {
  value: string;
  label: string;
  type: 'fiat' | 'crypto';
}

const SERVICE_TYPES: ServiceOption[] = [
  {
    value: 'ONLINE_PAYMENT',
    label: 'پرداخت آنلاین',
    icon: CreditCard,
    color: 'oklch(55% 0.17 290)',
  },
  { value: 'GIFT_CARD', label: 'گیفت کارت', icon: Gift, color: 'oklch(58% 0.18 340)' },
  {
    value: 'TUITION_PAYMENT',
    label: 'پرداخت شهریه',
    icon: GraduationCap,
    color: 'oklch(55% 0.17 155)',
  },
  { value: 'FREELANCE_INCOME', label: 'نقد کردن درآمد', icon: Wallet, color: 'oklch(60% 0.15 70)' },
  {
    value: 'SOFTWARE_PURCHASE',
    label: 'خرید نرم‌افزار',
    icon: ShoppingBag,
    color: 'oklch(58% 0.18 15)',
  },
  {
    value: 'MOBILE_TOPUP',
    label: 'شارژ موبایل',
    icon: Smartphone,
    color: 'oklch(55% 0.18 195)',
  },
  {
    value: 'BILL_PAYMENT',
    label: 'پرداخت قبض',
    icon: Receipt,
    color: 'oklch(60% 0.18 75)',
  },
  { value: 'OTHER', label: 'سایر خدمات', icon: Sparkles, color: 'var(--ds-brand-600)' },
];

const CURRENCIES: CurrencyOption[] = [
  // ── ارزهای منطقه‌ای (اولویت برای کاربران افغان) ──────────────────────────
  { value: 'AFN', label: 'افغانی', type: 'fiat' },
  { value: 'USD', label: 'دلار آمریکا', type: 'fiat' },
  { value: 'AED', label: 'درهم امارات', type: 'fiat' },
  { value: 'PKR', label: 'روپیه پاکستان', type: 'fiat' },
  { value: 'IRR', label: 'ریال ایران', type: 'fiat' },
  { value: 'TRY', label: 'لیر ترکیه', type: 'fiat' },
  // ── ارزهای بین‌المللی ────────────────────────────────────────────────────
  { value: 'EUR', label: 'یورو', type: 'fiat' },
  { value: 'GBP', label: 'پوند انگلیس', type: 'fiat' },
  { value: 'CAD', label: 'دلار کانادا', type: 'fiat' },
  { value: 'AUD', label: 'دلار استرالیا', type: 'fiat' },
  { value: 'CHF', label: 'فرانک سوئیس', type: 'fiat' },
  // ── رمزارز ────────────────────────────────────────────────────────────────
  { value: 'USDT', label: 'تتر', type: 'crypto' },
  { value: 'BTC', label: 'بیت‌کوین', type: 'crypto' },
  { value: 'ETH', label: 'اتریوم', type: 'crypto' },
  { value: 'TRX', label: 'ترون', type: 'crypto' },
  { value: 'OTHER', label: 'سایر ارزها', type: 'fiat' },
];

// Countries ordered by relevance for Afghan users:
// 1. Afghanistan itself (self-transfers / internal reference)
// 2. Immediate neighbors (Iran, Pakistan, Tajikistan, Uzbekistan, Turkmenistan, China)
// 3. Major Afghan diaspora destinations (UAE, Turkey, Germany, USA, Canada, Australia, UK)
// 4. Other global destinations
const COUNTRIES = [
  // ── افغانستان ──────────────────────────────────────────────
  { value: 'afghanistan', label: 'افغانستان' },
  // ── همسایگان ──────────────────────────────────────────────
  { value: 'iran', label: 'ایران' },
  { value: 'pakistan', label: 'پاکستان' },
  { value: 'tajikistan', label: 'تاجیکستان' },
  { value: 'uzbekistan', label: 'ازبکستان' },
  { value: 'turkmenistan', label: 'ترکمنستان' },
  { value: 'china', label: 'چین' },
  // ── مقصدهای اصلی مهاجران افغان ───────────────────────────
  { value: 'uae', label: 'امارات' },
  { value: 'turkey', label: 'ترکیه' },
  { value: 'germany', label: 'آلمان' },
  { value: 'usa', label: 'آمریکا' },
  { value: 'canada', label: 'کانادا' },
  { value: 'australia', label: 'استرالیا' },
  { value: 'uk', label: 'انگلستان' },
  { value: 'sweden', label: 'سوئد' },
  { value: 'norway', label: 'نروژ' },
  { value: 'netherlands', label: 'هلند' },
  { value: 'denmark', label: 'دنمارک' },
  { value: 'france', label: 'فرانسه' },
  // ── سایر ─────────────────────────────────────────────────
  { value: 'malaysia', label: 'مالزی' },
  { value: 'qatar', label: 'قطر' },
  { value: 'kuwait', label: 'کویت' },
  { value: 'saudi_arabia', label: 'عربستان سعودی' },
  { value: 'switzerland', label: 'سوئیس' },
  { value: 'other', label: 'سایر کشورها' },
];

const STEP_LABELS = ['مبلغ و خدمات', 'اطلاعات شما', 'تأیید و ارسال', 'تأیید ایمیل'];
const TOTAL_STEPS = 4;

// ─── Props ────────────────────────────────────────────────────────────────── //

interface ServiceRequestFormProps {
  defaultServiceType?: ServiceType;
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// ─── Main Component ───────────────────────────────────────────────────────── //

const ServiceRequestForm: FC<ServiceRequestFormProps> = ({
  defaultServiceType = 'ONLINE_PAYMENT',
  telegramLink,
  whatsappLink,
}) => {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    trackingCode?: string;
  }>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const [submitShake, setSubmitShake] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── OTP / Progressive Capture state ────────────────────────────────────── //
  const [trackingCodeForOtp, setTrackingCodeForOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [otpResult, setOtpResult] = useState<{
    accountCreated?: boolean;
    loginHint?: string;
  } | null>(null);
  // idempotency key — generated once per form session, prevents double-submit on retry
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(ServiceRequestSchema),
    mode: 'onChange', // validation زنده — خطا همان لحظه که تایپ می‌شود دیده شود
    defaultValues: {
      serviceType: defaultServiceType,
      currency: 'USD',
      urgency: 'NORMAL',
      contactMethod: 'telegram',
      fullName: '',
      phone: '',
      email: '',
      amount: '',
      description: '',
      destinationCountry: '',
      bankName: '',
      websiteUrl: '',
      productName: '',
      universityName: '',
      studentId: '',
      platformName: '',
      platformUsername: '',
      softwareName: '',
      subscriptionType: '',
      giftCardBrand: '',
      giftCardRegion: '',
      mobileOperator: '',
      mobileNumber: '',
      billType: '',
      billAccountNumber: '',
    },
  });

  const serviceType = watch('serviceType');
  const selectedCurrency = watch('currency');
  const amount = watch('amount');
  const fullName = watch('fullName');
  const phone = watch('phone');
  const contactMethod = watch('contactMethod');

  // URL params prefill — preserves ?currency=USD&type=...&amount=... links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const t = p.get('type');
    const c = p.get('currency');
    const a = p.get('amount');
    if (t) setValue('serviceType', t as ServiceType, { shouldValidate: false });
    if (c) {
      const match = CURRENCIES.find((cur) => cur.value === c.toUpperCase());
      if (match) setValue('currency', match.value, { shouldValidate: false });
    }
    if (a) setValue('amount', a, { shouldValidate: false });
    if (window.location.hash === '#contact') {
      setTimeout(() => {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    }
  }, [setValue]);

  const selectedService = useMemo(
    () => SERVICE_TYPES.find((s) => s.value === serviceType),
    [serviceType],
  );
  const selectedCurrencyInfo = useMemo(
    () => CURRENCIES.find((c) => c.value === selectedCurrency),
    [selectedCurrency],
  );

  const copyCode = useCallback(async () => {
    if (!result.trackingCode) return;
    await navigator.clipboard.writeText(result.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.trackingCode]);

  // Auto-expand textarea — Intercom pattern
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  // ── OTP resend countdown ────────────────────────────────────────────────── //
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  const sendOtp = useCallback(async (email: string, trackingCode: string) => {
    setOtpSending(true);
    setOtpError('');
    const res = await issueServiceOtp({ email, trackingCode });
    setOtpSending(false);
    if (res.success) {
      setOtpResendTimer(60);
    } else {
      setOtpError(res.error.message);
    }
  }, []);

  const goNext = async () => {
    const fields: (keyof ServiceRequestFormData)[] =
      step === 1 ? ['amount', 'currency', 'serviceType'] : step === 2 ? ['fullName', 'phone'] : [];
    const valid = await trigger(fields);
    if (valid) {
      setDir('fwd');
      setStep((p) => p + 1);
    }
  };

  const goBack = () => {
    setDir('back');
    setStep((p) => p - 1);
  };

  // Step 3 → submit form, get tracking code, then move to OTP step
  const onSubmit = async (data: ServiceRequestFormData) => {
    if (step !== 3) return;
    setSubmitting(true);
    setResult({ status: 'idle' });
    try {
      const payload: ServiceRequestClientInput = {
        ...(data as ServiceRequestClientInput),
        idempotencyKey: idempotencyKeyRef.current,
      };
      const res = await createServiceRequest(payload);
      if (!res.success) {
        setResult({ status: 'error', message: res.error.message });
        setSubmitShake(true);
        setTimeout(() => setSubmitShake(false), 400);
        return;
      }
      // Go to OTP step if email was provided
      const email = data.email?.trim();
      if (email && res.data.trackingCode) {
        setTrackingCodeForOtp(res.data.trackingCode);
        idempotencyKeyRef.current = crypto.randomUUID(); // reset for safety
        setDir('fwd');
        setStep(4);
        await sendOtp(email, res.data.trackingCode);
      } else {
        // No email → show success directly
        setResult({
          status: 'success',
          message: 'درخواست شما با موفقیت ثبت شد.',
          trackingCode: res.data.trackingCode,
        });
        reset();
        setStep(1);
      }
    } catch {
      setResult({ status: 'error', message: 'خطایی در ثبت درخواست رخ داد.' });
      setSubmitShake(true);
      setTimeout(() => setSubmitShake(false), 400);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    const email = watch('email')?.trim();
    if (!email || !trackingCodeForOtp || !otpCode.trim()) return;
    setOtpVerifying(true);
    setOtpError('');
    const res = await verifyServiceOtpAndLink({
      email,
      code: otpCode.trim(),
      trackingCode: trackingCodeForOtp,
    });
    setOtpVerifying(false);
    if (res.success) {
      setOtpResult({ accountCreated: res.data.accountCreated, loginHint: res.data.loginHint });
      setResult({
        status: 'success',
        message: 'درخواست شما با موفقیت ثبت شد.',
        trackingCode: trackingCodeForOtp,
      });
      reset();
      setStep(1);
    } else {
      setOtpError(res.error.message);
    }
  };

  const skipOtp = () => {
    // User skips verification — show success with tracking code anyway
    setResult({ status: 'success', message: 'درخواست ثبت شد.', trackingCode: trackingCodeForOtp });
    reset();
    setStep(1);
  };

  const resetForm = () => {
    setResult({ status: 'idle' });
    setOtpResult(null);
    setOtpCode('');
    setOtpError('');
    setOtpResendTimer(0);
    setTrackingCodeForOtp('');
    idempotencyKeyRef.current = crypto.randomUUID();
    setStep(1);
    reset();
  };

  // ─── Success ─────────────────────────────────────────────────────────── //
  if (result.status === 'success' && result.trackingCode) {
    return (
      <div className={s.successWrap}>
        <div className={s.successIcon} aria-hidden="true">
          <CheckCircle2 size={28} />
        </div>
        <h3 className={s.successTitle}>درخواست شما ثبت شد!</h3>

        {/* Progressive Capture badge */}
        {otpResult?.accountCreated && (
          <div className={s.pcBadge}>
            <UserPlus size={14} />
            <span>
              حساب کاربری برای شما ساخته شد. می‌توانید از طریق «فراموشی رمز» رمز تنظیم کنید.
            </span>
          </div>
        )}

        <p className={s.successSub}>کد پیگیری:</p>
        <div className={s.trackingCodeBox}>
          <span className={s.trackingCode} dir="ltr">
            {result.trackingCode}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className={s.copyBtn}
            aria-label={copied ? 'کپی شد' : 'کپی کد پیگیری'}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
        <p className={s.successNote}>این کد را برای پیگیری درخواست نگه دارید</p>
        <div className={s.successActions}>
          <button type="button" onClick={resetForm} className={s.btnReset}>
            ثبت درخواست جدید
          </button>
          <a
            href={result.trackingCode ? `/track/${result.trackingCode}` : '/dashboard/my-requests'}
            className={s.btnDashboard}
          >
            مشاهده وضعیت
          </a>
        </div>
        {(telegramLink || whatsappLink) && (
          <div className={s.supportLinks}>
            <span className={s.supportLabel}>برای پیگیری سریع‌تر با پشتیبانی تماس بگیرید:</span>
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.supportBtn} ${s.btnTelegram}`}
              >
                <FaTelegram size={15} /> تلگرام
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.supportBtn} ${s.btnWhatsapp}`}
              >
                <FaWhatsapp size={15} /> واتساپ
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────── //
  return (
    <div className={s.form}>
      {/* Progress */}
      <StepProgress step={step} />

      {/* Step panels — keyed for slide animation */}
      <div key={step} className={dir === 'fwd' ? s.panel : s.panelBack}>
        {/* ── STEP 1: Amount + currency + service type ──────────────────── */}
        {step === 1 && (
          <div>
            {/* Amount widget — Wise: amount-first */}
            <div className={s.amountWidget}>
              <div className={s.amountRow}>
                <div className={s.amountFieldWrap}>
                  <span className={s.amountLabel}>مبلغ</span>
                  <input
                    id="amount"
                    type="text"
                    {...register('amount')}
                    className={`${s.amountInput} ${errors.amount ? s.amountInputError : ''}`}
                    placeholder="مثلاً: ۵۰۰"
                    dir="ltr"
                    inputMode="decimal"
                    aria-label="مبلغ"
                  />
                </div>
                <CurrencySelect
                  value={selectedCurrency}
                  groups={CURRENCY_SELECT_GROUPS}
                  onChange={(v) => setValue('currency', v, { shouldValidate: false })}
                  ariaLabel="ارز انتخابی"
                  size="default"
                />
              </div>

              {/* Wise-style rate strip */}
              {amount && selectedCurrencyInfo && (
                <div className={s.rateStrip}>
                  <ShieldCheck size={14} className={s.rateStripIcon} />
                  <div>
                    <div className={s.rateStripText}>
                      پرداخت{' '}
                      <strong dir="ltr">
                        {amount} {selectedCurrencyInfo.value}
                      </strong>{' '}
                      — نرخ دقیق توسط کارشناس تأیید می‌شود
                    </div>
                    <div className={s.rateStripNote}>پاسخگویی در کمتر از ۳۰ دقیقه</div>
                  </div>
                </div>
              )}

              {errors.amount && (
                <p className={s.fieldError} role="alert">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Service type */}
            <Divider label="نوع خدمات" />
            <RadioGroup
              value={serviceType}
              onValueChange={(v) =>
                setValue('serviceType', v as ServiceType, { shouldValidate: true })
              }
              className={s.serviceGrid}
              aria-label="نوع خدمات"
            >
              {SERVICE_TYPES.map((svc) => {
                const Icon = svc.icon;
                const sel = serviceType === svc.value;
                return (
                  <label
                    key={svc.value}
                    htmlFor={`svc-${svc.value}`}
                    className={`${s.serviceBtn} ${sel ? s.serviceBtnSelected : ''}`}
                  >
                    <RadioGroupItem
                      value={svc.value}
                      id={`svc-${svc.value}`}
                      className={s.srOnly}
                    />
                    {sel && (
                      <span className={s.serviceCheckmark} aria-hidden="true">
                        <Check size={9} />
                      </span>
                    )}
                    <div className={s.serviceIcon} style={{ color: svc.color }}>
                      <Icon size={17} />
                    </div>
                    <span className={s.serviceName}>{svc.label}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {/* ── STEP 2: Personal info + conditional service fields ─────────── */}
        {step === 2 && (
          <div>
            <Divider label="اطلاعات شخصی" />

            <div className={s.fieldRow}>
              <Field
                id="fullName"
                label="نام و نام خانوادگی"
                required
                error={errors.fullName?.message}
              >
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName')}
                  className={`${s.input} ${errors.fullName ? s.inputError : ''}`}
                  placeholder="نام کامل"
                  autoComplete="name"
                />
              </Field>

              <Field
                id="phone"
                label="شماره تماس"
                required
                error={errors.phone?.message}
                hint="با ۰ یا ۹۸ شروع کنید"
              >
                <input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className={`${s.input} ${errors.phone ? s.inputError : ''}`}
                  placeholder="09123456789"
                  dir="ltr"
                  autoComplete="tel"
                />
              </Field>
            </div>

            <Field id="email" label="ایمیل" hint="اختیاری — برای دریافت تأییدیه">
              <input
                id="email"
                type="email"
                {...register('email')}
                className={s.input}
                placeholder="example@email.com"
                dir="ltr"
                autoComplete="email"
              />
            </Field>

            {/* Linear progressive disclosure — grid-template-rows transition */}
            <ConditionalSection open={serviceType === 'INTERNATIONAL_TRANSFER'}>
              <Divider label="اطلاعات حواله (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="destinationCountry" label="کشور مقصد">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="destinationCountry"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="destinationCountry" className={s.select}>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
                <Field id="bankName" label="نام بانک مقصد">
                  <input
                    id="bankName"
                    type="text"
                    {...register('bankName')}
                    className={s.input}
                    placeholder="نام بانک گیرنده"
                  />
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'ONLINE_PAYMENT'}>
              <Divider label="اطلاعات خرید (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="websiteUrl" label="آدرس سایت">
                  <input
                    id="websiteUrl"
                    type="text"
                    {...register('websiteUrl')}
                    className={s.input}
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </Field>
                <Field id="productName" label="نام محصول">
                  <input
                    id="productName"
                    type="text"
                    {...register('productName')}
                    className={s.input}
                    placeholder="نام محصول یا خدمات"
                  />
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'TUITION_PAYMENT'}>
              <Divider label="اطلاعات تحصیلی (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="tuitionCountry" label="کشور مقصد">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="destinationCountry"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="tuitionCountry" className={s.select}>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
                <Field id="universityName" label="نام دانشگاه">
                  <input
                    id="universityName"
                    type="text"
                    {...register('universityName')}
                    className={s.input}
                    placeholder="نام دانشگاه"
                  />
                </Field>
              </div>
              <Field id="studentId" label="شماره دانشجویی" hint="اختیاری">
                <input
                  id="studentId"
                  type="text"
                  {...register('studentId')}
                  className={s.input}
                  placeholder="شماره دانشجویی"
                  dir="ltr"
                />
              </Field>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'FREELANCE_INCOME'}>
              <Divider label="اطلاعات پلتفرم (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="platformName" label="نام پلتفرم">
                  <input
                    id="platformName"
                    type="text"
                    {...register('platformName')}
                    className={s.input}
                    placeholder="Upwork، Fiverr، ..."
                  />
                </Field>
                <Field id="platformUsername" label="نام کاربری">
                  <input
                    id="platformUsername"
                    type="text"
                    {...register('platformUsername')}
                    className={s.input}
                    placeholder="username"
                    dir="ltr"
                  />
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'SOFTWARE_PURCHASE'}>
              <Divider label="اطلاعات نرم‌افزار (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="softwareName" label="نام نرم‌افزار">
                  <input
                    id="softwareName"
                    type="text"
                    {...register('softwareName')}
                    className={s.input}
                    placeholder="Adobe، Microsoft 365، ..."
                  />
                </Field>
                <Field id="subscriptionType" label="نوع اشتراک">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="subscriptionType"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="subscriptionType" className={s.select}>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">ماهانه</SelectItem>
                            <SelectItem value="yearly">سالانه</SelectItem>
                            <SelectItem value="lifetime">مادام‌العمر</SelectItem>
                            <SelectItem value="one-time">یکبار خرید</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'GIFT_CARD'}>
              <Divider label="اطلاعات گیفت کارت (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="giftCardBrand" label="برند گیفت کارت">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="giftCardBrand"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="giftCardBrand" className={s.select}>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amazon">Amazon</SelectItem>
                            <SelectItem value="google_play">Google Play</SelectItem>
                            <SelectItem value="apple">Apple / iTunes</SelectItem>
                            <SelectItem value="steam">Steam</SelectItem>
                            <SelectItem value="netflix">Netflix</SelectItem>
                            <SelectItem value="spotify">Spotify</SelectItem>
                            <SelectItem value="xbox">Xbox / Microsoft</SelectItem>
                            <SelectItem value="playstation">PlayStation</SelectItem>
                            <SelectItem value="visa">Visa Prepaid</SelectItem>
                            <SelectItem value="other">سایر</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
                <Field id="giftCardRegion" label="ریجن / منطقه">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="giftCardRegion"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="giftCardRegion" className={s.select}>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">آمریکا (US)</SelectItem>
                            <SelectItem value="eu">اروپا (EU)</SelectItem>
                            <SelectItem value="uk">انگلستان (UK)</SelectItem>
                            <SelectItem value="global">جهانی (Global)</SelectItem>
                            <SelectItem value="other">سایر</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'MOBILE_TOPUP'}>
              <Divider label="اطلاعات شارژ موبایل (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="mobileOperator" label="اپراتور">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="mobileOperator"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="mobileOperator" className={s.select}>
                            <SelectValue placeholder="انتخاب اپراتور" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mtn">MTN افغانستان</SelectItem>
                            <SelectItem value="roshan">روشن</SelectItem>
                            <SelectItem value="etisalat">اتصالات</SelectItem>
                            <SelectItem value="salam">سلام</SelectItem>
                            <SelectItem value="other">سایر</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
                <Field id="mobileNumber" label="شماره موبایل">
                  <input
                    id="mobileNumber"
                    type="tel"
                    {...register('mobileNumber')}
                    className={s.input}
                    placeholder="۰۷۰۱۲۳۴۵۶۷"
                    dir="ltr"
                  />
                </Field>
              </div>
            </ConditionalSection>

            <ConditionalSection open={serviceType === 'BILL_PAYMENT'}>
              <Divider label="اطلاعات قبض (اختیاری)" />
              <div className={s.fieldRow}>
                <Field id="billType" label="نوع قبض">
                  <div className={`${s.selectWrap} ${s.selectWrapRadix}`}>
                    <Controller
                      control={control}
                      name="billType"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger id="billType" className={s.select}>
                            <SelectValue placeholder="انتخاب نوع قبض" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dabs">برق DABS</SelectItem>
                            <SelectItem value="water">آب</SelectItem>
                            <SelectItem value="telecom">مخابرات</SelectItem>
                            <SelectItem value="internet">اینترنت</SelectItem>
                            <SelectItem value="other">سایر</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </Field>
                <Field id="billAccountNumber" label="شماره حساب / مشترک">
                  <input
                    id="billAccountNumber"
                    type="text"
                    {...register('billAccountNumber')}
                    className={s.input}
                    placeholder="شماره حساب مشترک"
                    dir="ltr"
                  />
                </Field>
              </div>
            </ConditionalSection>
          </div>
        )}

        {/* ── STEP 3: Confirm + contact + submit ────────────────────────── */}
        {step === 3 && (
          <div>
            {/* Summary */}
            <div className={s.summaryCard}>
              {selectedService &&
                (() => {
                  const Icon = selectedService.icon;
                  return (
                    <div className={s.summaryHeader}>
                      <div
                        className={s.summaryServiceIcon}
                        style={{ color: selectedService.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className={s.summaryServiceTitle}>{selectedService.label}</p>
                        <p className={s.summaryServiceDesc}>
                          {amount} {selectedCurrencyInfo?.value ?? ''} — {fullName || '—'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              <div className={s.summaryGrid}>
                <div className={s.summaryCell}>
                  <div className={s.summaryCellLabel}>مبلغ</div>
                  <div className={s.summaryCellValue} dir="ltr">
                    {amount || '—'} {selectedCurrencyInfo?.value ?? ''}
                  </div>
                </div>
                <div className={s.summaryCell}>
                  <div className={s.summaryCellLabel}>شماره تماس</div>
                  <div className={s.summaryCellValue} dir="ltr">
                    {phone || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact method */}
            <Divider label="روش تماس ترجیحی" />
            <RadioGroup
              value={contactMethod}
              onValueChange={(v) =>
                setValue('contactMethod', v as ServiceRequestFormData['contactMethod'], {
                  shouldValidate: true,
                })
              }
              className={s.contactRow}
            >
              <label className={s.contactLabel} htmlFor="contact-telegram">
                <RadioGroupItem value="telegram" id="contact-telegram" className={s.contactRadio} />
                <div className={s.contactCard}>
                  <div className={s.contactIconWrap} style={{ color: 'oklch(61% 0.17 218)' }}>
                    <FaTelegram size={16} />
                  </div>
                  <div className={s.contactCardTitle}>تلگرام</div>
                </div>
              </label>
              <label className={s.contactLabel} htmlFor="contact-whatsapp">
                <RadioGroupItem value="whatsapp" id="contact-whatsapp" className={s.contactRadio} />
                <div className={s.contactCard}>
                  <div className={s.contactIconWrap} style={{ color: 'oklch(71% 0.18 155)' }}>
                    <FaWhatsapp size={16} />
                  </div>
                  <div className={s.contactCardTitle}>واتساپ</div>
                </div>
              </label>
            </RadioGroup>

            {/* Description — Intercom: auto-expand */}
            <Divider label="توضیحات (اختیاری)" />
            <div className={s.fieldGroup}>
              <textarea
                id="description"
                name={register('description').name}
                onChange={register('description').onChange}
                onBlur={register('description').onBlur}
                ref={(el) => {
                  register('description').ref(el);
                  textareaRef.current = el;
                }}
                rows={2}
                className={s.textarea}
                placeholder="اگر توضیحات خاصی دارید اینجا بنویسید… (اختیاری)"
                onInput={autoResize}
              />
              {errors.description && (
                <p className={s.fieldError} role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: OTP email verification ────────────────────────────── */}
        {step === 4 && (
          <div className={s.otpPanel}>
            <div className={s.otpIcon} aria-hidden="true">
              <Mail size={28} />
            </div>
            <h3 className={s.otpTitle}>تأیید ایمیل</h3>
            <p className={s.otpDesc}>
              کد ۶ رقمی به <strong dir="ltr">{watch('email')}</strong> ارسال شد. لطفاً کد را وارد
              کنید.
            </p>
            {otpSending && <p className={s.otpHint}>در حال ارسال کد…</p>}
            {otpError && (
              <div className={s.errorAlert} role="alert">
                <AlertCircle size={14} />
                <span>{otpError}</span>
              </div>
            )}
            <div className={s.otpInputWrap}>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className={s.otpInput}
                placeholder="_ _ _ _ _ _"
                dir="ltr"
                aria-label="کد تأیید ۶ رقمی"
                autoComplete="one-time-code"
              />
            </div>
            <div className={s.otpActions}>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpVerifying || otpCode.length !== 6}
                className={s.btnSubmit}
              >
                {otpVerifying ? (
                  <>
                    <span className={s.spinner} aria-hidden="true" />
                    <span>در حال تأیید…</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>تأیید کد</span>
                  </>
                )}
              </button>
            </div>
            <div className={s.otpFooter}>
              {otpResendTimer > 0 ? (
                <span className={s.otpTimer}>ارسال مجدد در {otpResendTimer} ثانیه</span>
              ) : (
                <button
                  type="button"
                  onClick={() => sendOtp(watch('email') ?? '', trackingCodeForOtp)}
                  disabled={otpSending}
                  className={s.btnResend}
                >
                  <RotateCcw size={13} />
                  <span>ارسال مجدد کد</span>
                </button>
              )}
              <button type="button" onClick={skipOtp} className={s.btnSkip}>
                رد کردن تأیید
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {result.status === 'error' && step !== 4 && (
        <div className={s.errorAlert} role="alert">
          <AlertCircle size={14} />
          <span>{result.message}</span>
        </div>
      )}

      {/* Trust bar — Stripe: always above submit on step 3 */}
      {step === 3 && (
        <div className={s.trustBar}>
          <ShieldCheck size={13} className={s.trustBarIcon} />
          <span>🔒 اطلاعات شما محرمانه است · پاسخ در کمتر از ۳۰ دقیقه · ۹۸٪ رضایت مشتری</span>
        </div>
      )}

      {/* Navigation — hidden on step 4 (OTP has its own buttons) */}
      {step !== 4 && (
        <div className={s.navRow}>
          {step > 1 ? (
            <button type="button" onClick={goBack} className={s.btnBack}>
              <ArrowRight size={15} />
              <span>قبلی</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button type="button" onClick={goNext} className={s.btnNext}>
              <span>بعدی</span>
              <ArrowLeft size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit(onSubmit)}
              className={`${s.btnSubmit} ${submitShake ? s.btnSubmitError : ''}`}
            >
              {submitting ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>ثبت درخواست</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestForm;

// ─── Helpers ──────────────────────────────────────────────────────────────── //

function StepProgress({ step }: { step: number }) {
  // RTL: fill runs right→left, so for step 2/3 we compute from inline-end
  // Track spans from circle-center to circle-center = (step-1)/(total-1) * 100%
  const fillPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <ol className={s.progress} aria-label="مراحل فرم">
      {/* Animated filled track */}
      <div
        className={s.progressTrackFill}
        style={{ inlineSize: `${fillPct}%` }}
        aria-hidden="true"
      />

      {STEP_LABELS.map((label, idx) => {
        const num = idx + 1;
        const done = step > num;
        const active = step === num;
        return (
          <li key={label} className={s.progressStep}>
            <div
              className={`${s.progressDot} ${active ? s.progressDotActive : ''} ${done ? s.progressDotDone : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check size={14} /> : num}
            </div>
            <span
              className={`${s.progressLabel} ${active ? s.progressLabelActive : ''} ${done ? s.progressLabelDone : ''}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className={s.sectionDivider} aria-hidden="true">
      <div className={s.sectionDividerLine} />
      <span className={s.sectionDividerLabel}>{label}</span>
      <div className={s.sectionDividerLine} />
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className={s.fieldGroup}>
      <label className={s.label} htmlFor={id}>
        {label}
        {required && (
          <span className={s.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <span className={s.fieldHint}>{hint}</span>}
      {error && (
        <p className={s.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ConditionalSection({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${s.revealWrap} ${open ? s.revealWrapOpen : ''}`}>
      <div className={s.revealInner}>{children}</div>
    </div>
  );
}

// ─── Currency groups for CurrencySelect ───────────────────────────────────── //
const CURRENCY_SELECT_GROUPS: CurrencyGroup[] = [
  {
    label: 'ارزهای منطقه‌ای',
    items: CURRENCIES.filter((c) =>
      ['AFN', 'USD', 'AED', 'PKR', 'IRR', 'TRY'].includes(c.value),
    ).map((c) => ({ value: c.value, code: c.value, label: c.label })),
  },
  {
    label: 'ارزهای بین‌المللی',
    items: CURRENCIES.filter(
      (c) =>
        c.type === 'fiat' && !['AFN', 'USD', 'AED', 'PKR', 'IRR', 'TRY', 'OTHER'].includes(c.value),
    ).map((c) => ({ value: c.value, code: c.value, label: c.label })),
  },
  {
    label: 'رمزارز',
    items: CURRENCIES.filter((c) => c.type === 'crypto').map((c) => ({
      value: c.value,
      code: c.value,
      label: c.label,
    })),
  },
  {
    label: 'سایر',
    items: CURRENCIES.filter((c) => c.value === 'OTHER').map((c) => ({
      value: c.value,
      code: c.value,
      label: c.label,
    })),
  },
];
