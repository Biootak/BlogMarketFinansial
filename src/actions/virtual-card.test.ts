/**
 * virtual-card.ts — تست‌های unit
 *
 * تمام DB calls mock هستند.
 * هدف: auth guard، limit (max 3 cards)، state transitions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    virtualCard: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireUser: vi.fn(),
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import {
  cancelVirtualCard,
  getMyVirtualCards,
  issueVirtualCard,
  toggleFreezeCard,
} from '@/actions/virtual-card';

// ─── helpers ──────────────────────────────────────────────────────────────────

const AUTH_OK = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const CARD_ROW = {
  id: 'card-1',
  label: 'کارت اصلی',
  last4: '1234',
  brand: 'VISA',
  status: 'ACTIVE' as const,
  balance: BigInt(0),
  currency: 'USD' as const,
  expiresAt: new Date('2028-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  walletId: 'virtual:user-1',
  userId: 'user-1',
};

// ─── getMyVirtualCards ────────────────────────────────────────────────────────

describe('getMyVirtualCards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → آرایه خالی', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await getMyVirtualCards();
    expect(result).toEqual([]);
  });

  it('با auth → کارت‌ها را map می‌کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findMany).mockResolvedValue([CARD_ROW]);
    const result = await getMyVirtualCards();
    expect(result).toHaveLength(1);
    expect(result[0]?.last4).toBe('1234');
    expect(result[0]?.balance).toBe('0'); // BigInt → string
  });

  it('balance BigInt به string تبدیل می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findMany).mockResolvedValue([
      { ...CARD_ROW, balance: BigInt(150_000) },
    ]);
    const result = await getMyVirtualCards();
    expect(result[0]?.balance).toBe('150000');
    expect(typeof result[0]?.balance).toBe('string');
  });

  it('expiresAt به ISO string تبدیل می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findMany).mockResolvedValue([CARD_ROW]);
    const result = await getMyVirtualCards();
    expect(typeof result[0]?.expiresAt).toBe('string');
    expect(result[0]?.expiresAt).toContain('2028');
  });
});

// ─── issueVirtualCard ─────────────────────────────────────────────────────────

describe('issueVirtualCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await issueVirtualCard({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('ورودی نامعتبر (currency غیرمجاز) → VALIDATION_ERROR با پیام Zod', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    const result = await issueVirtualCard({ currency: 'MOON_COIN' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).not.toBe('');
    }
  });

  it('ورودی کاملاً نامعتبر (label خیلی طولانی) → VALIDATION_ERROR با fallback', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    // label > 50 → Zod error → errors[0]?.message ?? 'خطا' branch
    const result = await issueVirtualCard({ currency: 'USD', label: 'الف'.repeat(60) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('بیش از ۳ کارت فعال → LIMIT_REACHED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(3);
    const result = await issueVirtualCard({ currency: 'USD' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('LIMIT_REACHED');
  });

  it('کمتر از ۳ کارت → کارت صادر می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(2);
    vi.mocked(prisma.virtualCard.create).mockResolvedValue(CARD_ROW);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await issueVirtualCard({ currency: 'USD', label: 'کارت سفر' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBe('VISA');
      expect(result.data.currency).toBe('USD');
    }
    expect(prisma.virtualCard.create).toHaveBeenCalledOnce();
  });

  it('حد مجاز مرزی: دقیقاً ۲ کارت → مجاز', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(2);
    vi.mocked(prisma.virtualCard.create).mockResolvedValue(CARD_ROW);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await issueVirtualCard({ currency: 'AFN' });
    expect(result.success).toBe(true);
  });

  it('تعداد دقیقاً ۳ → ممنوع', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(3);
    const result = await issueVirtualCard({ currency: 'AFN' });
    expect(result.success).toBe(false);
  });
});

// ─── toggleFreezeCard ─────────────────────────────────────────────────────────

describe('toggleFreezeCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await toggleFreezeCard('card-1', true);
    expect(result.success).toBe(false);
  });

  it('کارت یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue(null);
    const result = await toggleFreezeCard('card-x', true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('کارت BLOCKED → INVALID_STATUS', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({ id: 'card-1', status: 'BLOCKED' } as never);
    const result = await toggleFreezeCard('card-1', true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATUS');
  });

  it('freeze=true → status=FROZEN', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({ id: 'card-1', status: 'ACTIVE' } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue(CARD_ROW);

    const result = await toggleFreezeCard('card-1', true);
    expect(result.success).toBe(true);
    expect(prisma.virtualCard.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FROZEN' }) }),
    );
  });

  it('freeze=false → status=ACTIVE', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({ id: 'card-1', status: 'FROZEN' } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue(CARD_ROW);

    const result = await toggleFreezeCard('card-1', false);
    expect(result.success).toBe(true);
    expect(prisma.virtualCard.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
  });
});

// ─── cancelVirtualCard ────────────────────────────────────────────────────────

describe('cancelVirtualCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await cancelVirtualCard('card-1');
    expect(result.success).toBe(false);
  });

  it('کارت یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue(null);
    const result = await cancelVirtualCard('card-x');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('کارت موجود → BLOCKED می‌شود و audit ثبت می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({ id: 'card-1', status: 'ACTIVE' } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue(CARD_ROW);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await cancelVirtualCard('card-1');
    expect(result.success).toBe(true);
    expect(prisma.virtualCard.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'BLOCKED' }) }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });
});
