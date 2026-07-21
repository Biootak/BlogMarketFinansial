'use server';

/**
 * transfer-providers — Server Actions CRUD کامل برای مدیریت TransferProvider.
 *
 * دو سطح دسترسی:
 *   OWNER/ADMIN پلتفرم: همه provider ها را می‌بینند و مدیریت می‌کنند.
 *   صراف (Exchange): فقط provider مخصوص خودش را ایجاد/ویرایش می‌کند.
 *
 * Cache: tag `transfer-providers` revalidate می‌شود پس از هر نوشتن.
 * Shape: { success: true, data } | { success: false, error: { code, message } }
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import type { FintechActionResult } from '@/types/types';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';

// ─── Validation Schema ────────────────────────────────────────────────────────

const TRANSFER_KIND_VALUES = ['SARAJI', 'ONLINE', 'BANK', 'CRYPTO'] as const;
const TRANSFER_FEATURE_VALUES = [
  'live-rate',
  'fee-transparent',
  'cash-pickup',
  'bank-transfer',
] as const;

const ProviderSchema = z.object({
  slug: z
    .string()
    .min(2, 'slug حداقل ۲ کاراکتر')
    .max(64, 'slug حداکثر ۶۴ کاراکتر')
    .regex(/^[a-z0-9-]+$/, 'slug فقط حروف انگلیسی کوچک، اعداد و خط تیره'),
  name: z.string().min(2, 'نام الزامی است').max(100, 'نام حداکثر ۱۰۰ کاراکتر'),
  kind: z.enum(TRANSFER_KIND_VALUES, { message: 'نوع سرویس نامعتبر است' }),
  spreadPercent: z
    .number({ invalid_type_error: 'عدد وارد کنید' })
    .min(0, 'spread نمی‌تواند منفی باشد')
    .max(50, 'spread حداکثر ۵۰٪'),
  flatFeeToman: z
    .number({ invalid_type_error: 'عدد وارد کنید' })
    .int('کارمزد ثابت باید عدد صحیح باشد')
    .min(0, 'کارمزد نمی‌تواند منفی باشد')
    .max(10_000_000, 'کارمزد خیلی زیاد است'),
  speedMinutes: z
    .number({ invalid_type_error: 'عدد وارد کنید' })
    .int('زمان باید عدد صحیح باشد')
    .min(0, 'زمان نمی‌تواند منفی باشد'),
  features: z.array(z.enum(TRANSFER_FEATURE_VALUES)).default([]),
  active: z.boolean().default(true),
  order: z
    .number({ invalid_type_error: 'عدد وارد کنید' })
    .int('ترتیب باید عدد صحیح باشد')
    .min(1, 'ترتیب حداقل ۱')
    .max(9999),
  description: z.string().max(500, 'توضیح حداکثر ۵۰۰ کاراکتر').nullable().optional(),
  logoUrl: z.string().url('آدرس لوگو نامعتبر است').nullable().optional(),
});

// schema ساده‌تر برای صراف — فقط فیلدهای مجاز
const ExchangeProviderUpdateSchema = z.object({
  name: z.string().min(2, 'نام الزامی است').max(100),
  spreadPercent: z.number({ invalid_type_error: 'عدد وارد کنید' }).min(0).max(50),
  flatFeeToman: z.number({ invalid_type_error: 'عدد وارد کنید' }).int().min(0).max(10_000_000),
  speedMinutes: z.number({ invalid_type_error: 'عدد وارد کنید' }).int().min(0),
  features: z.array(z.enum(TRANSFER_FEATURE_VALUES)).default([]),
  active: z.boolean().default(true),
  description: z.string().max(500).nullable().optional(),
  logoUrl: z.string().url('آدرس لوگو نامعتبر است').nullable().optional(),
});

const CreateSchema = ProviderSchema;
const UpdateSchema = ProviderSchema.partial().omit({ slug: true });

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransferProviderRow = {
  id: string;
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
  logoUrl: string | null;
  exchangeId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Cache invalidation helper ────────────────────────────────────────────────

/**
 * هر دو لایه کش را یکجا bust می‌کند:
 *   1. Next.js Data Cache (unstable_cache) از طریق revalidateTag
 *   2. in-memory safeCache از طریق safeRevalidateTag
 */
function revalidateProviderCaches(): void {
  for (const tag of ['transfer-providers', 'exchange-rates', 'money-transfer'] as const) {
    revalidateTag(tag);
    safeRevalidateTag(tag);
  }
}

// ─── READ — Platform Admin ────────────────────────────────────────────────────

export const getTransferProviders = unstable_cache(
  async (): Promise<TransferProviderRow[]> => {
    return prisma.transferProvider.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    }) as Promise<TransferProviderRow[]>;
  },
  ['transfer-providers:list:v1'],
  { revalidate: 60, tags: ['transfer-providers'] },
);

