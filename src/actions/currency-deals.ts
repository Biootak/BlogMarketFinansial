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
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { Decimal } from '@prisma/client/runtime/library';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
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

// ─── CREATE (مشتری یا صراف) ────────────────────────────────────────────────────

export async function createDeal(
  raw: unknown,
): Promise<ActionResult<{ id: string; trackingCode: string }>> {
  // ── Rate limit: 5 deal در 10 دقیقه بر اساس IP (M5) ──────────────────────
  const ip = (await headers()).get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
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
  // این جلوگیری می‌کند دو درخواست همزمان با یک quoteId، هر دو موفق شوند.
  let appliedRate = new Decimal(0);
  let toAmount = new Decimal(0);
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
    toAmount = new Decimal(fromAmount).mul(appliedRate);
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

  revalidateDealCaches();
  return { success: true, data: { id: deal.id, trackingCode } };
}

// ─── helper: خواندن IP از headers ────────────────────────────────────────────
async function getClientIp(): Promise<string> {
  return (await headers()).get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
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
): Promise<ActionResult<{ id: string }>> {
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

export async function completeDeal(
  dealId: string,
  internalNote?: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ id: string }>> {
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
    const [customer, exchange] = await Promise.all([
      prisma.customer.findFirst({
        where: { userId: deal.userId, exchangeId: deal.exchangeId },
        select: { kycLevel: true, kycStatus: true },
      }),
      prisma.exchange.findUnique({
        where: { id: deal.exchangeId },
        select: { requireKyc: true },
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
          },
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

  const prevStatus = deal.status as 'PENDING' | 'CONFIRMED' | 'PROCESSING';

  // F5-fix: همه write‌ها در یک $transaction — اگر هر کدام fail شود، همه rollback می‌شوند
  const cancelIp = await getClientIp();
  await prisma.$transaction(async (tx) => {
    await tx.currencyDeal.update({
      where: { id: dealId },
      data: { status: 'CANCELLED', internalNote: reason },
    });

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
        meta: { reason },
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
  return { success: true, data: { id: dealId } };
}
