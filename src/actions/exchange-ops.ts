'use server';

/**
 * exchange-ops — عملیات جدید پنل صرافی (آگوست ۲۰۲۶)
 *
 * صفحاتی که این ماژول تغذیه می‌کند:
 *   - /exchange/deals     → getExchangeDealStats (خود لیست از currency-deals.ts)
 *   - /exchange/ledger    → getExchangeLedger
 *   - /exchange/requests  → getExchangeRequests / getExchangeRequestStats / reviewExchangeRequest
 *   - /exchange/fraud     → getExchangeFraudQueue / resolveExchangeFraud
 *
 * امنیت: همهٔ read ها requireExchangeAccess دارند (tenant isolation) و همهٔ
 * write ها با بررسی صرافی + ثبت AuditLog انجام می‌شوند.
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExchangeDealStats = {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  completed: number;
  cancelled: number;
  disputed: number;
  refunded: number;
  /** مجموع مبلغ ورودی معاملات تکمیل‌شدهٔ امروز (به کمترین واحد) */
  todayVolume: string;
  todayCount: number;
};

export type ExchangeLedgerRow = {
  id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  runningBalance: string;
  description: string | null;
  createdAt: Date;
  customerName: string | null;
  accountLabel: string | null;
  txnId: string | null;
};

export type ExchangeLedgerData = {
  rows: ExchangeLedgerRow[];
  total: number;
  creditTotal: string;
  debitTotal: string;
  creditCount: number;
  debitCount: number;
};

export type ExchangeLedgerResult = FintechActionResult<ExchangeLedgerData>;

export type ExchangeRequestRow = {
  id: string;
  trackingCode: string;
  type: 'ACCOUNT_NEW' | 'ACCOUNT_UNFREEZE' | 'TRANSFER_INITIATE' | 'LIMIT_INCREASE' | 'OTHER';
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  note: string | null;
  payload: Record<string, string | number> | null;
  resolution: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  customerName: string;
  customerPhone: string;
};

export type ExchangeRequestStats = {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  cancelled: number;
  /** ۷ روز اخیر */
  last7d: number;
};

export type ExchangeFraudRow = {
  id: string;
  reason: string;
  riskScore: number;
  status: string;
  assignedToId: string | null;
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  customerName: string | null;
  customerPhone: string | null;
  txnId: string | null;
  txnAmount: string | null;
  txnCurrency: string | null;
};

export type ExchangeFraudStats = {
  open: number;
  inReview: number;
  resolved: number;
  /** میانگین امتیاز ریسک موارد باز */
  avgRisk: number;
  totalAtRisk: string;
};

// ─── Deal stats ───────────────────────────────────────────────────────────────

