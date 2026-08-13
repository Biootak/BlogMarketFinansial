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
import { requireAdmin, requirePermission } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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

  // 2026-08-11: enforce سطح اکشن — ایجاد تسویه به `settlements:create`
  const perm = await requirePermission('settlements:create');
  if (!perm.success) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم برای این عملیات را ندارید' },
    };
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

  // C5-fix: از Decimal.js برای تبدیل دقیق به cents (BigInt) استفاده می‌کنیم.
  // Number() روی مبالغ بزرگ (>2^53) precision می‌بازد — Decimal کامل‌اً صحیح است.
  const totalVolumeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(new Decimal(d.fromAmount.toString()).mul(100).round().toFixed(0)),
    BigInt(0),
  );
  const totalFeeDecimal = deals.reduce(
    (sum, d) => sum + BigInt(new Decimal(d.feeAmount.toString()).mul(100).round().toFixed(0)),
    BigInt(0),
  );

  // platformFee = totalFeeDecimal * (platformFeeRate / 100)
  // مثال: totalFeeDecimal=10000n (100 AFN), platformFeeRate=10% → platformFee=1000n (10 AFN)
  const platformFeeRateDecimal = new Decimal((exchange.platformFee ?? 0).toString()).div(100);
  const platformFee = BigInt(
    new Decimal(totalFeeDecimal.toString()).mul(platformFeeRateDecimal).round().toFixed(0),
  );
  const exchangeNet = totalFeeDecimal - platformFee;

  const id = createId();

  try {
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
  } catch (err) {
    // R1-fix: unique constraint — دو cron هم‌زمان برای همان دوره، دومی P2002
    // می‌گیرد و باید settlement موجود را برگرداند (double-settlement race).
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === 'P2002') {
      const existing = await prisma.settlement.findFirst({
        where: { exchangeId, periodStart, periodEnd, currency },
        select: { id: true },
      });
      if (existing) return { success: true, data: { id: existing.id } };
    }
    throw err;
  }

  try {
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
  } catch {
    // audit log failure نباید عملیات اصلی را fail کند
  }

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

  // 2026-08-11: enforce سطح اکشن — عملیات تسویه به `settlements:create`
  const perm = await requirePermission('settlements:create');
  if (!perm.success) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم برای این عملیات را ندارید' },
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

  // ── Atomic claim: فقط یک approve هم‌زمان می‌تواند PENDING→APPROVED را اجرا کند
  // (دو ادمین هم‌زمان → یکی برنده، دیگری ALREADY_APPROVED → idempotent success).
  const claim = await prisma.settlement.updateMany({
    where: { id: settlementId, status: 'PENDING' },
    data: {
      status: 'APPROVED',
      approvedById: auth.user.id,
      approvedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    // یا قبلاً توسط ادمین دیگر تأیید شده یا وضعیت تغییر کرده — idempotent success
    return { success: true, data: undefined };
  }

  try {
    await logSettlementAudit({
      actorId: auth.user.id,
      action: 'SETTLEMENT_APPROVED',
      entityId: settlementId,
      exchangeId: settlement.exchangeId,
    });
  } catch {
    // audit log failure نباید تأیید را fail کند
  }

  revalidateTag('settlements');

  return { success: true, data: undefined };
}

// ─── MARK PAID ───────────────────────────────────────────────────────────────

export async function markSettlementPaid(settlementId: string): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  // 2026-08-11: enforce سطح اکشن — عملیات تسویه به `settlements:create`
  const perm = await requirePermission('settlements:create');
  if (!perm.success) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم برای این عملیات را ندارید' },
    };
  }

  // B-07 fix: exchangeId را هم fetch کن تا audit log و future IDOR checks
  // بتوانند از آن استفاده کنند. قبلاً فقط status بود و exchangeId
  // فقط داخل $transaction دوباره fetch می‌شد.
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    select: { status: true, exchangeId: true },
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
  type PaidPayload = {
    exchangeId: string;
    platformFee: bigint;
    exchangeNet: bigint;
    currency: string;
    totalVolume: bigint;
    dealCount: number;
  };
  let paidSettlement: PaidPayload;
  try {
    paidSettlement = await prisma.$transaction(async (tx): Promise<PaidPayload> => {
      // ── Atomic claim: فقط یک پرداخت هم‌زمان می‌تواند APPROVED→PAID را اجرا کند.
      // بدون این قفل، دو ادمین هم‌زمان هر دو ledger ثبت می‌کردند → دوبار پرداخت.
      const claim = await tx.settlement.updateMany({
        where: { id: settlementId, status: 'APPROVED' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (claim.count === 0) throw new Error('ALREADY_PAID');

      const updated = await tx.settlement.findUniqueOrThrow({
        where: { id: settlementId },
        select: {
          exchangeId: true,
          platformFee: true,
          exchangeNet: true,
          currency: true,
          totalVolume: true,
          dealCount: true,
        },
      });

      // B-13 fix: runningBalance = آخرین موجودی LedgerEntry همین exchange.
      // قبلاً BigInt(0) بود — گزارش حسابداری تراز نمی‌داد.
      // settlement-level entries accountId ندارند (exchange-level هستند)
      // پس runningBalance را از آخرین entry همین exchange می‌گیریم.
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { exchangeId: updated.exchangeId },
        orderBy: { createdAt: 'desc' },
        select: { runningBalance: true },
      });
      const prevBalance = lastEntry?.runningBalance ?? BigInt(0);
      const afterDebit = prevBalance - updated.platformFee;
      const afterCredit = afterDebit + updated.exchangeNet;

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
          runningBalance: afterDebit,
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
          runningBalance: afterCredit,
          description: `خالص قابل پرداخت صرافی — تسویه ${settlementId.slice(-8)}`,
          createdById: auth.user.id,
        },
      });

      return updated;
    });
  } catch (err) {
    if ((err as Error).message === 'ALREADY_PAID') {
      // پرداخت هم‌زمان دیگر همین تسویه را کامل کرده — idempotent success
      return { success: true, data: undefined };
    }
    throw err;
  }

  try {
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
  } catch {
    // audit log failure نباید پرداخت را fail کند
  }

  revalidateTag('settlements');

  return { success: true, data: undefined };
}

