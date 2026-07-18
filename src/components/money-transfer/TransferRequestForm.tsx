'use client';

/**
 * TransferRequestForm — 2026 Fintech Grade
 * ─────────────────────────────────────────
 * Architecture: Service-first, 3-step + OTP
 *
 * Step 0: انتخاب نوع سرویس (grid کارت‌ها)
 * Step 1: جزئیات سرویس (مبلغ + فیلدهای شرطی)
 * Step 2: اطلاعات تماس + فوریت + روش پیگیری
 * Step 3: OTP → Progressive Capture
 */

import { type FC, useState, useRef, useCallback, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Zap,
  AlertCircle,
  Mail,
  KeyRound,
  RotateCcw,
  UserPlus,
  Send,
  Globe,
  ChevronDown,
  Lock,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Bitcoin,
  DollarSign,
} from 'lucide-react';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { z } from 'zod';
import { isPhoneValid } from '@/lib/phone-validation';
import { createServiceRequest } from '@/actions/serviceRequestActions';
import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import s from './TransferRequestForm.module.css';

// ─── Service Types ────────────────────────────────────────────────────────── //

type ServiceTypeKey =
  | 'INTERNATIONAL_TRANSFER'
  | 'CURRENCY_BUY'
  | 'CURRENCY_SELL'
  | 'CRYPTO_BUY'
  | 'CRYPTO_SELL'
  | 'PAYPAL_TRANSFER'
  | 'ONLINE_PAYMENT'
  | 'TUITION_PAYMENT'
  | 'FREELANCE_INCOME'
  | 'SOFTWARE_PURCHASE'
  | 'GIFT_CARD'
  | 'OTHER';

interface ServiceOption {
  key: ServiceTypeKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  group: 'transfer' | 'currency' | 'crypto' | 'digital';
}

const SERVICE_OPTIONS: ServiceOption[] = [
  // گروه: حواله
  {
    key: 'INTERNATIONAL_TRANSFER',
    label: 'حواله بین‌المللی',
    sublabel: 'انتقال پول به خارج از کشور',
    icon: Globe,
    group: 'transfer',
  },
  // گروه: ارز
  {
    key: 'CURRENCY_BUY',
    label: 'خرید ارز',
    sublabel: 'دلار، یورو، درهم و سایر ارزها',
    icon: TrendingUp,
    group: 'currency',
  },
  {
    key: 'CURRENCY_SELL',
    label: 'فروش ارز',
    sublabel: 'تبدیل ارز خارجی به افغانی/ریال',
    icon: TrendingDown,
    group: 'currency',
  },
  // گروه: کریپتو
  {
    key: 'CRYPTO_BUY',
    label: 'خرید ارز دیجیتال',
    sublabel: 'بیت‌کوین، اتریوم، تتر و...',
    icon: Bitcoin,
    group: 'crypto',
  },
  {
    key: 'CRYPTO_SELL',
    label: 'فروش ارز دیجیتال',
    sublabel: 'تبدیل کریپتو به پول نقد',
    icon: Wallet,
    group: 'crypto',
  },
  // گروه: پرداخت دیجیتال
  {
    key: 'PAYPAL_TRANSFER',
    label: 'پی‌پال / اسکریل',
    sublabel: 'انتقال از/به پی‌پال، اسکریل، وایز',
    icon: CreditCard,
    group: 'digital',
  },
  {
    key: 'ONLINE_PAYMENT',
    label: 'پرداخت آنلاین',
    sublabel: 'پرداخت فاکتور / سایت خارجی',
    icon: DollarSign,
    group: 'digital',
  },
  {
    key: 'OTHER',
    label: 'سایر خدمات',
    sublabel: 'شهریه، فریلنسر، نرم‌افزار، گیفت‌کارت',
    icon: ArrowLeftRight,
    group: 'digital',
  },
];

const GROUP_LABELS: Record<ServiceOption['group'], string> = {
  transfer: 'حواله',
  currency: 'ارز فیزیکی',
  crypto: 'ارز دیجیتال',
  digital: 'پرداخت دیجیتال',
};

// ─── Data ─────────────────────────────────────────────────────────────────── //

