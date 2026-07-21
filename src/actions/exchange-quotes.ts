'use server';

/**
 * exchange-quotes — Server Actions برای مدیریت قیمت‌گذاری صرافی‌ها
 *
 * جریان:
 *   صراف → submitQuote (PENDING)
 *   ادمین → approveQuote (ACTIVE) یا rejectQuote (REJECTED)
 *   cron  → expireQuotes (EXPIRED)
 *   مشتری → lockQuote (LOCKED) هنگام ثبت معامله
 *
 * P1-2: getActiveQuotes و getActiveCurrencies با safeCache کش می‌شوند
 * P0-6: rate-limit روی submitQuote اضافه شد
 *
 * A1-24 fixes:
 *   C3: expireQuotes نیاز به cron-auth
 *   H5: getExchangeQuotes نیاز به access check
 *   M8: submitQuote ACTIVE قبلی را هم آرشیو کند
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import safeCache, { safeRevalidateTag } from '@/lib/safe-cache';
import type { FintechActionResult } from '@/types/types';
import { headers } from 'next/headers';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuoteRow = {
  id: string;
  exchangeId: string;
  currencyCode: string;
  currencyPair: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  minAmount: string | null;
  maxAmount: string | null;
  status: string;
  validMinutes: number;
  expiresAt: Date | null;
  note: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  submittedById: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  // joined
  exchangeName?: string;
  exchangeCity?: string | null;
  exchangeLogoUrl?: string | null;
};

// ─── Validation ───────────────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'AED',
  'GBP',
  'AFN',
  'TRY',
  'CAD',
  'AUD',
  'CHF',
  'JPY',
  'CNY',
  'SAR',
  'KWD',
  'IQD',
  'RUB',
] as const;

const SubmitQuoteSchema = z
  .object({
    currencyCode: z.enum(SUPPORTED_CURRENCIES, { message: 'کد ارز نامعتبر است' }),
    currencyPair: z.string().min(3).max(12),
    buyRate: z
      .number({ invalid_type_error: 'نرخ خرید باید عدد باشد' })
      .positive('نرخ خرید باید مثبت باشد'),
    sellRate: z
      .number({ invalid_type_error: 'نرخ فروش باید عدد باشد' })
      .positive('نرخ فروش باید مثبت باشد'),
    unit: z.enum(['toman', 'rial', 'afn', 'usd']).default('toman'),
    minAmount: z.number().positive().nullable().optional(),
    maxAmount: z.number().positive().nullable().optional(),
    validMinutes: z.number().int().min(5).max(1440).default(60),
  })
  .refine((d) => d.buyRate <= d.sellRate, {
    message: 'نرخ فروش باید بیشتر یا مساوی نرخ خرید باشد',
    path: ['sellRate'],
  });

// ─── Cache invalidation ───────────────────────────────────────────────────────

function revalidateQuoteCaches(): void {
  revalidateTag('exchange-quotes');
  revalidateTag('transfer-providers');
  revalidateTag('exchange-rates');
  revalidateTag('money-transfer');
  // P1-2: in-memory safeCache را هم پاک کن
  safeRevalidateTag('exchange-quotes');
  safeRevalidateTag('exchange-rates');
}

// ─── READ — کش‌شده (P1-2) ────────────────────────────────────────────────────

/**
 * همه quotes فعال برای نمایش در سایت — با safeCache 60 ثانیه (P1-2)
 *
 * #13 note: TTL=60s waterfall — با SWR در safeCache کاهش یافته.
 * بهتر از unstable_cache + revalidateTag است چون safeCache در-process cache
 * را هم پاک می‌کند (safeRevalidateTag). در revalidateQuoteCaches هر دو صدا زده می‌شوند.
 */
