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
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

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

// ─── READ ─────────────────────────────────────────────────────────────────────

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

  return rows.map((r) => ({
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
  }));
}

// ─── COMPUTE (called by cron) ────────────────────────────────────────────────

const ComputeSchema = z.object({
  exchangeId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  currency: z.string().default('AFN'),
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

  const totalVolumeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(Math.round(Number(d.fromAmount) * 100)),
    BigInt(0),
  );
  const totalFeeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(Math.round(Number(d.feeAmount) * 100)),
    BigInt(0),
  );

  const platformFeeRate = Number(exchange.platformFee ?? 0) / 100;
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

  revalidateTag('settlements');

  return { success: true, data: { id } };
}

// ─── APPROVE ─────────────────────────────────────────────────────────────────

export async function approveSettlement(
  settlementId: string,
): Promise<FintechActionResult<void>> {
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

  revalidateTag('settlements');

  return { success: true, data: undefined };
}

// ─── MARK PAID ───────────────────────────────────────────────────────────────

export async function markSettlementPaid(
  settlementId: string,
): Promise<FintechActionResult<void>> {
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

  await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  revalidateTag('settlements');

  return { success: true, data: undefined };
}
