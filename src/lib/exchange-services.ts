/**
 * 2026-07-28: Catalog مرکزی سرویس‌های آنلاین صرافی‌ها.
 *
 * - هر سرویس یک کلید canonical دارد که با ServiceType enum یکسان است
 *   تا با جدول ServiceRequest موجود سازگار باشد.
 * - هیچ صرافی حق تعریف سرویس جدید با کلید دلخواه ندارد — UI یکپارچه می‌ماند.
 * - ترتیب پیش‌فرض برای وقتی است که صرافی order تعیین نکرده.
 *
 * اضافه کردن سرویس جدید:
 *   ۱. ServiceType enum در schema.prisma → مقدار جدید
 *   ۲. prisma migrate
 *   ۳. این فایل → entry جدید با همان کلید
 *
 * حذف سرویس:
 *   - فقط اگر هیچ صرافی آن را فعال نکرده. در غیر این صورت
 *     status='deprecated' بگذارید تا صرافی‌ها بتوانند مهاجرت کنند.
 */
import {
  Banknote,
  Bitcoin,
  Coins,
  CreditCard,
  Gift,
  Globe2,
  GraduationCap,
  Layers,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type ExchangeServiceKey =
  | 'CURRENCY_BUY'
  | 'CURRENCY_SELL'
  | 'INTERNATIONAL_TRANSFER'
  | 'ONLINE_PAYMENT'
  | 'TUITION_PAYMENT'
  | 'GIFT_CARD'
  | 'CRYPTO_BUY'
  | 'CRYPTO_SELL'
  | 'PAYPAL_TRANSFER'
  | 'SOFTWARE_PURCHASE';

export interface ExchangeServiceMeta {
  /** کلید canonical — همان مقدار ServiceType enum */
  key: ExchangeServiceKey;
  /** نام فارسی کوتاه برای کارت */
  name: string;
  /** توضیح ۱ جمله‌ای — همان در همه جا استفاده می‌شود مگر صرافی override کند */
  description: string;
  /** آیکن Lucide */
  icon: LucideIcon;
  /** accent token — به جای hex از token های ds */
  accent: 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'orange' | 'indigo' | 'lime' | 'slate';
  /** گروه‌بندی برای marketplace */
  group: 'currency' | 'transfer' | 'payment' | 'crypto' | 'specialty';
  /** ترتیب پیش‌فرض (وقتی صرافی order نداده) */
  defaultOrder: number;
}

export const EXCHANGE_SERVICE_CATALOG: readonly ExchangeServiceMeta[] = [
  {
    key: 'CURRENCY_BUY',
    name: 'خرید ارز',
    description: 'خرید دلار، یورو و سایر ارزهای رایج با نرخ روز و تسویه سریع.',
    icon: Banknote,
    accent: 'emerald',
    group: 'currency',
    defaultOrder: 10,
  },
  {
    key: 'CURRENCY_SELL',
    name: 'فروش ارز',
    description: 'فروش ارز به صرافی با بهترین نرخ و تسویه در همان روز.',
    icon: Coins,
    accent: 'amber',
    group: 'currency',
    defaultOrder: 20,
  },
  {
    key: 'INTERNATIONAL_TRANSFER',
    name: 'حواله بین‌المللی',
    description: 'ارسال حواله به سراسر دنیا از طریق شبکه‌های معتبر بانکی.',
    icon: Globe2,
    accent: 'sky',
    group: 'transfer',
    defaultOrder: 30,
  },
  {
    key: 'PAYPAL_TRANSFER',
    name: 'انتقال پی‌پال و اسکریل',
    description: 'شارژ حساب پی‌پال، Payoneer، Skrill و Wise.',
    icon: Wallet,
    accent: 'indigo',
    group: 'transfer',
    defaultOrder: 40,
  },
  {
    key: 'ONLINE_PAYMENT',
    name: 'پرداخت آنلاین',
    description: 'پرداخت هزینه خدمات، اشتراک و فاکتورهای بین‌المللی.',
    icon: CreditCard,
    accent: 'teal',
    group: 'payment',
    defaultOrder: 50,
  },
  {
    key: 'TUITION_PAYMENT',
    name: 'پرداخت شهریه',
    description: 'پرداخت شهریه دانشگاه‌های خارجی و هزینه ویزا.',
    icon: GraduationCap,
    accent: 'violet',
    group: 'payment',
    defaultOrder: 60,
  },
  {
    key: 'CRYPTO_BUY',
    name: 'خرید ارز دیجیتال',
    description: 'خرید بیت‌کوین، اتریوم و سایر رمزارزها.',
    icon: Bitcoin,
    accent: 'orange',
    group: 'crypto',
    defaultOrder: 70,
  },
  {
    key: 'CRYPTO_SELL',
    name: 'فروش ارز دیجیتال',
    description: 'فروش رمزارز و تسویه به ریال یا ارز.',
    icon: Layers,
    accent: 'lime',
    group: 'crypto',
    defaultOrder: 80,
  },
  {
    key: 'GIFT_CARD',
    name: 'گیفت کارت',
    description: 'خرید و فروش گیفت کارت‌های بین‌المللی.',
    icon: Gift,
    accent: 'rose',
    group: 'specialty',
    defaultOrder: 90,
  },
  {
    key: 'SOFTWARE_PURCHASE',
    name: 'خرید نرم‌افزار',
    description: 'پرداخت هزینه لایسنس و اشتراک سرویس‌های نرم‌افزاری.',
    icon: ShoppingBag,
    accent: 'slate',
    group: 'specialty',
    defaultOrder: 100,
  },
] as const;

const CATALOG_INDEX: Record<ExchangeServiceKey, ExchangeServiceMeta> =
  EXCHANGE_SERVICE_CATALOG.reduce(
    (acc, item) => {
      acc[item.key] = item;
      return acc;
    },
    {} as Record<ExchangeServiceKey, ExchangeServiceMeta>,
  );

export function getServiceMeta(key: string): ExchangeServiceMeta | undefined {
  return (CATALOG_INDEX as Record<string, ExchangeServiceMeta | undefined>)[key];
}

export function isValidServiceKey(key: string): key is ExchangeServiceKey {
  return key in CATALOG_INDEX;
}

export const SERVICE_GROUPS: Record<
  ExchangeServiceMeta['group'],
  { label: string; description: string }
> = {
  currency: {
    label: 'ارز فیات',
    description: 'خرید و فروش ارزهای رایج',
  },
  transfer: {
    label: 'حواله و انتقال',
    description: 'ارسال وجه و انتقال بین سیستم‌های مالی',
  },
  payment: {
    label: 'پرداخت',
    description: 'پرداخت فاکتور، شهریه و خدمات',
  },
  crypto: {
    label: 'ارز دیجیتال',
    description: 'خرید و فروش رمزارز',
  },
  specialty: {
    label: 'سرویس‌های ویژه',
    description: 'گیفت کارت، لایسنس و سایر خدمات',
  },
};
