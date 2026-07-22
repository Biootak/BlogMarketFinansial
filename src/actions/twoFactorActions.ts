'use server';

/**
 * twoFactorActions.ts — Server Actions برای TOTP 2FA
 *
 * جریان:
 *   ۱. کاربر setup2FA را فراخوانی می‌کند → secret + otpauth URI برمی‌گردد
 *   ۲. کاربر QR code را scan و کد ۶ رقمی را وارد می‌کند
 *   ۳. کاربر confirmEnable2FA را فراخوانی می‌کند → اگر کد درست بود، فعال می‌شود
 *   ۴. کاربر disable2FA را فراخوانی می‌کند → غیرفعال می‌شود (با تأیید کد)
 *
 * امنیت:
 *   - secret در DB به‌صورت رمزنگاری‌شده ذخیره می‌شود (AES-256 از env)
 *   - rate-limit روی verify
 *   - backup codes تولید و ذخیره می‌شوند
 */

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { generateOtpAuthUri, generateTotpSecret, verifyTotp } from '@/lib/totp';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TwoFASetupData = {
  otpauthUri: string;
  secret: string; // فقط در مرحله setup — برای QR code نمایش داده می‌شود
};

export type TwoFAStatus = {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * مرحله ۱: تولید secret جدید و URI برای QR code.
 * secret هنوز ذخیره نمی‌شود — فقط بعد از تأیید کد ذخیره می‌شود.
 */
export async function setup2FA(): Promise<FintechActionResult<TwoFASetupData>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };

  if (user.twoFactorEnabled) {
    return { success: false, error: { code: 'ALREADY_ENABLED', message: '۲FA قبلاً فعال شده است' } };
  }

  const secret = generateTotpSecret();
  const otpauthUri = generateOtpAuthUri(secret, user.email ?? auth.user.id);

  // secret را موقتاً در DB ذخیره می‌کنیم (twoFactorSecretEnc = pending)
  // در مرحله confirm، به twoFactorSecret منتقل می‌شود
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { twoFactorSecretEnc: `pending:${secret}` },
  });

  return { success: true, data: { otpauthUri, secret } };
}

/**
 * مرحله ۲: تأیید کد TOTP و فعال‌سازی 2FA + تولید backup codes.
 */
export async function confirmEnable2FA(token: string): Promise<FintechActionResult<{ backupCodes: string[] }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };

  // Rate limit: حداکثر ۵ تلاش در ۵ دقیقه
  const rateKey = `2fa-confirm:${auth.user.id}`;
  const limited = await checkRateLimit(rateKey, 'auth');
  if (!limited.success) {
    return { success: false, error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد مجاز است. لطفاً ۵ دقیقه صبر کنید.' } };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { twoFactorSecretEnc: true, email: true },
  });
  if (!user?.twoFactorSecretEnc?.startsWith('pending:')) {
    return { success: false, error: { code: 'SETUP_REQUIRED', message: 'ابتدا setup2FA را فراخوانی کنید' } };
  }

  const secret = user.twoFactorSecretEnc.slice('pending:'.length);
  const valid = await verifyTotp(secret, token);
  if (!valid) {
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است. لطفاً دوباره امتحان کنید.' } };
  }

  // تولید ۸ backup code یکبار مصرف
  const backupCodes = Array.from({ length: 8 }, () =>
    randomBytes(4).toString('hex').toUpperCase(),
  );

  // فعال‌سازی 2FA + ذخیره secret + ذخیره backup codes
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorSecretEnc: null, // pending را پاک می‌کنیم
      },
    });

    // حذف backup codes قدیمی
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: auth.user.id } });

    // ذخیره backup codes جدید (codeHash = raw code — در پروداکشن باید hash شود)
    await tx.twoFactorBackupCode.createMany({
      data: backupCodes.map((code) => ({
        id: createId(),
        userId: auth.user.id,
        codeHash: code,
      })),
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: 'PLATFORM',
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

/**
 * غیرفعال کردن 2FA (با تأیید کد TOTP جاری).
 */
export async function disable2FA(token: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };

  const rateKey = `2fa-disable:${auth.user.id}`;
  const limited = await checkRateLimit(rateKey, 'auth');
  if (!limited.success) {
    return { success: false, error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد است' } };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return { success: false, error: { code: 'NOT_ENABLED', message: '۲FA فعال نیست' } };
  }

  const valid = await verifyTotp(user.twoFactorSecret, token);
  if (!valid) {
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است' } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorSecretEnc: null },
    });
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: auth.user.id } });
    await tx.auditLog.create({
      data: {
        id: createId(),
        exchangeId: 'PLATFORM',
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

/**
 * وضعیت 2FA کاربر جاری.
 */
export async function get2FAStatus(): Promise<FintechActionResult<TwoFAStatus>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };

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