export const getActiveQuotes = safeCache(
  async (currencyCode?: string): Promise<QuoteRow[]> => {
    const now = new Date();
    const rows = await prisma.exchangeRateQuote.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        Exchange: { showInComparison: true, status: 'ACTIVE' },
        ...(currencyCode ? { currencyCode } : {}),
      },
      include: {
        Exchange: { select: { name: true, displayName: true, city: true, logoUrl: true } },
      },
      orderBy: [{ Exchange: { name: 'asc' } }, { currencyCode: 'asc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      exchangeId: r.exchangeId,
      currencyCode: r.currencyCode,
      currencyPair: r.currencyPair,
      buyRate: r.buyRate.toString(),
      sellRate: r.sellRate.toString(),
      unit: r.unit,
      minAmount: r.minAmount?.toString() ?? null,
      maxAmount: r.maxAmount?.toString() ?? null,
      status: r.status,
      validMinutes: r.validMinutes,
      expiresAt: r.expiresAt,
      note: r.note,
      approvedById: r.approvedById,
      approvedAt: r.approvedAt,
      submittedById: r.submittedById,
      version: r.version,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      exchangeName: r.Exchange.displayName ?? r.Exchange.name,
      exchangeCity: r.Exchange.city,
      exchangeLogoUrl: r.Exchange.logoUrl,
    }));
  },
  [] as QuoteRow[],
  { key: 'active-quotes', ttl: 60, tags: ['exchange-quotes', 'exchange-rates'] },
);

/** ارزهای یکتایی که quote ACTIVE دارند — با safeCache 60 ثانیه (P1-2) */
export const getActiveCurrencies = safeCache(
  async (): Promise<string[]> => {
    const now = new Date();
    const rows = await prisma.exchangeRateQuote.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        Exchange: { showInComparison: true, status: 'ACTIVE' },
      },
      select: { currencyCode: true },
      distinct: ['currencyCode'],
      orderBy: { currencyCode: 'asc' },
    });
    return rows.map((r) => r.currencyCode);
  },
  [] as string[],
  { key: 'active-currencies', ttl: 60, tags: ['exchange-quotes', 'exchange-rates'] },
);

/**
 * همه quotes یک صرافی — برای داشبورد صراف (H5: access check اضافه شد)
 *
 * #14 note: این تابع عمداً بدون cache است — داده tenant-specific است
 * و cache کردن آن ریسک data leak بین صرافی‌ها دارد. هر بار fresh load
 * از DB می‌خورد. با revalidateTag('exchange-quotes') بعد از write پوشش داده می‌شود.
 */