const DESTINATION_COUNTRIES = [
  { value: 'afghanistan',  label: 'افغانستان',    flag: '🇦🇫' },
  { value: 'iran',         label: 'ایران',         flag: '🇮🇷' },
  { value: 'pakistan',     label: 'پاکستان',       flag: '🇵🇰' },
  { value: 'uae',          label: 'امارات',        flag: '🇦🇪' },
  { value: 'turkey',       label: 'ترکیه',         flag: '🇹🇷' },
  { value: 'germany',      label: 'آلمان',         flag: '🇩🇪' },
  { value: 'usa',          label: 'آمریکا',        flag: '🇺🇸' },
  { value: 'uk',           label: 'انگلستان',      flag: '🇬🇧' },
  { value: 'canada',       label: 'کانادا',        flag: '🇨🇦' },
  { value: 'australia',    label: 'استرالیا',      flag: '🇦🇺' },
  { value: 'sweden',       label: 'سوئد',          flag: '🇸🇪' },
  { value: 'norway',       label: 'نروژ',          flag: '🇳🇴' },
  { value: 'netherlands',  label: 'هلند',          flag: '🇳🇱' },
  { value: 'tajikistan',   label: 'تاجیکستان',     flag: '🇹🇯' },
  { value: 'malaysia',     label: 'مالزی',         flag: '🇲🇾' },
  { value: 'qatar',        label: 'قطر',           flag: '🇶🇦' },
  { value: 'saudi_arabia', label: 'عربستان',       flag: '🇸🇦' },
  { value: 'other',        label: 'سایر کشورها',   flag: '🌍' },
];

const FIAT_CURRENCIES = [
  { value: 'USD',   label: 'USD',  name: 'دلار آمریکا',   symbol: '$' },
  { value: 'AED',   label: 'AED',  name: 'درهم امارات',   symbol: 'د.إ' },
  { value: 'EUR',   label: 'EUR',  name: 'یورو',           symbol: '€' },
  { value: 'GBP',   label: 'GBP',  name: 'پوند',           symbol: '£' },
  { value: 'CAD',   label: 'CAD',  name: 'دلار کانادا',   symbol: 'C$' },
  { value: 'AUD',   label: 'AUD',  name: 'دلار استرالیا', symbol: 'A$' },
  { value: 'TRY',   label: 'TRY',  name: 'لیر ترکیه',     symbol: '₺' },
  { value: 'AFN',   label: 'AFN',  name: 'افغانی',         symbol: '؋' },
  { value: 'IRR',   label: 'IRR',  name: 'ریال ایران',    symbol: '﷼' },
  { value: 'OTHER', label: 'دیگر', name: 'سایر ارز',      symbol: '¤' },
];

const CRYPTO_CURRENCIES = [
  { value: 'USDT',  label: 'USDT',  name: 'تتر',            symbol: '₮' },
  { value: 'BTC',   label: 'BTC',   name: 'بیت‌کوین',       symbol: '₿' },
  { value: 'ETH',   label: 'ETH',   name: 'اتریوم',         symbol: 'Ξ' },
  { value: 'BNB',   label: 'BNB',   name: 'بایننس کوین',    symbol: 'B' },
  { value: 'TRX',   label: 'TRX',   name: 'ترون',           symbol: '♦' },
  { value: 'TON',   label: 'TON',   name: 'تون',            symbol: '◎' },
  { value: 'USDC',  label: 'USDC',  name: 'یو‌اس‌دی‌سی',   symbol: '$' },
  { value: 'OTHER', label: 'دیگر',  name: 'سایر کوین',     symbol: '¤' },
];

const DIGITAL_PAYMENT_PLATFORMS = [
  { value: 'paypal',    label: 'PayPal' },
  { value: 'skrill',    label: 'Skrill' },
  { value: 'wise',      label: 'Wise' },
  { value: 'neteller',  label: 'Neteller' },
  { value: 'perfectmoney', label: 'Perfect Money' },
  { value: 'other',     label: 'سایر' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: '۹۸٪ رضایت مشتریان' },
  { icon: Clock,       label: 'پاسخ در ۳۰ دقیقه' },
  { icon: Lock,        label: 'اطلاعات محرمانه' },
  { icon: Sparkles,    label: '+۱۲,۰۰۰ مشتری' },
];

// ─── Schema ────────────────────────────────────────────────────────────────── //

