'use server';

/**
 * settlement.ts — Server Actions برای مدیریت تسویه‌حساب صرافی‌ها
 *
 * جریان:
 *   cron → computePeriodSettlement (محاسبه دوره)
 *   ادمین → approveSettlement → APPROVED
 *   ادمین → markSettlementPaid → PAID
 *
 * امنیت: همه write actions نیاز به requireAdmin دارند.
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// helper: ثبت AuditLog برای settlement actions
async function logSettlementAudit(params: {
  actorId: string;
  action: string;
  entityId: string;
  exchangeId: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: params.exchangeId,
      actorId: params.actorId,
      actorRole: 'ADMIN',
      action: params.action,
      entityType: 'Settlement',
      entityId: params.entityId,
      meta: (params.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettlementRow = {
  id: string;
  exchangeId: string;
  exchangeName: string;
  periodStart: Date;
  periodEnd: Date;
  totalVolume: string;
  dealCount: number;
  platformFee: string;
  exchangeNet: string;
  currency: string;
  status: string;
  note: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

// ─── mapper helper ─────────────────────────────────────────────────────────────

type RawSettlementRow = {
  id: string;
  exchangeId: string;
  periodStart: Date;
  periodEnd: Date;
  totalVolume: bigint;
  dealCount: number;
  platformFee: bigint;
  exchangeNet: bigint;
  currency: string;
  status: string;
  note: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  Exchange: { name: string; displayName: string | null };
};

function mapSettlementRow(r: RawSettlementRow): SettlementRow {
  return {
    id: r.id,
    exchangeId: r.exchangeId,
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    totalVolume: r.totalVolume.toString(),
    dealCount: r.dealCount,
    platformFee: r.platformFee.toString(),
    exchangeNet: r.exchangeNet.toString(),
    currency: r.currency,
    status: r.status,
    note: r.note,
    approvedById: r.approvedById,
    approvedAt: r.approvedAt,
    paidAt: r.paidAt,
    createdAt: r.createdAt,
  };
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/** admin-only: همه تسویه‌ها (با فیلتر اختیاری) */
export async function getSettlements(opts?: {
  exchangeId?: string;
  status?: string;
  limit?: number;
}): Promise<SettlementRow[]> {
  const auth = await requireAdmin();
  if (!auth.success) return [];

  const rows = await prisma.settlement.findMany({
    where: {
      ...(opts?.exchangeId ? { exchangeId: opts.exchangeId } : {}),
      ...(opts?.status ? { status: opts.status as import('@prisma/client').SettlementStatus } : {}),
    },
    include: {
      Exchange: { select: { name: true, displayName: true } },
    },
    orderBy: { periodStart: 'desc' },
    take: opts?.limit ?? 50,
  });

  return rows.map(mapSettlementRow);
}

/**
 * صراف‌محور: فقط تسویه‌های همین صرافی را برمی‌گرداند.
 *
 * امنیت: requireExchangeAccess — صراف فقط به صرافی خودش دسترسی دارد.
 * ادمین‌های پلتفرم هم از این مسیر می‌توانند استفاده کنند (exchange-auth bypass).
 */
export async function getMyExchangeSettlements(
  exchangeId: string,
  opts?: { status?: string; limit?: number },
): Promise<SettlementRow[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.settlement.findMany({
    where: {
      exchangeId,
      ...(opts?.status ? { status: opts.status as import('@prisma/client').SettlementStatus } : {}),
    },
    include: {
      Exchange: { select: { name: true, displayName: true } },
    },
    orderBy: { periodStart: 'desc' },
    take: opts?.limit ?? 50,
  });

  return rows.map(mapSettlementRow);
}

// ─── COMPUTE (called by cron) ────────────────────────────────────────────────

const ComputeSchema = z
  .object({
    exchangeId: z.string().min(1),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    currency: z.string().default('AFN'),
  })
  .refine((d) => d.periodStart < d.periodEnd, {
    message: 'تاریخ شروع باید قبل از تاریخ پایان باشد',
    path: ['periodStart'],
  });

/**
 * computePeriodSettlement — محاسبه تسویه دوره‌ای برای یک صرافی
 *
 * از CurrencyDeal های COMPLETED در بازه زمانی داده‌شده محاسبه می‌کند.
 * platformFee = sum(feeAmount) * (exchange.platformFee / 100)
 */
