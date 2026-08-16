// src/components/money-transfer/serviceOrderOptions.ts
// دیتای مشترک «ثبت سفارش» — کاتالوگ سرویس‌ها، ارزها، کشورها و فیلدهای شرطی.
// جدا شده از TransferRequestForm برای استفادهٔ مشترک (فرم، checkout، marketplace).

import {
  ArrowLeftRight,
  Bitcoin,
  Bus,
  CreditCard,
  DollarSign,
  Globe,
  ReceiptText,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

// ─── Service Types ────────────────────────────────────────────────────────── //

export type ServiceTypeKey =
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
  | 'MOBILE_TOPUP'
  | 'BILL_PAYMENT'
  | 'TRAVEL_TICKET'
  | 'OTHER';

export interface ServiceOption {
  key: ServiceTypeKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  group: 'transfer' | 'currency' | 'crypto' | 'digital';
}

export const SERVICE_OPTIONS: ServiceOption[] = [
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
    sublabel: 'تبدیل ارز خارجی به افغانی',
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
    key: 'MOBILE_TOPUP',
    label: 'شارژ موبایل',
    sublabel: 'MTN، روشن، اتصالات، سلام',
    icon: Smartphone,
    group: 'digital',
  },
  {
    key: 'BILL_PAYMENT',
    label: 'پرداخت قبض',
    sublabel: 'برق DABS، آب، مخابرات',
    icon: ReceiptText,
    group: 'digital',
  },
  {
    key: 'TRAVEL_TICKET',
    label: 'خرید بلیط سفر',
    sublabel: 'هواپیما و اتوبوس بین‌شهری',
    icon: Bus,
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

// ─── کشورها / ارزها ────────────────────────────────────────────────────────── //

export const DESTINATION_COUNTRIES = [
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

/**
 * قانون P0 (AGENTS.md): AFN همیشه اول — این لیست در dropdown به همین ترتیب
 * نمایش داده می‌شود. ترتیب: AFN → USD → EUR → AED → ...
 */
export const FIAT_CURRENCIES = [
  { value: 'AFN', code: 'AFN', label: 'افغانی', symbol: '؋' },
  { value: 'USD', code: 'USD', label: 'دلار آمریکا', symbol: '$' },
  { value: 'EUR', code: 'EUR', label: 'یورو', symbol: '€' },
  { value: 'AED', code: 'AED', label: 'درهم امارات', symbol: 'د.إ' },
  { value: 'GBP', code: 'GBP', label: 'پوند', symbol: '£' },
  { value: 'SAR', code: 'SAR', label: 'ریال عربستان', symbol: '﷼' },
  { value: 'CAD', code: 'CAD', label: 'دلار کانادا', symbol: 'C$' },
  { value: 'AUD', code: 'AUD', label: 'دلار استرالیا', symbol: 'A$' },
  { value: 'TRY', code: 'TRY', label: 'لیر ترکیه', symbol: '₺' },
  { value: 'PKR', code: 'PKR', label: 'روپیه پاکستان', symbol: '₨' },
  { value: 'IRR', code: 'IRR', label: 'ریال ایران', symbol: '﷼' },
  { value: 'OTHER', code: '···', label: 'سایر ارز', symbol: '¤' },
];

export const CRYPTO_CURRENCIES = [
  { value: 'USDT', code: 'USDT', label: 'تتر', symbol: '₮' },
  { value: 'BTC', code: 'BTC', label: 'بیت‌کوین', symbol: '₿' },
  { value: 'ETH', code: 'ETH', label: 'اتریوم', symbol: 'Ξ' },
  { value: 'BNB', code: 'BNB', label: 'بایننس کوین', symbol: 'B' },
  { value: 'TRX', code: 'TRX', label: 'ترون', symbol: '♦' },
  { value: 'TON', code: 'TON', label: 'تون', symbol: '◎' },
  { value: 'USDC', code: 'USDC', label: 'یو‌اس‌دی‌سی', symbol: '$' },
  { value: 'OTHER', code: '···', label: 'سایر کوین', symbol: '¤' },
];

export const DIGITAL_PAYMENT_PLATFORMS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'skrill', label: 'Skrill' },
  { value: 'wise', label: 'Wise' },
  { value: 'neteller', label: 'Neteller' },
  { value: 'perfectmoney', label: 'Perfect Money' },
  { value: 'other', label: 'سایر' },
];

// ─── فیلدهای شرطی سرویس‌های جدید (2026-08-16) ──────────────────────────────── //

export const MOBILE_OPERATORS = [
  { value: 'mtn', label: 'MTN' },
  { value: 'roshan', label: 'روشن' },
  { value: 'etisalat', label: 'اتصالات' },
  { value: 'awcc', label: 'AWCC' },
  { value: 'salaam', label: 'سلام' },
];

export const BILL_TYPES = [
  { value: 'electricity', label: 'برق (DABS)' },
  { value: 'water', label: 'آب' },
  { value: 'telecom', label: 'مخابرات' },
];

export const GIFT_CARD_BRANDS = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'googleplay', label: 'Google Play' },
  { value: 'apple', label: 'Apple / iTunes' },
  { value: 'steam', label: 'Steam' },
  { value: 'psn', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'other', label: 'سایر' },
];

