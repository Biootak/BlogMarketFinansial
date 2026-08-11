/**
 * settlement.ts — تست‌های unit
 *
 * تمرکز روی: auth guard، validation، state machine (approve/paid)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    settlement: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    currencyDeal: {
      findMany: vi.fn(),
    },
    exchange: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        settlement: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            exchangeId: 'exch-1',
            platformFee: BigInt(5000),
            exchangeNet: BigInt(45000),
            currency: 'AFN',
            totalVolume: BigInt(500000),
            dealCount: 10,
          }),
        },
        ledgerEntry: {
          create: vi.fn(),
        },
      }),
    ),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/exchange-auth', () => ({
  requireExchangeAccess: vi.fn(),
}));

vi.mock('@/lib/revalidate', () => ({
  revalidateTag: vi.fn(),
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import {
  approveSettlement,
  computePeriodSettlement,
  markSettlementPaid,
} from '@/actions/settlement';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const PENDING_SETTLEMENT = {
  id: 'settle-1',
  exchangeId: 'exch-1',
  status: 'PENDING',
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-01-31'),
  totalVolume: BigInt(1_000_000),
  dealCount: 5,
  platformFee: BigInt(50_000),
  exchangeNet: BigInt(950_000),
  currency: 'AFN',
  note: null,
  approvedById: null,
  approvedAt: null,
  paidAt: null,
  createdAt: new Date('2026-02-01'),
  Exchange: { name: 'صرافی', displayName: null },
};

// ─── computePeriodSettlement ──────────────────────────────────────────────────

describe('computePeriodSettlement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(false);
  });

  it('ورودی نامعتبر → VALIDATION_ERROR', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await computePeriodSettlement({ exchangeId: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('تسویه تکراری → idempotent (id موجود برمی‌گرداند)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findFirst).mockResolvedValue({ id: 'settle-existing' } as never);

    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe('settle-existing');
  });

  it('صرافی یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.exchange.findUnique).mockResolvedValue(null);

    const result = await computePeriodSettlement({
      exchangeId: 'exch-missing',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('صرافی موجود + معاملات → تسویه ساخته می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.exchange.findUnique).mockResolvedValue({
      platformFee: { toString: () => '10' },
      name: 'صرافی آزادی',
      displayName: null,
    } as never);
    vi.mocked(prisma.currencyDeal.findMany).mockResolvedValue([
      { fromAmount: { toString: () => '1000' }, feeAmount: { toString: () => '15' } },
    ] as never);
    vi.mocked(prisma.settlement.create).mockResolvedValue({ id: 'settle-new' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(true);
    expect(prisma.settlement.create).toHaveBeenCalledOnce();
    expect(revalidateTag).toHaveBeenCalledWith('settlements');
  });
});

// ─── approveSettlement ────────────────────────────────────────────────────────

describe('approveSettlement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(false);
  });

  it('تسویه یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(null);
    const result = await approveSettlement('settle-x');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('تسویه APPROVED نیست → INVALID_STATE', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({
      status: 'APPROVED',
      exchangeId: 'exch-1',
    } as never);
    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATE');
  });

  it('تسویه PENDING → تأیید می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({
      status: 'PENDING',
      exchangeId: 'exch-1',
    } as never);
    vi.mocked(prisma.settlement.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(true);
    expect(prisma.settlement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
    expect(revalidateTag).toHaveBeenCalledWith('settlements');
  });

  it('race: دو approve هم‌زمان → دومی idempotent success (بدون خطا)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({
      status: 'PENDING',
      exchangeId: 'exch-1',
    } as never);
    // دومی updateMany را اجرا می‌کند ولی هیچ ردیفی PENDING نیست → count=0
    vi.mocked(prisma.settlement.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(true);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

// ─── markSettlementPaid ───────────────────────────────────────────────────────

describe('markSettlementPaid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(false);
  });

  it('تسویه یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(null);
    const result = await markSettlementPaid('settle-x');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('تسویه PENDING (نه APPROVED) → INVALID_STATE', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({ status: 'PENDING' } as never);
    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATE');
  });

  it('تسویه APPROVED → PAID می‌شود و ledger ثبت می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(revalidateTag).toHaveBeenCalledWith('settlements');
  });

  it('race: دو پرداخت هم‌زمان → فقط یک ledger ثبت می‌شود (بدون double-pay)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    // شبیه‌سازی: transaction اجرا می‌شود ولی claim هیچ ردیفی را APPROVED نیافت
    // (درخواست اول قبلاً PAID کرده) → ALREADY_PAID → idempotent success
    const loseTx = {
      settlement: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      ledgerEntry: { create: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementationOnce(
      ((fn: (tx: unknown) => Promise<unknown>) => Promise.resolve(fn(loseTx))) as never,
    );

    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(true); // idempotent — نه خطا
    // ledger باید اصلاً صدا زده نشود چون claim شکست خورد
    expect(loseTx.ledgerEntry.create.mock.calls.length).toBe(0);
    // بازنده: نه audit و نه revalidate اجرا می‌شود
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ─── getSettlements ──────────────────────────────────────────────────────────

describe('getSettlements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → آرایه خالی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const { getSettlements } = await import('@/actions/settlement');
    const result = await getSettlements();
    expect(result).toEqual([]);
  });

  it('با auth → آرایه map‌شده', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findMany).mockResolvedValue([PENDING_SETTLEMENT as never]);
    const { getSettlements } = await import('@/actions/settlement');
    const result = await getSettlements();
    expect(result).toHaveLength(1);
    expect(result[0]?.exchangeName).toBe('صرافی');
  });

  it('فیلتر exchangeId → به where ارسال می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findMany).mockResolvedValue([]);
    const { getSettlements } = await import('@/actions/settlement');
    await getSettlements({ exchangeId: 'exch-test' });
    expect(prisma.settlement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ exchangeId: 'exch-test' }),
      }),
    );
  });

  it('فیلتر status → به where ارسال می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findMany).mockResolvedValue([]);
    const { getSettlements } = await import('@/actions/settlement');
    await getSettlements({ status: 'APPROVED' });
    expect(prisma.settlement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
  });
});