// ─── INTERNAL: atomic claim helper ───────────────────────────────────────────
// markSettlementPaid از updateMany شرطی (claim) استفاده می‌کند تا دو درخواست
// هم‌زمان فقط یکی موفق شود. ALREADY_PAID از داخل transaction پرتاب می‌شود و
// اینجا به حالت idempotent تبدیل می‌شود (اگر قبلاً PAID شده، success).

// ─── CSV EXPORT (dead-button fix 2026-08-01) ────────────────────────────────
// دکمهٔ «خروجی CSV» در SettlementCockpit بدون onClick بود — dead button.
// این action همان دادهٔ getMyExchangeSettlements را به CSV تبدیل می‌کند
// (الگوی generateReportCsv در reporting.ts).

export async function generateSettlementCsv(
  exchangeId: string,
  opts?: { status?: string; limit?: number },
): Promise<FintechActionResult<{ csv: string; filename: string }>> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  }

  const rows = await getMyExchangeSettlements(exchangeId, opts);

  // RTL-safe: ستون‌ها فارسی ولی CSV با جداساز استاندارد
  const header = [
    'شناسه',
    'صرافی',
    'از تاریخ',
    'تا تاریخ',
    'حجم کل',
    'تعداد معاملات',
    'کارمزد پلتفرم',
    'خالص صرافی',
    'واحد',
    'وضعیت',
    'یادداشت',
  ];

  const fmtDate = (d: Date | null): string => (d ? new Intl.DateTimeFormat('en-CA').format(d) : '');

  const esc = (v: string): string => (v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v);

  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        esc(r.id),
        esc(r.exchangeName),
        fmtDate(r.periodStart),
        fmtDate(r.periodEnd),
        esc(r.totalVolume),
        String(r.dealCount),
        esc(r.platformFee),
        esc(r.exchangeNet),
        esc(r.currency),
        esc(r.status),
        esc(r.note ?? ''),
      ].join(','),
    );
  }

  const csv = `﻿${lines.join('\n')}`;
  const filename = `settlements-${exchangeId.slice(-6)}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return { success: true, data: { csv, filename } };
}
