'use client';

/**
 * TransferRequestForm — 2026 Fintech Grade
 * ─────────────────────────────────────────
 * Architecture: Wise-style amount-first, 2-step + OTP
 * Design: Split-panel (info | form), spring motion, ambient SVG
 *
 * Step 1: مبلغ + ارز + کشور مقصد
 * Step 2: اطلاعات تماس + فوریت + روش پیگیری
 * Step 3: OTP → Progressive Capture
 */

import { type FC, useState, useRef, useCallback, useEffect, useId } from 'react';
// useEffect is still needed for OTP countdown
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
} from 'lucide-react';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { z } from 'zod';
import { isPhoneValid } from '@/lib/phone-validation';
import { createServiceRequest } from '@/actions/serviceRequestActions';
import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import s from './TransferRequestForm.module.css';

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

const SEND_CURRENCIES = [
  { value: 'USD',   label: 'USD',  name: 'دلار آمریکا',   symbol: '$' },
  { value: 'AED',   label: 'AED',  name: 'درهم امارات',   symbol: 'د.إ' },
  { value: 'EUR',   label: 'EUR',  name: 'یورو',           symbol: '€' },
  { value: 'GBP',   label: 'GBP',  name: 'پوند',           symbol: '£' },
  { value: 'CAD',   label: 'CAD',  name: 'دلار کانادا',   symbol: 'C$' },
  { value: 'AUD',   label: 'AUD',  name: 'دلار استرالیا', symbol: 'A$' },
  { value: 'TRY',   label: 'TRY',  name: 'لیر ترکیه',     symbol: '₺' },
  { value: 'USDT',  label: 'USDT', name: 'تتر',            symbol: '₮' },
  { value: 'AFN',   label: 'AFN',  name: 'افغانی',         symbol: '؋' },
  { value: 'IRR',   label: 'IRR',  name: 'ریال ایران',    symbol: '﷼' },
  { value: 'OTHER', label: 'دیگر', name: 'سایر ارز',      symbol: '¤' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: '۹۸٪ رضایت مشتریان' },
  { icon: Clock,       label: 'پاسخ در ۳۰ دقیقه' },
  { icon: Lock,        label: 'اطلاعات محرمانه' },
  { icon: Sparkles,    label: '+۱۲,۰۰۰ مشتری' },
];

// ─── Schema ────────────────────────────────────────────────────────────────── //

const TransferSchema = z.object({
  amount: z.string().min(1, 'مبلغ را وارد کنید').regex(/^[\d.,]+$/, 'فقط عدد وارد کنید'),
  currency: z.string().min(1),
  destinationCountry: z.string().min(1, 'کشور مقصد را انتخاب کنید'),
  bankName: z.string().max(100).optional(),
  fullName: z.string().min(3, 'نام کامل حداقل ۳ حرف').max(100),
  phone: z.string().min(1, 'شماره تماس الزامی است')
    .refine(isPhoneValid, { message: 'شماره تماس معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷)' }),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  contactMethod: z.enum(['telegram', 'whatsapp']).default('telegram'),
  description: z.string().max(500).optional(),
});

type TransferFormData = z.infer<typeof TransferSchema>;

// ─── Props ────────────────────────────────────────────────────────────────── //

