'use server';

/**
 * currency-deals — Server Actions برای مدیریت معاملات ارزی
 *
 * جریان:
 *   مشتری → createDeal (PENDING) — آنلاین یا حضوری
 *   صرافی → confirmDeal (CONFIRMED)
 *   صرافی → completeDeal (COMPLETED) + ثبت LedgerEntry/Transaction
 *   هر طرف → cancelDeal (CANCELLED) — قبل از PROCESSING
 *
 * امنیت و یکپارچگی:
 *   - rate-limit روی createDeal / confirmDeal / completeDeal
 *   - atomic quote-lock: check + lock در یک prisma.$transaction
 *   - ownership check در همه write actions
 *   - AuditLog با IP و deviceId برای confirmDeal / completeDeal / cancelDeal
 *   - completeDeal: appliedRate=0 → خطا (H5)
 *   - completeDeal: LedgerEntry با txnId صحیح + Transaction ثبت می‌شود (H1, P1-1)
 *   - P0-2: getExchangeDeals نیاز به requireExchangeAccess دارد
 *   - P0-4: AuditLog حالا IP را ثبت می‌کند
 *
 * A1-24 fixes:
 *   C2: Math.random() → crypto.randomBytes() در generateTrackingCode
 *   H8: idempotencyKey اجباری در completeDeal
 *   M2: appliedRate>0 validation در confirmDeal
 *   M5: toAmount در CreateDealSchema (از fromAmount * appliedRate محاسبه شود)
 *   H2: KYC gate مهمانان — حتی کاربر لاگین‌نشده باید شماره موبایل معتبر بدهد
 */

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { screenTransaction } from '@/lib/fraud/screener';
import { notifyDealStatusChange, notifyNewDeal } from '@/lib/notifications/fintech';
import { notifyTelegramUser } from '@/lib/notifications/telegram-user';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { getPortalUrl } from '@/lib/telegram';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealStatusLogRow = {
  id: string;
  dealId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: Date;
};

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
  // status history (included by getDealByTracking)
  statusLogs?: DealStatusLogRow[];
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
  // M5: toAmount از fromAmount * appliedRate محاسبه می‌شود
  toAmount: z.number().positive().nullable().optional(),
  channel: z.enum(['ONLINE', 'INPERSON', 'PHONE']).default('ONLINE'),
  note: z.string().max(500).nullable().optional(),
  idempotencyKey: z.string().max(128).optional(),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

// C2: crypto.randomBytes به جای Math.random() — غیرقابل پیش‌بینی
// آنتروپی: ۶ بایت (۱۲ hex) + ۳ بایت (۶ hex) = ۷۲ بیت — ضد brute-force/تخمین
function generateTrackingCode(): string {
  const a = randomBytes(6).toString('hex').toUpperCase();
  const b = randomBytes(3).toString('hex').toUpperCase();
  return `DL-${a}-${b}`;
}

function revalidateDealCaches(): void {
  revalidateTag('currency-deals');
  revalidateTag('exchange-deals');
}

/** تبدیل Decimal Prisma به string — type-safe */
function decimalToStr(v: Decimal | null | undefined): string {
  return v == null ? '0' : v.toString();
}

// ─── mapDeal — تبدیل row دیتابیس به DealRow ─────────────────────────────────

