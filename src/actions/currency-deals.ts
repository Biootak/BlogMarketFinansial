'use server';

/**
 * currency-deals — Server Actions برای مدیریت معاملات ارزی
 *
 * جریان:
 *   مشتری → createDeal (PENDING) — آنلاین یا حضوری
 *   صرافی → confirmDeal (CONFIRMED)
 *   صرافی → completeDeal (COMPLETED) + آپلود رسید
 *   هر طرف → cancelDeal (CANCELLED) — قبل از PROCESSING
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type DealRow = {
  id: string;
  trackingCode: string;
  exchangeId: string;
  quoteId: string | null;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  appliedRate: string;
  feeAmount: string;
  marketRateRef: string | null;
  channel: string;
  status: string;
  note: string | null;
  internalNote: string | null;
  confirmedById: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // joined
  exchangeName?: string;
  exchangeCity?: string | null;
};

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateDealSchema = z.object({
  exchangeId: z.string().min(1, 'شناسه صرافی الزامی است'),
  quoteId: z.string().optional().nullable(),
  customerName: z.string().min(2, 'نام الزامی است').max(100),
  customerPhone: z.string().min(7, 'شماره تماس نامعتبر است').max(20),
  customerEmail: z.string().email('ایمیل نامعتبر است').nullable().optional(),
  fromCurrency: z.string().min(3).max(5),
  toCurrency: z.string().min(3).max(5),
  fromAmount: z
    .number({ invalid_type_error: 'مبلغ باید عدد باشد' })
    .positive('مبلغ باید مثبت باشد'),
  channel: z.enum(['ONLINE', 'INPERSON', 'PHONE']).default('ONLINE'),
  note: z.string().max(500).nullable().optional(),
  idempotencyKey: z.string().max(128).optional(),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateTrackingCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DL-${ts}-${rand}`;
}

function revalidateDealCaches(): void {
  for (const tag of ['currency-deals', 'exchange-deals'] as const) {
    revalidateTag(tag);
    safeRevalidateTag(tag);
  }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/** معاملات یک صرافی — برای داشبورد صراف */
