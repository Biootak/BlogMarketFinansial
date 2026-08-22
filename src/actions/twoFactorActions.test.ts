/**
 * twoFactorActions — تست‌های unit احراز هویت دو مرحله‌ای
 *
 * تمام DB calls و crypto mock هستند. تمرکز روی:
 *   - گارد requireUser + rate-limit اختصاصی هر اکشن
 *   - رمزنگاری secret در حالت pending (H2-fix)
 *   - decrypt امن + عدم نشت خطا (DECRYPT_FAILED)
 *   - قفل دائمی 2FA برای OWNER/SUPERADMIN
 *   - یک‌بارمصرف بودن جریان فعال‌سازی/غیرفعال‌سازی + audit
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(makeTx())),
  },
}));

const makeTx = () => ({
  user: { update: vi.fn().mockResolvedValue({}) },
  twoFactorBackupCode: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 10 }),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
});

vi.mock('@/lib/require-auth', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
}));

vi.mock('@/lib/totp', () => ({
  generateOtpAuthUri: vi.fn(
    (secret: string, email: string) => `otpauth://totp/${email}?secret=${secret}`,
  ),
  generateTotpSecret: vi.fn(() => 'TOTP_SECRET_RAW'),
  verifyTotp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/totp-secrets', () => ({
  decryptTotpSecret: vi.fn(() => 'TOTP_SECRET_RAW'),
  encryptTotpSecret: vi.fn((s: string) => `v1:enc:${s}`),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2b$12$hash'), compare: vi.fn() },
}));

// ─── Imports (بعد از mock) ────────────────────────────────────────────────────

import { confirmEnable2FA, disable2FA, get2FAStatus, setup2FA } from '@/actions/twoFactorActions';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { generateOtpAuthUri, verifyTotp } from '@/lib/totp';
import { decryptTotpSecret, encryptTotpSecret } from '@/lib/totp-secrets';
import bcrypt from 'bcryptjs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER = { success: true as const, user: { id: 'u1', role: 'CUSTOMER' as const } };
const OWNER = { success: true as const, user: { id: 'owner-1', role: 'OWNER' as const } };
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const RL_OK = { success: true as const, remaining: 5, reset: Date.now() + 60000 };
const RATE_LIMITED = { success: false as const, remaining: 0, reset: Date.now() - 1000 };

const PENDING_USER = {
  id: 'u1',
  twoFactorSecretEnc: `pending:${encryptTotpSecret('TOTP_SECRET_RAW')}`,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('setup2FA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // پیش‌فرض مجدد — mockResolvedValue پایدار می‌تواند به تست بعدی leak کند
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(UNAUTH);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('بدون رمز عبور فعلی → VALIDATION', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    const r = await setup2FA();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rate-limit اختصاصی → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RATE_LIMITED);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
    expect(checkRateLimit).toHaveBeenCalledWith('2fa-setup:u1', 'auth');
  });

  it('کاربر بدون رمز عبور (OAuth-only) → NO_PASSWORD', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ password: null } as never);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_PASSWORD');
  });

  it('رمز عبور فعلی اشتباه → WRONG_PASSWORD', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      password: '$2b$12$hash',
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const r = await setup2FA('wrong-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('WRONG_PASSWORD');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('کاربر یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ password: '$2b$12$hash' } as never)
      .mockResolvedValueOnce(null as never);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('2FA قبلاً فعال → ALREADY_ENABLED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ password: '$2b$12$hash' } as never)
      .mockResolvedValueOnce({
        email: 'u@x.com',
        twoFactorEnabled: true,
      } as never);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('ALREADY_ENABLED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('موفق → secret با پیشوند pending: رمزنگاری و ذخیره می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ password: '$2b$12$hash' } as never)
      .mockResolvedValueOnce({
        email: 'u@x.com',
        twoFactorEnabled: false,
      } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    const r = await setup2FA('current-pass');
    expect(r.success).toBe(true);
    if (!r.success) return;
    // plaintext هرگز ذخیره نمی‌شود — همیشه pending:encrypted
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { twoFactorSecretEnc: `pending:${encryptTotpSecret('TOTP_SECRET_RAW')}` },
    });
    expect(r.data.secret).toBe('TOTP_SECRET_RAW');
    expect(generateOtpAuthUri).toHaveBeenCalledWith('TOTP_SECRET_RAW', 'u@x.com');
  });
});

describe('confirmEnable2FA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK);
    vi.mocked(verifyTotp).mockResolvedValue(true);
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(UNAUTH);
    const r = await confirmEnable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('rate-limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RATE_LIMITED);
    const r = await confirmEnable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
    expect(checkRateLimit).toHaveBeenCalledWith('2fa-confirm:u1', 'auth');
  });

  it('بدون secret pending → SETUP_REQUIRED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ twoFactorSecretEnc: null } as never);
    const r = await confirmEnable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('SETUP_REQUIRED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('decrypt خطا → DECRYPT_FAILED (نه خطای داخلی)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PENDING_USER as never);
    vi.mocked(decryptTotpSecret).mockImplementationOnce(() => {
      throw new Error('bad secret');
    });
    const r = await confirmEnable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('DECRYPT_FAILED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('کد TOTP اشتباه → INVALID_TOKEN + هیچ تغییری در DB', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PENDING_USER as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(false);
    const r = await confirmEnable2FA('000000');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_TOKEN');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('موفق → ۱۰ کد پشتیبان هش‌شده + secret نهایی رمزنگاری‌شده + audit', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PENDING_USER as never);
    const r = await confirmEnable2FA('123456');
    expect(r.success).toBe(true);
    if (!r.success) return;
    // ۱۰ کد پشتیبان یک‌بار نمایش
    expect(r.data.backupCodes).toHaveLength(10);
    expect(r.data.backupCodes[0]).toMatch(/^[A-F0-9]{8}$/);
    // هش‌شده (bcrypt) — هرگز plaintext کد پشتیبان در DB نیست
    const tx = vi.mocked(prisma.$transaction).mock.calls[0]?.[0];
    expect(typeof tx).toBe('function');
    // اجرای transaction واقعی برای بررسی بدنه
    const txObj = makeTx();
    await (tx as unknown as (t: typeof txObj) => Promise<unknown>)(txObj);
    expect(txObj.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          twoFactorSecretEnc: encryptTotpSecret('TOTP_SECRET_RAW'),
        }),
      }),
    );
    const created = txObj.twoFactorBackupCode.createMany.mock.calls[0]?.[0] as {
      data: { codeHash: string }[];
    };
    expect(created.data).toHaveLength(10);
    expect(created.data.every((c) => c.codeHash.startsWith('$2b$12$'))).toBe(true);
    expect(txObj.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: '2FA_ENABLED', actorId: 'u1' }),
      }),
    );
  });

  it('کدهای پشتیبان هر بار یکتا هستند (randomBytes واقعی)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PENDING_USER as never);
    vi.mocked(verifyTotp).mockResolvedValue(true);
    const r = await confirmEnable2FA('123456');
    if (r.success) {
      expect(new Set(r.data.backupCodes).size).toBe(10);
    }
  });
});

describe('disable2FA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK);
    vi.mocked(verifyTotp).mockResolvedValue(true);
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(UNAUTH);
    const r = await disable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('rate-limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RATE_LIMITED);
    const r = await disable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
    expect(checkRateLimit).toHaveBeenCalledWith('2fa-disable:u1', 'auth');
  });

  it('2FA فعال نیست → NOT_ENABLED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: false,
      twoFactorSecretEnc: null,
      role: 'CUSTOMER',
    } as never);
    const r = await disable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_ENABLED');
  });

  it('OWNER هرگز نمی‌تواند غیرفعال کند → FORBIDDEN (قبل از verify)', async () => {
    vi.mocked(requireUser).mockResolvedValue(OWNER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: true,
      twoFactorSecretEnc: 'v1:enc:x',
      role: 'OWNER',
    } as never);
    const r = await disable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.code).toBe('FORBIDDEN');
      expect(r.error.message).toContain('مالک');
    }
    expect(decryptTotpSecret).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('کد اشتباه → INVALID_TOKEN + بدون تغییر', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: true,
      twoFactorSecretEnc: 'v1:enc:x',
      role: 'CUSTOMER',
    } as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(false);
    const r = await disable2FA('123456');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_TOKEN');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('موفق → غیرفعال + حذف کدهای پشتیبان + audit 2FA_DISABLED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: true,
      twoFactorSecretEnc: 'v1:enc:x',
      role: 'CUSTOMER',
    } as never);
    vi.mocked(verifyTotp).mockResolvedValue(true);
    const txObj = makeTx();
    vi.mocked(prisma.$transaction).mockImplementation((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) => fn(txObj)) as never);
    const r = await disable2FA('123456');
    expect(r.success).toBe(true);
    expect(decryptTotpSecret).toHaveBeenCalledWith('v1:enc:x');
    expect(txObj.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          twoFactorEnabled: false,
          twoFactorSecretEnc: null,
          twoFactorSecret: null,
        }),
      }),
    );
    expect(txObj.twoFactorBackupCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(txObj.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: '2FA_DISABLED', actorId: 'u1' }),
      }),
    );
  });
});

describe('get2FAStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(UNAUTH);
    const r = await get2FAStatus();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('کاربر یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const r = await get2FAStatus();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('فعال + ۳ کد باقی‌مانده → وضعیت کامل', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: true,
      _count: { TwoFactorBackupCode: 3 },
    } as never);
    const r = await get2FAStatus();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.enabled).toBe(true);
      expect(r.data.hasBackupCodes).toBe(true);
      expect(r.data.backupCodesCount).toBe(3);
    }
  });

  it('غیرفعال + بدون کد → hasBackupCodes=false', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: false,
      _count: { TwoFactorBackupCode: 0 },
    } as never);
    const r = await get2FAStatus();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.enabled).toBe(false);
      expect(r.data.hasBackupCodes).toBe(false);
    }
  });

  it('فقط کدهای استفاده‌نشده شمرده می‌شوند (where: usedAt null)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      twoFactorEnabled: true,
      _count: { TwoFactorBackupCode: 0 },
    } as never);
    await get2FAStatus();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        twoFactorEnabled: true,
        _count: { select: { TwoFactorBackupCode: { where: { usedAt: null } } } },
      },
    });
  });
});