export async function computePeriodSettlement(
  raw: unknown,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const parsed = ComputeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { exchangeId, periodStart, periodEnd, currency } = parsed.data;

  // Idempotency: بررسی settlement تکراری برای همان دوره و صرافی
  const existingSettlement = await prisma.settlement.findFirst({
    where: {
      exchangeId,
      periodStart,
      periodEnd,
      currency,
    },
    select: { id: true },
  });
  if (existingSettlement) {
    return { success: true, data: { id: existingSettlement.id } };
  }

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: { platformFee: true, name: true, displayName: true },
  });

  if (!exchange) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'صرافی یافت نشد' } };
  }

  // محاسبه معاملات COMPLETED در بازه
  const deals = await prisma.currencyDeal.findMany({
    where: {
      exchangeId,
      status: 'COMPLETED',
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { fromAmount: true, feeAmount: true },
  });

  // Prisma Decimal → string → BigInt (مثال: 1500.50 AFN → "150050" cents)
  // از d.fromAmount.toString() به جای Number() برای جلوگیری از floating-point precision error
  const totalVolumeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(Math.round(Number(d.fromAmount.toString()) * 100)),
    BigInt(0),
  );
  const totalFeeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(Math.round(Number(d.feeAmount.toString()) * 100)),
    BigInt(0),
  );

  // platformFee = totalFeeDecimal * (platformFeeRate / 100)
  // مثال: totalFeeDecimal=10000n (100 AFN), platformFeeRate=10% → platformFee=1000n (10 AFN)
  const platformFeeRate = Number((exchange.platformFee ?? 0).toString()) / 100;
  const platformFee = BigInt(Math.round(Number(totalFeeDecimal) * platformFeeRate));
  const exchangeNet = totalFeeDecimal - platformFee;

  const id = createId();

  await prisma.settlement.create({
    data: {
      id,
      exchangeId,
      periodStart,
      periodEnd,
      totalVolume: totalVolumeDecimal,
      dealCount: deals.length,
      platformFee,
      exchangeNet,
      currency,
      status: 'PENDING',
    },
  });

  await logSettlementAudit({
    actorId: auth.user.id,
    action: 'SETTLEMENT_COMPUTED',
    entityId: id,
    exchangeId,
    meta: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dealCount: deals.length,
      totalVolume: totalVolumeDecimal.toString(),
      platformFee: platformFee.toString(),
      exchangeNet: exchangeNet.toString(),
      currency,
    },
  });

  revalidateTag('settlements');

  return { success: true, data: { id } };
}

// ─── APPROVE ─────────────────────────────────────────────────────────────────

/**
 * approveSettlement — فقط ادمین پلتفرم می‌تواند تسویه را تأیید کند.
 *
 * امنیت دو لایه:
 *   ۱. requireAdmin → فقط platform admin/owner
 *   ۲. settlementId → exchangeId را چک می‌کند تا IDOR مسدود شود
 *      (ادمین نمی‌تواند settlement صرافی دیگری را از طریق این action تأیید کند — ولی ادمین به همه دسترسی دارد)
 *
 * نکته طراحی: صراف OWNER/MANAGER نمی‌تواند settlement خودش را approve کند.
 * این یک separation-of-duties است — تأیید باید توسط طرف مقابل (پلتفرم) انجام شود.
 */
export async function approveSettlement(settlementId: string): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز — فقط ادمین پلتفرم' },
    };
  }

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    select: { status: true, exchangeId: true },
  });

  if (!settlement) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'تسویه یافت نشد' } };
  }

  if (settlement.status !== 'PENDING') {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط تسویه‌های در انتظار قابل تأیید هستند' },
    };
  }

  await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: 'APPROVED',
      approvedById: auth.user.id,
      approvedAt: new Date(),
    },
  });

  await logSettlementAudit({
    actorId: auth.user.id,
    action: 'SETTLEMENT_APPROVED',
    entityId: settlementId,
    exchangeId: settlement.exchangeId,
  });

  revalidateTag('settlements');

  return { success: true, data: undefined };
}

// ─── MARK PAID ───────────────────────────────────────────────────────────────

export async function markSettlementPaid(settlementId: string): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    select: { status: true },
  });

  if (!settlement) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'تسویه یافت نشد' } };
  }

  if (settlement.status !== 'APPROVED') {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'فقط تسویه‌های تأییدشده قابل پرداخت هستند' },
    };
  }

  // همه write ها در یک transaction — اگر LedgerEntry fail کند، settlement هم rollback می‌شود
  const paidSettlement = await prisma.$transaction(async (tx) => {
    const updated = await tx.settlement.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date() },
      select: {
        exchangeId: true,
        platformFee: true,
        exchangeNet: true,
        currency: true,
        totalVolume: true,
        dealCount: true,
      },
    });

    // ثبت کارمزد پلتفرم در LedgerEntry — double-entry: DEBIT از صرافی (پلتفرم fee می‌گیرد)
    // مثال: platformFee=5000 AFN → LedgerEntry DEBIT 5000 از صرافی
    // مثال: exchangeNet=45000 AFN → LedgerEntry CREDIT 45000 به صرافی
    await tx.ledgerEntry.create({
      data: {
        id: createId(),
        exchangeId: updated.exchangeId,
        txnId: null,
        accountId: null, // settlement-level — مختص حساب مشتری نیست
        customerId: null, // settlement-level
        direction: 'DEBIT',
        amount: updated.platformFee,
        currency: updated.currency,
        runningBalance: BigInt(0), // platform running-balance در این schema track نمی‌شود
        description: `کارمزد پلتفرم — تسویه ${settlementId.slice(-8)}`,
        createdById: auth.user.id,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        id: createId(),
        exchangeId: updated.exchangeId,
        txnId: null,
        accountId: null,
        customerId: null,
        direction: 'CREDIT',
        amount: updated.exchangeNet,
        currency: updated.currency,
        runningBalance: BigInt(0),
        description: `خالص قابل پرداخت صرافی — تسویه ${settlementId.slice(-8)}`,
        createdById: auth.user.id,
      },
    });

    return updated;
  });

  await logSettlementAudit({
    actorId: auth.user.id,
    action: 'SETTLEMENT_PAID',
    entityId: settlementId,
    exchangeId: paidSettlement.exchangeId,
    meta: {
      platformFee: paidSettlement.platformFee.toString(),
      exchangeNet: paidSettlement.exchangeNet.toString(),
      currency: paidSettlement.currency,
      totalVolume: paidSettlement.totalVolume.toString(),
      dealCount: paidSettlement.dealCount,
    },
  });

  revalidateTag('settlements');

  return { success: true, data: undefined };
}
