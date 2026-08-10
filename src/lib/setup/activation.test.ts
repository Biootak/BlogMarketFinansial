/**
 * activation.ts — تست‌های unit برای جریان دعوت مالک (provision → resolve → consume)
 *
 * Prisma کاملاً mock شده است. `$transaction` طوری شبیه‌سازی می‌شود که callback
 * را با همان آبجکت prisma به‌عنوان `tx` صدا بزند — یعنی همهٔ فراخوانی‌های داخل
 * تراکنش روی همان mockها می‌نشینند و قابل assert هستند.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock — باید قبل از import ماژول باشد ──────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    $transaction: vi.fn(),
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    verificationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    systemLog: {
      create: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  OWNER_SETUP_INTENT,
  consumeOwnerSetupInvite,
  provisionOwnerSetupInvite,
  resolveOwnerSetupInvite,
} from '@/lib/setup/activation';
import type { Mock } from 'vitest';

// ─── helpers ──────────────────────────────────────────────────────────────────

const prismaMock = prisma as unknown as {
  $transaction: Mock;
  user: {
    findFirst: Mock;
    findUnique: Mock;
    create: Mock;
    update: Mock;
  };
  session: { deleteMany: Mock };
  verificationToken: {
    findUnique: Mock;
    create: Mock;
    deleteMany: Mock;
  };
};

const ACTIVE_OWNER = {
  id: 'owner-1',
  email: 'dev@example.com',
  role: 'OWNER',
  status: 'Active',
};

const PENDING_OWNER = {
  id: 'owner-1',
  email: 'owner@example.com',
  role: 'OWNER',
  status: 'Pending',
};

function mockTransaction() {
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction();
  // biome-ignore lint/performance/noDelete: باید واقعاً غایب باشد تا fallback تست شود
  delete process.env.NEXT_PUBLIC_APP_URL;
});

// ─── Provision ─────────────────────────────────────────────────────────────────

describe('provisionOwnerSetupInvite', () => {
  it('creates a pending OWNER + invite token when no owner exists', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'owner-new', email: 'owner@example.com' });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({});

    const result = await provisionOwnerSetupInvite('  Owner@Example.COM  ');

    expect(result.ok).toBe(true);
    expect(result.email).toBe('owner@example.com');
    expect(result.link).toBe(`http://localhost:3000/setup?token=${result.token}`);
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@example.com',
          role: 'OWNER',
          status: 'Pending',
        }),
      }),
    );
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intent: OWNER_SETUP_INTENT, email: 'owner@example.com' }),
      }),
    );
  });

  it('rejects when an owner exists with a different email', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_OWNER);

    const result = await provisionOwnerSetupInvite('other@example.com');

    expect(result.ok).toBe(false);
    expect(result.message).toContain(ACTIVE_OWNER.email);
    // هیچ تغییری نباید رخ دهد — تراکنش زودتر برمی‌گردد.
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.verificationToken.create).not.toHaveBeenCalled();
  });

  it('with --replace-email, repoints the existing owner to the new email', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_OWNER);
    // ایمیل جدید به کاربر دیگری تعلق ندارد.
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({});

    const result = await provisionOwnerSetupInvite('real@owner.com', undefined, true);

    expect(result.ok).toBe(true);
    expect(result.email).toBe('real@owner.com');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'owner-1' },
        data: expect.objectContaining({ email: 'real@owner.com', status: 'Pending' }),
      }),
    );
    // توکن‌های قدیمیِ هر دو ایمیل باید پاک شوند.
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: { in: ['real@owner.com', 'dev@example.com'] } }),
      }),
    );
  });

  it('with --replace-email, refuses when the new email belongs to another user', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_OWNER);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'someone-else', email: 'real@owner.com' });

    const result = await provisionOwnerSetupInvite('real@owner.com', undefined, true);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('کاربر دیگری');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('resets an existing owner to Pending and mints a fresh invite (handover)', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_OWNER);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({});

    // بدون --email: از ایمیل مالک موجود استفاده می‌شود.
    const result = await provisionOwnerSetupInvite('');

    expect(result.ok).toBe(true);
    expect(result.email).toBe('dev@example.com');
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'owner-1' } });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'owner-1' },
        data: expect.objectContaining({
          status: 'Pending',
          password: null,
          emailVerified: null,
          tokenVersion: { increment: 1 },
        }),
      }),
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    // لینک به ایمیلِ موجود اشاره می‌کند.
    expect(result.link).toContain('/setup?token=');
  });
});

// ─── Resolve ──────────────────────────────────────────────────────────────────

describe('resolveOwnerSetupInvite', () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  it('resolves a valid token for a pending owner', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'abc',
      email: 'owner@example.com',
      intent: OWNER_SETUP_INTENT,
      expires: future,
    });
    prismaMock.user.findFirst.mockResolvedValue(PENDING_OWNER);

    const result = await resolveOwnerSetupInvite('abc');
    expect(result).toEqual({ ok: true, email: 'owner@example.com' });
  });

  it('rejects an expired token', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'abc',
      email: 'owner@example.com',
      intent: OWNER_SETUP_INTENT,
      expires: past,
    });

    const result = await resolveOwnerSetupInvite('abc');
    expect(result.ok).toBe(false);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a token with a different intent', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'abc',
      email: 'owner@example.com',
      intent: 'register',
      expires: future,
    });

    const result = await resolveOwnerSetupInvite('abc');
    expect(result.ok).toBe(false);
  });

  it('rejects when the owner is no longer Pending (already activated)', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'abc',
      email: 'owner@example.com',
      intent: OWNER_SETUP_INTENT,
      expires: future,
    });
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_OWNER);

    const result = await resolveOwnerSetupInvite('abc');
    expect(result.ok).toBe(false);
  });

  it('rejects an empty/whitespace token', async () => {
    const result = await resolveOwnerSetupInvite('   ');
    expect(result.ok).toBe(false);
    expect(prismaMock.verificationToken.findUnique).not.toHaveBeenCalled();
  });
});

// ─── Consume ──────────────────────────────────────────────────────────────────

describe('consumeOwnerSetupInvite', () => {
  it('consumes the token atomically and returns the pending owner', async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findFirst.mockResolvedValue({ id: 'owner-1' });

    const result = await consumeOwnerSetupInvite('tok', 'Owner@Example.com');

    expect(result).toEqual({ ok: true, user: { id: 'owner-1' } });
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'owner@example.com',
          intent: OWNER_SETUP_INTENT,
          token: 'tok',
          expires: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it('fails when the token is unknown, used, or expired (count 0)', async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });

    const result = await consumeOwnerSetupInvite('tok', 'owner@example.com');

    expect(result.ok).toBe(false);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });
});