// ─── READ — Exchange-scoped ───────────────────────────────────────────────────

/**
 * خواندن provider مخصوص یک صرافی (یا null اگر هنوز ثبت نشده).
 * غیر-cached تا همیشه آخرین مقدار برگردانده شود.
 */
export async function getExchangeProvider(exchangeId: string): Promise<TransferProviderRow | null> {
  const row = await prisma.transferProvider.findFirst({
    where: { exchangeId },
  });
  return row as TransferProviderRow | null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createTransferProvider(
  raw: unknown,
): Promise<FintechActionResult<TransferProviderRow>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'داده نامعتبر';
    return { success: false, error: { code: 'INVALID_INPUT', message: msg } };
  }

  const data = parsed.data;

  const existing = await prisma.transferProvider.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE_SLUG', message: `slug «${data.slug}» قبلاً ثبت شده است` },
    };
  }

  const row = await prisma.transferProvider.create({
    data: {
      slug: data.slug,
      name: data.name,
      kind: data.kind,
      spreadPercent: data.spreadPercent,
      flatFeeToman: data.flatFeeToman,
      speedMinutes: data.speedMinutes,
      features: data.features,
      active: data.active,
      order: data.order,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
    },
  });

  revalidateProviderCaches();
  return { success: true, data: row as TransferProviderRow };
}

// ─── CREATE OR UPDATE — Exchange-scoped ──────────────────────────────────────

/**
 * صراف می‌تواند نرخ خودش را ثبت یا آپدیت کند.
 * اگر provider مخصوص صراف وجود نداشته باشد، ساخته می‌شود.
 * slug = `sarafi-{exchangeId}` (prefix ثابت + id صراف).
 */
export async function upsertExchangeProvider(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<TransferProviderRow>> {
  // A1-fix: از requireExchangeAccess در exchange-auth.ts استفاده می‌کنیم (single source of truth)
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

  const parsed = ExchangeProviderUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'داده نامعتبر';
    return { success: false, error: { code: 'INVALID_INPUT', message: msg } };
  }

  const {
    name,
    spreadPercent,
    flatFeeToman,
    speedMinutes,
    features,
    active,
    description,
    logoUrl,
  } = parsed.data;

  // بررسی وجود صرافی
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: { id: true, name: true },
  });
  if (!exchange) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'صرافی یافت نشد' } };
  }

  const slug = `sarafi-${exchangeId}`;

  // upsert: اگر موجود نبود بساز، اگر موجود بود آپدیت کن
  const row = await prisma.transferProvider.upsert({
    where: { slug },
    create: {
      slug,
      name,
      kind: 'SARAJI',
      spreadPercent,
      flatFeeToman,
      speedMinutes,
      features,
      active,
      order: 50, // قبل از provider های سیستمی با order بالا
      description: description ?? null,
      logoUrl: logoUrl ?? null,
      exchangeId,
    },
    update: {
      name,
      spreadPercent,
      flatFeeToman,
      speedMinutes,
      features,
      active,
      description: description ?? null,
      logoUrl: logoUrl ?? null,
    },
  });

  revalidateProviderCaches();
  return { success: true, data: row as TransferProviderRow };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateTransferProvider(
  id: string,
  raw: unknown,
): Promise<FintechActionResult<TransferProviderRow>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  if (!id) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'شناسه الزامی است' } };
  }

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'داده نامعتبر';
    return { success: false, error: { code: 'INVALID_INPUT', message: msg } };
  }

  const existing = await prisma.transferProvider.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'صرافی یافت نشد' } };
  }

  const row = await prisma.transferProvider.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
    },
  });

  revalidateProviderCaches();
  return { success: true, data: row as TransferProviderRow };
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleTransferProvider(
  id: string,
  active: boolean,
): Promise<FintechActionResult<{ id: string; active: boolean }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const row = await prisma.transferProvider.update({
    where: { id },
    data: { active },
    select: { id: true, active: true },
  });

  revalidateProviderCaches();
  return { success: true, data: row };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteTransferProvider(id: string): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const existing = await prisma.transferProvider.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'صرافی یافت نشد' } };
  }

  await prisma.transferProvider.delete({ where: { id } });

  revalidateProviderCaches();
  return { success: true, data: { id } };
}

// ─── REORDER ─────────────────────────────────────────────────────────────────

export async function reorderTransferProviders(
  items: { id: string; order: number }[],
): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  await prisma.$transaction(
    items.map((item) =>
      prisma.transferProvider.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    ),
  );

  revalidateProviderCaches();
  return { success: true, data: undefined };
}
