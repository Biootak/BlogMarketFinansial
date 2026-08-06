'use server';

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { generateOtpAuthUri, generateTotpSecret, verifyTotp } from '@/lib/totp';
import type { FintechActionResult } from '@/types/types';
import bcrypt from 'bcryptjs';
import { v4 as createId } from 'uuid';

export type TwoFASetupData = { otpauthUri: string; secret: string };
export type TwoFAStatus = { enabled: boolean; hasBackupCodes: boolean; backupCodesCount: number };

export async function setup2FA(): Promise<FintechActionResult<TwoFASetupData>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  const limited = await checkRateLimit(`2fa-setup:${auth.user.id}`, 'auth');
  if (!limited.success)
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها بیش از حد مجاز است' },
    };
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };
  if (user.twoFactorEnabled)
    return { success: false, error: { code: 'ALREADY_ENABLED', message: '۲FA قبلاً فعال شده است' } };
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { twoFactorSecretEnc: `pending:${secret}` },
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
  const secret = user.twoFactorSecretEnc.slice('pending:'.length);
  if (!(await verifyTotp(secret, token)))
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است' } };
  const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString('hex').toUpperCase());
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret, twoFactorSecretEnc: null },
    });
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: auth.user.id } });
    await tx.twoFactorBackupCode.createMany({
      data: await Promise.all(
        backupCodes.map(async (code) => ({
          id: createId(),
          userId: auth.user.id,
          codeHash: await bcrypt.hash(code, 12),
        })),
      ),
    });
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
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret)
    return { success: false, error: { code: 'NOT_ENABLED', message: '۲FA فعال نیست' } };
  if (!(await verifyTotp(user.twoFactorSecret, token)))
    return { success: false, error: { code: 'INVALID_TOKEN', message: 'کد وارد شده نادرست است' } };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorSecretEnc: null },
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
