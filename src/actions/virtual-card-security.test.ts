/**
 * virtual-card.ts — تست‌های امنیتی تکمیلی
 *
 * شکاف‌های پوشش‌داده‌نشده:
 *   - Cross-user IDOR: کاربر نمی‌تواند کارت کاربر دیگر را freeze/cancel کند
 *   - cancelVirtualCard روی کارت FROZEN باید کار کند (وضعیت نهایی = BLOCKED)
 *   - cancelVirtualCard روی کارت BLOCKED باید idempotent باشد
 *   - getMyVirtualCards: BLOCKED cards از لیست مخفی هستند
 *   - issueVirtualCard: count فقط ACTIVE را چک می‌کند (FROZEN شمرده نمی‌شود)
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

const USER_1 = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const USER_2 = { success: true as const, user: { id: 'user-2', role: 'USER' as const } };
const AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const CARD_1 = {
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
  accountId: 'virtual:user-1',
  userId: 'user-1',
};

// ─── IDOR: کارت کاربر دیگر ────────────────────────────────────────────────────

describe('toggleFreezeCard — IDOR prevention', () => {
  beforeEach(() => vi.clearAllMocks());

  it('user-2 نمی‌تواند کارت user-1 را freeze کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_2);
    // findFirst با where { id: 'card-1', userId: 'user-2' } → null
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue(null);

    const result = await toggleFreezeCard('card-1', true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('user-2 نمی‌تواند کارت user-1 را unfreeze کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_2);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue(null);

    const result = await toggleFreezeCard('card-1', false);
    expect(result.success).toBe(false);
  });

  it('user-1 می‌تواند کارت خودش را freeze کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({
      id: 'card-1',
      status: 'ACTIVE',
      userId: 'user-1',
    } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue(CARD_1);

    const result = await toggleFreezeCard('card-1', true);
    expect(result.success).toBe(true);
  });
});

describe('cancelVirtualCard — IDOR prevention', () => {
  beforeEach(() => vi.clearAllMocks());

  it('user-2 نمی‌تواند کارت user-1 را cancel کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_2);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue(null);

    const result = await cancelVirtualCard('card-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });
});

// ─── cancelVirtualCard — state transitions ────────────────────────────────────

describe('cancelVirtualCard — state transitions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('کارت FROZEN می‌تواند cancel شود (BLOCKED بشود)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({
      id: 'card-1',
      status: 'FROZEN',
    } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue({ ...CARD_1, status: 'BLOCKED' });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await cancelVirtualCard('card-1');
    expect(result.success).toBe(true);
    expect(prisma.virtualCard.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'BLOCKED' }) }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it('کارت BLOCKED cancel می‌شود (idempotent)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValue({
      id: 'card-1',
      status: 'BLOCKED',
    } as never);
    vi.mocked(prisma.virtualCard.update).mockResolvedValue({ ...CARD_1, status: 'BLOCKED' });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    // cancelVirtualCard چک وضعیت ندارد — هر وضعیتی قابل cancel است
    const result = await cancelVirtualCard('card-1');
    expect(result.success).toBe(true);
  });
});

// ─── getMyVirtualCards — data isolation ──────────────────────────────────────

describe('getMyVirtualCards — data isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('فقط کارت‌های همین کاربر برمی‌گردد (userId filter)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.findMany).mockResolvedValue([]);

    await getMyVirtualCards();

    const call = vi.mocked(prisma.virtualCard.findMany).mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ userId: 'user-1' });
  });

  it('BLOCKED cards از لیست مخفی هستند (status filter)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.findMany).mockResolvedValue([]);

    await getMyVirtualCards();

    const call = vi.mocked(prisma.virtualCard.findMany).mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ status: { not: 'BLOCKED' } });
  });
});

// ─── issueVirtualCard — limit based on ACTIVE only ───────────────────────────

describe('issueVirtualCard — limit logic', () => {
  beforeEach(() => vi.clearAllMocks());

  it('count فقط ACTIVE cards چک می‌کند (FROZEN شمرده نمی‌شود)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(1); // فقط 1 کارت ACTIVE

    vi.mocked(prisma.virtualCard.create).mockResolvedValue(CARD_1);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await issueVirtualCard({ currency: 'USD' });
    expect(result.success).toBe(true);

    // چک کن که count با status: 'ACTIVE' صدا زده شده
    const countCall = vi.mocked(prisma.virtualCard.count).mock.calls[0]?.[0];
    expect(countCall?.where).toMatchObject({ status: 'ACTIVE' });
  });

  it('بیش از ۳ ACTIVE کارت → LIMIT_REACHED حتی اگر FROZEN هم باشد', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.virtualCard.count).mockResolvedValue(3);

    const result = await issueVirtualCard({ currency: 'USD' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('LIMIT_REACHED');
  });
});
