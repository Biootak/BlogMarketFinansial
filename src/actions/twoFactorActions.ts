'use server';

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { generateOtpAuthUri, generateTotpSecret, verifyTotp } from '@/lib/totp';
import { decryptTotpSecret, encryptTotpSecret } from '@/lib/totp-secrets';
import type { FintechActionResult } from '@/types/types';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as createId } from 'uuid';

export type TwoFASetupData = { otpauthUri: string; secret: string };
export type TwoFAStatus = { enabled: boolean; hasBackupCodes: boolean; backupCodesCount: number };

export async function setup2FA(
  currentPassword?: string,
): Promise<FintechActionResult<TwoFASetupData>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  // SECURITY-fix (2026-08-22): فعال‌سازی 2FA نیازمند اثبات هویت با رمز فعلی.
  // قبلاً فقط سشن کافی بود — مهاجمی که سشن را ربوده بود می‌توانست secret خودش
  // را روی حساب قربانی ثبت کند؛ حتی بعد از بازیابی رمز، قربانی در چالش TOTP
  // گیر می‌کرد (کدهای پشتیبان هم برای مهاجم ساخته می‌شد) = قفل دائمی حساب.
  // غیرفعال‌سازی از قبل TOTP می‌خواهد؛ حالا فعال‌سازی هم re-auth دارد.
  const limited = await checkRateLimit(`2fa-setup:${auth.user.id}`, 'auth');
  if (!limited.success)
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد مجاز است' },
    };
  if (!currentPassword || typeof currentPassword !== 'string') {
    return {
      success: false,
      error: { code: 'VALIDATION', message: 'رمز عبور فعلی برای فعال‌سازی ۲FA الزامی است' },
    };
  }
  const userForAuth = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { password: true },
  });
  if (!userForAuth?.password) {
    return {
      success: false,
      error: {
        code: 'NO_PASSWORD',
        message: 'ابتدا برای حساب خود رمز عبور تنظیم کنید',
      },
    };
  }
  const passwordOk = await bcrypt.compare(currentPassword, userForAuth.password);
  if (!passwordOk) {
    return {
      success: false,
      error: { code: 'WRONG_PASSWORD', message: 'رمز عبور فعلی اشتباه است' },
    };
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };
  if (user.twoFactorEnabled)
    return { success: false, error: { code: 'ALREADY_ENABLED', message: '۲FA قبلاً فعال شده است' } };
  const secret = generateTotpSecret();
  // H2-fix: secret را قبل از ذخیره رمزنگاری کن (pending هم باید محافظت شود)
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { twoFactorSecretEnc: `pending:${encryptTotpSecret(secret)}` },
  });
  return {
    success: true,
    data: { otpauthUri: generateOtpAuthUri(secret, user.email ?? auth.user.id), secret },
  };
}

export async function confirmEnable2FA(
  token: string,
): Promise<FintechActionResult<{ backupCodes: string[] }>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  const limited = await checkRateLimit(`2fa-confirm:${auth.user.id}`, 'auth');
  if (!limited.success)
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد مجاز است' },
    };
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { twoFactorSecretEnc: true },
  });
  if (!user?.twoFactorSecretEnc?.startsWith('pending:'))
    return {
      success: false,
      error: { code: 'SETUP_REQUIRED', message: 'ابتدا setup2FA را انجام دهید' },
    };
  // H2-fix: decrypt کن — با encryptTotpSecret ذخیره شده بود
  let secret: string;
  try {
    secret = decryptTotpSecret(user.twoFactorSecretEnc.slice('pending:'.length));
  } catch {
    return {
      success: false,
      error: { code: 'DECRYPT_FAILED', message: 'خطای رمزگشایی. لطفاً با پشتیبانی تماس بگیرید' },
    };
  }
  if (!(await verifyTotp(secret, token)))
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است' } };
  // 10 کد پشتیبان — هماهنگ با وعده UI (TwoFactorCenter) و استاندارد صنعتی (Google/Microsoft 10 کد)
  const backupCodes = Array.from({ length: 10 }, () =>
    randomBytes(4).toString('hex').toUpperCase(),
  );
  // C2-fix: secret را رمزنگاری‌شده ذخیره کن — plaintext هرگز در DB نباشد
  // T2-fix: هش bcrypt (cost 12 × 10 کد ≈ ۵+ ثانیه CPU) را BEFORE ترنزکشن انجام بده؛
  // وگرنه از مهلت ۵ ثانیه‌ای interactive transaction پرایسما رد می‌شود و کل فعال‌سازی
  // با «Transaction already closed» می‌میرد.
  const hashedCodes = await Promise.all(
    backupCodes.map(async (code) => ({
      id: createId(),
      userId: auth.user.id,
      codeHash: await bcrypt.hash(code, 12),
    })),
  );
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecretEnc: encryptTotpSecret(secret),
        twoFactorSecret: null,
      },
    });
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: auth.user.id } });
    await tx.twoFactorBackupCode.createMany({ data: hashedCodes });
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: null,
        actorId: auth.user.id,
        actorRole: 'USER',
        action: '2FA_ENABLED',
        entityType: 'User',
        entityId: auth.user.id,
      },
    });
  });
  return { success: true, data: { backupCodes } };
}

export async function disable2FA(token: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  const limited = await checkRateLimit(`2fa-disable:${auth.user.id}`, 'auth');
  if (!limited.success)
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد مجاز است' },
    };
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { twoFactorEnabled: true, twoFactorSecretEnc: true, role: true },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecretEnc)
    return { success: false, error: { code: 'NOT_ENABLED', message: '۲FA فعال نیست' } };
  // مالک (OWNER/SUPERADMIN) هرگز نمی‌تواند 2FA را غیرفعال کند — امنیت دائمی
  if (user.role === Role.OWNER || user.role === Role.SUPERADMIN) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'حساب مالک اجازه‌ی غیرفعال‌کردن احراز هویت دو مرحله‌ای را ندارد',
      },
    };
  }
  // C2-fix: از fiel رمزنگاری‌شده decrypt و verify کن
  const secret2 = decryptTotpSecret(user.twoFactorSecretEnc);
  if (!(await verifyTotp(secret2, token)))
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است' } };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: { twoFactorEnabled: false, twoFactorSecretEnc: null, twoFactorSecret: null },
    });
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: auth.user.id } });
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: null,
        actorId: auth.user.id,
        actorRole: 'USER',
        action: '2FA_DISABLED',
        entityType: 'User',
        entityId: auth.user.id,
      },
    });
  });
  return { success: true, data: undefined };
}

export async function get2FAStatus(): Promise<FintechActionResult<TwoFAStatus>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      twoFactorEnabled: true,
      _count: { select: { TwoFactorBackupCode: { where: { usedAt: null } } } },
    },
  });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };
  return {
    success: true,
    data: {
      enabled: user.twoFactorEnabled,
      hasBackupCodes: user._count.TwoFactorBackupCode > 0,
      backupCodesCount: user._count.TwoFactorBackupCode,
    },
  };
}