export async function getExchangeDealStats(exchangeId: string): Promise<ExchangeDealStats> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
      refunded: 0,
      todayVolume: '0',
      todayCount: 0,
    };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [grouped, today] = await Promise.all([
    prisma.currencyDeal.groupBy({
      by: ['status'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    prisma.currencyDeal.findMany({
      where: { exchangeId, status: 'COMPLETED', completedAt: { gte: startOfDay } },
      select: { fromAmount: true },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = Array.from(counts.values()).reduce((s, c) => s + c, 0);
  const todayVolume = today.reduce(
    (sum, d) => sum + (Number.isFinite(Number(d.fromAmount)) ? Number(d.fromAmount) : 0),
    0,
  );

  return {
    total,
    pending: counts.get('PENDING') ?? 0,
    confirmed: counts.get('CONFIRMED') ?? 0,
    processing: counts.get('PROCESSING') ?? 0,
    completed: counts.get('COMPLETED') ?? 0,
    cancelled: counts.get('CANCELLED') ?? 0,
    disputed: counts.get('DISPUTED') ?? 0,
    refunded: counts.get('REFUNDED') ?? 0,
    todayVolume: todayVolume.toString(),
    todayCount: today.length,
  };
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export async function getExchangeLedger(
  exchangeId: string,
  opts?: {
    direction?: 'DEBIT' | 'CREDIT' | 'ALL';
    query?: string;
    limit?: number;
  },
): Promise<ExchangeLedgerResult> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { success: false, error: access.error };

  const where: Record<string, unknown> = { exchangeId };
  if (opts?.direction && opts.direction !== 'ALL') where.direction = opts.direction;
  if (opts?.query?.trim()) {
    const q = opts.query.trim();
    where.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { txnId: { contains: q, mode: 'insensitive' } },
      { Customer: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
      { FintechAccount: { is: { label: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const [rows, total, creditAgg, debitAgg] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(80, opts?.limit ?? 40),
      select: {
        id: true,
        direction: true,
        amount: true,
        currency: true,
        runningBalance: true,
        description: true,
        createdAt: true,
        txnId: true,
        Customer: { select: { fullName: true } },
        FintechAccount: { select: { label: true } },
      },
    }),
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.aggregate({
      where: { ...where, direction: 'CREDIT' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledgerEntry.aggregate({
      where: { ...where, direction: 'DEBIT' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    success: true,
    data: {
      rows: rows.map((r) => ({
        id: r.id,
        direction: r.direction,
        amount: r.amount.toString(),
        currency: r.currency,
        runningBalance: r.runningBalance.toString(),
        description: r.description,
        createdAt: r.createdAt,
        customerName: r.Customer?.fullName ?? null,
        accountLabel: r.FintechAccount?.label ?? null,
        txnId: r.txnId,
      })),
      total,
      creditTotal: (creditAgg._sum.amount ?? BigInt(0)).toString(),
      debitTotal: (debitAgg._sum.amount ?? BigInt(0)).toString(),
      creditCount: creditAgg._count,
      debitCount: debitAgg._count,
    },
  };
}

// ─── Customer requests ────────────────────────────────────────────────────────

const REQUEST_STATUS: ExchangeRequestRow['status'][] = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];
const REQUEST_TYPES: ExchangeRequestRow['type'][] = [
  'ACCOUNT_NEW',
  'ACCOUNT_UNFREEZE',
  'TRANSFER_INITIATE',
  'LIMIT_INCREASE',
  'OTHER',
];

export async function getExchangeRequests(
  exchangeId: string,
  opts?: { status?: string; type?: string; limit?: number },
): Promise<ExchangeRequestRow[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const where: Record<string, unknown> = { exchangeId };
  if (opts?.status && REQUEST_STATUS.includes(opts.status as ExchangeRequestRow['status'])) {
    where.status = opts.status;
  }
  if (opts?.type && REQUEST_TYPES.includes(opts.type as ExchangeRequestRow['type'])) {
    where.type = opts.type;
  }

  const rows = await prisma.customerRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(80, opts?.limit ?? 50),
    select: {
      id: true,
      trackingCode: true,
      type: true,
      status: true,
      note: true,
      payload: true,
      resolution: true,
      createdAt: true,
      reviewedAt: true,
      customer: { select: { fullName: true, phone: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    trackingCode: r.trackingCode,
    type: r.type,
    status: r.status,
    note: r.note,
    payload: r.payload as Record<string, string | number> | null,
    resolution: r.resolution,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    customerName: r.customer.fullName,
    customerPhone: r.customer.phone,
  }));
}

export async function getExchangeRequestStats(exchangeId: string): Promise<ExchangeRequestStats> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return { total: 0, pending: 0, inReview: 0, approved: 0, rejected: 0, cancelled: 0, last7d: 0 };
  }

  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const [grouped, last7d] = await Promise.all([
    prisma.customerRequest.groupBy({
      by: ['status'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    prisma.customerRequest.count({
      where: { exchangeId, createdAt: { gte: since7 } },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = Array.from(counts.values()).reduce((s, c) => s + c, 0);

  return {
    total,
    pending: counts.get('PENDING') ?? 0,
    inReview: counts.get('IN_REVIEW') ?? 0,
    approved: counts.get('APPROVED') ?? 0,
    rejected: counts.get('REJECTED') ?? 0,
    cancelled: counts.get('CANCELLED') ?? 0,
    last7d,
  };
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCOUNT_NEW: 'باز کردن حساب جدید',
  ACCOUNT_UNFREEZE: 'رفع مسدودی حساب',
  TRANSFER_INITIATE: 'شروع انتقال',
  LIMIT_INCREASE: 'افزایش سقف تراکنش',
  OTHER: 'سایر',
};

const ReviewRequestSchema = {
  requestId: (v: unknown) => typeof v === 'string' && v.length > 0,
  status: (v: unknown) =>
    v === 'APPROVED' || v === 'REJECTED' || v === 'IN_REVIEW' || v === 'CANCELLED',
};

export async function reviewExchangeRequest(input: {
  requestId: string;
  status: 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'CANCELLED';
  resolution?: string;
}): Promise<FintechActionResult<{ id: string; status: string }>> {
  if (
    !ReviewRequestSchema.requestId(input.requestId) ||
    !ReviewRequestSchema.status(input.status)
  ) {
    return { success: false, error: { code: 'VALIDATION', message: 'ورودی نامعتبر است' } };
  }

  const req = await prisma.customerRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      exchangeId: true,
      status: true,
      userId: true,
      type: true,
      trackingCode: true,
    },
  });
  if (!req) return { success: false, error: { code: 'NOT_FOUND', message: 'درخواست یافت نشد' } };

  const access = await requireExchangeAccess(req.exchangeId, true);
  if (!access.ok) return { success: false, error: access.error };

  const headersList = await headers();
  const xff = headersList.get('x-forwarded-for') ?? '';
  const ip =
    xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .at(-1) ??
    headersList.get('x-real-ip')?.trim() ??
    'unknown';

  await prisma.$transaction(async (tx) => {
    await tx.customerRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.status,
        resolution: input.resolution?.trim() || null,
        reviewedById: access.userId,
        reviewedAt: new Date(),
      },
    });
    await tx.customerRequestStatusLog.create({
      data: {
        id: createId(),
        requestId: input.requestId,
        fromStatus: req.status,
        toStatus: input.status,
        actorId: access.userId,
        actorRole: 'STAFF',
        note: input.resolution?.trim() || null,
      },
    });
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: req.exchangeId,
        actorId: access.userId,
        actorRole: 'SARAFI',
        action: `REQUEST_${input.status}`,
        entityType: 'CustomerRequest',
        entityId: input.requestId,
        ip,
        meta: { fromStatus: req.status, note: input.resolution?.trim() || null },
      },
    });

    // REQ-006: پاسخ صرافی (تأیید/رد) → اعلان فوری به مشتری
    if (
      input.status === 'APPROVED' ||
      input.status === 'REJECTED' ||
      input.status === 'CANCELLED'
    ) {
      const label = REQUEST_TYPE_LABEL[req.type] ?? 'درخواست';
      const message =
        input.status === 'APPROVED'
          ? `✅ درخواست «${label}» (${req.trackingCode}) تأیید شد.${input.resolution?.trim() ? ` — ${input.resolution.trim()}` : ''}`
          : input.status === 'REJECTED'
            ? `❌ درخواست «${label}» (${req.trackingCode}) رد شد.${input.resolution?.trim() ? ` دلیل: ${input.resolution.trim()}` : ''}`
            : `درخواست «${label}» (${req.trackingCode}) لغو شد.`;
      await tx.notification.create({
        data: { userId: req.userId, message, isRead: false },
      });
    }
  });

  revalidateTag('customer-requests');
  return { success: true, data: { id: input.requestId, status: input.status } };
}

// ─── Fraud review ─────────────────────────────────────────────────────────────

export async function getExchangeFraudQueue(exchangeId: string): Promise<ExchangeFraudRow[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.fraudReview.findMany({
    where: { exchangeId },
    orderBy: [{ status: 'asc' }, { riskScore: 'desc' }, { createdAt: 'desc' }],
    take: 80,
    select: {
      id: true,
      reason: true,
      riskScore: true,
      status: true,
      assignedToId: true,
      resolution: true,
      createdAt: true,
      resolvedAt: true,
      Customer: { select: { fullName: true, phone: true } },
      Transaction: { select: { id: true, amount: true, currency: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    riskScore: r.riskScore,
    status: r.status,
    assignedToId: r.assignedToId,
    resolution: r.resolution,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    customerName: r.Customer?.fullName ?? null,
    customerPhone: r.Customer?.phone ?? null,
    txnId: r.Transaction?.id ?? null,
    txnAmount: r.Transaction ? r.Transaction.amount.toString() : null,
    txnCurrency: r.Transaction?.currency ?? null,
  }));
}

export async function getExchangeFraudStats(exchangeId: string): Promise<ExchangeFraudStats> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { open: 0, inReview: 0, resolved: 0, avgRisk: 0, totalAtRisk: '0' };

  const [grouped, avg] = await Promise.all([
    prisma.fraudReview.groupBy({
      by: ['status'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    prisma.fraudReview.aggregate({
      where: { exchangeId, status: { in: ['OPEN', 'IN_REVIEW'] } },
      _avg: { riskScore: true },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const resolved = (counts.get('RESOLVED') ?? 0) + (counts.get('CLOSED') ?? 0);

  return {
    open: counts.get('OPEN') ?? 0,
    inReview: counts.get('IN_REVIEW') ?? 0,
    resolved,
    avgRisk: Math.round(avg._avg.riskScore ?? 0),
    totalAtRisk: '0',
  };
}

export async function resolveExchangeFraud(input: {
  reviewId: string;
  status: 'RESOLVED' | 'CLOSED' | 'OPEN';
  resolution?: string;
}): Promise<FintechActionResult<{ id: string; status: string }>> {
  if (typeof input.reviewId !== 'string' || input.reviewId.length === 0) {
    return { success: false, error: { code: 'VALIDATION', message: 'شناسه نامعتبر است' } };
  }

  const review = await prisma.fraudReview.findUnique({
    where: { id: input.reviewId },
    select: { id: true, exchangeId: true, status: true },
  });
  if (!review) return { success: false, error: { code: 'NOT_FOUND', message: 'پرونده یافت نشد' } };

  const access = await requireExchangeAccess(review.exchangeId, true);
  if (!access.ok) return { success: false, error: access.error };

  const headersList2 = await headers();
  const xff2 = headersList2.get('x-forwarded-for') ?? '';
  const ip =
    xff2
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .at(-1) ??
    headersList2.get('x-real-ip')?.trim() ??
    'unknown';

  await prisma.$transaction(async (tx) => {
    await tx.fraudReview.update({
      where: { id: input.reviewId },
      data: {
        status: input.status,
        resolution: input.resolution?.trim() || null,
        resolvedAt: input.status === 'OPEN' ? null : new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: review.exchangeId,
        actorId: access.userId,
        actorRole: 'SARAFI',
        action: `FRAUD_${input.status}`,
        entityType: 'FraudReview',
        entityId: input.reviewId,
        ip,
        meta: { fromStatus: review.status, resolution: input.resolution?.trim() || null },
      },
    });
  });

  return { success: true, data: { id: input.reviewId, status: input.status } };
}