interface Props {
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────── //

const TransferRequestForm: FC<Props> = ({ telegramLink, whatsappLink }) => {
  const [step, setStep]                     = useState<1 | 2 | 3>(1);
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
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(TransferSchema),
    mode: 'onBlur',
    defaultValues: { currency: 'USD', urgency: 'NORMAL', contactMethod: 'telegram' },
  });

  const amount      = watch('amount');
  const currency    = watch('currency');
  const destination = watch('destinationCountry');
  const urgency     = watch('urgency');
  const contact     = watch('contactMethod');

  const currencyMeta = SEND_CURRENCIES.find((c) => c.value === currency) ?? SEND_CURRENCIES[0];
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

  const goNext = async () => {
    const ok = await trigger(step === 1
      ? ['amount', 'currency', 'destinationCountry']
      : ['fullName', 'phone'],
    );
    if (ok) { setDir('fwd'); setStep((p) => (p + 1) as 1 | 2 | 3); }
  };

  const goBack = () => { setDir('back'); setStep((p) => (p - 1) as 1 | 2 | 3); };

  const onSubmit = async (data: TransferFormData) => {
    if (step !== 2) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await createServiceRequest({
        fullName:           data.fullName,
        phone:              data.phone,
        email:              data.email || null,
        serviceType:        'INTERNATIONAL_TRANSFER',
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
        platformName:       null,
        platformUsername:   null,
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
    setSuccess(false); setStep(1); setTrackingCode(''); setOtpCode('');
    setOtpError(''); setOtpResendTimer(0); setAccountCreated(false); setFormError('');
    idempotencyKey.current = crypto.randomUUID();
    reset();
  };

  // ── Success screen ───────────────────────────────────────────────────────── //
  if (success && trackingCode) {
    return (
      <div className={s.successWrap}>
        {/* Animated check */}
        <div className={s.successRing} aria-hidden="true">
          <svg viewBox="0 0 52 52" className={s.checkSvg} aria-hidden="true">
            <circle className={s.checkCircle} cx="26" cy="26" r="23" fill="none" />
            <path  className={s.checkMark}  fill="none" d="M14 26 l8 8 16-16" />
          </svg>
        </div>

        <h3 className={s.successTitle}>درخواست حواله ثبت شد!</h3>

        {accountCreated && (
          <div className={s.pcBadge} role="status">
            <UserPlus size={13} />
            <span>حساب کاربری برای شما ساخته شد — ایمیل فعال‌سازی ارسال شد.</span>
          </div>
        )}

        {/* Tracking code */}
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

  // ── Step progress dots ───────────────────────────────────────────────────── //
  const STEPS = ['مبلغ و مقصد', 'اطلاعات تماس'];

  return (
    <div className={s.formRoot}>

      {/* ── Progress ─────────────────────────────────────────────────── */}
      <div className={s.progress} role="list" aria-label="مراحل ثبت درخواست">
        {STEPS.map((label, i) => {
          const n = i + 1;
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

      {/* ── Panel ────────────────────────────────────────────────────── */}
      <div key={`step-${step}`} className={dir === 'fwd' ? s.panelFwd : s.panelBack}>

        {/* ════════════════ STEP 1 ════════════════ */}
        {step === 1 && (
          <div className={s.stepBody}>

            {/* Amount + currency — Wise-style large input */}
            <div className={s.amountSection}>
              <label className={s.amountLabel} htmlFor={`${formId}-amount`}>
                مبلغ ارسال
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
                    {SEND_CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
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

              {/* Live preview — appears as user types */}
              {amount && !errors.amount && (
                <div className={s.amountPreview} aria-live="polite">
                  <ShieldCheck size={12} className={s.previewIcon} aria-hidden="true" />
                  <span>
                    ارسال{' '}
                    <strong dir="ltr">{amount} {currencyMeta.label}</strong>
                    {' '}— نرخ دقیق توسط کارشناس تأیید می‌شود
                  </span>
                </div>
              )}
            </div>

            {/* Destination country — flag grid */}
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
                  aria-describedby={errors.destinationCountry ? `${formId}-err-country` : undefined}
                >
                  <option value="">انتخاب کشور مقصد</option>
                  {DESTINATION_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className={s.selectChevron} aria-hidden="true" />
              </div>
              {errors.destinationCountry && (
                <p id={`${formId}-err-country`} className={s.fieldError} role="alert">
                  {errors.destinationCountry.message}
                </p>
              )}
            </div>

            {/* Bank name */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel} htmlFor={`${formId}-bank`}>
                نام بانک گیرنده
                <span className={s.optional}>(اختیاری)</span>
              </label>
              <input
                id={`${formId}-bank`}
                type="text"
                {...register('bankName')}
                className={s.input}
                placeholder="مثلاً: Kabul Bank, Bank Melli …"
              />
            </div>

            {/* Popular destinations strip */}
            <div className={s.popularRow} aria-label="مقاصد پرکاربرد">
              {['afghanistan', 'uae', 'usa', 'uk', 'turkey'].map((v) => {
                const c = DESTINATION_COUNTRIES.find((x) => x.value === v);
                if (!c) return null;
                return (
                  <button
                    key={v}
                    type="button"
                    className={`${s.popularBtn} ${destination === v ? s.popularBtnActive : ''}`}
                    onClick={() => {
                      const el = document.querySelector<HTMLSelectElement>(`#${CSS.escape(`${formId}-country`)}`);
                      if (el) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
                    }}
                    aria-pressed={destination === v}
                  >
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════ STEP 2 ════════════════ */}
        {step === 2 && (
          <div className={s.stepBody}>

            {/* Recap strip */}
            <div className={s.recapStrip}>
              <Globe size={13} className={s.recapIcon} aria-hidden="true" />
              <span>
                <strong dir="ltr">{amount} {currencyMeta.label}</strong>
                {countryMeta && <> → {countryMeta.flag} {countryMeta.label}</>}
              </span>
            </div>

            {/* Name + phone grid */}
            <div className={s.fieldGrid}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor={`${formId}-name`}>
                  نام و نام خانوادگی <span className={s.req} aria-hidden="true">*</span>
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  {...register('fullName')}
                  className={`${s.input} ${errors.fullName ? s.inputErr : ''}`}
                  placeholder="نام کامل"
                  autoComplete="name"
                  aria-describedby={errors.fullName ? `${formId}-err-name` : undefined}
                />
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
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  {...register('phone')}
                  className={`${s.input} ${errors.phone ? s.inputErr : ''}`}
                  placeholder="07X-XXXXXXX"
                  dir="ltr"
                  autoComplete="tel"
                  aria-describedby={errors.phone ? `${formId}-err-phone` : undefined}
                />
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
                ایمیل
                <span className={s.optional}>(برای دریافت تأییدیه + پیگیری)</span>
              </label>
              <div className={s.inputWithIcon}>
                <Mail size={14} className={s.inputIcon} aria-hidden="true" />
                <input
                  id={`${formId}-email`}
                  type="email"
                  {...register('email')}
                  className={`${s.input} ${s.inputIconPad} ${errors.email ? s.inputErr : ''}`}
                  placeholder="example@email.com"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className={s.fieldError} role="alert">{errors.email.message}</p>}
            </div>

            {/* Urgency toggle */}
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

            {/* Description */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel} htmlFor={`${formId}-desc`}>
                توضیحات <span className={s.optional}>(اختیاری)</span>
              </label>
              <textarea
                id={`${formId}-desc`}
                {...register('description')}
                rows={2}
                className={s.textarea}
                placeholder="هر اطلاعات اضافی که لازم است بدانیم…"
              />
            </div>
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

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className={s.otpInput}
              placeholder="_ _ _ _ _ _"
              dir="ltr"
              aria-label="کد تأیید ۶ رقمی"
              autoComplete="one-time-code"
              autoFocus
            />

            <button
              type="button"
              onClick={verifyOtp}
              disabled={otpVerifying || otpCode.length !== 6}
              className={s.btnFill}
              style={{ width: '100%', marginBlockStart: '0.75rem' }}
            >
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
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {otpResendTimer}
                    </span>{' '}
                    ثانیه
                  </span>
                )
                : (
                  <button
                    type="button"
                    onClick={() => sendOtp(watch('email') ?? '', trackingCode)}
                    disabled={otpSending}
                    className={s.btnLink}
                  >
                    <RotateCcw size={11} /> ارسال مجدد
                  </button>
                )
              }
              <button type="button" onClick={skipOtp} className={s.btnSkip}>
                رد کردن
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form error ───────────────────────────────────────────────── */}
      {formError && step !== 3 && (
        <div className={s.inlineError} role="alert">
          <AlertCircle size={14} /><span>{formError}</span>
        </div>
      )}

      {/* ── Trust pills (step 2 only) ─────────────────────────────── */}
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

      {/* ── Navigation ────────────────────────────────────────────── */}
      {step !== 3 && (
        <div className={s.navRow}>
          {step > 1
            ? (
              <button type="button" onClick={goBack} className={s.btnBack}>
                <ArrowRight size={14} aria-hidden="true" />
                قبلی
              </button>
            )
            : <div aria-hidden="true" />
          }

          {step < 2
            ? (
              <button type="button" onClick={goNext} className={s.btnNext}>
                بعدی
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
            )
            : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit(onSubmit)}
                className={`${s.btnFill} ${s.btnSubmitFull} ${submitShake ? s.shake : ''}`}
              >
                {submitting
                  ? <><span className={s.spinner} aria-hidden="true" /><span>در حال ارسال…</span></>
                  : <><Send size={14} aria-hidden="true" /><span>ثبت درخواست حواله</span></>
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