export async function getExchangeDeals(exchangeId: string, status?: string): Promise<DealRow[]> {
  const rows = await prisma.currencyDeal.findMany({
    where: { exchangeId, ...(status ? { status: status as 'PENDING' } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map(mapDeal);
}

/** معاملات کاربر — برای داشبورد مشتری */
export async function getMyDeals(): Promise<DealRow[]> {
  const auth = await requireUser();
  if (!auth.success) return [];
  const rows = await prisma.currencyDeal.findMany({
    where: { userId: auth.user.id },
    include: { Exchange: { select: { name: true, displayName: true, city: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    ...mapDeal(r),
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
    exchangeCity: r.Exchange.city,
  }));
}

/** پیگیری معامله با کد — عمومی (بدون auth) */
export async function getDealByTracking(trackingCode: string): Promise<DealRow | null> {
  const row = await prisma.currencyDeal.findUnique({
    where: { trackingCode },
    include: { Exchange: { select: { name: true, displayName: true, city: true } } },
  });
  if (!row) return null;
  return {
    ...mapDeal(row),
    exchangeName: row.Exchange.displayName ?? row.Exchange.name,
    exchangeCity: row.Exchange.city,
  };
}

function mapDeal(r: {
  id: string;
  trackingCode: string;
  exchangeId: string;
  quoteId: string | null;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: unknown;
  toAmount: unknown;
  appliedRate: unknown;
  feeAmount: unknown;
  marketRateRef: unknown;
  channel: string;
  status: string;
  note: string | null;
  internalNote: string | null;
  confirmedById: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): DealRow {
  return {
    id: r.id,
    trackingCode: r.trackingCode,
    exchangeId: r.exchangeId,
    quoteId: r.quoteId,
    userId: r.userId,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    fromAmount: String(r.fromAmount),
    toAmount: String(r.toAmount),
    appliedRate: String(r.appliedRate),
    feeAmount: String(r.feeAmount),
    marketRateRef: r.marketRateRef != null ? String(r.marketRateRef) : null,
    channel: r.channel,
    status: r.status,
    note: r.note,
    internalNote: r.internalNote,
    confirmedById: r.confirmedById,
    confirmedAt: r.confirmedAt,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── CREATE (مشتری یا صراف) ────────────────────────────────────────────────────

export async function createDeal(
  raw: unknown,
): Promise<ActionResult<{ id: string; trackingCode: string }>> {
  const parsed = CreateDealSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'داده نامعتبر';
    return { success: false, error: { code: 'INVALID_INPUT', message: msg } };
  }

  const {
    exchangeId,
    quoteId,
    customerName,
    customerPhone,
    customerEmail,
    fromCurrency,
    toCurrency,
    fromAmount,
    channel,
    note,
    idempotencyKey,
  } = parsed.data;

  // بررسی idempotency
  if (idempotencyKey) {
    const existing = await prisma.currencyDeal.findUnique({ where: { idempotencyKey } });
    if (existing)
      return { success: true, data: { id: existing.id, trackingCode: existing.trackingCode } };
  }

  // گرفتن نرخ از quote (اگر quoteId داده شده)
  let appliedRate = 0;
  let toAmount = 0;
  const feeAmount = 0;
  const marketRateRef: number | null = null;

  if (quoteId) {
    const quote = await prisma.exchangeRateQuote.findUnique({ where: { id: quoteId } });
    if (!quote)
      return { success: false, error: { code: 'QUOTE_NOT_FOUND', message: 'quote یافت نشد' } };
    if (quote.status !== 'ACTIVE' && quote.status !== 'LOCKED') {
      return { success: false, error: { code: 'QUOTE_EXPIRED', message: 'این نرخ منقضی شده است' } };
    }
    if (quote.expiresAt && quote.expiresAt < new Date()) {
      return { success: false, error: { code: 'QUOTE_EXPIRED', message: 'این نرخ منقضی شده است' } };
    }
    // نرخ فروش صرافی = مشتری می‌خرد
    appliedRate = Number(quote.sellRate);
    toAmount = fromAmount * appliedRate;
  } else {
    // بدون quote — نرخ بعداً توسط صراف تعیین می‌شود
    appliedRate = 0;
    toAmount = 0;
  }

  // userId از auth (اگر لاگین بود) — از try/catch به جای .catch() برای type safety
  let userId: string | null = null;
  try {
    const auth = await requireUser();
    if (auth.success) userId = auth.user.id;
  } catch {
    // کاربر لاگین نیست — deal به عنوان مهمان ثبت می‌شود
  }

  const trackingCode = generateTrackingCode();
  const deal = await prisma.currencyDeal.create({
    data: {
      trackingCode,
      exchangeId,
      quoteId: quoteId ?? null,
      userId,
      customerName,
      customerPhone,
      customerEmail: customerEmail ?? null,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      appliedRate,
      feeAmount,
      marketRateRef,
      channel,
      status: 'PENDING',
      note: note ?? null,
      idempotencyKey: idempotencyKey ?? null,
    },
  });

  await prisma.dealStatusLog.create({
    data: { dealId: deal.id, toStatus: 'PENDING', actorRole: userId ? 'USER' : 'GUEST' },
  });

  // اگر quote داشت → LOCKED کن تا دیگران در ۱۵ دقیقه نتوانند همان quote را بگیرند
  if (quoteId) {
    await prisma.exchangeRateQuote.update({
      where: { id: quoteId },
      data: { status: 'LOCKED' },
    });
  }

  revalidateDealCaches();
  return { success: true, data: { id: deal.id, trackingCode } };
}

// ─── CONFIRM (صرافی) ─────────────────────────────────────────────────────────

export async function confirmDeal(
  dealId: string,
  data: { appliedRate?: number; toAmount?: number; feeAmount?: number; internalNote?: string },
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: { id: true, exchangeId: true, status: true, quoteId: true },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };
  if (deal.status !== 'PENDING')
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط معاملات PENDING قابل تایید هستند' },
    };

  // بررسی دسترسی — باید OWNER/ADMIN یا staff صرافی مربوطه باشد
  const { user } = auth;
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
    const staff = await prisma.exchangeStaff.findFirst({
      where: { exchangeId: deal.exchangeId, userId: user.id, revokedAt: null },
      select: { id: true },
    });
    if (!staff) return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } };
  }

  await prisma.currencyDeal.update({
    where: { id: dealId },
    data: {
      status: 'CONFIRMED',
      confirmedById: user.id,
      confirmedAt: new Date(),
      ...(data.appliedRate != null ? { appliedRate: data.appliedRate } : {}),
      ...(data.toAmount != null ? { toAmount: data.toAmount } : {}),
      ...(data.feeAmount != null ? { feeAmount: data.feeAmount } : {}),
      ...(data.internalNote ? { internalNote: data.internalNote } : {}),
    },
  });

  await prisma.dealStatusLog.create({
    data: {
      dealId,
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      actorId: user.id,
      actorRole: 'SARAFI',
    },
  });

  // quote را آزاد کن
  if (deal.quoteId) {
    const q = await prisma.exchangeRateQuote.findUnique({
      where: { id: deal.quoteId },
      select: { status: true },
    });
    if (q?.status === 'LOCKED') {
      await prisma.exchangeRateQuote.update({
        where: { id: deal.quoteId },
        data: { status: 'ACTIVE' },
      });
    }
  }

  revalidateDealCaches();
  return { success: true, data: { id: dealId } };
}

// ─── COMPLETE (صرافی) ─────────────────────────────────────────────────────────

export async function completeDeal(
  dealId: string,
  internalNote?: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: { id: true, exchangeId: true, status: true },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };
  if (!['CONFIRMED', 'PROCESSING'].includes(deal.status)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message: 'معامله باید در وضعیت CONFIRMED یا PROCESSING باشد',
      },
    };
  }

  const { user } = auth;
  await prisma.currencyDeal.update({
    where: { id: dealId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...(internalNote ? { internalNote } : {}),
    },
  });

  await prisma.dealStatusLog.create({
    data: {
      dealId,
      fromStatus: deal.status as 'CONFIRMED' | 'PROCESSING',
      toStatus: 'COMPLETED',
      actorId: user.id,
      actorRole: 'SARAFI',
    },
  });

  revalidateDealCaches();
  return { success: true, data: { id: dealId } };
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelDeal(
  dealId: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: { id: true, status: true, quoteId: true, userId: true, exchangeId: true },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };
  if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(deal.status)) {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'این معامله قابل لغو نیست' },
    };
  }

  const { user } = auth;
  const isOwner = deal.userId === user.id;
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    const staff = await prisma.exchangeStaff.findFirst({
      where: { exchangeId: deal.exchangeId, userId: user.id, revokedAt: null },
      select: { id: true },
    });
    if (!staff) return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } };
  }

  await prisma.currencyDeal.update({
    where: { id: dealId },
    data: { status: 'CANCELLED', internalNote: reason },
  });
  await prisma.dealStatusLog.create({
    data: {
      dealId,
      fromStatus: deal.status as 'PENDING',
      toStatus: 'CANCELLED',
      actorId: user.id,
      note: reason,
    },
  });

  // quote را آزاد کن
  if (deal.quoteId) {
    const q = await prisma.exchangeRateQuote.findUnique({
      where: { id: deal.quoteId },
      select: { status: true },
    });
    if (q?.status === 'LOCKED') {
      await prisma.exchangeRateQuote.update({
        where: { id: deal.quoteId },
        data: { status: 'ACTIVE' },
      });
    }
  }

  revalidateDealCaches();
  return { success: true, data: { id: dealId } };
}
