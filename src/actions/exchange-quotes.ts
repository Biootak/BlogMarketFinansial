'use server';

/**
 * exchange-quotes — Server Actions برای مدیریت قیمت‌گذاری صرافی‌ها
 *
 * جریان:
 *   صراف → submitQuote (PENDING)
 *   ادمین → approveQuote (ACTIVE) یا rejectQuote (REJECTED)
 *   cron  → expireQuotes (EXPIRED)
 *   مشتری → lockQuote (LOCKED) هنگام ثبت معامله
 */

import prisma from '@/lib/db';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

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
  for (const tag of [
    'exchange-quotes',
    'transfer-providers',
    'exchange-rates',
    'money-transfer',
  ] as const) {
    revalidateTag(tag);
    safeRevalidateTag(tag);
  }
}

// ─── Auth helper برای صراف ────────────────────────────────────────────────────

async function requireExchangeAccess(
  exchangeId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: { code: string; message: string } }> {
  const auth = await requireUser();
  if (!auth.success) return { ok: false, error: { code: auth.code, message: auth.message } };
  const { user } = auth;
  if (user.role === 'OWNER' || user.role === 'ADMIN') return { ok: true, userId: user.id };

  const staff = await prisma.exchangeStaff.findFirst({
    where: { exchangeId, userId: user.id, revokedAt: null, role: { in: ['OWNER', 'MANAGER'] } },
    select: { id: true },
  });
  if (!staff)
    return {
      ok: false,
      error: { code: 'FORBIDDEN', message: 'فقط مدیران صرافی می‌توانند قیمت ثبت کنند' },
    };
  return { ok: true, userId: user.id };
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/** همه quotes فعال برای نمایش در سایت — با اطلاعات صرافی */
export async function getActiveQuotes(currencyCode?: string): Promise<QuoteRow[]> {
  const now = new Date();
  const rows = await prisma.exchangeRateQuote.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: now },
      Exchange: { showInComparison: true, status: 'ACTIVE' },
      ...(currencyCode ? { currencyCode } : {}),
    },
    include: { Exchange: { select: { name: true, displayName: true, city: true, logoUrl: true } } },
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
}

/** ارزهای یکتایی که quote ACTIVE دارند — برای چرخش در جدول */
export async function getActiveCurrencies(): Promise<string[]> {
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
}

/** همه quotes یک صرافی — برای داشبورد صراف */
export async function getExchangeQuotes(exchangeId: string): Promise<QuoteRow[]> {
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
): Promise<ActionResult<QuoteRow>> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { success: false, error: access.error };

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

  // quote قبلی PENDING همین ارز را آرشیو کن
  await prisma.exchangeRateQuote.updateMany({
    where: { exchangeId, currencyCode, status: { in: ['PENDING'] } },
    data: { status: 'ARCHIVED' },
  });

  const row = await prisma.exchangeRateQuote.create({
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

  await prisma.quoteStatusLog.create({
    data: { quoteId: row.id, toStatus: 'PENDING', actorId: access.userId, actorRole: 'SARAFI' },
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
): Promise<ActionResult<{ id: string }>> {
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

  // quote قبلی ACTIVE همین ارز را آرشیو کن
  await prisma.exchangeRateQuote.updateMany({
    where: {
      exchangeId: quote.exchangeId,
      currencyCode: quote.currencyCode,
      status: 'ACTIVE',
      id: { not: id },
    },
    data: { status: 'ARCHIVED' },
  });

  await prisma.exchangeRateQuote.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      approvedById: auth.user.id,
      approvedAt: now,
      expiresAt,
      note: note ?? null,
    },
  });

  await prisma.quoteStatusLog.create({
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

  revalidateQuoteCaches();
  return { success: true, data: { id } };
}

// ─── REJECT (ادمین) ───────────────────────────────────────────────────────────

export async function rejectQuote(
  id: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
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

  await prisma.exchangeRateQuote.update({
    where: { id },
    data: { status: 'REJECTED', note: reason },
  });
  await prisma.quoteStatusLog.create({
    data: {
      quoteId: id,
      fromStatus: 'PENDING',
      toStatus: 'REJECTED',
      actorId: auth.user.id,
      actorRole: 'ADMIN',
      reason,
    },
  });

  revalidateQuoteCaches();
  return { success: true, data: { id } };
}

// ─── EXPIRE (cron) ────────────────────────────────────────────────────────────

/** منقضی کردن quote های ACTIVE که expiresAt آن‌ها گذشته — فقط از cron صدا زده می‌شود */
export async function expireQuotes(): Promise<{ expired: number }> {
  const now = new Date();
  const expired = await prisma.exchangeRateQuote.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    select: { id: true },
  });

  if (expired.length === 0) return { expired: 0 };

  const ids = expired.map((q) => q.id);
  await prisma.exchangeRateQuote.updateMany({
    where: { id: { in: ids } },
    data: { status: 'EXPIRED' },
  });
  await prisma.quoteStatusLog.createMany({
    data: ids.map((id) => ({
      quoteId: id,
      fromStatus: 'ACTIVE' as const,
      toStatus: 'EXPIRED' as const,
      actorRole: 'SYSTEM',
      reason: 'auto-expired by cron',
    })),
  });

  revalidateQuoteCaches();
  return { expired: expired.length };
}
