/**
 * fraud/rules.ts — تست‌های واحد برای scoring logic
 *
 * توابع تعیین‌کننده score و shouldBlock/shouldHold از منطق ریاضی ساده‌اند.
 * DB calls با vi.mock مک می‌شوند.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    transaction: {
      count: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import { assessTransactionRisk } from '@/lib/fraud/rules';

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = {
  customerId: 'cust-1',
  exchangeId: 'exch-1',
  amount: BigInt(100_000),
  currency: 'AFN',
  kind: 'TRANSFER',
} as const;

/** مشتری قدیمی (30 روز پیش ایجاد شده — خطر NEW_CUSTOMER ندارد) */
const OLD_CUSTOMER = {
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
};

/** مشتری جدید (3 روز پیش) */
const NEW_CUSTOMER = {
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
};

function mockPrismaClean() {
  vi.mocked(prisma.transaction.count).mockResolvedValue(0);
  vi.mocked(prisma.customer.findUnique).mockResolvedValue({
    ...OLD_CUSTOMER,
    id: 'cust-1',
    exchangeId: 'exch-1',
    status: 'ACTIVE' as const,
    kycLevel: 'NONE' as const,
    riskScore: 0,
    fullName: 'کاربر تست',
    fatherName: null,
    nationalId: null,
    passportNo: null,
    phone: '0700000000',
    email: null,
    city: null,
    address: null,
    notes: null,
    personalLimitAf: null,
    kycStatus: 'NOT_STARTED' as const,
    createdAt: OLD_CUSTOMER.createdAt,
    updatedAt: OLD_CUSTOMER.createdAt,
    userId: null,
    createdById: null,
  } as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assessTransactionRisk — score محاسبه‌گر', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClean();
  });

  describe('score = 0 — تراکنش سالم', () => {
    it('هیچ قانونی trigger نشود → score صفر', async () => {
      const result = await assessTransactionRisk(BASE);
      expect(result.score).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.shouldBlock).toBe(false);
      expect(result.shouldHold).toBe(false);
    });
  });

  describe('Rule 1 — VELOCITY: > 5 تراکنش در ۱۰ دقیقه', () => {
    it('velocity=6 → score += 40، reason دارد', async () => {
      // count اول = velocity (6)، count دوم = duplicate (0)، count سوم = failCount (0)
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(6) // velocity
        .mockResolvedValueOnce(0) // duplicate
        .mockResolvedValueOnce(0); // failCount

      const result = await assessTransactionRisk(BASE);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.reasons.some((r) => r.startsWith('VELOCITY_TRANSACTIONS'))).toBe(true);
    });

    it('velocity=5 → قانون trigger نمی‌شود (مرز دقیق: >5)', async () => {
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await assessTransactionRisk(BASE);
      expect(result.reasons.some((r) => r.startsWith('VELOCITY_TRANSACTIONS'))).toBe(false);
    });
  });

  describe('Rule 2 — HIGH_AMOUNT_WITHDRAWAL', () => {
    it('WITHDRAWAL با مبلغ > 1,000,000 → score += 30', async () => {
      const result = await assessTransactionRisk({
        ...BASE,
        kind: 'WITHDRAWAL',
        amount: BigInt(1_000_001),
      });
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.reasons).toContain('HIGH_AMOUNT_WITHDRAWAL');
    });

    it('WITHDRAWAL با مبلغ == 1,000,000 → قانون trigger نمی‌شود (مرز)', async () => {
      const result = await assessTransactionRisk({
        ...BASE,
        kind: 'WITHDRAWAL',
        amount: BigInt(1_000_000),
      });
      expect(result.reasons).not.toContain('HIGH_AMOUNT_WITHDRAWAL');
    });

    it('TRANSFER با مبلغ بالا → بدون HIGH_AMOUNT_WITHDRAWAL', async () => {
      const result = await assessTransactionRisk({
        ...BASE,
        kind: 'TRANSFER',
        amount: BigInt(9_999_999),
      });
      expect(result.reasons).not.toContain('HIGH_AMOUNT_WITHDRAWAL');
    });
  });

  describe('Rule 3 — DUPLICATE_TRANSACTION', () => {
    it('duplicate=1 → score += 60، reason دارد', async () => {
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(0) // velocity
        .mockResolvedValueOnce(1) // duplicate!
        .mockResolvedValueOnce(0); // failCount

      const result = await assessTransactionRisk(BASE);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.reasons).toContain('DUPLICATE_TRANSACTION');
    });

    it('duplicate=0 → بدون DUPLICATE_TRANSACTION', async () => {
      const result = await assessTransactionRisk(BASE);
      expect(result.reasons).not.toContain('DUPLICATE_TRANSACTION');
    });
  });

  describe('Rule 4 — NEW_CUSTOMER_HIGH_VALUE', () => {
    it('مشتری جدید + مبلغ > 500,000 → score += 25', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        ...NEW_CUSTOMER,
        id: 'cust-1',
        exchangeId: 'exch-1',
        status: 'ACTIVE' as const,
        kycLevel: 'NONE' as const,
        riskScore: 0,
        fullName: 'مشتری جدید',
        fatherName: null,
        nationalId: null,
        passportNo: null,
        phone: '0700000001',
        email: null,
        city: null,
        address: null,
        notes: null,
        personalLimitAf: null,
        kycStatus: 'NOT_STARTED' as const,
        createdAt: NEW_CUSTOMER.createdAt,
        updatedAt: NEW_CUSTOMER.createdAt,
        userId: null,
        createdById: null,
      } as never);

      const result = await assessTransactionRisk({
        ...BASE,
        amount: BigInt(500_001),
      });
      expect(result.score).toBeGreaterThanOrEqual(25);
      expect(result.reasons).toContain('NEW_CUSTOMER_HIGH_VALUE');
    });

    it('مشتری قدیمی + مبلغ بالا → بدون NEW_CUSTOMER_HIGH_VALUE', async () => {
      const result = await assessTransactionRisk({
        ...BASE,
        amount: BigInt(5_000_000),
      });
      expect(result.reasons).not.toContain('NEW_CUSTOMER_HIGH_VALUE');
    });

    it('مشتری جدید + مبلغ == 500,000 → بدون NEW_CUSTOMER_HIGH_VALUE (مرز)', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        ...NEW_CUSTOMER,
        id: 'cust-1',
        exchangeId: 'exch-1',
        status: 'ACTIVE' as const,
        kycLevel: 'NONE' as const,
        riskScore: 0,
        fullName: 'مشتری جدید',
        fatherName: null,
        nationalId: null,
        passportNo: null,
        phone: '0700000001',
        email: null,
        city: null,
        address: null,
        notes: null,
        personalLimitAf: null,
        kycStatus: 'NOT_STARTED' as const,
        createdAt: NEW_CUSTOMER.createdAt,
        updatedAt: NEW_CUSTOMER.createdAt,
        userId: null,
        createdById: null,
      } as never);

      const result = await assessTransactionRisk({
        ...BASE,
        amount: BigInt(500_000),
      });
      expect(result.reasons).not.toContain('NEW_CUSTOMER_HIGH_VALUE');
    });
  });

  describe('Rule 5 — MULTIPLE_FAILURES', () => {
    it('failCount=4 → score += 35، reason دارد', async () => {
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(0) // velocity
        .mockResolvedValueOnce(0) // duplicate
        .mockResolvedValueOnce(4); // failCount!

      const result = await assessTransactionRisk(BASE);
      expect(result.score).toBeGreaterThanOrEqual(35);
      expect(result.reasons.some((r) => r.startsWith('MULTIPLE_FAILURES'))).toBe(true);
    });

    it('failCount=3 → قانون trigger نمی‌شود (مرز: >3)', async () => {
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);

      const result = await assessTransactionRisk(BASE);
      expect(result.reasons.some((r) => r.startsWith('MULTIPLE_FAILURES'))).toBe(false);
    });
  });

  describe('shouldBlock / shouldHold thresholds', () => {
    it('score >= 70 → shouldBlock=true', async () => {
      // duplicate (60) + HIGH_AMOUNT_WITHDRAWAL (30) = 90
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(0) // velocity
        .mockResolvedValueOnce(1) // duplicate → +60
        .mockResolvedValueOnce(0); // failCount

      const result = await assessTransactionRisk({
        ...BASE,
        kind: 'WITHDRAWAL',
        amount: BigInt(1_000_001), // +30
      });
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.shouldBlock).toBe(true);
      expect(result.shouldHold).toBe(false);
    });

    it('score >= 40 و < 70 → shouldHold=true', async () => {
      // velocity (40) → score = 40
      vi.mocked(prisma.transaction.count)
        .mockResolvedValueOnce(6) // velocity → +40
        .mockResolvedValueOnce(0) // duplicate
        .mockResolvedValueOnce(0); // failCount

      const result = await assessTransactionRisk(BASE);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.shouldHold).toBe(true);
      expect(result.shouldBlock).toBe(false);
    });

    it('score < 40 → هیچ‌کدام false', async () => {
      const result = await assessTransactionRisk(BASE);
      expect(result.shouldBlock).toBe(false);
      expect(result.shouldHold).toBe(false);
    });
  });
});
