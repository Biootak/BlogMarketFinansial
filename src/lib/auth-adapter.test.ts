/**
 * auth-adapter.test.ts — «یک ایمیل = یک حساب».
 *
 * باگی که این تست‌ها می‌بندند (2026-08-14): PrismaAdapter رسمی برای
 * getUserByEmail از findUnique استفاده می‌کند که در PostgreSQL حساس به
 * بزرگی/کوچکی حرف است، در حالی که @auth/core ایمیل profile را lowercase
 * می‌کند. کاربری با ایمیلِ مختلط (`Admin@Gmail.com`) با ورود گوگل پیدا
 * نمی‌شد و Auth.js حسابِ دومی می‌ساخت — هویت کاربر دو تکه می‌شد.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  default: {
    user: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    account: { upsert: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/server-logger', () => ({
  serverLog: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({
    getUser: vi.fn(),
    getUserByAccount: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    unlinkAccount: vi.fn(),
  })),
}));

import { createAuthAdapter } from '@/lib/auth-adapter';
import prisma from '@/lib/db';

const EXISTING_USER = {
  id: 'u-1',
  email: 'Admin@Gmail.com',
  name: 'مالک',
  emailVerified: new Date('2026-01-01'),
  image: null,
};

describe('createAuthAdapter — getUserByEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ایمیلِ lowercase از OAuth، ردیفِ مختلطِ موجود را پیدا می‌کند', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(EXISTING_USER as never);
    const adapter = createAuthAdapter();
    const user = await adapter.getUserByEmail?.('admin@gmail.com');
    expect(user?.id).toBe('u-1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: 'admin@gmail.com', mode: 'insensitive' } },
      }),
    );
  });

  it('ورودی با فاصله/حروف بزرگ نرمال می‌شود', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(EXISTING_USER as never);
    const adapter = createAuthAdapter();
    await adapter.getUserByEmail?.('  ADMIN@Gmail.COM  ');
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: 'admin@gmail.com', mode: 'insensitive' } },
      }),
    );
  });

  it('اگر تکراری وجود داشته باشد، قدیمی‌ترین ردیف انتخاب می‌شود (قطعی)', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(EXISTING_USER as never);
    const adapter = createAuthAdapter();
    await adapter.getUserByEmail?.('admin@gmail.com');
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );
  });

  it('کاربر موجود نیست → null', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const adapter = createAuthAdapter();
    const user = await adapter.getUserByEmail?.('nobody@example.com');
    expect(user).toBeNull();
  });
});

describe('createAuthAdapter — createUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ایمیل قبل از درج normalize می‌شود (ردیف مختلط تازه ساخته نمی‌شود)', async () => {
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      ...EXISTING_USER,
      email: 'new@example.com',
    } as never);
    const adapter = createAuthAdapter();
    await adapter.createUser?.({
      id: 'ignored',
      email: ' NEW@Example.com ',
      emailVerified: null,
      name: 'کاربر',
    } as never);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new@example.com' }),
    });
  });

  it('فیلدهای مشتق (غیر ستون) به Prisma فرستاده نمی‌شوند', async () => {
    vi.mocked(prisma.user.create).mockResolvedValueOnce(EXISTING_USER as never);
    const adapter = createAuthAdapter();
    await adapter.createUser?.({
      id: 'ignored',
      email: 'x@example.com',
      emailVerified: null,
      role: 'OWNER',
      profile: { bio: 'x' },
      permissions: ['a'],
    } as never);
    const arg = vi.mocked(prisma.user.create).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(Object.keys(arg.data).sort()).toEqual(['email', 'emailVerified', 'image', 'name']);
  });
});

describe('createAuthAdapter — linkAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upsert می‌کند تا اتصال دوباره با خطای unique سقوط نکند', async () => {
    vi.mocked(prisma.account.upsert).mockResolvedValueOnce({} as never);
    const adapter = createAuthAdapter();
    await adapter.linkAccount?.({
      userId: 'u-1',
      type: 'oauth',
      provider: 'google',
      providerAccountId: 'g-123',
      access_token: 'at',
      expires_at: 999,
    } as never);
    expect(prisma.account.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerAccountId: { provider: 'google', providerAccountId: 'g-123' },
        },
        update: expect.objectContaining({ userId: 'u-1', access_token: 'at' }),
        create: expect.objectContaining({ userId: 'u-1', provider: 'google' }),
      }),
    );
    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('توکن‌های غایب به null تبدیل می‌شوند (نه undefined)', async () => {
    vi.mocked(prisma.account.upsert).mockResolvedValueOnce({} as never);
    const adapter = createAuthAdapter();
    await adapter.linkAccount?.({
      userId: 'u-1',
      type: 'oauth',
      provider: 'github',
      providerAccountId: 'gh-9',
    } as never);
    const arg = vi.mocked(prisma.account.upsert).mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
    };
    expect(arg.create.refresh_token).toBeNull();
    expect(arg.create.id_token).toBeNull();
  });
});