const RequestSchema = z.object({
  serviceType: z.string().min(1, 'نوع سرویس را انتخاب کنید'),
  amount: z.string().min(1, 'مبلغ را وارد کنید').regex(/^[\d.,]+$/, 'فقط عدد وارد کنید'),
  currency: z.string().min(1),
  // Transfer-specific
  destinationCountry: z.string().optional(),
  bankName: z.string().max(100).optional(),
  // Crypto-specific
  walletAddress: z.string().max(200).optional(),
  cryptoNetwork: z.string().max(50).optional(),
  // Digital payment-specific
  platformName: z.string().optional(),
  platformUsername: z.string().max(100).optional(),
  // Contact
  fullName: z.string().min(3, 'نام کامل حداقل ۳ حرف').max(100),
  phone: z.string().min(1, 'شماره تماس الزامی است')
    .refine(isPhoneValid, { message: 'شماره تماس معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷)' }),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  contactMethod: z.enum(['telegram', 'whatsapp']).default('telegram'),
  description: z.string().max(500).optional(),
});

type RequestFormData = z.infer<typeof RequestSchema>;

// ─── Props ────────────────────────────────────────────────────────────────── //

interface Props {
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────── //

function getDefaultCurrency(svcType: ServiceTypeKey): string {
  if (svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL') return 'USDT';
  return 'USD';
}

function getCurrencyList(svcType: ServiceTypeKey) {
  if (svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL') return CRYPTO_CURRENCIES;
  return FIAT_CURRENCIES;
}

function needsDestinationCountry(svcType: ServiceTypeKey) {
  return svcType === 'INTERNATIONAL_TRANSFER';
}

function needsCryptoFields(svcType: ServiceTypeKey) {
  return svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL';
}

function needsPlatformFields(svcType: ServiceTypeKey) {
  return (
    svcType === 'PAYPAL_TRANSFER' ||
    svcType === 'ONLINE_PAYMENT' ||
    svcType === 'FREELANCE_INCOME'
  );
}

function getAmountLabel(svcType: ServiceTypeKey): string {
  if (svcType === 'CURRENCY_BUY')   return 'مبلغ خرید';
  if (svcType === 'CURRENCY_SELL')  return 'مبلغ فروش';
  if (svcType === 'CRYPTO_BUY')     return 'مقدار خرید';
  if (svcType === 'CRYPTO_SELL')    return 'مقدار فروش';
  return 'مبلغ';
}

function getSubmitLabel(svcType: ServiceTypeKey): string {
  const svc = SERVICE_OPTIONS.find((s) => s.key === svcType);
  return `ثبت درخواست ${svc?.label ?? ''}`;
}

// ─── Component ────────────────────────────────────────────────────────────── //

const TransferRequestForm: FC<Props> = ({ telegramLink, whatsappLink }) => {
  // step 0 = service picker, 1 = details, 2 = contact, 3 = OTP
  const [step, setStep]                     = useState<0 | 1 | 2 | 3>(0);
  const [selectedService, setSelectedService] = useState<ServiceTypeKey | null>(null);
  const [dir, setDir]                       = useState<'fwd' | 'back'>('fwd');
  const [submitting, setSubmitting]         = useState(false);
  const [submitShake, setSubmitShake]       = useState(false);
  const [formError, setFormError]           = useState('');
  const [trackingCode, setTrackingCode]     = useState('');
  const [copied, setCopied]                 = useState(false);
  const [success, setSuccess]               = useState(false);

  // OTP
  const [otpCode, setOtpCode]               = useState('');
  const [otpSending, setOtpSending]         = useState(false);
  const [otpVerifying, setOtpVerifying]     = useState(false);
  const [otpError, setOtpError]             = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [accountCreated, setAccountCreated] = useState(false);

  const idempotencyKey = useRef(crypto.randomUUID());
  const formId = useId();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(RequestSchema),
    mode: 'onBlur',
    defaultValues: {
      serviceType: '',
      currency: 'USD',
      urgency: 'NORMAL',
      contactMethod: 'telegram',
    },
  });

  const amount      = watch('amount');
  const currency    = watch('currency');
  const destination = watch('destinationCountry');
  const urgency     = watch('urgency');
  const contact     = watch('contactMethod');
  const platform    = watch('platformName');

  const svcType     = selectedService ?? 'INTERNATIONAL_TRANSFER';
  const currencyList = getCurrencyList(svcType);
  const currencyMeta = currencyList.find((c) => c.value === currency) ?? currencyList[0];
  const countryMeta  = DESTINATION_COUNTRIES.find((c) => c.value === destination);

  // OTP countdown
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  const sendOtp = useCallback(async (email: string, code: string) => {
    setOtpSending(true);
    setOtpError('');
    const res = await issueServiceOtp({ email, trackingCode: code });
    setOtpSending(false);
    if (res.success) {
      setOtpResendTimer(60);
    } else {
      setOtpError(res.message);
      if (res.retryAfterMs) setOtpResendTimer(Math.ceil(res.retryAfterMs / 1000));
    }
  }, []);

  // ── Service selection ──────────────────────────────────────────────────── //
  const selectService = (key: ServiceTypeKey) => {
    setSelectedService(key);
    setValue('serviceType', key);
    // Reset currency to appropriate default
    setValue('currency', getDefaultCurrency(key));
    setDir('fwd');
    setStep(1);
  };

  const goNext = async () => {
    if (step === 1) {
      const fields: (keyof RequestFormData)[] = ['amount', 'currency'];
      if (needsDestinationCountry(svcType)) fields.push('destinationCountry');
      const ok = await trigger(fields);
      if (ok) { setDir('fwd'); setStep(2); }
    } else if (step === 2) {
      // handled by handleSubmit
    }
  };

  const goBack = () => {
    setDir('back');
    if (step === 1) {
      setStep(0);
      setSelectedService(null);
      setValue('serviceType', '');
    } else {
      setStep((p) => (p - 1) as 0 | 1 | 2 | 3);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    if (step !== 2) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await createServiceRequest({
        fullName:           data.fullName,
        phone:              data.phone,
        email:              data.email || null,
        serviceType:        data.serviceType as ServiceTypeKey,
        amount:             data.amount,
        currency:           data.currency,
        destinationCountry: data.destinationCountry || null,
        bankName:           data.bankName || null,
        description:        data.description || null,
        urgency:            data.urgency,
        contactMethod:      data.contactMethod,
        idempotencyKey:     idempotencyKey.current,
        websiteUrl:         null,
        productName:        null,
        universityName:     null,
        studentId:          null,
        platformName:       data.platformName || null,
        platformUsername:   data.platformUsername || null,
        softwareName:       null,
        subscriptionType:   null,
        giftCardBrand:      null,
        giftCardRegion:     null,
      });
      if (!res.success) {
        setFormError(res.message);
        setSubmitShake(true);
        setTimeout(() => setSubmitShake(false), 400);
        return;
      }
      setTrackingCode(res.trackingCode ?? '');
      const email = data.email?.trim();
      if (email && res.trackingCode) {
        idempotencyKey.current = crypto.randomUUID();
        setDir('fwd');
        setStep(3);
        await sendOtp(email, res.trackingCode);
      } else {
        setSuccess(true);
      }
    } catch {
      setFormError('خطایی رخ داد. لطفاً دوباره تلاش کنید.');
      setSubmitShake(true);
      setTimeout(() => setSubmitShake(false), 400);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    const email = watch('email')?.trim();
    if (!email || !trackingCode || otpCode.length !== 6) return;
    setOtpVerifying(true);
    setOtpError('');
    const res = await verifyServiceOtpAndLink({ email, code: otpCode, trackingCode });
    setOtpVerifying(false);
    if (res.success) {
      setAccountCreated(res.accountCreated ?? false);
      setSuccess(true);
    } else {
      setOtpError(res.message);
    }
  };

  const skipOtp = () => setSuccess(true);

  const copyCode = async () => {
    await navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setSuccess(false); setStep(0); setSelectedService(null);
    setTrackingCode(''); setOtpCode('');
    setOtpError(''); setOtpResendTimer(0); setAccountCreated(false); setFormError('');
    idempotencyKey.current = crypto.randomUUID();
    reset();
  };

  // ── Success screen ───────────────────────────────────────────────────────── //
  if (success && trackingCode) {
    return (
      <div className={s.successWrap}>
        <div className={s.successRing} aria-hidden="true">
          <svg viewBox="0 0 52 52" className={s.checkSvg} aria-hidden="true">
            <circle className={s.checkCircle} cx="26" cy="26" r="23" fill="none" />
            <path  className={s.checkMark}  fill="none" d="M14 26 l8 8 16-16" />
          </svg>
        </div>

        <h3 className={s.successTitle}>درخواست شما ثبت شد!</h3>

        {accountCreated && (
          <div className={s.pcBadge} role="status">
            <UserPlus size={13} />
            <span>حساب کاربری برای شما ساخته شد — ایمیل فعال‌سازی ارسال شد.</span>
          </div>
        )}

        <div className={s.codeCard}>
          <p className={s.codeLabel}>کد پیگیری</p>
          <div className={s.codeRow}>
            <span className={s.code} dir="ltr">{trackingCode}</span>
            <button type="button" onClick={copyCode} className={s.copyBtn}
              aria-label={copied ? 'کپی شد' : 'کپی کد پیگیری'}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <p className={s.successNote}>
          این کد را نگه دارید. تیم ما در کمتر از ۳۰ دقیقه با شما تماس می‌گیرد.
        </p>

        <div className={s.successActions}>
          <button type="button" onClick={resetAll} className={s.btnOutline}>
            درخواست جدید
          </button>
          <a href={`/track/${trackingCode}`} className={s.btnFill}>
            مشاهده وضعیت ←
          </a>
        </div>

        {(telegramLink || whatsappLink) && (
          <div className={s.quickContact}>
            <span className={s.quickLabel}>پیگیری سریع:</span>
            {telegramLink && (
              <a href={telegramLink} target="_blank" rel="noopener noreferrer"
                className={s.btnTg}>
                <FaTelegram size={14} /> تلگرام
              </a>
            )}
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className={s.btnWa}>
                <FaWhatsapp size={14} /> واتساپ
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Progress labels (steps 1–2 only) ────────────────────────────────────── //
  const STEPS = ['جزئیات', 'اطلاعات تماس'];

  return (
    <div className={s.formRoot}>

      {/* ── Progress (steps 1+) ─────────────────────────────────────── */}
      {step >= 1 && step <= 2 && (
        <div className={s.progress} role="list" aria-label="مراحل ثبت درخواست">
          {STEPS.map((label, i) => {
            const n = (i + 1) as 1 | 2;
            const done    = step > n;
            const current = step === n;
            return (
              <div key={label} className={s.progressItem} role="listitem"
                aria-current={current ? 'step' : undefined}>
                <div className={`${s.progressDot} ${done ? s.dotDone : ''} ${current ? s.dotActive : ''}`}>
                  {done ? <Check size={10} /> : <span>{n}</span>}
                </div>
                <span className={`${s.progressLabel} ${current ? s.labelActive : ''}`}>{label}</span>
              </div>
            );
          })}
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: step >= 2 ? '100%' : '0%' }} />
          </div>
        </div>
      )}

      {/* ── Panel ─────────────────────────────────────────────────── */}
      <div key={`step-${step}`} className={dir === 'fwd' ? s.panelFwd : s.panelBack}>

        {/* ════════════════ STEP 0: Service Picker ════════════════ */}
        {step === 0 && (
          <div className={s.stepBody}>
            <p className={s.servicePickerTitle}>چه خدمتی نیاز دارید؟</p>
            <div className={s.serviceGrid}>
              {SERVICE_OPTIONS.map((svc) => {
                const Icon = svc.icon;
                return (
                  <button
                    key={svc.key}
                    type="button"
                    className={s.serviceCard}
                    onClick={() => selectService(svc.key)}
                    aria-label={`${svc.label} — ${svc.sublabel}`}
                  >
                    <span className={s.serviceCardIcon} aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span className={s.serviceCardLabel}>{svc.label}</span>
                    <span className={s.serviceCardSub}>{svc.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════ STEP 1: Service Details ════════════════ */}
        {step === 1 && selectedService && (
          <div className={s.stepBody}>

            {/* Selected service badge */}
            <div className={s.recapStrip}>
              {(() => { const svc = SERVICE_OPTIONS.find((x) => x.key === selectedService); const Icon = svc?.icon ?? Globe; return <Icon size={13} className={s.recapIcon} aria-hidden="true" />; })()}
              <span><strong>{SERVICE_OPTIONS.find((x) => x.key === selectedService)?.label}</strong></span>
            </div>

            {/* Amount + currency */}
            <div className={s.amountSection}>
              <label className={s.amountLabel} htmlFor={`${formId}-amount`}>
                {getAmountLabel(selectedService)}
              </label>
              <div className={`${s.amountBox} ${errors.amount ? s.amountBoxErr : ''}`}>
                <input
                  id={`${formId}-amount`}
                  {...register('amount')}
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  className={s.amountInput}
                  placeholder="0"
                  aria-label="مبلغ"
                  aria-describedby={errors.amount ? `${formId}-err-amount` : undefined}
                  autoComplete="off"
                  autoFocus
                />
                <div className={s.currencyPill}>
                  <span className={s.currencySymbol} aria-hidden="true">
                    {currencyMeta.symbol}
                  </span>
                  <select
                    {...register('currency')}
                    className={s.currencySelect}
                    aria-label="واحد ارز"
                  >
                    {currencyList.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className={s.currencyChevron} aria-hidden="true" />
                </div>
              </div>
              {errors.amount && (
                <p id={`${formId}-err-amount`} className={s.fieldError} role="alert">
                  {errors.amount.message}
                </p>
              )}
              {amount && !errors.amount && (
                <div className={s.amountPreview} aria-live="polite">
                  <ShieldCheck size={12} className={s.previewIcon} aria-hidden="true" />
                  <span>
                    <strong dir="ltr">{amount} {currencyMeta.label}</strong>
                    {' '}— نرخ دقیق توسط کارشناس تأیید می‌شود
                  </span>
                </div>
              )}
            </div>

            {/* ── Transfer: Destination country ── */}
            {needsDestinationCountry(selectedService) && (
              <>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`${formId}-country`}>
                    کشور مقصد <span className={s.req} aria-hidden="true">*</span>
                  </label>
                  <div className={`${s.selectBox} ${errors.destinationCountry ? s.selectBoxErr : ''}`}>
                    <span className={s.selectFlag} aria-hidden="true">
                      {countryMeta ? countryMeta.flag : '🌍'}
                    </span>
                    <select
                      id={`${formId}-country`}
                      {...register('destinationCountry')}
                      className={s.select}
                    >
                      <option value="">انتخاب کشور مقصد</option>
                      {DESTINATION_COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={s.selectChevron} aria-hidden="true" />
                  </div>
                  {errors.destinationCountry && (
                    <p className={s.fieldError} role="alert">{errors.destinationCountry.message}</p>
                  )}
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`${formId}-bank`}>
                    نام بانک گیرنده <span className={s.optional}>(اختیاری)</span>
                  </label>
                  <input id={`${formId}-bank`} type="text" {...register('bankName')}
                    className={s.input} placeholder="مثلاً: Kabul Bank, Bank Melli …" />
                </div>

                {/* Popular destinations */}
                <div className={s.popularRow} aria-label="مقاصد پرکاربرد">
                  {['afghanistan', 'uae', 'usa', 'uk', 'turkey'].map((v) => {
                    const c = DESTINATION_COUNTRIES.find((x) => x.value === v);
                    if (!c) return null;
                    return (
                      <button key={v} type="button"
                        className={`${s.popularBtn} ${destination === v ? s.popularBtnActive : ''}`}
                        onClick={() => { const el = document.querySelector<HTMLSelectElement>(`#${CSS.escape(`${formId}-country`)}`); if (el) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); } }}
                        aria-pressed={destination === v}>
                        <span>{c.flag}</span><span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Crypto: Wallet + Network ── */}
            {needsCryptoFields(selectedService) && (
              <>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`${formId}-wallet`}>
                    آدرس کیف پول <span className={s.optional}>(اختیاری)</span>
                  </label>
                  <input id={`${formId}-wallet`} type="text" {...register('walletAddress')}
                    className={s.input} dir="ltr"
                    placeholder="0x... یا آدرس TRC20/BEP20 خود را وارد کنید" />
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`${formId}-network`}>
                    شبکه <span className={s.optional}>(اختیاری)</span>
                  </label>
                  <input id={`${formId}-network`} type="text" {...register('cryptoNetwork')}
                    className={s.input} dir="ltr"
                    placeholder="TRC20 / ERC20 / BEP20 / TON …" />
                </div>
              </>
            )}

            {/* ── Digital Payment: Platform ── */}
            {needsPlatformFields(selectedService) && (
              <>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`${formId}-platform`}>
                    پلتفرم <span className={s.optional}>(اختیاری)</span>
                  </label>
                  <div className={s.selectBox}>
                    <select id={`${formId}-platform`} {...register('platformName')}
                      className={s.select}>
                      <option value="">انتخاب پلتفرم</option>
                      {DIGITAL_PAYMENT_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={s.selectChevron} aria-hidden="true" />
                  </div>
                </div>
                {platform && platform !== 'other' && (
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-pusername`}>
                      ایمیل / نام کاربری <span className={s.optional}>(اختیاری)</span>
                    </label>
                    <input id={`${formId}-pusername`} type="text" {...register('platformUsername')}
                      className={s.input} dir="ltr" placeholder="example@email.com" />
                  </div>
                )}
              </>
            )}

            {/* ── Description (all services) ── */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel} htmlFor={`${formId}-desc1`}>
                توضیحات <span className={s.optional}>(اختیاری)</span>
              </label>
              <textarea id={`${formId}-desc1`} {...register('description')} rows={2}
                className={s.textarea} placeholder="هر اطلاعات اضافی که لازم است بدانیم…" />
            </div>
          </div>
        )}

        {/* ════════════════ STEP 2: Contact Info ════════════════ */}
        {step === 2 && (
          <div className={s.stepBody}>

            {/* Recap */}
            <div className={s.recapStrip}>
              <Globe size={13} className={s.recapIcon} aria-hidden="true" />
              <span>
                <strong dir="ltr">{amount} {currencyMeta.label}</strong>
                {' — '}{SERVICE_OPTIONS.find((x) => x.key === selectedService)?.label}
              </span>
            </div>

            {/* Name + phone */}
            <div className={s.fieldGrid}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor={`${formId}-name`}>
                  نام و نام خانوادگی <span className={s.req} aria-hidden="true">*</span>
                </label>
                <input id={`${formId}-name`} type="text" {...register('fullName')}
                  className={`${s.input} ${errors.fullName ? s.inputErr : ''}`}
                  placeholder="نام کامل" autoComplete="name"
                  aria-describedby={errors.fullName ? `${formId}-err-name` : undefined} />
                {errors.fullName && (
                  <p id={`${formId}-err-name`} className={s.fieldError} role="alert">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor={`${formId}-phone`}>
                  شماره تماس <span className={s.req} aria-hidden="true">*</span>
                </label>
                <input id={`${formId}-phone`} type="tel" {...register('phone')}
                  className={`${s.input} ${errors.phone ? s.inputErr : ''}`}
                  placeholder="07X-XXXXXXX" dir="ltr" autoComplete="tel"
                  aria-describedby={errors.phone ? `${formId}-err-phone` : undefined} />
                {errors.phone && (
                  <p id={`${formId}-err-phone`} className={s.fieldError} role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel} htmlFor={`${formId}-email`}>
                ایمیل <span className={s.optional}>(برای دریافت تأییدیه + پیگیری)</span>
              </label>
              <div className={s.inputWithIcon}>
                <Mail size={14} className={s.inputIcon} aria-hidden="true" />
                <input id={`${formId}-email`} type="email" {...register('email')}
                  className={`${s.input} ${s.inputIconPad} ${errors.email ? s.inputErr : ''}`}
                  placeholder="example@email.com" dir="ltr" autoComplete="email" />
              </div>
              {errors.email && <p className={s.fieldError} role="alert">{errors.email.message}</p>}
            </div>

            {/* Urgency */}
            <fieldset className={s.fieldset}>
              <legend className={s.fieldLabel}>اولویت</legend>
              <div className={s.segmentRow}>
                <label className={`${s.segment} ${urgency === 'NORMAL' ? s.segmentActive : ''}`}>
                  <input type="radio" value="NORMAL" {...register('urgency')} className={s.srOnly} />
                  <Clock size={13} aria-hidden="true" />
                  <span>عادی</span>
                  <small>تا ۲۴ ساعت</small>
                </label>
                <label className={`${s.segment} ${s.segmentUrgent} ${urgency === 'URGENT' ? s.segmentActive : ''}`}>
                  <input type="radio" value="URGENT" {...register('urgency')} className={s.srOnly} />
                  <Zap size={13} aria-hidden="true" />
                  <span>فوری</span>
                  <small>اولویت‌دار</small>
                </label>
              </div>
            </fieldset>

            {/* Contact method */}
            <fieldset className={s.fieldset}>
              <legend className={s.fieldLabel}>روش پیگیری</legend>
              <div className={s.contactRow}>
                {telegramLink && (
                  <label className={`${s.contactChip} ${contact === 'telegram' ? s.contactChipActive : ''}`}>
                    <input type="radio" value="telegram" {...register('contactMethod')} className={s.srOnly} />
                    <FaTelegram size={15} />
                    <span>تلگرام</span>
                  </label>
                )}
                <label className={`${s.contactChip} ${contact === 'whatsapp' ? s.contactChipActive : ''}`}>
                  <input type="radio" value="whatsapp" {...register('contactMethod')} className={s.srOnly} />
                  <FaWhatsapp size={15} />
                  <span>واتساپ</span>
                </label>
              </div>
            </fieldset>
          </div>
        )}

        {/* ════════════════ STEP 3: OTP ════════════════ */}
        {step === 3 && (
          <div className={s.otpWrap}>
            <div className={s.otpIcon} aria-hidden="true">
              <Mail size={22} />
            </div>
            <h4 className={s.otpTitle}>تأیید ایمیل</h4>
            <p className={s.otpDesc}>
              کد ۶ رقمی به{' '}
              <strong dir="ltr">{watch('email')}</strong>{' '}
              ارسال شد.
            </p>

            {otpSending && (
              <p className={s.otpHint} aria-live="polite">در حال ارسال کد…</p>
            )}
            {otpError && (
              <div className={s.inlineError} role="alert">
                <AlertCircle size={13} /><span>{otpError}</span>
              </div>
            )}

            <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className={s.otpInput} placeholder="_ _ _ _ _ _"
              dir="ltr" aria-label="کد تأیید ۶ رقمی" autoComplete="one-time-code" autoFocus />

            <button type="button" onClick={verifyOtp}
              disabled={otpVerifying || otpCode.length !== 6}
              className={s.btnFill} style={{ width: '100%', marginBlockStart: '0.75rem' }}>
              {otpVerifying
                ? <><span className={s.spinner} aria-hidden="true" /><span>در حال تأیید…</span></>
                : <><KeyRound size={14} /><span>تأیید کد</span></>
              }
            </button>

            <div className={s.otpActions}>
              {otpResendTimer > 0
                ? (
                  <span className={s.timerText} aria-live="polite">
                    ارسال مجدد در{' '}
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{otpResendTimer}</span>{' '}ثانیه
                  </span>
                )
                : (
                  <button type="button" onClick={() => sendOtp(watch('email') ?? '', trackingCode)}
                    disabled={otpSending} className={s.btnLink}>
                    <RotateCcw size={11} /> ارسال مجدد
                  </button>
                )
              }
              <button type="button" onClick={skipOtp} className={s.btnSkip}>رد کردن</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form error ─────────────────────────────────────────────── */}
      {formError && step !== 3 && (
        <div className={s.inlineError} role="alert">
          <AlertCircle size={14} /><span>{formError}</span>
        </div>
      )}

      {/* ── Trust pills (step 2 only) ───────────────────────────── */}
      {step === 2 && (
        <div className={s.trustPills} aria-label="تضمین‌های ما">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <span key={label} className={s.trustPill}>
              <Icon size={11} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────── */}
      {step !== 0 && step !== 3 && (
        <div className={s.navRow}>
          <button type="button" onClick={goBack} className={s.btnBack}>
            <ArrowRight size={14} aria-hidden="true" />
            قبلی
          </button>

          {step === 1
            ? (
              <button type="button" onClick={goNext} className={s.btnNext}>
                بعدی
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
            )
            : (
              <button type="button" disabled={submitting}
                onClick={handleSubmit(onSubmit)}
                className={`${s.btnFill} ${s.btnSubmitFull} ${submitShake ? s.shake : ''}`}>
                {submitting
                  ? <><span className={s.spinner} aria-hidden="true" /><span>در حال ارسال…</span></>
                  : <><Send size={14} aria-hidden="true" /><span>{getSubmitLabel(svcType)}</span></>
                }
              </button>
            )
          }
        </div>
      )}
    </div>
  );
};

export default TransferRequestForm;
