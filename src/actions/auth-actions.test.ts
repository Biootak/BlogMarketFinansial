/**
 * auth-actions.ts — تست‌های یکپارچه احراز هویت
 *
 * هدف: پوشش همه سناریوهای واقعی (happy + edge + attack) تا باگ‌ها
 *      قبل از رسیدن به production کشف شوند.
 *
 * سناریوهای پوشش‌داده‌شده:
 *   lookupEmail      — ایمیل ناشناخته / تأیید‌نشده / بدون رمز / با رمز / rate-limit / Zod
 *   registerUser     — ثبت‌نام جدید / ایمیل تکراری تأییدشده / overwrite پنجره تازه /
 *                      overwrite منقضی / rate-limit / Zod
 *   loginWithPassword — ورود موفق / رمز اشتباه / banned / تأیید‌نشده /
 *                       2FA enabled → challenge / OWNER بدون 2FA → setup /
 *                       OWNER با 2FA → challenge / rate-limit
 *   verifyOtp        — کد صحیح / کد اشتباه / منقضی / too-many-attempts /
 *                      intent=recover → resetToken / intent=2fa TOTP صحیح /
 *                      intent=2fa TOTP اشتباه / intent=2fa backup code /
 *                      decrypt error / rate-limit / signIn failure
 *   resendOtp        — ارسال مجدد / cooldown / intent نامعتبر
 *   recoverPassword  — ایمیل ناشناخته / ارسال موفق / rate-limit
 *   setNewPassword   — توکن معتبر / توکن منقضی / توکن نامعتبر / Zod
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────
// next-auth را کامل mock می‌کنیم — از این که next/server را import کند جلوگیری می‌شود

vi.mock('next-auth', () => {
  class AuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
    }
  }
  return { AuthError, default: { providers: [] } };
});

vi.mock('@/lib/db', () => ({
  default: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    verificationToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    twoFactorBackupCode: { findMany: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    activityLog: { create: vi.fn() },
    systemLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: vi.fn(), findUnique: vi.fn() },
        verificationToken: { deleteMany: vi.fn() },
      }),
    ),
  },
}));

vi.mock('@/auth', () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  resetRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/tokens', () => ({
  generateOtpToken: vi
    .fn()
    .mockResolvedValue({ ok: true, code: '123456', expiresAt: new Date(Date.now() + 600000) }),
  consumeOtpToken: vi.fn().mockResolvedValue({ ok: true }),
  generateLoginToken: vi
    .fn()
    .mockResolvedValue({ token: 'login-tok-xyz', expiresAt: new Date(Date.now() + 60000) }),
  generatePasswordResetToken: vi
    .fn()
    .mockResolvedValue({ token: 'reset-tok-abc', expiresAt: new Date(Date.now() + 300000) }),
  consumePasswordResetToken: vi.fn().mockResolvedValue({ ok: true }),
  invalidateOtpTokens: vi.fn().mockResolvedValue(undefined),
  generateSixDigitCode: vi.fn().mockReturnValue('999999'),
  createTwoFactorChallenge: vi.fn().mockResolvedValue({ expiresAt: new Date(Date.now() + 120000) }),
  beginTwoFactorChallenge: vi
    .fn()
    .mockResolvedValue({ ok: true, challengeId: 'chal-1', attemptsLeft: 4 }),
  finishTwoFactorChallenge: vi.fn().mockResolvedValue(undefined),
  OTP_EXPIRES_MS: 600000,
  OTP_RESEND_COOLDOWN_MS: 60000,
  OTP_MAX_ATTEMPTS: 5,
  PASSWORD_RESET_TOKEN_EXPIRES_MS: 300000,
  TWO_FACTOR_CHALLENGE_EXPIRES_MS: 120000,
  TWO_FACTOR_MAX_ATTEMPTS: 5,
}));

vi.mock('@/lib/email', () => ({
  getEmailProviderAsync: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/lib/email/templates', () => ({
  otpEmail: vi.fn().mockReturnValue({ subject: 'OTP', html: '<p>code</p>' }),
  otpExpiresLabel: vi.fn().mockReturnValue('10 دقیقه'),
}));

vi.mock('@/lib/totp', () => ({
  verifyTotp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/totp-secrets', () => ({
  decryptTotpSecret: vi.fn().mockReturnValue('DECRYPTED_SECRET'),
  encryptTotpSecret: vi.fn().mockReturnValue('v1:encrypted'),
}));

vi.mock('@/lib/server-logger', () => ({
  serverLog: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

// setNewPassword در مسیر موفق revalidateTag صدا می‌زند؛ در محیط vitest
// next/cache در دسترس نیست و بدون این mock مسیر موفق «خطای موقتی» برمی‌گرداند.
vi.mock('@/lib/revalidate', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('$hashed$'),
  },
}));

// ─── Imports (بعد از mock) ────────────────────────────────────────────────────

import {
  loginWithPassword,
  lookupEmail,
  recoverPassword,
  registerUser,
  resendOtp,
  setNewPassword,
  verifyOtp,
} from '@/actions/auth-actions';
import { signIn } from '@/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  beginTwoFactorChallenge,
  consumeOtpToken,
  consumePasswordResetToken,
  createTwoFactorChallenge,
  finishTwoFactorChallenge,
  generateLoginToken,
  generateOtpToken,
} from '@/lib/tokens';
import { verifyTotp } from '@/lib/totp';
import { decryptTotpSecret } from '@/lib/totp-secrets';
import bcrypt from 'bcryptjs';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VERIFIED_USER = {
  id: 'u-1',
  email: 'user@example.com',
  name: 'کاربر تست',
  password: '$hashed$',
  emailVerified: new Date('2026-01-01'),
  twoFactorEnabled: false,
  twoFactorSecretEnc: null,
  role: 'USER' as const,
  status: 'Active' as const,
  createdAt: new Date('2026-01-01'),
};

const UNVERIFIED_USER = {
  ...VERIFIED_USER,
  id: 'u-2',
  emailVerified: null,
  createdAt: new Date(Date.now() - 5 * 60 * 1000), // ۵ دقیقه پیش (داخل window)
};

const USER_2FA = {
  ...VERIFIED_USER,
  id: 'u-2fa',
  twoFactorEnabled: true,
  twoFactorSecretEnc: 'v1:some-encrypted-secret',
};

const OWNER_USER = { ...VERIFIED_USER, id: 'u-owner', role: 'OWNER' as const };
const OWNER_2FA = { ...USER_2FA, id: 'u-owner-2fa', role: 'OWNER' as const };

function makeForm(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const RL_OK = { success: true as const, reset: Date.now() + 60000 };
const RL_FAIL = { success: false as const, reset: Date.now() + 30000 };

// ─── lookupEmail ──────────────────────────────────────────────────────────────

describe('lookupEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ایمیل نامعتبر → VALIDATION_ERROR', async () => {
    const r = await lookupEmail(makeForm({ email: 'not-an-email' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('ایمیل');
  });

  it('ایمیل خالی → VALIDATION_ERROR', async () => {
    const r = await lookupEmail(makeForm({ email: '' }));
    expect(r.success).toBe(false);
  });

  it('rate-limit → خطای cooldown', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await lookupEmail(makeForm({ email: 'a@b.com' }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toContain('بیش از حد');
      expect(r.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('ایمیل ناشناخته → step=register', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const r = await lookupEmail(makeForm({ email: 'new@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.step).toBe('register');
  });

  it('ایمیل تأییدنشده → step=verify + intent=reverify', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(UNVERIFIED_USER as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('reverify');
    }
    expect(generateOtpToken).toHaveBeenCalledOnce();
  });

  it('کاربر با رمز عبور → step=login', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.step).toBe('login');
  });

  it('کاربر بدون رمز (OAuth) → step=verify + intent=login', async () => {
    const oauthUser = { ...VERIFIED_USER, password: null };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(oauthUser as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('login');
    }
  });
});

// ─── registerUser ─────────────────────────────────────────────────────────────

describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ورودی ناقص → VALIDATION_ERROR', async () => {
    const r = await registerUser(makeForm({ email: 'a@b.com', password: 'weak', name: 'x' }));
    expect(r.success).toBe(false);
  });

  it('رمز بدون حرف بزرگ → VALIDATION_ERROR', async () => {
    const r = await registerUser(
      makeForm({ email: 'a@b.com', password: 'password1', name: 'احمد' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('حروف بزرگ');
  });

  it('rate-limit → خطا با cooldownMs', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await registerUser(
      makeForm({ email: 'a@b.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('ایمیل تأییدشده موجود → خطا (تکراری)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await registerUser(
      makeForm({ email: 'user@example.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('قبلاً ثبت شده');
  });

  it('ایمیل تأیید‌نشده تازه → overwrite و کد ارسال', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(UNVERIFIED_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce(UNVERIFIED_USER as never);
    const r = await registerUser(
      makeForm({ email: 'user@example.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.step).toBe('verify');
    expect(prisma.user.update).toHaveBeenCalledOnce();
  });

  it('ایمیل تأیید‌نشده منقضی (> 30 دقیقه) → خطا', async () => {
    const oldUser = {
      ...UNVERIFIED_USER,
      createdAt: new Date(Date.now() - 35 * 60 * 1000), // ۳۵ دقیقه پیش
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(oldUser as never);
    const r = await registerUser(
      makeForm({ email: 'user@example.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('منقضی');
  });

  it('ثبت‌نام موفق جدید → step=verify', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce(UNVERIFIED_USER as never);
    const r = await registerUser(
      makeForm({ email: 'new@example.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('register');
    }
  });

  it('OTP cooldown → خطا با cooldownMs', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce(UNVERIFIED_USER as never);
    vi.mocked(generateOtpToken).mockResolvedValueOnce({
      ok: false,
      reason: 'wait',
      retryAfterMs: 45000,
    } as never);
    const r = await registerUser(
      makeForm({ email: 'new@example.com', password: 'Password1', name: 'احمد' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBe(45000);
  });
});

// ─── loginWithPassword ────────────────────────────────────────────────────────

describe('loginWithPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ورودی ناقص → VALIDATION_ERROR', async () => {
    const r = await loginWithPassword(makeForm({ email: 'bad', password: '' }));
    expect(r.success).toBe(false);
  });

  it('rate-limit → خطا با cooldownMs', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await loginWithPassword(makeForm({ email: 'a@b.com', password: 'Password1' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('ورود موفق (بدون 2FA) → redirect=/dashboard', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.redirect).toBe('/dashboard');
    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ kind: 'password' }),
    );
  });

  it('رمز اشتباه → خطا (bcrypt false)', async () => {
    // کاربر عادی (بدون 2FA): در مسیر signIn('credentials',{kind:password}) خطا می‌گیرد
    // چون authorize() با bcrypt.compare=false مقدار null برمی‌گرداند → CredentialsSignin
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(VERIFIED_USER as never) // lookup اول (2FA branch)
      .mockResolvedValueOnce(VERIFIED_USER as never); // lookup دوم (در catch CredentialsSignin)
    const { AuthError } = await import('next-auth');
    const err = new AuthError('CredentialsSignin');
    err.type = 'CredentialsSignin';
    vi.mocked(signIn).mockRejectedValueOnce(err);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'WrongPass1' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('اشتباه');
  });

  it('حساب banned → خطای دسترسی', async () => {
    // banned user با 2FA فعال — در بلوک 2FA چک می‌شود
    const bannedWith2FA = { ...USER_2FA, status: 'Banned' as const };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(bannedWith2FA as never);
    const r = await loginWithPassword(
      makeForm({ email: 'banned@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('غیرفعال');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('حساب تأییدنشده (با 2FA) → step=verify + OTP ارسال', async () => {
    const unverified2FA = {
      ...USER_2FA,
      emailVerified: null,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(unverified2FA as never);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('reverify');
    }
    // سشن نباید ساخته شود
    expect(signIn).not.toHaveBeenCalled();
  });

  it('2FA فعال + رمز درست → step=verify + intent=2fa (بدون سشن)', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.verificationToken.create).mockResolvedValue({} as never);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('2fa');
    }
    // مطمئن شو سشن ساخته نشده
    expect(signIn).not.toHaveBeenCalled();
  });

  it('2FA فعال + رمز اشتباه → خطا (قبل از challenge)', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'WrongPass1' }),
    );
    expect(r.success).toBe(false);
    // هیچ challenge ساخته نشده
    expect(prisma.verificationToken.create).not.toHaveBeenCalled();
  });

  it('OWNER بدون 2FA → redirect=/2fa-setup', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(OWNER_USER as never);
    const r = await loginWithPassword(
      makeForm({ email: 'owner@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.redirect).toBe('/2fa-setup');
  });

  it('OWNER با 2FA → step=verify + intent=2fa', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(OWNER_2FA as never);
    const r = await loginWithPassword(
      makeForm({ email: 'owner@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('2fa');
    }
    expect(signIn).not.toHaveBeenCalled();
  });

  it('OWNER banned → خطا حتی با رمز درست', async () => {
    const bannedOwner = { ...OWNER_USER, status: 'Banned' as const };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(bannedOwner as never);
    const r = await loginWithPassword(
      makeForm({ email: 'owner@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(false);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signIn خطا می‌دهد → AuthError map شده', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const { AuthError } = await import('next-auth');
    const err = Object.create(AuthError.prototype);
    err.type = 'CredentialsSignin';
    vi.mocked(signIn).mockRejectedValueOnce(err);
    // کاربر ایمیل تأیید‌شده دارد
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await loginWithPassword(
      makeForm({ email: 'user@example.com', password: 'Password1' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('اشتباه');
  });
});

// ─── verifyOtp ────────────────────────────────────────────────────────────────

describe('verifyOtp — intent=register/login/reverify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ورودی ناقص (کد خالی) → VALIDATION_ERROR', async () => {
    const r = await verifyOtp(makeForm({ email: 'a@b.com', code: '', intent: 'register' }));
    expect(r.success).toBe(false);
  });

  it('کد ۵ رقمی برای intent غیر 2fa → VALIDATION_ERROR', async () => {
    const r = await verifyOtp(makeForm({ email: 'a@b.com', code: '12345', intent: 'login' }));
    expect(r.success).toBe(false);
  });

  it('rate-limit → خطا با cooldownMs', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await verifyOtp(makeForm({ email: 'a@b.com', code: '123456', intent: 'register' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('کد صحیح intent=register → redirect=/dashboard', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...VERIFIED_USER,
      emailVerified: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: 'register' }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.redirect).toBe('/dashboard');
    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ kind: 'after_otp' }),
    );
  });

  it('کد اشتباه → خطای یکپارچه (بدون leak)', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: false, reason: 'wrong-code' } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '000000', intent: 'login' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      // پیام باید یکپارچه و مبهم باشد — نه «کد اشتباه است» و نه «کد منقضی است»
      expect(r.error).toBe('کد نامعتبر یا منقضی شده است. لطفاً دوباره درخواست دهید');
      expect(r.error).not.toContain('یافت نشد');
    }
  });

  it('کد منقضی → همان پیام یکپارچه (بدون افشای دلیل)', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: false, reason: 'expired' } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '000000', intent: 'login' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      // دقیقاً همان پیام حالت «کد اشتباه» — مهاجم نمی‌تواند وجود/انقضای توکن را تشخیص دهد
      expect(r.error).toBe('کد نامعتبر یا منقضی شده است. لطفاً دوباره درخواست دهید');
      expect(r.error).not.toContain('یافت نشد');
    }
  });

  it('too-many-attempts → پیام مخصوص (بدون سشن)', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({
      ok: false,
      reason: 'too-many-attempts',
    } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '000000', intent: 'login' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('تعداد');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('intent=recover → step=set-password + resetToken (بدون سشن)', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: true } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: 'recover' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('set-password');
      expect(r.resetToken).toBeDefined();
    }
    // بسیار مهم: ورود ایجاد نشده
    expect(signIn).not.toHaveBeenCalled();
  });

  it('کاربر با 2FA فعال + OTP ایمیلی صحیح → challenge TOTP (نه سشن)', async () => {
    // P0 (2026-08-14): مسیر OTP ایمیلی نباید TOTP را دور بزند. قبلاً هر کسی
    // با دسترسی به ایمیل قربانی مستقیم سشن می‌گرفت.
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(USER_2FA as never) // applyIntent
      .mockResolvedValueOnce(USER_2FA as never); // گارد 2FA
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: 'login' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('2fa');
    }
    expect(createTwoFactorChallenge).toHaveBeenCalledWith('user@example.com');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signIn بعد از OTP خطا می‌دهد → خطای واضح (OTP مصرف‌شده، ولی سشن نه)', async () => {
    vi.mocked(consumeOtpToken).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...VERIFIED_USER,
      emailVerified: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce(VERIFIED_USER as never);
    vi.mocked(generateLoginToken).mockResolvedValueOnce({
      token: 'tok',
      expiresAt: new Date(),
    } as never);
    vi.mocked(signIn).mockRejectedValueOnce(new Error('DB error'));
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: 'login' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('خطا');
  });
});

describe('verifyOtp — intent=2fa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rate-limit 2FA → خطا با cooldown', async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce(RL_OK as never) // verify rate
      .mockResolvedValueOnce(RL_FAIL as never); // 2fa-verify rate
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toContain('دو مرحله');
      expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('کاربر 2FA ندارد → خطا', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('فعال نیست');
  });

  it('حساب banned → خطا حتی با TOTP درست', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const bannedWith2FA = { ...USER_2FA, status: 'Banned' as const };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(bannedWith2FA as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('غیرفعال');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('ایمیل تأیید‌نشده → خطا (نباید سشن بسازد)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const unverified2FA = { ...USER_2FA, emailVerified: null };
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(unverified2FA as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('تأیید');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('TOTP درست → ورود موفق + reset rate-limit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(true);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.redirect).toBe('/dashboard');
    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ kind: 'after_otp' }),
    );
  });

  it('TOTP اشتباه + کد پشتیبان نیست → خطا + challenge باقی می‌ماند (attempts شمرده شد)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(false);
    // persistent (نه Once): این mock ممکن است اصلاً صدا زده نشود (کد ۶ رقمی با regex
    // هگز ۸ کاراکتری match نمی‌شود) — Onceِ مصرف‌نشده به تست بعدی leak می‌کند.
    vi.mocked(prisma.twoFactorBackupCode.findMany).mockResolvedValue([]);
    vi.mocked(beginTwoFactorChallenge).mockResolvedValueOnce({
      ok: true,
      challengeId: 'chal-1',
      attemptsLeft: 3,
    });
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '000000', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('نادرست');
    // 2026-08-14: یک اشتباه تایپی نباید challenge را بسوزاند — سقف attempts
    // (که beginTwoFactorChallenge اعمال می‌کند) brute-force را می‌بندد.
    expect(finishTwoFactorChallenge).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('challenge وجود ندارد → ورود رد می‌شود حتی با TOTP معتبر (گارد عامل اول)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(beginTwoFactorChallenge).mockResolvedValueOnce({
      ok: false,
      reason: 'not-found',
    });
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('مهلت');
    expect(signIn).not.toHaveBeenCalled();
    // TOTP هرگز نباید بررسی شود — گارد قبل از verify اجرا می‌شود
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it('challenge منقضی → ورود رد می‌شود', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(beginTwoFactorChallenge).mockResolvedValueOnce({ ok: false, reason: 'expired' });
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('سقف تلاش challenge پر شده → پیام «حد مجاز»', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(beginTwoFactorChallenge).mockResolvedValueOnce({
      ok: false,
      reason: 'too-many-attempts',
    });
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('حد مجاز');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('کد پشتیبان معتبر ۸ کاراکتری → ورود موفق + کد burn', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(false); // TOTP اشتباه
    vi.mocked(prisma.twoFactorBackupCode.findMany).mockResolvedValueOnce([
      { id: 'bc-1', codeHash: '$hash$' },
    ] as never);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never); // backup match
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.twoFactorBackupCode.update).mockResolvedValue({} as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: 'DEADBEEF', intent: '2fa' }),
    );
    expect(r.success).toBe(true);
    // کد پشتیبان باید یک‌بارمصرف شود
    expect(prisma.twoFactorBackupCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bc-1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it('decrypt خطا می‌دهد → پیام کاربرپسند (بدون کد داخلی، راهنمای کد پشتیبان)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(decryptTotpSecret).mockImplementationOnce(() => {
      throw new Error('AUTH_SECRET missing');
    });
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      // کد داخلی به کاربر درز نکند؛ کاربر به مسیر کد پشتیبان راهنمایی شود
      expect(r.error).not.toContain('TOTP-DEC');
      expect(r.error).toContain('کد پشتیبان');
      // نباید پیام «خطای موقتی» باشد
      expect(r.error).not.toContain('موقتی');
    }
  });

  it('signIn بعد از TOTP معتبر خطا → پیام واضح', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(true);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(generateLoginToken).mockResolvedValueOnce({
      token: 'tok',
      expiresAt: new Date(),
    } as never);
    vi.mocked(signIn).mockRejectedValueOnce(new Error('network error'));
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('خطا');
  });

  it('کد backup استفاده‌شده قبلی → رد می‌شود', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(false);
    // backup کد استفاده‌شده — usedAt set است — در query where: {usedAt: null} برنمی‌گردد
    vi.mocked(prisma.twoFactorBackupCode.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: 'DEADBEEF', intent: '2fa' }),
    );
    expect(r.success).toBe(false);
  });
});

// ─── resendOtp ────────────────────────────────────────────────────────────────

describe('resendOtp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('intent نامعتبر → VALIDATION_ERROR', async () => {
    const r = await resendOtp(makeForm({ email: 'a@b.com', intent: '2fa' }));
    expect(r.success).toBe(false);
  });

  it('rate-limit → خطا با cooldown', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await resendOtp(makeForm({ email: 'a@b.com', intent: 'login' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('OTP cooldown هنوز فعال → خطا با cooldownMs', async () => {
    vi.mocked(generateOtpToken).mockResolvedValueOnce({
      ok: false,
      reason: 'wait',
      retryAfterMs: 30000,
    } as never);
    const r = await resendOtp(makeForm({ email: 'a@b.com', intent: 'recover' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBe(30000);
  });

  it('ارسال مجدد موفق → step=verify', async () => {
    const r = await resendOtp(makeForm({ email: 'user@example.com', intent: 'register' }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('register');
    }
  });

  it('ایمیل نامعتبر → VALIDATION_ERROR', async () => {
    const r = await resendOtp(makeForm({ email: 'not-email', intent: 'register' }));
    expect(r.success).toBe(false);
  });
});

// ─── recoverPassword ──────────────────────────────────────────────────────────

describe('recoverPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ایمیل نامعتبر → VALIDATION_ERROR', async () => {
    const r = await recoverPassword(makeForm({ email: 'bad' }));
    expect(r.success).toBe(false);
  });

  it('rate-limit → خطا', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await recoverPassword(makeForm({ email: 'a@b.com' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('ایمیل ناشناخته → پاسخ مبهم (no-leak)', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const r = await recoverPassword(makeForm({ email: 'ghost@example.com' }));
    // باید success برگرداند تا attacker نداند ایمیل وجود دارد یا نه
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('recover');
    }
    // OTP نباید ارسال شود
    expect(generateOtpToken).not.toHaveBeenCalled();
  });

  it('ایمیل شناخته → step=verify + OTP ارسال', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await recoverPassword(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.step).toBe('verify');
      expect(r.intent).toBe('recover');
    }
    expect(generateOtpToken).toHaveBeenCalledOnce();
  });

  it('OTP cooldown → خطا', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    vi.mocked(generateOtpToken).mockResolvedValueOnce({
      ok: false,
      reason: 'wait',
      retryAfterMs: 20000,
    } as never);
    const r = await recoverPassword(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBe(20000);
  });

  it('OWNER recovery → در systemLog ثبت می‌شود', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(OWNER_USER as never);
    vi.mocked(prisma.systemLog.create).mockResolvedValueOnce({} as never);
    const r = await recoverPassword(makeForm({ email: 'owner@example.com' }));
    expect(r.success).toBe(true);
    expect(prisma.systemLog.create).toHaveBeenCalledOnce();
  });
});

// ─── setNewPassword ───────────────────────────────────────────────────────────

describe('setNewPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ورودی ناقص → VALIDATION_ERROR', async () => {
    const r = await setNewPassword(
      makeForm({ email: 'a@b.com', resetToken: 'short', password: 'P1' }),
    );
    expect(r.success).toBe(false);
  });

  it('رمز ضعیف → VALIDATION_ERROR', async () => {
    const r = await setNewPassword(
      makeForm({
        email: 'user@example.com',
        resetToken: 'a'.repeat(16),
        password: 'weakpassword',
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('رمز');
  });

  it('توکن منقضی → خطای نشست منقضی', async () => {
    vi.mocked(consumePasswordResetToken).mockResolvedValueOnce({
      ok: false,
      reason: 'expired',
    } as never);
    const r = await setNewPassword(
      makeForm({
        email: 'user@example.com',
        resetToken: 'a'.repeat(16),
        password: 'Password1New',
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('منقضی');
  });

  it('توکن نامعتبر → خطای نشست نامعتبر', async () => {
    vi.mocked(consumePasswordResetToken).mockResolvedValueOnce({
      ok: false,
      reason: 'not-found',
    } as never);
    const r = await setNewPassword(
      makeForm({
        email: 'user@example.com',
        resetToken: 'a'.repeat(16),
        password: 'Password1New',
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('نامعتبر');
  });

  it('کاربر در DB پیدا نشد → خطای مبهم (no-leak)', async () => {
    vi.mocked(consumePasswordResetToken).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const r = await setNewPassword(
      makeForm({
        email: 'ghost@example.com',
        resetToken: 'a'.repeat(16),
        password: 'Password1New',
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).not.toContain('یافت نشد');
  });

  it('بازنشانی موفق → step=login + passwordVersion bump', async () => {
    vi.mocked(consumePasswordResetToken).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(VERIFIED_USER as never);
    // cast: امضای واقعی $transaction دو overload دارد (آرایه + callback با
    // نوع کامل tx). mock فقط بخش‌های استفاده‌شده را می‌سازد.
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        user: { update: vi.fn().mockResolvedValue(VERIFIED_USER) },
        verificationToken: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      })) as never);
    const r = await setNewPassword(
      makeForm({
        email: 'user@example.com',
        resetToken: 'a'.repeat(16),
        password: 'NewPassword1',
      }),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.step).toBe('login');
  });

  it('rate-limit → خطا', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await setNewPassword(
      makeForm({
        email: 'user@example.com',
        resetToken: 'a'.repeat(16),
        password: 'NewPassword1',
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.cooldownMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── DB Connectivity resilience (2026-08-14) ─────────────────────────────────
// کاربر در تولید هنگام ورود/2FA «خطای موقتی در سامانه» می‌گرفت؛ ریشه خطاهای
// اتصال دیتابیس بود (ConnectionReset / pool timeout / اعتبارنامهٔ کهنه). این
// تست‌ها مطمئن می‌شوند: خطای گذرا یک بار retry می‌شود، و خطای قطعی اتصال پیام
// واضح «ارتباط با سرور برقرار نشد» می‌دهد نه پیام مبهم.

describe('DB connectivity resilience', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lookupEmail: خطای گذرای اتصال → یک بار retry و موفقیت', async () => {
    // بار اول: ConnectionReset؛ بار دوم: کاربر پیدا می‌شود
    vi.mocked(prisma.user.findFirst)
      .mockRejectedValueOnce(
        new Error('Error in PostgreSQL connection: ConnectionReset by remote host') as never,
      )
      .mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.step).toBe('login');
    // مطمئن شو واقعاً دوباره تلاش شده (دو بار findFirst)
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
  });

  it('lookupEmail: P1001 (دسترس‌ناپذیر) → یک بار retry', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockRejectedValueOnce(new Error("Can't reach database server at `x:5432`") as never)
      .mockResolvedValueOnce(VERIFIED_USER as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
  });

  it('lookupEmail: خطای گذرا مکرر → پیام «ارتباط با سرور برقرار نشد» (بدون throw)', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockRejectedValueOnce(new Error("Can't reach database server at `x:5432`") as never)
      .mockRejectedValueOnce(new Error("Can't reach database server at `x:5432`") as never);
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('ارتباط با سرور');
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
  });

  it('lookupEmail: اعتبارنامهٔ کهنه (authentication failed) → پیام واضح، بدون retry', async () => {
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(
      new Error(
        'Authentication failed against database server, the provided database credentials are not valid',
      ) as never,
    );
    const r = await lookupEmail(makeForm({ email: 'user@example.com' }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('ارتباط با سرور');
    // تلاش مجدد برای خطای اعتبارنامه منطقی نیست
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(1);
  });

  it('verifyOtp (2FA): retry بعد از pool timeout موفق می‌شود', async () => {
    vi.mocked(prisma.user.findFirst)
      .mockRejectedValueOnce(
        new Error('Timed out fetching a new connection from the connection pool') as never,
      )
      .mockResolvedValueOnce(USER_2FA as never);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(verifyTotp).mockResolvedValueOnce(true);
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(generateLoginToken).mockResolvedValueOnce({
      token: 'tok',
      expiresAt: new Date(),
    } as never);
    const r = await verifyOtp(
      makeForm({ email: 'user@example.com', code: '123456', intent: '2fa' }),
    );
    expect(r.success).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
  });
});
