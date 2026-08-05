/**
 * exchange-staff actions — تست‌های unit با mock کامل
 *
 * تمام dependencies خارجی (prisma, requireAdmin, revalidateTag) mock شده‌اند.
 * هدف: تست منطق validation، auth guard، و response shape.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock‌ها — باید قبل از import action ها باشند ─────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    exchangeStaff: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/revalidate', () => ({
  revalidateTag: vi.fn(),
}));

// ─── Import های واقعی ─────────────────────────────────────────────────────────

import {
  getAllStaff,
  inviteStaff,
  removeStaff,
  revokeStaff,
  searchUsersForStaff,
  updateStaff,
} from '@/actions/exchange-staff';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MOCK_ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const MOCK_UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const MOCK_STAFF_ROW = {
  id: 'staff-1',
  exchangeId: 'exch-1',
  userId: 'user-1',
  role: 'STAFF' as const,
  title: null,
  permissions: [],
  invitedBy: 'admin-1',
  joinedAt: new Date('2026-01-01'),
  revokedAt: null,
  Exchange: { name: 'صرافی آزادی' },
  User: { name: 'علی احمدی', email: 'ali@example.com', image: null },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getAllStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → آرایه خالی (auth guard)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await getAllStaff();
    expect(result).toEqual([]);
    expect(prisma.exchangeStaff.findMany).not.toHaveBeenCalled();
  });

  it('آرایه map‌شده برمی‌گرداند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findMany).mockResolvedValue([MOCK_STAFF_ROW]);
    const result = await getAllStaff();
    expect(result).toHaveLength(1);
    expect(result[0]?.exchangeName).toBe('صرافی آزادی');
    expect(result[0]?.userName).toBe('علی احمدی');
  });

  it('خطای DB → آرایه خالی برمی‌گرداند (نه throw)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findMany).mockRejectedValue(new Error('DB error'));
    const result = await getAllStaff();
    expect(result).toEqual([]);
  });

  it('با فیلتر exchangeId صدا زده می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findMany).mockResolvedValue([]);
    await getAllStaff({ exchangeId: 'exch-x' });
    expect(prisma.exchangeStaff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ exchangeId: 'exch-x' }),
      }),
    );
  });

  it('با exchangeId=all → فیلتر exchangeId اعمال نمی‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findMany).mockResolvedValue([]);
    await getAllStaff({ exchangeId: 'all' });
    const call = vi.mocked(prisma.exchangeStaff.findMany).mock.calls[0]?.[0];
    expect(call?.where).not.toHaveProperty('exchangeId');
  });

  it('با query → OR filter اعمال می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findMany).mockResolvedValue([]);
    await getAllStaff({ query: 'احمد' });
    const call = vi.mocked(prisma.exchangeStaff.findMany).mock.calls[0]?.[0];
    expect(call?.where).toHaveProperty('OR');
  });
});

describe('searchUsersForStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('query کوتاه‌تر از ۲ کاراکتر → آرایه خالی', async () => {
    const result = await searchUsersForStaff('a');
    expect(result).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('query خالی → آرایه خالی', async () => {
    const result = await searchUsersForStaff('');
    expect(result).toEqual([]);
  });

  it('auth fail → آرایه خالی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await searchUsersForStaff('علی');
    expect(result).toEqual([]);
  });

  it('auth ok → findMany صدا می‌زند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', name: 'علی', email: 'ali@test.com', image: null } as never,
    ]);
    const result = await searchUsersForStaff('علی');
    expect(result).toHaveLength(1);
    expect(prisma.user.findMany).toHaveBeenCalledOnce();
  });

  it('خطای DB → آرایه خالی (catch branch)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB error'));
    const result = await searchUsersForStaff('احمد');
    expect(result).toEqual([]);
  });
});

describe('inviteStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await inviteStaff({
      exchangeId: 'e1',
      userId: 'u1',
      role: 'STAFF',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHENTICATED');
  });

  it('ورودی نامعتبر → VALIDATION خطا', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    const result = await inviteStaff({ exchangeId: '', userId: '', role: 'STAFF' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION');
  });

  it('ورودی معتبر → upsert صدا می‌زند و id برمی‌گرداند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.upsert).mockResolvedValue({ id: 'staff-1' } as never);

    const result = await inviteStaff({
      exchangeId: 'exch-1',
      userId: 'user-1',
      role: 'MANAGER',
      title: 'مدیر شعبه',
      permissions: [],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe('staff-1');
    expect(prisma.exchangeStaff.upsert).toHaveBeenCalledOnce();
    expect(revalidateTag).toHaveBeenCalledWith('exchange-staff');
  });

  it('نقش نامعتبر → VALIDATION', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    const result = await inviteStaff({
      exchangeId: 'exch-1',
      userId: 'user-1',
      role: 'GOD_MODE', // نقش غیرمجاز
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION');
  });
});

describe('updateStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await updateStaff('staff-1', { role: 'MANAGER' });
    expect(result.success).toBe(false);
  });

  it('نقش نامعتبر → VALIDATION خطا', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    const result = await updateStaff('staff-1', { role: 'HACKER' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION');
  });

  it('ورودی معتبر → update صدا می‌زند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findUnique).mockResolvedValue({ id: 'staff-1' } as never);
    vi.mocked(prisma.exchangeStaff.update).mockResolvedValue({ id: 'staff-1' } as never);

    const result = await updateStaff('staff-1', { role: 'MANAGER' });
    expect(result.success).toBe(true);
    expect(prisma.exchangeStaff.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'staff-1' } }),
    );
    expect(revalidateTag).toHaveBeenCalledWith('exchange-staff');
  });
});

describe('revokeStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → خطا', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await revokeStaff('staff-1');
    expect(result.success).toBe(false);
  });

  it('با auth → revokedAt می‌گذارد و revalidate می‌کند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findUnique).mockResolvedValue({ id: 'staff-1' } as never);
    vi.mocked(prisma.exchangeStaff.update).mockResolvedValue({
      id: 'staff-1',
      revokedAt: new Date(),
    } as never);

    const result = await revokeStaff('staff-1');
    expect(result.success).toBe(true);

    const updateCall = vi.mocked(prisma.exchangeStaff.update).mock.calls[0]?.[0];
    expect(updateCall?.data).toHaveProperty('revokedAt');
    expect(revalidateTag).toHaveBeenCalledWith('exchange-staff');
  });
});

describe('removeStaff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → خطا', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_UNAUTH);
    const result = await removeStaff('staff-1');
    expect(result.success).toBe(false);
  });

  it('با auth → delete صدا می‌زند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(MOCK_ADMIN);
    vi.mocked(prisma.exchangeStaff.findUnique).mockResolvedValue({ id: 'staff-1' } as never);
    vi.mocked(prisma.exchangeStaff.delete).mockResolvedValue({ id: 'staff-1' } as never);

    const result = await removeStaff('staff-1');
    expect(result.success).toBe(true);
    expect(prisma.exchangeStaff.delete).toHaveBeenCalledWith({ where: { id: 'staff-1' } });
    expect(revalidateTag).toHaveBeenCalledWith('exchange-staff');
  });
});
