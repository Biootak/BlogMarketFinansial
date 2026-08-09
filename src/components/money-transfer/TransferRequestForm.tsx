'use client';

/**
 * TransferRequestForm — 2026-07-19 redesign
 * ─────────────────────────────────────────
 * معماری جدید: Session-first, 2-step + پیش‌فاکتور
 *
 * Step 0: انتخاب نوع سرویس (grid کارت‌ها)
 * Step 1: جزئیات سرویس (مبلغ + فیلدهای شرطی)
 * Step 2: پیش‌فاکتور — نمایش خلاصه + تأیید کاربر
 *
 * اطلاعات کاربر (نام، موبایل، ایمیل) از session می‌آیند — هیچ فرمی نمایش نمی‌شود.
 * اگر کاربر شماره موبایل نداشته باشد → badge "تکمیل پروفایل" نمایش داده می‌شود.
 */

import { createServiceRequest, getUserServiceProfile } from '@/actions/serviceRequestActions';
import {
  CONVERTER_PREFILL_KEY,
  type ConverterPrefill,
} from '@/app/(site)/money-transfer/HeroConverter';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Bitcoin,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  CreditCard,
  DollarSign,
  Globe,
  LogIn,
  Mail,
  Phone,
  ReceiptText,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import { type FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { z } from 'zod';
import PhoneVerifyModal from './PhoneVerifyModal';
import s from './TransferRequestForm.module.css';

/** برگشت به همین فرم بعد از ورود/ثبت‌نام */
const AUTH_CALLBACK = encodeURIComponent('/money-transfer#contact');

/** پیش‌نویس فرم — قبل از رفتن به ثبت‌نام ذخیره می‌شود تا اطلاعات از دست نرود */
const TRANSFER_FORM_DRAFT_KEY = 'mt_form_draft';

interface FormDraft {
  serviceType: ServiceTypeKey;
  amount?: string;
  currency?: string;
  destinationCountry?: string;
  bankName?: string;
  description?: string;
  platformName?: string;
  platformUsername?: string;
  walletAddress?: string;
  cryptoNetwork?: string;
  urgency?: 'NORMAL' | 'URGENT';
}

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
  {
    key: 'INTERNATIONAL_TRANSFER',
    label: 'حواله بین‌المللی',
    sublabel: 'انتقال پول به خارج از کشور',
    icon: Globe,
    group: 'transfer',
  },
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
  {
    key: 'CRYPTO_BUY',
    label: 'خرید ارز دیجیتال',
    sublabel: 'بیت‌کوین، اتریوم، تتر و…',
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

// ─── Data ─────────────────────────────────────────────────────────────────── //

const DESTINATION_COUNTRIES = [
  { value: 'afghanistan', label: 'افغانستان', flag: '🇦🇫' },
  { value: 'iran', label: 'ایران', flag: '🇮🇷' },
  { value: 'pakistan', label: 'پاکستان', flag: '🇵🇰' },
  { value: 'uae', label: 'امارات', flag: '🇦🇪' },
  { value: 'turkey', label: 'ترکیه', flag: '🇹🇷' },
  { value: 'germany', label: 'آلمان', flag: '🇩🇪' },
  { value: 'usa', label: 'آمریکا', flag: '🇺🇸' },
  { value: 'uk', label: 'انگلستان', flag: '🇬🇧' },
  { value: 'canada', label: 'کانادا', flag: '🇨🇦' },
  { value: 'australia', label: 'استرالیا', flag: '🇦🇺' },
  { value: 'sweden', label: 'سوئد', flag: '🇸🇪' },
  { value: 'norway', label: 'نروژ', flag: '🇳🇴' },
  { value: 'netherlands', label: 'هلند', flag: '🇳🇱' },
  { value: 'tajikistan', label: 'تاجیکستان', flag: '🇹🇯' },
  { value: 'malaysia', label: 'مالزی', flag: '🇲🇾' },
  { value: 'qatar', label: 'قطر', flag: '🇶🇦' },
  { value: 'saudi_arabia', label: 'عربستان', flag: '🇸🇦' },
  { value: 'other', label: 'سایر کشورها', flag: '🌍' },
];

const FIAT_CURRENCIES = [
  { value: 'USD', code: 'USD', label: 'دلار آمریکا', symbol: '$' },
  { value: 'AED', code: 'AED', label: 'درهم امارات', symbol: 'د.إ' },
  { value: 'EUR', code: 'EUR', label: 'یورو', symbol: '€' },
  { value: 'GBP', code: 'GBP', label: 'پوند', symbol: '£' },
  { value: 'CAD', code: 'CAD', label: 'دلار کانادا', symbol: 'C$' },
  { value: 'AUD', code: 'AUD', label: 'دلار استرالیا', symbol: 'A$' },
  { value: 'TRY', code: 'TRY', label: 'لیر ترکیه', symbol: '₺' },
  { value: 'AFN', code: 'AFN', label: 'افغانی', symbol: '؋' },
  { value: 'IRR', code: 'IRR', label: 'ریال ایران', symbol: '﷼' },
  { value: 'OTHER', code: '···', label: 'سایر ارز', symbol: '¤' },
];

const CRYPTO_CURRENCIES = [
  { value: 'USDT', code: 'USDT', label: 'تتر', symbol: '₮' },
  { value: 'BTC', code: 'BTC', label: 'بیت‌کوین', symbol: '₿' },
  { value: 'ETH', code: 'ETH', label: 'اتریوم', symbol: 'Ξ' },
  { value: 'BNB', code: 'BNB', label: 'بایننس کوین', symbol: 'B' },
  { value: 'TRX', code: 'TRX', label: 'ترون', symbol: '♦' },
  { value: 'TON', code: 'TON', label: 'تون', symbol: '◎' },
  { value: 'USDC', code: 'USDC', label: 'یو‌اس‌دی‌سی', symbol: '$' },
  { value: 'OTHER', code: '···', label: 'سایر کوین', symbol: '¤' },
];

// H1-fix: هنجارسازی عنوان فارسی/لاتین ارز از پارامتر query مگامنو.
// عنوان آیتم مگامنو می‌تواند «دلار آمریکا»، «یورو» یا کد لاتین باشد.
function normalizeCurrency(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const up = t.toUpperCase();
  // کد استاندارد ۳ حرفی
  if (/^[A-Z]{3,5}$/.test(up)) return up;
  // نقشه عنوان فارسی → کد
  const faMap: Record<string, string> = {
    دلار: 'USD',
    'دلار آمریکا': 'USD',
    'دلار امریکا': 'USD',
    یورو: 'EUR',
    پوند: 'GBP',
    درهم: 'AED',
    لیر: 'TRY',
    فرانک: 'CHF',
    افغانی: 'AFN',
    ریال: 'IRR',
    'ریال ایران': 'IRR',
    روپیه: 'PKR',
    ین: 'JPY',
    یوان: 'CNY',
  };
  const faHit = Object.entries(faMap).find(([k]) => t.includes(k));
  if (faHit) return faHit[1];
  return up;
}

function isCryptoCode(code?: string | null): boolean {
  if (!code) return false;
  return /^(USDT|BTC|ETH|BNB|TRX|TON|USDC|SOL|XRP|ADA|DOGE)$/i.test(code.toUpperCase());
}

const DIGITAL_PAYMENT_PLATFORMS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'skrill', label: 'Skrill' },
  { value: 'wise', label: 'Wise' },
  { value: 'neteller', label: 'Neteller' },
  { value: 'perfectmoney', label: 'Perfect Money' },
  { value: 'other', label: 'سایر' },
];

