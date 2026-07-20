/**
 * money-transfer/providers
 * ----------------------------------------------------------------------------
 * داده‌ی provider های صرافی/انتقال پول برای مقایسه‌ی نرخ.
 *
 * 2026-07-05: این ماژول قبلاً شامل یک آرایه‌ی hardcode (`TRANSFER_PROVIDERS`)
 * بود. حالا provider ها از جدول `TransferProvider` در دیتابیس خوانده می‌شوند
 * تا ادمین بتواند بدون deploy نرخ‌ها را به‌روز کند.
 *
 *   - `loadActiveTransferProviders()`: query async از DB (با کش)
 *   - `getTransferProviderKindLabel()`: تبدیل enum به label فارسی برای UI
 *   - `TRANSFER_PROVIDER_KIND` / `TransferFeature`: type-only constants
 *
 * نکته: اگر DB fail شود، آرایه‌ی `FALLBACK_PROVIDERS` به‌عنوان stale-safe
 * برگردانده می‌شود تا صفحه crash نکند.
 * ----------------------------------------------------------------------------
 */

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

// app-level constants (DB-side enum در Prisma این‌ها را enforce می‌کند)
export type TransferKind = 'SARAJI' | 'ONLINE' | 'BANK' | 'CRYPTO';

export const TRANSFER_PROVIDER_KIND: ReadonlyArray<TransferKind> = [
  'SARAJI',
  'ONLINE',
  'BANK',
  'CRYPTO',
] as const;

/** labels فارسی برای نمایش در UI — تنها منبع truth برای label. */
export const TRANSFER_KIND_LABELS: Record<TransferKind, string> = {
  SARAJI: 'صرافی',
  ONLINE: 'سرویس آنلاین',
  BANK: 'بانک',
  CRYPTO: 'رمزارز',
};

/** پرچم قابلیت‌ها — مقادیر معتبر برای فیلد `features`. */
export type TransferFeature = 'live-rate' | 'fee-transparent' | 'cash-pickup' | 'bank-transfer';
export const TRANSFER_FEATURES: ReadonlyArray<TransferFeature> = [
  'live-rate',
  'fee-transparent',
  'cash-pickup',
  'bank-transfer',
] as const;

/** shape مصرفی توسط API/UI — مستقل از Prisma. */
export interface TransferProvider {
  /** slug یکتا — همان providerId در API */
  id: string;
  /** نام فارسی */
  name: string;
  /** نوع سرویس */
  kind: TransferKind;
  /** label فارسی kind (برای راحتی UI) */
  kindLabel: string;
  /** درصد markup روی نرخ بازار (مثلاً 0.7 یعنی ۰٫۷٪ بالاتر از بازار) */
  spreadPercent: number;
  /** کارمزد ثابت به تومان */
  flatFeeToman: number;
  /** سرعت تقریبی انتقال (دقیقه) */
  speedMinutes: number;
  /** پرچم قابلیت‌ها */
  features: ReadonlyArray<TransferFeature>;
  /** فعال/غیرفعال */
  active: boolean;
  /** ترتیب نمایش (کوچک‌تر = بالاتر) */
  order: number;
  /** توضیح کوتاه */
  description: string | null;
}

/**
 * fallback ایستا — در صورت fail شدن DB برگردانده می‌شود.
 * این مقادیر باید با seed اولیه هم‌خوانی داشته باشند تا در حالت fail رفتار
 * صفحه قابل پیش‌بینی باقی بماند.
 */
export const FALLBACK_PROVIDERS: ReadonlyArray<TransferProvider> = [
  {
    id: 'market-mid',
    name: 'نرخ میانگین بازار',
    kind: 'SARAJI',
    kindLabel: TRANSFER_KIND_LABELS.SARAJI,
    spreadPercent: 0,
    flatFeeToman: 0,
    speedMinutes: 0,
    features: ['live-rate', 'fee-transparent'],
    active: true,
    order: 1,
    description: 'مرجع میانگین بازار آزاد',
  },
  {
    id: 'tgju',
    name: 'TGJU (مرجع)',
    kind: 'SARAJI',
    kindLabel: TRANSFER_KIND_LABELS.SARAJI,
    spreadPercent: 0.2,
    flatFeeToman: 0,
    speedMinutes: 5,
    features: ['live-rate', 'fee-transparent'],
    active: true,
    order: 2,
    description: 'نرخ مرجع وب‌سایت TGJU',
  },
  {
    id: 'wise',
    name: 'Wise',
    kind: 'ONLINE',
    kindLabel: TRANSFER_KIND_LABELS.ONLINE,
    spreadPercent: 0.7,
    flatFeeToman: 35_000,
    speedMinutes: 60 * 4,
    features: ['live-rate', 'fee-transparent', 'bank-transfer'],
    active: true,
    order: 3,
    description: 'نرخ میانی بازار با شفافیت کارمزد',
  },
] as const;

/**
 * Map رکورد DB به TransferProvider. عمدتاً برای normalize کردن enum و اضافه
 * کردن kindLabel به کار می‌رود.
 */
type DbTransferProvider = {
  slug: string;
  name: string;
  kind: string;
  spreadPercent: number;
  flatFeeToman: number;
  speedMinutes: number;
  features: string[];
  active: boolean;
  order: number;
  description: string | null;
};

function mapDbToProvider(row: DbTransferProvider): TransferProvider {
  // kind را به یکی از مقادیر معتبر cast می‌کنیم؛ اگر DB مقدار نامعتبر داشت
  // (مثلاً قدیمی)، به‌عنوان SARAJI نمایش داده می‌شود.
  const kind: TransferKind = TRANSFER_PROVIDER_KIND.includes(row.kind as TransferKind)
    ? (row.kind as TransferKind)
    : 'SARAJI';
  const features = (row.features ?? []).filter((f): f is TransferFeature =>
    (TRANSFER_FEATURES as ReadonlyArray<string>).includes(f),
  );
  return {
    id: row.slug,
    name: row.name,
    kind,
    kindLabel: TRANSFER_KIND_LABELS[kind],
    spreadPercent: row.spreadPercent,
    flatFeeToman: row.flatFeeToman,
    speedMinutes: row.speedMinutes,
    features,
    active: row.active,
    order: row.order,
    description: row.description,
  };
}

/**
 * خواندن همه‌ی provider های فعال از DB. اگر DB fail کند، مقدار stale cache
 * یا در نهایت `FALLBACK_PROVIDERS` برگردانده می‌شود.
 *
 * کش: ۶۰ ثانیه (safe-cache in-memory). هنگام تغییر provider در داشبورد،
 * tag `transfer-providers` با `revalidateTag` باید invalidate شود (todo:
 * پیاده‌سازی در داشبورد).
 */
export const loadActiveTransferProviders = safeCache(
  async (): Promise<ReadonlyArray<TransferProvider>> => {
    const rows = await prisma.transferProvider.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    return rows.map(mapDbToProvider);
  },
  FALLBACK_PROVIDERS,
  {
    key: 'money-transfer:active-providers',
    ttl: 60,
    tags: ['transfer-providers', 'exchange-rates', 'money-transfer'],
  },
);

export default loadActiveTransferProviders;