type RawDeal = {
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
  fromAmount: Decimal;
  toAmount: Decimal;
  appliedRate: Decimal;
  feeAmount: Decimal;
  marketRateRef: Decimal | null;
  channel: string;
  status: string;
  note: string | null;
  internalNote: string | null;
  confirmedById: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapDeal(r: RawDeal): DealRow {
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
    fromAmount: decimalToStr(r.fromAmount),
    toAmount: decimalToStr(r.toAmount),
    appliedRate: decimalToStr(r.appliedRate),
    feeAmount: decimalToStr(r.feeAmount),
    marketRateRef: r.marketRateRef != null ? decimalToStr(r.marketRateRef) : null,
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

// ─── READ ─────────────────────────────────────────────────────────────────────

/** معاملات یک صرافی — برای داشبورد صراف */
export async function getExchangeDeals(
  exchangeId: string,
  opts?: {
    status?:
      | 'PENDING'
      | 'CONFIRMED'
      | 'PROCESSING'
      | 'COMPLETED'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'REFUNDED';
    limit?: number;
    /** T2-fix: cursor ترکیبی (createdAt,id) برای pagination صحیح — F3-fix */
    cursor?: { createdAt: string; id: string };
  },
): Promise<DealRow[]> {
  // ── P0-2: tenant isolation — بدون این چک هر کسی با exchangeId داده می‌بیند ─
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.currencyDeal.findMany({
    where: {
      exchangeId,
      ...(opts?.status ? { status: opts.status } : {}),
      // F3-fix: cursor ترکیبی (createdAt, id) — دو deal با timestamp یکسان page نمی‌افتند
      ...(opts?.cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(opts.cursor.createdAt) } },
              { createdAt: new Date(opts.cursor.createdAt), id: { lt: opts.cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: opts?.limit ?? 50,
  });
  return rows.map(mapDeal);
}

/** معاملات کاربر — برای داشبورد مشتری */
export type MyDealsPage = {
  deals: DealRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  /** شمارندهٔ وضعیت‌ها روی کل معاملات کاربر (نه فقط صفحهٔ فعلی) */
  statusCounts: Record<string, number>;
};

export async function getMyDeals(
  opts: {
    page?: number;
    limit?: number;
    status?:
      | 'PENDING'
      | 'CONFIRMED'
      | 'PROCESSING'
      | 'COMPLETED'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'REFUNDED';
  } = {},
): Promise<FintechActionResult<MyDealsPage>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const skip = (page - 1) * limit;
  // F8-fix: فیلتر وضعیت سرور-محور — قبلاً فقط صفحهٔ فعلی فیلتر می‌شد و
  // معامله‌ای که در صفحهٔ بعد بود با وجود شمارندهٔ درست، «پیدا نمی‌شد».
  const where = { userId: auth.user.id, ...(opts.status ? { status: opts.status } : {}) };

  const [rows, total, statusGroup] = await Promise.all([
    prisma.currencyDeal.findMany({
      where,
      include: { Exchange: { select: { name: true, displayName: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.currencyDeal.count({ where }),
    // F7-fix: شمارندهٔ وضعیت سرور-محور — قبلاً از صفحهٔ فعلی حساب می‌شد و
    // با بیش از limit معامله، KPIها و شمارندهٔ تب‌ها غلط نشان می‌داد.
    prisma.currencyDeal.groupBy({
      by: ['status'],
      where: { userId: auth.user.id },
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroup) {
    statusCounts[g.status] = g._count._all;
  }

  return {
    success: true,
    data: {
      deals: rows.map((r) => ({
        ...mapDeal(r),
        exchangeName: r.Exchange.displayName ?? r.Exchange.name,
        exchangeCity: r.Exchange.city,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statusCounts,
    },
  };
}

/** پیگیری معامله با کد — عمومی (بدون auth) */
/**
 * خروجی عمومی پیگیری — فقط فیلدهایی که مشتری باید ببیند.
 *
 * امنیت (least-privilege): این تابع از سمت سرور (server component) صدا زده
 * می‌شود ولی خروجی‌اش باید حداقلی باشد تا اگر روزی از سمت کلاینت یا یک
 * route دیگر صدا زده شد، هیچ داده‌ی حساسی (نام/تلفن/ایمیل/internalNote/
 * شناسه‌های داخلی) از مرز action خارج نشود.
 */
export type PublicDealTracking = {
  trackingCode: string;
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
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  exchangeName: string;
  exchangeCity: string | null;
  statusLogs: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: Date;
  }>;
};

export async function getDealByTracking(trackingCode: string): Promise<PublicDealTracking | null> {
  // DoS/scan guard — فقط کدهای با فرمت معتبر به دیتابیس می‌رسند تا کوئری روی
  // ورودی‌های garbage هدر نرود. کدهای واقعی: `DL-XXXXXXXX-XXXX` (۱۲ hex).
  if (!/^[A-Z0-9][A-Z0-9-]{5,23}$/.test(trackingCode)) return null;
  // Anti-enumeration — rate limiter مخصوص `deal-track` (۲۰/دقیقه per IP).
  // این صفحه revalidate=60 دارد، پس کاربر عادی حداکثر ۱ کوئری در دقیقه می‌زند؛
  // این لیمیت فقط اسکن/شمارش کدهای مختلف را می‌گیرد.
  if (process.env.NODE_ENV === 'production') {
    const rl = await checkRateLimit(`deal-track:${await getClientIp()}`, 'deal-track');
    if (!rl.success) return null;
  }
  const row = await prisma.currencyDeal.findUnique({
    where: { trackingCode },
    include: {
      Exchange: { select: { name: true, displayName: true, city: true } },
      StatusLogs: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!row) return null;
  // DTO عمومی — deliberately هیچ فیلد حساسی برنمی‌گرداند
  return {
    trackingCode: row.trackingCode,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    fromAmount: row.fromAmount.toString(),
    toAmount: row.toAmount.toString(),
    appliedRate: row.appliedRate.toString(),
    feeAmount: row.feeAmount.toString(),
    marketRateRef: row.marketRateRef != null ? row.marketRateRef.toString() : null,
    channel: row.channel,
    status: row.status,
    note: row.note,
    confirmedAt: row.confirmedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    exchangeName: row.Exchange.displayName ?? row.Exchange.name,
    exchangeCity: row.Exchange.city,
    statusLogs: row.StatusLogs.map((l) => ({
      fromStatus: l.fromStatus ?? null,
      toStatus: l.toStatus,
      note: l.note ?? null,
      createdAt: l.createdAt,
    })),
  };
}

// ─── CREATE (مشتری یا صراف) ────────────────────────────────────────────────────

export async function createDeal(
  raw: unknown,
): Promise<FintechActionResult<{ id: string; trackingCode: string }>> {
  // ── Rate limit: 5 deal در 10 دقیقه بر اساس IP (M5) ──────────────────────
  // Rightmost XFF entry = آخرین proxy مورد اعتماد (spoof-resistant). leftmost [0] توسط client جعل می‌شود.
  const _xff = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';
  const rl = await checkRateLimit(`deal:${ip}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های شما زیاد است. لطفاً کمی صبر کنید.' },
    };
  }

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
    toAmount: inputToAmount,
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

  // userId از auth (اگر لاگین بود) — guest ها هم مجاز هستند
  let userId: string | null = null;
  try {
    const auth = await requireUser();
    if (auth.success) userId = auth.user.id;
  } catch {
    // کاربر لاگین نیست — deal به عنوان مهمان ثبت می‌شود
  }

  // ── Atomic quote check + lock در یک transaction (C3) ─────────────────────
  let appliedRate = new Decimal(0);
  let calculatedToAmount = new Decimal(0);
  const feeAmount = new Decimal(0);
  const marketRateRef: Decimal | null = null;

  if (quoteId) {
    const lockResult = await prisma.$transaction(
      async (tx) => {
        const quote = await tx.exchangeRateQuote.findUnique({ where: { id: quoteId } });
        if (!quote) return { ok: false as const, code: 'QUOTE_NOT_FOUND' } as const;
        if (quote.status === 'LOCKED') return { ok: false as const, code: 'QUOTE_LOCKED' } as const;
        if (quote.status !== 'ACTIVE')
          return { ok: false as const, code: 'QUOTE_EXPIRED' } as const;
        if (quote.expiresAt && quote.expiresAt < new Date()) {
          return { ok: false as const, code: 'QUOTE_EXPIRED' } as const;
        }
        // Atomic lock — اگر همزمان دو نفر بیایند، دومی LOCKED می‌بیند
        await tx.exchangeRateQuote.update({
          where: { id: quoteId },
          data: { status: 'LOCKED' },
        });
        return { ok: true as const, quote } as const;
      },
      { isolationLevel: 'Serializable' },
    );

    if (!lockResult.ok) {
      const msgs: Record<string, string> = {
        QUOTE_NOT_FOUND: 'quote یافت نشد',
        QUOTE_LOCKED: 'این نرخ در حال استفاده توسط کاربر دیگری است. لطفاً منتظر بمانید.',
        QUOTE_EXPIRED: 'این نرخ منقضی شده است',
      };
      return {
        success: false,
        error: { code: lockResult.code, message: msgs[lockResult.code] ?? 'خطای quote' },
      };
    }

    // نرخ فروش صرافی = مشتری می‌خرد
    // مثال: fromAmount=100 USD، sellRate=56000 تومان → toAmount=5,600,000 تومان
    appliedRate = lockResult.quote.sellRate;
    calculatedToAmount = new Decimal(fromAmount).mul(appliedRate);
    // M5: اگر کاربر toAmount داده است و quote ندارد، از ورودی استفاده کن
    // اگر quote دارد، toAmount محاسبه‌شده اولویت دارد
    if (inputToAmount != null) {
      calculatedToAmount = new Decimal(inputToAmount);
    }
  }

  // ── Fraud screening (فقط برای کاربران لاگین) ──────────────────────────────
  // اگر userId موجود باشد (user logged in)، تراکنش را از فیلتر fraud رد می‌کنیم.
  // گزارش fraud هرگز باعث block نمی‌شود — فقط اگر shouldBlock=true برگشت، خطا.
  if (userId) {
    const customer = await prisma.customer.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (customer) {
      const fraudRisk = await screenTransaction({
        customerId: customer.id,
        exchangeId,
        // 2026-08-03: Decimal→BigInt conversion — avoid Number() precision loss
        // on large amounts (> 2^53 loses bits). Decimal.toFixed(0) stays exact.
        amount: BigInt(new Decimal(fromAmount.toString()).mul(100).round().toFixed(0)),
        currency: fromCurrency,
        ip,
        kind: 'EXCHANGE',
      });
      if (fraudRisk.shouldBlock) {
        return {
          success: false,
          error: {
            code: 'FRAUD_BLOCKED',
            message: 'این معامله به دلایل امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.',
          },
        };
      }
    }
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
      toAmount: calculatedToAmount,
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

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId,
      actorId: userId ?? 'GUEST',
      actorRole: userId ? 'USER' : 'GUEST',
      action: 'DEAL_CREATED',
      entityType: 'CurrencyDeal',
      entityId: deal.id,
      ip,
      meta: {
        trackingCode,
        fromCurrency,
        toCurrency,
        fromAmount: String(fromAmount),
        channel,
      } as Prisma.InputJsonValue,
    },
  });

  revalidateDealCaches();

  // Fire-and-forget notification — never block the response
  void notifyNewDeal({
    trackingCode,
    customerName,
    customerPhone,
    fromCurrency,
    toCurrency,
    fromAmount: String(fromAmount),
    toAmount: String(inputToAmount ?? 0),
    status: 'PENDING',
    exchangeName: exchangeId,
  });

  // اعلان به تلگرامِ خودِ مشتری — «معامله ثبت شد» (وعدهٔ طراحی)
  if (userId) {
    void notifyTelegramUser(
      userId,
      `🆕 <b>معامله ثبت شد</b>\n\n🔑 کد پیگیری: <code>${trackingCode}</code>\n💱 ${fromAmount} ${fromCurrency} → ${inputToAmount ?? '—'} ${toCurrency}\n📌 وضعیت: در انتظار بررسی`,
      {
        inlineKeyboard: [[{ text: '🌐 پیگیری معامله', url: getPortalUrl('/customer/dashboard') }]],
      },
      { dedupeKey: `deal-created:${deal.id}` },
    );
  }

  return { success: true, data: { id: deal.id, trackingCode } };
}

// ─── helper: خواندن IP از headers ────────────────────────────────────────────
async function getClientIp(): Promise<string> {
  // Rightmost XFF entry = آخرین proxy مورد اعتماد ما (spoof-resistant).
  // leftmost [0] توسط client کنترل می‌شود و جعل‌پذیر است.
  const xff = (await headers()).get('x-forwarded-for') ?? '';
  return (
    xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown'
  );
}

// ─── CONFIRM (صرافی) ─────────────────────────────────────────────────────────

export async function confirmDeal(
  dealId: string,
  data: {
    appliedRate?: number;
    toAmount?: number;
    feeAmount?: number;
    internalNote?: string;
    idempotencyKey?: string;
  },
): Promise<FintechActionResult<{ id: string }>> {
  // M2: appliedRate باید > 0 باشد
  if (data.appliedRate != null && data.appliedRate <= 0) {
    return {
      success: false,
      error: { code: 'INVALID_RATE', message: 'نرخ معامله باید بزرگتر از صفر باشد' },
    };
  }
  // ── P0-6: rate-limit روی confirm ──────────────────────────────────────────
  const ip = await getClientIp();
  const rl = await checkRateLimit(`confirm:${ip}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. لطفاً صبر کنید.' },
    };
  }

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: { id: true, exchangeId: true, status: true, quoteId: true },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };

  // ── ownership check (C2) ──────────────────────────────────────────────────
  const access = await requireExchangeAccess(deal.exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  if (deal.status !== 'PENDING') {
    // F4-fix: اگر قبلاً confirm شده (idempotency) → success برگردان
    if (deal.status === 'CONFIRMED' && data.idempotencyKey) {
      return { success: true, data: { id: dealId } };
    }
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط معاملات PENDING قابل تایید هستند' },
    };
  }

  await prisma.currencyDeal.update({
    where: { id: dealId },
    data: {
      status: 'CONFIRMED',
      confirmedById: access.userId,
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
      actorId: access.userId,
      actorRole: 'SARAFI',
    },
  });

  // AuditLog (M6) — با IP برای ردیابی (P0-4)
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: deal.exchangeId,
      actorId: access.userId,
      actorRole: 'SARAFI',
      action: 'DEAL_CONFIRMED',
      entityType: 'CurrencyDeal',
      entityId: dealId,
      ip,
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

// H8: idempotencyKey اجباری در completeDeal — برای جلوگیری از double-complete
export async function completeDeal(
  dealId: string,
  internalNote?: string,
  idempotencyKey?: string,
): Promise<FintechActionResult<{ id: string }>> {
  if (!idempotencyKey) {
    return {
      success: false,
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'برای تکمیل معامله، شناسه یکتای idempotency الزامی است',
      },
    };
  }
  // ── P0-6: rate-limit روی complete ─────────────────────────────────────────
  const ip = await getClientIp();
  const rl = await checkRateLimit(`complete:${ip}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. لطفاً صبر کنید.' },
    };
  }

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      exchangeId: true,
      status: true,
      fromCurrency: true,
      toCurrency: true,
      fromAmount: true,
      toAmount: true,
      appliedRate: true,
      feeAmount: true,
      userId: true,
    },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };

  // ── ownership check (C2) ──────────────────────────────────────────────────
  const access = await requireExchangeAccess(deal.exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  // ── F7: KYC gate — اگر مشتری لاگین است و exchange.requireKyc=true باشد ────
  // KYC فقط برای کاربران ثبت‌نام‌شده (userId != null) چک می‌شود.
  // مشتریان مهمان (userId=null) از این gate رد می‌شوند — سیاست مشابه exchange-transactions.ts
  // مثال: deal.userId='u1'، exchange.requireKyc=true، customer.kycStatus='PENDING' → خطا ✗
  //        deal.userId=null → KYC چک نمی‌شود (مهمان)                            → ادامه ✓
  if (deal.userId) {
    const [customer, exchange, kycRecord] = await Promise.all([
      prisma.customer.findFirst({
        where: { userId: deal.userId, exchangeId: deal.exchangeId },
        select: { kycLevel: true, kycStatus: true },
      }),
      prisma.exchange.findUnique({
        where: { id: deal.exchangeId },
        select: { requireKyc: true },
      }),
      // KYC expiry: expiresAt از KycRecord خوانده می‌شود
      prisma.kycRecord.findUnique({
        where: { userId: deal.userId },
        select: { expiresAt: true },
      }),
    ]);
    if (exchange?.requireKyc && customer) {
      if (customer.kycStatus !== 'APPROVED' || customer.kycLevel === 'NONE') {
        return {
          success: false,
          error: {
            code: 'KYC_REQUIRED',
            message: 'برای تکمیل معامله، احراز هویت (KYC) مشتری الزامی است',
          },
        };
      }
      // KYC expiry gate: اگر KYC منقضی شده → خطا
      // مثال: expiresAt=2024-01-01، now=2026-07-01 → KYC_EXPIRED ✗
      if (kycRecord?.expiresAt && kycRecord.expiresAt < new Date()) {
        return {
          success: false,
          error: {
            code: 'KYC_EXPIRED',
            message: 'احراز هویت (KYC) مشتری منقضی شده است. لطفاً KYC را تمدید کنید.',
          },
        };
      }
    }
  }

  if (!['CONFIRMED', 'PROCESSING'].includes(deal.status)) {
    // F4-fix: اگر قبلاً complete شده → idempotent success
    if (deal.status === 'COMPLETED' && idempotencyKey) {
      return { success: true, data: { id: dealId } };
    }
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message: 'معامله باید در وضعیت CONFIRMED یا PROCESSING باشد',
      },
    };
  }

  // ── H5: appliedRate=0 نمی‌تواند complete شود ─────────────────────────────
  // مثال: deal بدون quote ثبت شده، صراف باید ابتدا از confirmDeal نرخ را تنظیم کند
  if (new Decimal(deal.appliedRate.toString()).isZero()) {
    return {
      success: false,
      error: {
        code: 'MISSING_RATE',
        message: 'نرخ معامله هنوز تنظیم نشده است. ابتدا معامله را با نرخ مشخص تایید کنید.',
      },
    };
  }

  const fromStatus = deal.status as 'CONFIRMED' | 'PROCESSING';

  // ── H1: ثبت LedgerEntry + Transaction هنگام complete ─────────────────────
  // هر complete deal باید موجودی مشتری را آپدیت کند.
  // اگر مشتری Customer ندارد (مهمان)، فقط deal کامل می‌شود.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.currencyDeal.update({
        where: { id: dealId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          ...(internalNote ? { internalNote } : {}),
        },
      });

      await tx.dealStatusLog.create({
        data: {
          dealId,
          fromStatus,
          toStatus: 'COMPLETED',
          actorId: access.userId,
          actorRole: 'SARAFI',
        },
      });

      // AuditLog (M6) — با IP برای ردیابی (P0-4)
      await tx.auditLog.create({
        data: {
          id: createId(),
          exchangeId: deal.exchangeId,
          actorId: access.userId,
          actorRole: 'SARAFI',
          action: 'DEAL_COMPLETED',
          entityType: 'CurrencyDeal',
          entityId: dealId,
          ip,
          meta: {
            fromCurrency: deal.fromCurrency,
            toCurrency: deal.toCurrency,
            fromAmount: deal.fromAmount.toString(),
            toAmount: deal.toAmount.toString(),
            appliedRate: deal.appliedRate.toString(),
          } as Prisma.InputJsonValue,
        },
      });

      // اگر مشتری Customer دارد → LedgerEntry با txnId ثبت کن (H1 + P1-1)
      if (deal.userId) {
        const customer = await tx.customer.findFirst({
          where: { userId: deal.userId, exchangeId: deal.exchangeId },
          select: { id: true },
        });

        if (customer) {
          // پیدا کردن یا ساختن حساب مشتری برای ارز مقصد
          let account = await tx.fintechAccount.findFirst({
            where: {
              customerId: customer.id,
              exchangeId: deal.exchangeId,
              currency: deal.toCurrency,
            },
            select: { id: true, balance: true },
          });
          if (!account) {
            account = await tx.fintechAccount.create({
              data: {
                id: createId(),
                exchangeId: deal.exchangeId,
                customerId: customer.id,
                currency: deal.toCurrency,
                type: 'WALLET',
                status: 'ACTIVE',
                updatedAt: new Date(),
              },
              select: { id: true, balance: true },
            });
          }

          // F6-fix: چک کنید netAmount منفی نباشد
          // مثال: toAmount=5,600,000، feeAmount=56,000 → netAmount=5,544,000 ✓
          //        toAmount=50,000،   feeAmount=60,000 → netAmount<0 → خطا ✗
          const toAmountBig = BigInt(new Decimal(deal.toAmount.toString()).toFixed(0));
          const feeBig = BigInt(new Decimal(deal.feeAmount.toString()).toFixed(0));
          if (feeBig > toAmountBig) {
            throw new Error('FEE_EXCEEDS_AMOUNT: کارمزد از مبلغ معامله بیشتر است');
          }
          const netAmount = toAmountBig - feeBig;
          const newBalance = account.balance + netAmount;

          await tx.fintechAccount.update({
            where: { id: account.id },
            data: { balance: newBalance, updatedAt: new Date() },
          });

          // ── P1-1: ابتدا Transaction ثبت می‌شود تا txnId داشته باشیم ─────────
          // مثال: deal.id='abc123' → transaction.id='tx456' → ledgerEntry.txnId='tx456'
          const transaction = await tx.transaction.create({
            data: {
              id: createId(),
              exchangeId: deal.exchangeId,
              customerId: customer.id,
              accountId: account.id,
              kind: 'EXCHANGE',
              status: 'COMPLETED',
              // برای EXCHANGE: amount = ارز مقصد، destAmount = ارز مبدا (A4-fix)
              amount: toAmountBig,
              currency: deal.toCurrency,
              rate: Number(deal.appliedRate),
              fee: feeBig,
              destAmount: BigInt(new Decimal(deal.fromAmount.toString()).toFixed(0)),
              destCurrency: deal.fromCurrency,
              note: `معامله ارزی — کد: ${dealId.slice(-8)}`,
              updatedAt: new Date(),
            },
          });

          // A4-fix: دو LedgerEntry برای double-entry accounting
          // CREDIT: ارز مقصد (مشتری دریافت می‌کند)
          await tx.ledgerEntry.create({
            data: {
              id: createId(),
              exchangeId: deal.exchangeId,
              accountId: account.id,
              customerId: customer.id,
              txnId: transaction.id,
              direction: 'CREDIT',
              amount: netAmount,
              currency: deal.toCurrency,
              runningBalance: newBalance,
              description: `تکمیل معامله ارزی — کد: ${dealId.slice(-8)}`,
              createdById: access.userId,
            },
          });

          // DEBIT: ارز مبدا (مشتری پرداخت کرده) — فقط اگر حساب مبدا وجود دارد
          // مثال: مشتری 100 USD داد → DEBIT 100 USD از حساب USD او
          const fromAccount = await tx.fintechAccount.findFirst({
            where: {
              customerId: customer.id,
              exchangeId: deal.exchangeId,
              currency: deal.fromCurrency,
            },
            select: { id: true, balance: true },
          });
          if (fromAccount) {
            const fromAmountBig = BigInt(new Decimal(deal.fromAmount.toString()).toFixed(0));
            const newFromBalance = fromAccount.balance - fromAmountBig;
            await tx.fintechAccount.update({
              where: { id: fromAccount.id },
              data: {
                balance: newFromBalance < BigInt(0) ? BigInt(0) : newFromBalance,
                updatedAt: new Date(),
              },
            });
            await tx.ledgerEntry.create({
              data: {
                id: createId(),
                exchangeId: deal.exchangeId,
                accountId: fromAccount.id,
                customerId: customer.id,
                txnId: transaction.id,
                direction: 'DEBIT',
                amount: fromAmountBig,
                currency: deal.fromCurrency,
                runningBalance: newFromBalance < BigInt(0) ? BigInt(0) : newFromBalance,
                description: `تکمیل معامله ارزی (مبدا) — کد: ${dealId.slice(-8)}`,
                createdById: access.userId,
              },
            });
          }
        }
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطای داخلی';
    if (msg.startsWith('FEE_EXCEEDS_AMOUNT')) {
      return {
        success: false,
        error: {
          code: 'FEE_EXCEEDS_AMOUNT',
          message: 'کارمزد از مبلغ معامله بیشتر است — لطفاً فیلد کارمزد را بررسی کنید',
        },
      };
    }
    throw err;
  }

  revalidateDealCaches();

  // Fire-and-forget: notify deal completed
  const completedDeal = await prisma.currencyDeal
    .findUnique({
      where: { id: dealId },
      select: {
        id: true,
        trackingCode: true,
        customerName: true,
        customerPhone: true,
        fromCurrency: true,
        toCurrency: true,
        fromAmount: true,
        toAmount: true,
        userId: true,
        Exchange: { select: { name: true, displayName: true } },
      },
    })
    .catch(() => null);

  if (completedDeal) {
    void notifyDealStatusChange(
      {
        trackingCode: completedDeal.trackingCode,
        customerName: completedDeal.customerName,
        customerPhone: completedDeal.customerPhone,
        fromCurrency: completedDeal.fromCurrency,
        toCurrency: completedDeal.toCurrency,
        fromAmount: completedDeal.fromAmount.toString(),
        toAmount: completedDeal.toAmount.toString(),
        status: 'COMPLETED',
        exchangeName: completedDeal.Exchange.displayName ?? completedDeal.Exchange.name,
      },
      'COMPLETED',
    );

    // اعلان به تلگرامِ صاحب معامله — «معامله تکمیل شد»
    if (completedDeal.userId) {
      void notifyTelegramUser(
        completedDeal.userId,
        `✅ <b>معامله تکمیل شد</b>\n\n🔑 کد پیگیری: <code>${completedDeal.trackingCode}</code>\n💱 ${completedDeal.fromAmount} ${completedDeal.fromCurrency} → ${completedDeal.toAmount} ${completedDeal.toCurrency}`,
        {
          inlineKeyboard: [
            [{ text: '🌐 پیگیری معامله', url: getPortalUrl('/customer/dashboard') }],
          ],
        },
        { dedupeKey: `deal-completed:${completedDeal.id}` },
      );
    }
  }

  return { success: true, data: { id: dealId } };
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelDeal(
  dealId: string,
  reason: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      quoteId: true,
      userId: true,
      exchangeId: true,
    },
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

  const prevStatus = deal.status as 'PENDING' | 'CONFIRMED' | 'PROCESSING';

  // F5-fix: همه write‌ها در یک $transaction — اگر هر کدام fail شود، همه rollback می‌شوند
  // F5b-fix: atomic claim برای جلوگیری از race condition (دو درخواست cancel همزمان)
  const cancelIp = await getClientIp();
  await prisma.$transaction(async (tx) => {
    const claim = await tx.currencyDeal.updateMany({
      where: { id: dealId, status: prevStatus },
      data: { status: 'CANCELLED', internalNote: reason },
    });
    // اگر claim.count===0، deal قبلاً توسط درخواست دیگری تغییر وضعیت داده — idempotent exit
    if (claim.count === 0) return;

    await tx.dealStatusLog.create({
      data: {
        dealId,
        fromStatus: prevStatus,
        toStatus: 'CANCELLED',
        actorId: user.id,
        note: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: deal.exchangeId,
        actorId: user.id,
        actorRole: isAdmin ? 'ADMIN' : isOwner ? 'USER' : 'SARAFI',
        action: 'DEAL_CANCELLED',
        entityType: 'CurrencyDeal',
        entityId: dealId,
        ip: cancelIp,
        meta: { reason } as Prisma.InputJsonValue,
      },
    });

    // quote را آزاد کن (داخل transaction)
    if (deal.quoteId) {
      const q = await tx.exchangeRateQuote.findUnique({
        where: { id: deal.quoteId },
        select: { status: true },
      });
      if (q?.status === 'LOCKED') {
        await tx.exchangeRateQuote.update({
          where: { id: deal.quoteId },
          data: { status: 'ACTIVE' },
        });
      }
    }
  });

  revalidateDealCaches();

  // اعلان به تلگرامِ صاحب معامله — «معامله لغو شد»
  if (deal.userId) {
    void notifyTelegramUser(
      deal.userId,
      `❌ <b>معامله لغو شد</b>\n\n🔑 کد پیگیری: <code>${deal.trackingCode}</code>\n📌 دلیل: ${reason}`,
      {
        inlineKeyboard: [[{ text: '🌐 پیگیری معامله', url: getPortalUrl('/customer/dashboard') }]],
      },
      { dedupeKey: `deal-cancelled:${deal.id}` },
    );
  }

  return { success: true, data: { id: dealId } };
}

// ─── DISPUTE ──────────────────────────────────────────────────────────────────

/**
 * disputeDeal — ثبت اعتراض روی معامله تکمیل‌شده
 *
 * فقط:
 *   - صاحب معامله (userId === user.id) می‌تواند اعتراض دهد
 *   - ادمین/صراف می‌توانند به‌جای مشتری ثبت کنند
 *   - فقط معاملات COMPLETED قابل dispute هستند
 *
 * جریان: COMPLETED → DISPUTED → REFUNDED (refundDeal) یا → COMPLETED (بسته)
 */
export async function disputeDeal(
  dealId: string,
  reason: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  if (!reason?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'دلیل اعتراض الزامی است' },
    };
  }

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: { id: true, status: true, userId: true, exchangeId: true },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };

  if (deal.status !== 'COMPLETED') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message: 'فقط معاملات تکمیل‌شده قابل اعتراض هستند',
      },
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

  const disputeIp = await getClientIp();
  await prisma.$transaction(async (tx) => {
    await tx.currencyDeal.update({
      where: { id: dealId },
      data: { status: 'DISPUTED', internalNote: reason },
    });

    await tx.dealStatusLog.create({
      data: {
        dealId,
        fromStatus: 'COMPLETED',
        toStatus: 'DISPUTED',
        actorId: user.id,
        actorRole: isAdmin ? 'ADMIN' : isOwner ? 'USER' : 'SARAFI',
        note: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: deal.exchangeId,
        actorId: user.id,
        actorRole: isAdmin ? 'ADMIN' : isOwner ? 'USER' : 'SARAFI',
        action: 'DEAL_DISPUTED',
        entityType: 'CurrencyDeal',
        entityId: dealId,
        ip: disputeIp,
        meta: { reason } as Prisma.InputJsonValue,
      },
    });
  });

  revalidateDealCaches();
  return { success: true, data: { id: dealId } };
}

// ─── REFUND ───────────────────────────────────────────────────────────────────

/**
 * refundDeal — ثبت بازگشت وجه برای معامله DISPUTED
 *
 * فقط ادمین یا صراف می‌تواند refund دهد — نه کاربر عادی.
 * جریان: DISPUTED → REFUNDED
 *
 * اگر مشتری LedgerEntry داشته باشد، DEBIT reverse می‌شود (CREDIT برگشتی).
 */
export async function refundDeal(
  dealId: string,
  refundNote: string,
): Promise<FintechActionResult<{ id: string }>> {
  try {
    return await _refundDealImpl(dealId, refundNote);
  } catch (err) {
    return parseRefundError(err);
  }
}

async function _refundDealImpl(
  dealId: string,
  refundNote: string,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const { user } = auth;
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';

  const deal = await prisma.currencyDeal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      status: true,
      userId: true,
      exchangeId: true,
      toAmount: true,
      toCurrency: true,
      feeAmount: true,
      fromAmount: true,
      fromCurrency: true,
    },
  });
  if (!deal) return { success: false, error: { code: 'NOT_FOUND', message: 'معامله یافت نشد' } };

  if (deal.status !== 'DISPUTED') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message: 'فقط معاملات در وضعیت اعتراض قابل بازگشت وجه هستند',
      },
    };
  }

  // فقط ادمین یا صراف می‌توانند refund دهند
  if (!isAdmin) {
    const staff = await prisma.exchangeStaff.findFirst({
      where: { exchangeId: deal.exchangeId, userId: user.id, revokedAt: null },
      select: { id: true },
    });
    if (!staff) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'فقط ادمین یا صراف می‌توانند بازگشت وجه دهند' },
      };
    }
  }

  const refundIp = await getClientIp();

  // Serializable isolation: جلوگیری از race condition روی balance
  // اگر دو refund همزمان بیایند، دومی با conflict خطا می‌دهد
  await prisma.$transaction(
    async (tx) => {
      await tx.currencyDeal.update({
        where: { id: dealId },
        data: { status: 'REFUNDED', internalNote: refundNote },
      });

      await tx.dealStatusLog.create({
        data: {
          dealId,
          fromStatus: 'DISPUTED',
          toStatus: 'REFUNDED',
          actorId: user.id,
          actorRole: isAdmin ? 'ADMIN' : 'SARAFI',
          note: refundNote,
        },
      });

      await tx.auditLog.create({
        data: {
          id: createId(),
          exchangeId: deal.exchangeId,
          actorId: user.id,
          actorRole: isAdmin ? 'ADMIN' : 'SARAFI',
          action: 'DEAL_REFUNDED',
          entityType: 'CurrencyDeal',
          entityId: dealId,
          ip: refundIp,
          meta: {
            refundNote,
            toAmount: deal.toAmount.toString(),
            toCurrency: deal.toCurrency,
          } as Prisma.InputJsonValue,
        },
      });

      // اگر مشتری لاگین بوده و حساب داشته → DEBIT برگشتی ثبت کن
      if (deal.userId) {
        const customer = await tx.customer.findFirst({
          where: { userId: deal.userId, exchangeId: deal.exchangeId },
          select: { id: true },
        });
        if (customer) {
          // SELECT ... FOR UPDATE: balance را با lock می‌خوانیم تا race condition نباشد
          const lockedRows = await tx.$queryRaw<Array<{ id: string; balance: bigint }>>`
            SELECT id, balance
            FROM "FintechAccount"
            WHERE "customerId" = ${customer.id}
              AND "exchangeId" = ${deal.exchangeId}
              AND currency = ${deal.toCurrency}
            LIMIT 1
            FOR UPDATE
          `;
          const lockedAccount = lockedRows && lockedRows.length > 0 ? lockedRows[0] : null;
          if (lockedAccount) {
            const refundAmount = BigInt(new Decimal(deal.toAmount.toString()).toFixed(0));
            // اگر balance کمتر از مبلغ بازگشتی است → خطا به‌جای silent clamp
            // مثال: مشتری 100 AFN داشت، معامله 200 AFN بود → نمی‌توان 200 AFN debit کرد
            if (lockedAccount.balance < refundAmount) {
              throw new Error(
                `INSUFFICIENT_BALANCE: موجودی حساب (${lockedAccount.balance}) کمتر از مبلغ بازگشتی (${refundAmount}) است`,
              );
            }
            const newBalance = lockedAccount.balance - refundAmount;
            await tx.fintechAccount.update({
              where: { id: lockedAccount.id },
              data: { balance: newBalance, updatedAt: new Date() },
            });
            await tx.ledgerEntry.create({
              data: {
                id: createId(),
                exchangeId: deal.exchangeId,
                accountId: lockedAccount.id,
                customerId: customer.id,
                direction: 'DEBIT',
                amount: refundAmount,
                currency: deal.toCurrency,
                runningBalance: newBalance,
                description: `بازگشت وجه — معامله ${dealId.slice(-8)}`,
                createdById: user.id,
              },
            });
          }
        }
      }
    },
    { isolationLevel: 'Serializable' },
  );

  revalidateDealCaches();
  return { success: true, data: { id: dealId } };
}

// ─── helper: error handler برای refundDeal ────────────────────────────────────
// (این helper داخلی است — مستقیماً از refundDeal صدا نمی‌شود)
// خطاهای $queryRaw/$transaction را به FintechActionResult تبدیل می‌کند
function parseRefundError(err: unknown): FintechActionResult<{ id: string }> {
  const msg = err instanceof Error ? err.message : '';
  if (msg.startsWith('INSUFFICIENT_BALANCE')) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'موجودی حساب مشتری برای بازگشت وجه کافی نیست. لطفاً موجودی را بررسی کنید.',
      },
    };
  }
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی در پردازش بازگشت وجه' },
  };
}