// ─── Schema ────────────────────────────────────────────────────────────────── //

const RequestSchema = z.object({
  serviceType: z.string().min(1, 'نوع سرویس را انتخاب کنید'),
  amount: z
    .string()
    .min(1, 'مبلغ را وارد کنید')
    .regex(/^[\d.,]+$/, 'فقط عدد وارد کنید'),
  currency: z.string().min(1),
  destinationCountry: z.string().optional(),
  bankName: z.string().max(100).optional(),
  walletAddress: z.string().max(200).optional(),
  cryptoNetwork: z.string().max(50).optional(),
  platformName: z.string().optional(),
  platformUsername: z.string().max(100).optional(),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  description: z.string().max(500).optional(),
});

type RequestFormData = z.infer<typeof RequestSchema>;

// ─── Profile snapshot (از getUserServiceProfile) ──────────────────────────── //
interface UserProfile {
  name: string;
  phone: string | null;
  phoneVerified: boolean;
  email: string;
}

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
    svcType === 'PAYPAL_TRANSFER' || svcType === 'ONLINE_PAYMENT' || svcType === 'FREELANCE_INCOME'
  );
}

function getAmountLabel(svcType: ServiceTypeKey): string {
  if (svcType === 'CURRENCY_BUY') return 'مبلغ خرید';
  if (svcType === 'CURRENCY_SELL') return 'مبلغ فروش';
  if (svcType === 'CRYPTO_BUY') return 'مقدار خرید';
  if (svcType === 'CRYPTO_SELL') return 'مقدار فروش';
  return 'مبلغ';
}