export const TRAVEL_ROUTES = [
  { value: 'kbl-dxb', label: 'کابل ← دبی' },
  { value: 'kbl-ist', label: 'کابل ← استانبول' },
  { value: 'kbl-del', label: 'کابل ← دهلی' },
  { value: 'hrt-mshd', label: 'هرات ← مشهد' },
  { value: 'kbl-mzar-bus', label: 'اتوبوس کابل ← مزار' },
  { value: 'other', label: 'مسیر دیگر' },
];

// ─── نگاشت عنوان فارسی ارز ↔ کد (برای deep-link مگامنو) ───────────────────── //

export function normalizeCurrency(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const up = t.toUpperCase();
  if (/^[A-Z]{3,5}$/.test(up)) return up;
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

export function isCryptoCode(code?: string | null): boolean {
  if (!code) return false;
  return /^(USDT|BTC|ETH|BNB|TRX|TON|USDC|SOL|XRP|ADA|DOGE)$/i.test(code.toUpperCase());
}

// ─── قواعد فیلدهای شرطی ────────────────────────────────────────────────────── //

export function getDefaultCurrency(svcType: ServiceTypeKey): string {
  if (svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL') return 'USDT';
  // سرویس‌های افغانی‌محور از افغانی شروع می‌شوند (قانون AFN-first)
  if (svcType === 'MOBILE_TOPUP' || svcType === 'BILL_PAYMENT' || svcType === 'TRAVEL_TICKET')
    return 'AFN';
  return 'USD';
}

export function getCurrencyList(svcType: ServiceTypeKey) {
  if (svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL') return CRYPTO_CURRENCIES;
  return FIAT_CURRENCIES;
}

export function needsDestinationCountry(svcType: ServiceTypeKey) {
  return svcType === 'INTERNATIONAL_TRANSFER';
}

export function needsCryptoFields(svcType: ServiceTypeKey) {
  return svcType === 'CRYPTO_BUY' || svcType === 'CRYPTO_SELL';
}

export function needsPlatformFields(svcType: ServiceTypeKey) {
  return (
    svcType === 'PAYPAL_TRANSFER' || svcType === 'ONLINE_PAYMENT' || svcType === 'FREELANCE_INCOME'
  );
}

/** سرویس‌های افغانی‌محور که نرخ ارز نمی‌خواهند — مبلغ مستقیم افغانی است */
export function isAfnService(svcType: ServiceTypeKey) {
  return svcType === 'MOBILE_TOPUP' || svcType === 'BILL_PAYMENT' || svcType === 'TRAVEL_TICKET';
}

export function needsMobileFields(svcType: ServiceTypeKey) {
  return svcType === 'MOBILE_TOPUP';
}

export function needsBillFields(svcType: ServiceTypeKey) {
  return svcType === 'BILL_PAYMENT';
}

export function needsGiftCardFields(svcType: ServiceTypeKey) {
  return svcType === 'GIFT_CARD' || svcType === 'OTHER';
}

export function needsTravelFields(svcType: ServiceTypeKey) {
  return svcType === 'TRAVEL_TICKET';
}

export function needsWebsiteField(svcType: ServiceTypeKey) {
  return svcType === 'ONLINE_PAYMENT' || svcType === 'SOFTWARE_PURCHASE' || svcType === 'GIFT_CARD';
}

export function getAmountLabel(svcType: ServiceTypeKey): string {
  if (svcType === 'CURRENCY_BUY') return 'مبلغ خرید';
  if (svcType === 'CURRENCY_SELL') return 'مبلغ فروش';
  if (svcType === 'CRYPTO_BUY') return 'مقدار خرید';
  if (svcType === 'CRYPTO_SELL') return 'مقدار فروش';
  return 'مبلغ';
}
