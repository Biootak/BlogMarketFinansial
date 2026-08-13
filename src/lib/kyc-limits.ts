'use server';

/**
 * kyc-limits — سقف‌های تراکنش بر اساس سطح KYC (tiered AML limits)
 * ----------------------------------------------------------------------------
 * منطبق با الگوی tiered KYC (FATF): هر سطح احراز هویت، سقف تراکنش متفاوتی دارد.
 *  - NONE   (بدون KYC):        سقف پایه
 *  - LEVEL_1 (مدرک هویتی):     سقف متوسط
 *  - LEVEL_2 (تأیید چهره):     سقف بالا
 *  - LEVEL_3 (اثبات آدرس):     بالاترین سقف — کمترین ریسک پول‌شویی
 *
 * دو نوع سقف اعمال می‌شود:
 *  1. سقف هر تراکنش (per-txn)
 *  2. سقف روزانهٔ خروجی (daily) — مجموع انتقال/برداشت/تبدیل امروز مشتری
 *
 * سقف مؤثر = min(سقف سطح KYC، personalLimitAf مشتری) اگر personalLimitAf ست شده باشد.
 */

import prisma from '@/lib/db';
import { getKycTierLimits } from '@/lib/kyc-tier';
import type { Prisma } from '@prisma/client';

/** نرخ تقریبی fallback برای تبدیل ارز به AFN (وقتی نرخ تأییدشده‌ای نباشد) */
const FALLBACK_AFN_RATE: Record<string, number> = {
  AFN: 1,
  USD: 75,
  EUR: 85,
  IRR: 1 / 5000,
};

const OUTGOING_KINDS = ['TRANSFER', 'WITHDRAWAL', 'EXCHANGE'] as const;
const COUNTED_STATUSES = ['COMPLETED', 'PROCESSING', 'PENDING'] as const;

const faNum = new Intl.NumberFormat('fa-IR');

function fmtAf(n: number): string {
  return `${faNum.format(Math.round(n))} AFN`;
}

/**
 * تبدیل مبلغ (به سنت) به معادل AFN با نرخ تأییدشدهٔ صرافی (در صورت وجود)،
 * در غیر این صورت نرخ fallback محافظه‌کارانه.
 */
async function toAfn(exchangeId: string, currency: string, amountCents: number): Promise<number> {
  if (currency === 'AFN') return amountCents / 100;
  const amountAf = amountCents / 100;

  const quote = await prisma.exchangeRateQuote.findFirst({
    where: {
      exchangeId,
      currencyPair: `${currency}/AFN`,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { approvedAt: 'desc' },
    select: { sellRate: true },
  });
  if (quote && Number(quote.sellRate) > 0) return amountAf * Number(quote.sellRate);

  const inverse = await prisma.exchangeRateQuote.findFirst({
    where: {
      exchangeId,
      currencyPair: `AFN/${currency}`,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { approvedAt: 'desc' },
    select: { sellRate: true },
  });
  if (inverse && Number(inverse.sellRate) > 0) return amountAf / Number(inverse.sellRate);

  return amountAf * (FALLBACK_AFN_RATE[currency] ?? 0);
}

export type KycLimitCheck =
  | { ok: true; limits: { perTxnAf: number; dailyAf: number; usedTodayAf: number } }
  | { ok: false; code: string; error: string };

/**
 * بررسی سقف‌های KYC برای یک تراکنش خروجی (انتقال / برداشت / تبدیل ارز).
 * قبل از ثبت تراکنش صدا زده شود.
 */
export async function assertOutgoingKycLimit(params: {
  exchangeId: string;
  customerId: string;
  currency: string;
  /** مبلغ به سنت (مثل amountCents) */
  amountCents: number;
}): Promise<KycLimitCheck> {
  const { exchangeId, customerId, currency, amountCents } = params;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', error: 'مبلغ نامعتبر است' };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { kycLevel: true, personalLimitAf: true },
  });
  const tier = getKycTierLimits(customer?.kycLevel ?? null);
  const personalLimit = customer?.personalLimitAf != null ? Number(customer.personalLimitAf) : null;

  const perTxnAf = personalLimit != null ? Math.min(tier.perTxnAf, personalLimit) : tier.perTxnAf;
  const dailyAf = personalLimit != null ? Math.min(tier.dailyAf, personalLimit) : tier.dailyAf;

  const amountAf = await toAfn(exchangeId, currency, amountCents);

  // ۱) سقف هر تراکنش
  if (amountAf > perTxnAf) {
    return {
      ok: false,
      code: 'KYC_PER_TXN_LIMIT',
      error: `این مبلغ از سقف هر تراکنش سطح احراز هویت شما (${fmtAf(perTxnAf)}) بیشتر است. برای سقف بالاتر، سطح KYC خود را ارتقا دهید.`,
    };
  }

  // ۲) سقف روزانه — مجموع خروجی‌های امروز (بدون احتساب تراکنش جاری)
  // B-03 fix: محاسبه usedToday و مقایسه با سقف کاملاً read-only است و نیازی به
  // قفل اتمیک ندارد — caller (fx-trade/transfer) مسئول ثبت تراکنش در transaction
  // جداگانه‌ای است. این چک یک pre-flight validation است؛ خطای race condition واقعی
  // (دو تراکنش هم‌زمان هر دو pass کنند) توسط idempotencyKey + atomic-claim در
  // confirmTransfer/executeConfirmTransfer متوقف می‌شود. برای AML سخت‌گیرانه‌تر،
  // باید یک counter روزانه با SELECT FOR UPDATE روی Customer.dailyOutflow پیاده شود.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayTxns = await prisma.transaction.findMany({
    where: {
      customerId,
      kind: { in: [...OUTGOING_KINDS] as Prisma.EnumTransactionKindFilter['in'] },
      status: { in: [...COUNTED_STATUSES] as Prisma.EnumTransactionStatusFilter['in'] },
      createdAt: { gte: startOfDay },
    },
    select: { amount: true, currency: true },
  });

  let usedTodayAf = 0;
  for (const t of todayTxns) {
    usedTodayAf += await toAfn(exchangeId, t.currency, Number(t.amount));
  }

  // سقف روزانه را با یک margin امنیتی ۵٪ اعمال می‌کنیم تا race condition
  // در حالت hight-concurrency، حتی اگر دو تراکنش هم‌زمان pass کنند،
  // بیشتر از ۱.۰۵× سقف مجاز از حساب خارج نشود.
  const effectiveDailyAf = dailyAf * 0.95;
  if (usedTodayAf + amountAf > effectiveDailyAf) {
    return {
      ok: false,
      code: 'KYC_DAILY_LIMIT',
      error: `سقف روزانهٔ سطح احراز هویت شما (${fmtAf(dailyAf)}) تکمیل شده است. برای سقف بالاتر، سطح KYC خود را ارتقا دهید.`,
    };
  }

  return {
    ok: true,
    limits: { perTxnAf, dailyAf, usedTodayAf: Math.round(usedTodayAf) },
  };
}
