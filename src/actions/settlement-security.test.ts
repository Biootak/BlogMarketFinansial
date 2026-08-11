/**
 * settlement.ts — تست‌های امنیتی تکمیلی
 *
 * شکاف‌های شناسایی‌شده:
 *   - getMyExchangeSettlements: IDOR بین صرافی‌ها
 *   - non-admin نمی‌تواند computePeriodSettlement فراخوانی کند
 *   - non-admin نمی‌تواند approveSettlement یا markSettlementPaid فراخوانی کند
 *   - periodStart بعد از periodEnd → باید رد شود
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
    },
    currencyDeal: { findMany: vi.fn() },
    exchange: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        settlement: {
          update: vi.fn().mockResolvedValue({
            exchangeId: 'exch-1',
            platformFee: BigInt(5000),
            exchangeNet: BigInt(45000),
            currency: 'AFN',
            totalVolume: BigInt(500000),
            dealCount: 10,
          }),
        },
        ledgerEntry: { create: vi.fn() },
      }),
    ),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
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
  getMyExchangeSettlements,
  getSettlements,
  markSettlementPaid,
} from '@/actions/settlement';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { requireAdmin, requirePermission } from '@/lib/require-auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};
const ACCESS_OK = { ok: true as const, userId: 'user-exchange' };
const ACCESS_FAIL = {
  ok: false as const,
  error: { success: false as const, status: 403 as const, code: 'FORBIDDEN', message: 'ممنوع' },
};
const PERM_OK = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };

// سطح اکشن `settlements:create` به‌صورت پیش‌فرض مجاز است (تست‌های RBAC خودشان رد می‌کنند)
beforeEach(() => {
  vi.mocked(requirePermission).mockResolvedValue(PERM_OK);
});

const SETTLEMENT_ROW = {
  id: 'settle-1',
  exchangeId: 'exch-1',
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-01-31'),
  totalVolume: BigInt(1_000_000),
  dealCount: 5,
  platformFee: BigInt(50_000),
  exchangeNet: BigInt(950_000),
  currency: 'AFN',
  status: 'PENDING',
  note: null,
  approvedById: null,
  approvedAt: null,
  paidAt: null,
  createdAt: new Date('2026-02-01'),
  Exchange: { name: 'صرافی', displayName: null },
};

// ─── getSettlements — admin-only ──────────────────────────────────────────────

describe('getSettlements — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CUSTOMER نمی‌تواند همه settlement‌ها را ببیند → آرایه خالی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await getSettlements();
    expect(result).toEqual([]);
    expect(prisma.settlement.findMany).not.toHaveBeenCalled();
  });

  it('SUPPORT نمی‌تواند settlement‌ها را ببیند → آرایه خالی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'ممنوع',
    });
    const result = await getSettlements();
    expect(result).toEqual([]);
  });
});

// ─── getMyExchangeSettlements — IDOR prevention ──────────────────────────────

describe('getMyExchangeSettlements — IDOR', () => {
  beforeEach(() => vi.clearAllMocks());

  it('کاربر بدون دسترسی به صرافی → آرایه خالی (بدون throw)', async () => {
    vi.mocked(requireExchangeAccess).mockResolvedValue(ACCESS_FAIL as never);

    const result = await getMyExchangeSettlements('exch-victim');
    expect(result).toEqual([]);
    expect(prisma.settlement.findMany).not.toHaveBeenCalled();
  });

  it('کاربر با دسترسی → فقط تسویه‌های همین صرافی', async () => {
    vi.mocked(requireExchangeAccess).mockResolvedValue(ACCESS_OK);
    vi.mocked(prisma.settlement.findMany).mockResolvedValue([SETTLEMENT_ROW as never]);

    const result = await getMyExchangeSettlements('exch-1');
    expect(result).toHaveLength(1);

    // بررسی کن که where شامل exchangeId است
    const call = vi.mocked(prisma.settlement.findMany).mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ exchangeId: 'exch-1' });
  });

  it('کاربر صرافی A نمی‌تواند settlement صرافی B را بگیرد', async () => {
    vi.mocked(requireExchangeAccess).mockImplementation(async (exchangeId) => {
      if (exchangeId === 'exch-B') return ACCESS_FAIL as never;
      return ACCESS_OK;
    });

    const result = await getMyExchangeSettlements('exch-B');
    expect(result).toEqual([]);
  });
});

// ─── computePeriodSettlement — non-admin prevention ──────────────────────────

describe('computePeriodSettlement — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('EXCHANGE کاربر (non-admin) نمی‌تواند settlement محاسبه کند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'ممنوع',
    });

    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(false);
    expect(prisma.settlement.findFirst).not.toHaveBeenCalled();
  });

  it('periodStart بعد از periodEnd → VALIDATION_ERROR', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);

    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-02-01', // بعد از periodEnd!
      periodEnd: '2026-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('admin بدون مجوز `settlements:create` (محدودشده) → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(requirePermission).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'شما دسترسی «settlements:create» ندارید.',
    });

    const result = await computePeriodSettlement({
      exchangeId: 'exch-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('FORBIDDEN');
    expect(prisma.settlement.findFirst).not.toHaveBeenCalled();
  });
});

// ─── approveSettlement — role separation ─────────────────────────────────────

describe('approveSettlement — separation of duties', () => {
  beforeEach(() => vi.clearAllMocks());

  it('EXCHANGE (non-admin) نمی‌تواند settlement خودش را approve کند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'ممنوع',
    });

    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(false);
    expect(prisma.settlement.findUnique).not.toHaveBeenCalled();
  });

  it('SUPPORT (read-only) نمی‌تواند approve کند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'ممنوع',
    });
    const result = await approveSettlement('settle-1');
    expect(result.success).toBe(false);
  });
});

// ─── markSettlementPaid — role separation ────────────────────────────────────

describe('markSettlementPaid — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('non-admin نمی‌تواند settlement را paid کند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false as const,
      status: 403 as const,
      code: 'FORBIDDEN' as const,
      message: 'ممنوع',
    });

    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(false);
    expect(prisma.settlement.findUnique).not.toHaveBeenCalled();
  });

  it('تسویه PAID دوباره → INVALID_STATE (تکرار پرداخت ممنوع)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({
      status: 'PAID',
    } as never);

    const result = await markSettlementPaid('settle-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATE');
  });
});