export async function getExchangeQuotes(exchangeId: string): Promise<QuoteRow[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.exchangeRateQuote.findMany({
    where: { exchangeId },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    exchangeId: r.exchangeId,
    currencyCode: r.currencyCode,
    currencyPair: r.currencyPair,
    buyRate: r.buyRate.toString(),
    sellRate: r.sellRate.toString(),
    unit: r.unit,
    minAmount: r.minAmount?.toString() ?? null,
    maxAmount: r.maxAmount?.toString() ?? null,
    status: r.status,
    validMinutes: r.validMinutes,
    expiresAt: r.expiresAt,
    note: r.note,
    approvedById: r.approvedById,
    approvedAt: r.approvedAt,
    submittedById: r.submittedById,
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/** همه quotes PENDING — برای داشبورد ادمین */
export async function getPendingQuotes(): Promise<QuoteRow[]> {
  const auth = await requireAdmin();
  if (!auth.success) return [];
  const rows = await prisma.exchangeRateQuote.findMany({
    where: { status: 'PENDING' },
    include: { Exchange: { select: { name: true, displayName: true, city: true, logoUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    exchangeId: r.exchangeId,
    currencyCode: r.currencyCode,
    currencyPair: r.currencyPair,
    buyRate: r.buyRate.toString(),
    sellRate: r.sellRate.toString(),
    unit: r.unit,
    minAmount: r.minAmount?.toString() ?? null,
    maxAmount: r.maxAmount?.toString() ?? null,
    status: r.status,
    validMinutes: r.validMinutes,
    expiresAt: r.expiresAt,
    note: r.note,
    approvedById: r.approvedById,
    approvedAt: r.approvedAt,
    submittedById: r.submittedById,
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
    exchangeCity: r.Exchange.city,
    exchangeLogoUrl: r.Exchange.logoUrl,
  }));
}

// ─── SUBMIT (صراف) ────────────────────────────────────────────────────────────

export async function submitQuote(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<QuoteRow>> {
  // ── P0-6: rate-limit روی submitQuote ──────────────────────────────────────
  const ip = (await headers()).get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`quote-submit:${ip}:${exchangeId}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. لطفاً صبر کنید.' },
    };
  }

  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = SubmitQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'داده نامعتبر';
    return { success: false, error: { code: 'INVALID_INPUT', message: msg } };
  }

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: { id: true, allowedCurrencies: true, quoteAutoExpireMin: true },
  });
  if (!exchange) return { success: false, error: { code: 'NOT_FOUND', message: 'صرافی یافت نشد' } };

  const {
    currencyCode,
    currencyPair,
    buyRate,
    sellRate,
    unit,
    minAmount,
    maxAmount,
    validMinutes,
  } = parsed.data;

  // اگر allowedCurrencies تنظیم شده، بررسی می‌کنیم
  if (exchange.allowedCurrencies.length > 0 && !exchange.allowedCurrencies.includes(currencyCode)) {
    return {
      success: false,
      error: {
        code: 'CURRENCY_NOT_ALLOWED',
        message: `ارز ${currencyCode} برای این صرافی مجاز نیست`,
      },
    };
  }

  // M8: quote قبلی PENDING + ACTIVE همین ارز را آرشیو کن + ایجاد quote جدید + log — همه atomic
  const row = await prisma.$transaction(async (tx) => {
    await tx.exchangeRateQuote.updateMany({
      where: { exchangeId, currencyCode, status: { in: ['PENDING', 'ACTIVE'] } },
      data: { status: 'ARCHIVED' },
    });

    const created = await tx.exchangeRateQuote.create({
      data: {
        exchangeId,
        currencyCode,
        currencyPair,
        buyRate,
        sellRate,
        unit,
        minAmount: minAmount ?? null,
        maxAmount: maxAmount ?? null,
        status: 'PENDING',
        validMinutes: validMinutes ?? exchange.quoteAutoExpireMin,
        submittedById: access.userId,
      },
    });

    await tx.quoteStatusLog.create({
      data: {
        quoteId: created.id,
        toStatus: 'PENDING',
        actorId: access.userId,
        actorRole: 'SARAFI',
      },
    });

    return created;
  });

  revalidateQuoteCaches();
  return {
    success: true,
    data: {
      ...row,
      buyRate: row.buyRate.toString(),
      sellRate: row.sellRate.toString(),
      minAmount: null,
      maxAmount: null,
    },
  };
}

// ─── APPROVE (ادمین) ──────────────────────────────────────────────────────────

export async function approveQuote(
  id: string,
  note?: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const quote = await prisma.exchangeRateQuote.findUnique({ where: { id } });
  if (!quote) return { success: false, error: { code: 'NOT_FOUND', message: 'quote یافت نشد' } };
  if (quote.status !== 'PENDING') {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط quote های PENDING قابل تایید هستند' },
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + quote.validMinutes * 60 * 1000);

  // تمام write ها atomic: آرشیو quote قبلی + تأیید + log
  await prisma.$transaction(async (tx) => {
    // quote قبلی ACTIVE همین ارز را آرشیو کن
    await tx.exchangeRateQuote.updateMany({
      where: {
        exchangeId: quote.exchangeId,
        currencyCode: quote.currencyCode,
        status: 'ACTIVE',
        id: { not: id },
      },
      data: { status: 'ARCHIVED' },
    });

    await tx.exchangeRateQuote.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById: auth.user.id,
        approvedAt: now,
        expiresAt,
        note: note ?? null,
      },
    });

    await tx.quoteStatusLog.create({
      data: {
        quoteId: id,
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        actorId: auth.user.id,
        actorRole: 'ADMIN',
        reason: note ?? null,
        metadata: { expiresAt: expiresAt.toISOString() },
      },
    });
  });

  revalidateQuoteCaches();
  return { success: true, data: { id } };
}

// ─── REJECT (ادمین) ───────────────────────────────────────────────────────────

export async function rejectQuote(
  id: string,
  reason: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  if (!reason?.trim())
    return { success: false, error: { code: 'INVALID_INPUT', message: 'دلیل رد الزامی است' } };

  const quote = await prisma.exchangeRateQuote.findUnique({ where: { id } });
  if (!quote) return { success: false, error: { code: 'NOT_FOUND', message: 'quote یافت نشد' } };
  if (quote.status !== 'PENDING') {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط quote های PENDING قابل رد هستند' },
    };
  }

  // update + log atomic
  await prisma.$transaction(async (tx) => {
    await tx.exchangeRateQuote.update({
      where: { id },
      data: { status: 'REJECTED', note: reason },
    });
    await tx.quoteStatusLog.create({
      data: {
        quoteId: id,
        fromStatus: 'PENDING',
        toStatus: 'REJECTED',
        actorId: auth.user.id,
        actorRole: 'ADMIN',
        reason,
      },
    });
  });

  revalidateQuoteCaches();
  return { success: true, data: { id } };
}

// ─── EXPIRE (cron) ────────────────────────────────────────────────────────────

/** منقضی کردن quote های ACTIVE که expiresAt آن‌ها گذشته — فقط از cron صدا زده می‌شود */
// C3: cron-auth برای محافظت از این endpoint
// این تابع باید از cron route (/api/cron/expire-quotes) صدا زده شود
// که داخل آن verifyCronSecret فراخوانی می‌شود.
export async function expireQuotes(): Promise<{ expired: number }> {
  // C3: این تابع بدون auth — فقط از cron با secret صدا زده شود
  // auth در route handler انجام می‌شود، اینجا pure business logic است
  const now = new Date();
  // #16 fix: ACTIVE و LOCKED هر دو باید expire شوند — LOCKED quotes بی‌نهایت می‌ماندند
  const expired = await prisma.exchangeRateQuote.findMany({
    where: {
      status: { in: ['ACTIVE', 'LOCKED'] },
      expiresAt: { lt: now },
    },
    select: { id: true, status: true },
  });

  if (expired.length === 0) return { expired: 0 };

  const ids = expired.map((q) => q.id);
  await prisma.exchangeRateQuote.updateMany({
    where: { id: { in: ids } },
    data: { status: 'EXPIRED' },
  });
  await prisma.quoteStatusLog.createMany({
    data: expired.map((q) => ({
      quoteId: q.id,
      fromStatus: q.status as 'ACTIVE' | 'LOCKED',
      toStatus: 'EXPIRED' as const,
      actorRole: 'SYSTEM',
      reason: 'auto-expired by cron',
    })),
  });

  revalidateQuoteCaches();
  return { expired: expired.length };
}

// ─── AUTO-SUGGEST ─────────────────────────────────────────────────────────────

/**
 * getSuggestedRatesForExchange — Server Action wrapper برای auto-suggest
 *
 * ExchangeAccess check: فقط اعضای صرافی می‌توانند این را صدا کنند.
 * نرخ پیشنهادی را با spread پیش‌فرض ۱.۵٪ برمی‌گرداند.
 */
export async function getAutoSuggestedRates(
  exchangeId: string,
  currencyCode: string,
  spreadPercent = 1.5,
): Promise<FintechActionResult<import('@/lib/pricing/auto-suggest').SuggestedRate>> {
  const auth = await requireExchangeAccess(exchangeId);
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const { getSuggestedRates } = await import('@/lib/pricing/auto-suggest');
  const result = await getSuggestedRates({ currencyCode, spreadPercent });

  if (!result) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'نرخ بازار برای این ارز یافت نشد' },
    };
  }

  return { success: true, data: result };
}