// mask کردن شماره موبایل برای نمایش
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

// ─── Component ────────────────────────────────────────────────────────────── //

const TransferRequestForm: FC<Props> = ({ telegramLink, whatsappLink }) => {
  // step 0 = service picker, 1 = details, 2 = پیش‌فاکتور / review
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedService, setSelectedService] = useState<ServiceTypeKey | null>(null);
  const [panelDir, setPanelDir] = useState<'fwd' | 'back'>('fwd');
  const [submitting, setSubmitting] = useState(false);
  const [submitShake, setSubmitShake] = useState(false);
  const [formError, setFormError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  // اطلاعات user از server
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // وضعیت احراز هویت — برای مهمان‌ها پیام ورود نمایش می‌دهیم (نه خطای مبهم)
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const idempotencyKey = useRef(crypto.randomUUID());
  const autoSubmitPending = useRef(false);
  const formId = useId();

  const {
    register,
    trigger,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(RequestSchema),
    mode: 'onBlur',
    defaultValues: {
      serviceType: '',
      currency: 'USD',
      urgency: 'NORMAL',
    },
  });

  const amount = watch('amount');
  const currency = watch('currency');
  const destination = watch('destinationCountry');
  const platform = watch('platformName');

  const svcType = selectedService ?? 'INTERNATIONAL_TRANSFER';
  const currencyList = getCurrencyList(svcType);
  const currencyMeta = currencyList.find((c) => c.value === currency) ?? currencyList[0];
  const countryMeta = DESTINATION_COUNTRIES.find((c) => c.value === destination);
  const svcOption = SERVICE_OPTIONS.find((x) => x.key === svcType);

  // ── بارگذاری پروفایل کاربر (بار اول + pre-fill) ─────────────────────────── //
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    prefillApplied.current = true;

    // بارگذاری پروفایل
    setProfileLoading(true);
    // H10: prefill race fix — getServiceProfile data درون res.data است
    // H9: FintechActionResult بازگشتی → .data برای دسترسی به مقادیر
    getUserServiceProfile()
      .then((res) => {
        setProfileLoading(false);
        if (res.success) {
          setUserProfile(res.data);
          setAuthState('authenticated');
        } else if (res.error?.code === 'UNAUTHENTICATED') {
          // کاربر مهمان — فرم باید پیام ورود نشان دهد
          setAuthState('guest');
        }
      })
      .catch(() => {
        setProfileLoading(false);
        setAuthState('guest');
      });

    // بازیابی پیش‌نویس فرم (بعد از ثبت‌نام/ورود برگشت — بدون از دست دادن اطلاعات)
    try {
      const draftRaw = sessionStorage.getItem(TRANSFER_FORM_DRAFT_KEY);
      if (draftRaw) {
        sessionStorage.removeItem(TRANSFER_FORM_DRAFT_KEY);
        const draft = JSON.parse(draftRaw) as FormDraft;
        if (draft.serviceType) {
          setSelectedService(draft.serviceType);
          setValue('serviceType', draft.serviceType);
          setValue('currency', draft.currency ?? 'USD');
          if (draft.amount) setValue('amount', draft.amount);
          if (draft.destinationCountry) setValue('destinationCountry', draft.destinationCountry);
          if (draft.bankName) setValue('bankName', draft.bankName);
          if (draft.description) setValue('description', draft.description);
          if (draft.platformName) setValue('platformName', draft.platformName);
          if (draft.platformUsername) setValue('platformUsername', draft.platformUsername);
          if (draft.walletAddress) setValue('walletAddress', draft.walletAddress);
          if (draft.cryptoNetwork) setValue('cryptoNetwork', draft.cryptoNetwork);
          setPanelDir('fwd');
          setStep(2);
          return; // پیش‌نویس مهم‌تر از prefill هیرو است
        }
      }
    } catch {
      // sessionStorage parse error
    }

    // pre-fill از HeroConverter
    try {
      const raw = sessionStorage.getItem(CONVERTER_PREFILL_KEY);
      if (raw) sessionStorage.removeItem(CONVERTER_PREFILL_KEY);
      const prefill = raw ? (JSON.parse(raw) as ConverterPrefill) : null;

      // H1-fix (2026-08-01): مگامنوی «بازار» لینک
      // /money-transfer?currency=X&type=INTERNATIONAL_TRANSFER#contact می‌سازد.
      // هیچ کامپوننتی این پارامترها را نمی‌خواند — prefill از مگامنو گم می‌شد.
      // حالا هر دو منبع (sessionStorage + query params) با اولویت sessionStorage
      // خوانده می‌شوند تا کلیک روی نرخ مگامنو به فرم پیش‌پر با ارز درست برسد.
      const urlCurr = new URLSearchParams(window.location.search).get('currency');
      const urlType = new URLSearchParams(window.location.search).get('type');

      const toCode = prefill?.toCode;
      const isCryptoPrefill = prefill?.category === 'crypto';
      const targetCode =
        toCode === 'IRT'
          ? prefill?.fromCode
          : (toCode ?? (urlCurr ? normalizeCurrency(urlCurr) : null));
      const isCrypto = isCryptoPrefill || isCryptoCode(targetCode);
      const currList = isCrypto ? CRYPTO_CURRENCIES : FIAT_CURRENCIES;
      const matched = currList.find(
        (c) => c.value.toUpperCase() === (targetCode ?? '').toUpperCase(),
      );
      const currencyVal = matched?.value ?? (isCrypto ? 'USDT' : 'USD');

      // از query param type (مگامنو) → service؛ وگرنه از prefill category
      let service: ServiceTypeKey = 'CURRENCY_BUY';
      if (urlType && SERVICE_OPTIONS.some((o) => o.key === urlType)) {
        service = urlType as ServiceTypeKey;
      } else if (prefill?.category === 'crypto') {
        service = 'CRYPTO_BUY';
      } else if (prefill?.category === 'afghan') {
        service = 'INTERNATIONAL_TRANSFER';
      }

      const faMap: Record<string, string> = {
        '۰': '0',
        '۱': '1',
        '۲': '2',
        '۳': '3',
        '۴': '4',
        '۵': '5',
        '۶': '6',
        '۷': '7',
        '۸': '8',
        '۹': '9',
      };
      const latinAmount = (prefill?.amount ?? '')
        .split('')
        .map((ch) => faMap[ch] ?? ch)
        .join('')
        .replace(/[^\d.]/g, '');

      setSelectedService(service);
      setValue('serviceType', service);
      setValue('currency', currencyVal);
      if (latinAmount) setValue('amount', latinAmount);
      setPanelDir('fwd');
      setStep(1);
    } catch {
      // sessionStorage parse error
    }
  }, [setValue]);

  // ── Service selection ──────────────────────────────────────────────────── //
  const selectService = (key: ServiceTypeKey) => {
    setSelectedService(key);
    setValue('serviceType', key);
    setValue('currency', getDefaultCurrency(key));
    // فیلدهای شرطی سرویس قبلی را پاک کن — در غیر این صورت مقادیر قدیمی
    // (مثلاً آدرس کیف پول سرویس کریپتو قبلی) بی‌صدا با درخواست جدید ارسال می‌شوند.
    setValue('destinationCountry', '');
    setValue('bankName', '');
    setValue('walletAddress', '');
    setValue('cryptoNetwork', '');
    setValue('platformName', '');
    setValue('platformUsername', '');
    setPanelDir('fwd');
    setStep(1);
  };

  // ── Navigation ─────────────────────────────────────────────────────────── //
  const goNext = useCallback(async () => {
    if (step === 1) {
      const ok = await trigger(['amount', 'currency']);
      if (!ok) return;
      // کشور مقصد برای حواله «الزامی» است (در UI با * مشخص شده) ولی در اسکیمای
      // سراسری optional است — این‌جا صریح enforce می‌شود.
      if (needsDestinationCountry(svcType) && !watch('destinationCountry')) {
        setError('destinationCountry', {
          type: 'required',
          message: 'کشور مقصد را انتخاب کنید',
        });
        return;
      }
      setPanelDir('fwd');
      setStep(2);
    }
  }, [step, svcType, trigger, watch, setError]);

  const goBack = useCallback(() => {
    setPanelDir('back');
    if (step === 1) {
      setStep(0);
      setSelectedService(null);
      setValue('serviceType', '');
    } else {
      setStep((p) => (p - 1) as 0 | 1 | 2);
    }
  }, [step, setValue]);

  // ذخیره پیش‌نویس فرم — قبل از رفتن به ثبت‌نام (تدریجی، بدون از دست دادن ورودی)
  const saveDraft = useCallback(() => {
    try {
      const v = watch();
      const draft: FormDraft = {
        serviceType: svcType,
        amount: v.amount,
        currency: v.currency,
        destinationCountry: v.destinationCountry,
        bankName: v.bankName,
        description: v.description,
        platformName: v.platformName,
        platformUsername: v.platformUsername,
        walletAddress: v.walletAddress,
        cryptoNetwork: v.cryptoNetwork,
        urgency: v.urgency,
      };
      sessionStorage.setItem(TRANSFER_FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // sessionStorage ممکن است در دسترس نباشد
    }
  }, [svcType, watch]);

  // ── Submit ─────────────────────────────────────────────────────────────── //
  const doSubmit = useCallback(async () => {
    if (step !== 2) return;
    // مهمان → تدریجی: پیش‌نویس را نگه دار و به ثبت‌نام ببر (گیتِ نهایی، تأیید موبایل است)
    if (authState === 'guest') {
      saveDraft();
      window.location.href = `/auth?callbackUrl=${AUTH_CALLBACK}`;
      return;
    }
    // اگر شماره موبایل ندارد → modal باز کن، submit نکن
    if (userProfile && !userProfile.phone) {
      setShowPhoneModal(true);
      return;
    }
    // دفاع دوم برای کشور مقصد — در صورتی که کاربر از مرحلهٔ ۱ رد شده باشد
    if (needsDestinationCountry(svcType) && !watch('destinationCountry')) {
      setFormError('برای حواله بین‌المللی کشور مقصد را انتخاب کنید.');
      setSubmitShake(true);
      setTimeout(() => setSubmitShake(false), 400);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const formVals = watch();
      const res = await createServiceRequest({
        serviceType: svcType,
        amount: formVals.amount,
        currency: formVals.currency,
        urgency: formVals.urgency,
        idempotencyKey: idempotencyKey.current,
        ...(formVals.destinationCountry ? { destinationCountry: formVals.destinationCountry } : {}),
        ...(formVals.bankName ? { bankName: formVals.bankName } : {}),
        ...(formVals.description ? { description: formVals.description } : {}),
        ...(formVals.walletAddress ? { walletAddress: formVals.walletAddress } : {}),
        ...(formVals.cryptoNetwork ? { cryptoNetwork: formVals.cryptoNetwork } : {}),
        ...(formVals.platformName ? { platformName: formVals.platformName } : {}),
        ...(formVals.platformUsername ? { platformUsername: formVals.platformUsername } : {}),
      });
      if (!res.success) {
        // اگر شماره موبایل نداشت (race condition) → modal باز کن
        if (res.error.code === 'PHONE_REQUIRED') {
          setShowPhoneModal(true);
          return;
        }
        // race: authState هنوز loading بود ولی سرور فهمید مهمان است
        // (فرم هیچ‌جا نام/شماره نمی‌گیرد — MISSING_CONTACT یعنی حساب لازم است)
        if (res.error.code === 'MISSING_CONTACT') {
          saveDraft();
          window.location.href = `/auth?callbackUrl=${AUTH_CALLBACK}`;
          return;
        }
        setFormError(res.error.message);
        setSubmitShake(true);
        setTimeout(() => setSubmitShake(false), 400);
        return;
      }
      setTrackingCode(res.data.trackingCode);
      setSuccess(true);
    } catch {
      setFormError('خطایی رخ داد. لطفاً دوباره تلاش کنید.');
      setSubmitShake(true);
      setTimeout(() => setSubmitShake(false), 400);
    } finally {
      setSubmitting(false);
    }
  }, [step, userProfile, svcType, watch, authState, saveDraft]);

  // ── Auto-submit بعد از تأیید موبایل ──────────────────────────────────── //
  useEffect(() => {
    if (!autoSubmitPending.current) return;
    if (!userProfile?.phone) return;
    autoSubmitPending.current = false;
    doSubmit();
  }, [userProfile, doSubmit]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setSuccess(false);
    setStep(0);
    setSelectedService(null);
    setTrackingCode('');
    setFormError('');
    setPanelDir('fwd');
    idempotencyKey.current = crypto.randomUUID();
    reset();
  };

  // ══════════════════════════════════════════════════════════════════════════ //
  // SUCCESS SCREEN
  // ══════════════════════════════════════════════════════════════════════════ //
  if (success && trackingCode) {
    return (
      <div className={s.successWrap}>
        <div className={s.successRing} aria-hidden="true">
          <svg viewBox="0 0 52 52" className={s.checkSvg} aria-hidden="true">
            <circle className={s.checkCircle} cx="26" cy="26" r="23" fill="none" />
            <path className={s.checkMark} fill="none" d="M14 26 l8 8 16-16" />
          </svg>
        </div>

        <h3 className={s.successTitle}>درخواست ثبت شد</h3>
        <p className={s.successSubtitle}>
          {userProfile?.name ? `${userProfile.name}، ` : ''}تیم ما در کمتر از ۳۰ دقیقه با شما تماس
          می‌گیرد.
        </p>

        <div className={s.codeCard}>
          <p className={s.codeLabel}>کد پیگیری</p>
          <div className={s.codeRow}>
            <span className={s.code} dir="ltr">
              {trackingCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className={s.copyBtn}
              aria-label={copied ? 'کپی شد' : 'کپی کد پیگیری'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className={s.successActions}>
          <button type="button" onClick={resetAll} className={s.btnOutline}>
            درخواست جدید
          </button>
          {/* /track/[code] هر دو نوع کد (معامله و درخواست سرویس) را پشتیبانی می‌کند */}
          <a href={`/track/${trackingCode}`} className={s.btnFill}>
            مشاهده وضعیت ←
          </a>
        </div>

        {(telegramLink || whatsappLink) && (
          <div className={s.quickContact}>
            <span className={s.quickLabel}>پیگیری سریع:</span>
            {telegramLink && (
              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className={s.btnTg}>
                <FaTelegram size={14} /> تلگرام
              </a>
            )}
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={s.btnWa}>
                <FaWhatsapp size={14} /> واتساپ
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════ //
  // MAIN FORM
  // ══════════════════════════════════════════════════════════════════════════ //
  return (
    <>
      <div className={s.formRoot}>
        {/* ── Progress bar (step 1-2) ──────────────────────────────────── */}
        {step >= 1 && (
          <ol className={s.progress} aria-label="مراحل ثبت درخواست">
            {['جزئیات', 'پیش‌فاکتور'].map((label, i) => {
              const n = (i + 1) as 1 | 2;
              const done = step > n;
              const current = step === n;
              return (
                <li
                  key={label}
                  className={s.progressItem}
                  aria-current={current ? 'step' : undefined}
                >
                  <div
                    className={`${s.progressDot} ${done ? s.dotDone : ''} ${current ? s.dotActive : ''}`}
                  >
                    {done ? <Check size={10} /> : <span>{n}</span>}
                  </div>
                  <span className={`${s.progressLabel} ${current ? s.labelActive : ''}`}>
                    {label}
                  </span>
                </li>
              );
            })}
            <div className={s.progressTrack}>
              <div className={s.progressFill} style={{ width: step >= 2 ? '100%' : '0%' }} />
            </div>
          </ol>
        )}

        {/* ── Panel ─────────────────────────────────────────────────────── */}
        <div key={`step-${step}`} className={panelDir === 'fwd' ? s.panelFwd : s.panelBack}>
          {/* ════════════ STEP 0: Service Picker ════════════ */}
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

          {/* ════════════ STEP 1: Service Details ════════════ */}
          {step === 1 && selectedService && (
            <div className={s.stepBody}>
              {/* سرویس انتخابی */}
              <div className={s.recapStrip}>
                {(() => {
                  const Icon = svcOption?.icon ?? Globe;
                  return <Icon size={13} className={s.recapIcon} aria-hidden="true" />;
                })()}
                <span>
                  <strong>{svcOption?.label}</strong>
                </span>
              </div>

              {/* مبلغ + ارز */}
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
                  />
                  <span className={s.amountDivider} aria-hidden />
                  <CurrencySelect
                    items={currencyList}
                    value={currency}
                    onChange={(v) => setValue('currency', v, { shouldValidate: true })}
                    ariaLabel="واحد ارز"
                    size="compact"
                  />
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
                      <strong dir="ltr">
                        {amount} {currencyMeta.label}
                      </strong>{' '}
                      — نرخ دقیق توسط کارشناس تأیید می‌شود
                    </span>
                  </div>
                )}
              </div>

              {/* کشور مقصد (حواله) */}
              {needsDestinationCountry(selectedService) && (
                <>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-country`}>
                      کشور مقصد{' '}
                      <span className={s.req} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <div
                      className={`${s.selectBox} ${errors.destinationCountry ? s.selectBoxErr : ''}`}
                    >
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
                          <option key={c.value} value={c.value}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={s.selectChevron} aria-hidden="true" />
                    </div>
                    {errors.destinationCountry && (
                      <p className={s.fieldError} role="alert">
                        {errors.destinationCountry.message}
                      </p>
                    )}
                  </div>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-bank`}>
                      نام بانک گیرنده <span className={s.optional}>(اختیاری)</span>
                    </label>
                    <input
                      id={`${formId}-bank`}
                      type="text"
                      {...register('bankName')}
                      className={s.input}
                      placeholder="مثلاً: Kabul Bank, Bank Melli …"
                    />
                  </div>
                  {/* مقاصد پرکاربرد */}
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
                            const el = document.querySelector<HTMLSelectElement>(
                              `#${CSS.escape(`${formId}-country`)}`,
                            );
                            if (el) {
                              el.value = v;
                              el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                          }}
                          aria-pressed={destination === v}
                        >
                          <span>{c.flag}</span>
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* کیف پول کریپتو */}
              {needsCryptoFields(selectedService) && (
                <>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-wallet`}>
                      آدرس کیف پول <span className={s.optional}>(اختیاری)</span>
                    </label>
                    <input
                      id={`${formId}-wallet`}
                      type="text"
                      {...register('walletAddress')}
                      className={s.input}
                      dir="ltr"
                      placeholder="0x... یا آدرس TRC20/BEP20 خود را وارد کنید"
                    />
                  </div>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-network`}>
                      شبکه <span className={s.optional}>(اختیاری)</span>
                    </label>
                    <input
                      id={`${formId}-network`}
                      type="text"
                      {...register('cryptoNetwork')}
                      className={s.input}
                      dir="ltr"
                      placeholder="TRC20 / ERC20 / BEP20 / TON …"
                    />
                  </div>
                </>
              )}

              {/* پلتفرم دیجیتال */}
              {needsPlatformFields(selectedService) && (
                <>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel} htmlFor={`${formId}-platform`}>
                      پلتفرم <span className={s.optional}>(اختیاری)</span>
                    </label>
                    <div className={s.selectBox}>
                      <select
                        id={`${formId}-platform`}
                        {...register('platformName')}
                        className={s.select}
                      >
                        <option value="">انتخاب پلتفرم</option>
                        {DIGITAL_PAYMENT_PLATFORMS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
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
                      <input
                        id={`${formId}-pusername`}
                        type="text"
                        {...register('platformUsername')}
                        className={s.input}
                        dir="ltr"
                        placeholder="example@email.com"
                      />
                    </div>
                  )}
                </>
              )}

              {/* توضیحات */}
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

          {/* ════════════ STEP 2: پیش‌فاکتور / Review ════════════ */}
          {step === 2 && (
            <div className={s.stepBody}>
              <div className={s.invoiceHeader}>
                <ReceiptText size={16} className={s.invoiceIcon} aria-hidden="true" />
                <span className={s.invoiceTitle}>پیش‌فاکتور درخواست</span>
              </div>

              {/* ردیف‌های فاکتور */}
              <dl className={s.invoiceRows}>
                <div className={s.invoiceRow}>
                  <dt className={s.invoiceKey}>نوع سرویس</dt>
                  <dd className={s.invoiceVal}>{svcOption?.label ?? '—'}</dd>
                </div>
                <div className={s.invoiceRow}>
                  <dt className={s.invoiceKey}>مبلغ</dt>
                  <dd className={s.invoiceValBig}>
                    <span dir="ltr">{amount}</span>
                    <span className={s.invoiceCurrency}>{currencyMeta.label}</span>
                  </dd>
                </div>
                {destination && countryMeta && (
                  <div className={s.invoiceRow}>
                    <dt className={s.invoiceKey}>مقصد</dt>
                    <dd className={s.invoiceVal}>
                      {countryMeta.flag} {countryMeta.label}
                    </dd>
                  </div>
                )}
              </dl>

              {/* اطلاعات کاربر — از session، نه از فرم */}
              {authState === 'guest' ? (
                <p className={s.guestNote} role="note">
                  <LogIn size={13} aria-hidden="true" />
                  برای ثبت درخواست باید شمارهٔ موبایل تأیید شود — با «ثبت‌نام و ادامه» شروع کنید.
                </p>
              ) : (
                <div className={s.userCard}>
                  <p className={s.userCardTitle}>
                    <BadgeCheck size={13} aria-hidden="true" />
                    اطلاعات حساب کاربری شما
                  </p>
                  {profileLoading ? (
                    <div className={s.profileSkeleton} aria-busy="true">
                      <span className={s.skeletonLine} />
                      <span className={s.skeletonLine} style={{ width: '60%' }} />
                    </div>
                  ) : userProfile ? (
                    <dl className={s.userRows}>
                      {userProfile.name && (
                        <div className={s.userRow}>
                          <User size={12} aria-hidden="true" />
                          <dt className={s.srOnly}>نام</dt>
                          <dd>{userProfile.name}</dd>
                        </div>
                      )}
                      <div className={s.userRow}>
                        <Phone size={12} aria-hidden="true" />
                        <dt className={s.srOnly}>موبایل</dt>
                        {userProfile.phone ? (
                          <dd dir="ltr" className={s.userPhone}>
                            {maskPhone(userProfile.phone)}
                            <span className={s.verifiedBadge} aria-label="تأیید شده">
                              <BadgeCheck size={11} />
                            </span>
                          </dd>
                        ) : (
                          <dd className={s.phoneWarning}>
                            <CircleAlert size={11} aria-hidden="true" />
                            شماره موبایل ثبت نشده
                            <button
                              type="button"
                              className={s.phoneWarningLink}
                              onClick={() => setShowPhoneModal(true)}
                            >
                              افزودن شماره ←
                            </button>
                          </dd>
                        )}
                      </div>
                      <div className={s.userRow}>
                        <Mail size={12} aria-hidden="true" />
                        <dt className={s.srOnly}>ایمیل</dt>
                        <dd dir="ltr">{userProfile.email}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className={s.profileError} role="alert">
                      <AlertCircle size={12} aria-hidden="true" />
                      اطلاعات حساب بارگذاری نشد.
                    </p>
                  )}
                </div>
              )}

              {/* هشدار اگر موبایل نداشت — با trigger برای modal */}
              {userProfile && !userProfile.phone && (
                <div className={s.phoneAlert} role="alert">
                  <CircleAlert size={14} aria-hidden="true" />
                  <span>
                    برای ثبت درخواست شماره موبایل نیاز است.{' '}
                    <button
                      type="button"
                      className={s.phoneAlertLink}
                      onClick={() => setShowPhoneModal(true)}
                    >
                      همین‌جا تأیید کنید ←
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Form error ───────────────────────────────────────────────── */}
        {formError && (
          <div className={s.inlineError} role="alert">
            <AlertCircle size={14} />
            <span>{formError}</span>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────── */}
        {step !== 0 && (
          <div className={s.navRow}>
            <button type="button" onClick={goBack} className={s.btnBack}>
              <ArrowRight size={14} aria-hidden="true" />
              قبلی
            </button>

            {step === 1 ? (
              <button type="button" onClick={goNext} className={s.btnNext}>
                ادامه
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={doSubmit}
                disabled={submitting}
                className={`${s.btnFill} ${s.btnSubmitFull} ${submitShake ? s.shake : ''}`}
              >
                {submitting ? (
                  <>
                    <span className={s.spinner} aria-hidden="true" />
                    <span>در حال ارسال…</span>
                  </>
                ) : userProfile && !userProfile.phone ? (
                  <>
                    <Phone size={14} aria-hidden="true" />
                    <span>تأیید موبایل و ثبت درخواست</span>
                  </>
                ) : authState === 'guest' ? (
                  <>
                    <LogIn size={14} aria-hidden="true" />
                    <span>ثبت‌نام و ادامه</span>
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    <span>تأیید و ثبت درخواست</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Phone Verify Modal ───────────────────────────────────────────── */}
      {showPhoneModal && (
        <PhoneVerifyModal
          onVerified={(phone) => {
            // آپدیت state — phone تأیید شد
            setUserProfile((prev) => (prev ? { ...prev, phone, phoneVerified: true } : prev));
            setShowPhoneModal(false);
            // autoSubmitPending را true کن؛ useEffect پس از render submit را اجرا می‌کند
            autoSubmitPending.current = true;
          }}
          onClose={() => setShowPhoneModal(false)}
        />
      )}
    </>
  );
};

export default TransferRequestForm;
