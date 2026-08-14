'use server';

/**
 * accountLinksActions.ts — مدیریت اتصال حساب‌های OAuth (گوگل/گیت‌هاب) به حساب کاربر.
 *
 * معماری (طبق best practice Auth.js v5 — 2026-08-14):
 *   - اتصال خودکار با همان ایمیل در login-time توسط allowDangerousEmailAccountLinking
 *     + گارد email_verified در callbacks.signIn انجام می‌شود (auth.config.ts / auth.ts).
 *   - مسیر امنِ اتصالِ یک provider تازه: کاربرِ لاگین‌شده (با همان ایمیل) از صفحهٔ
 *     «اتصال حساب‌ها» دکمهٔ اتصال را می‌زند → OAuth dance → signIn callback متوجه
 *     session موجود می‌شود و اجازهٔ linking را می‌دهد (بدون چالش 2FA اضافه).
 *   - قطع اتصال: فقط providerهای مجاز؛ و هرگز آخرین روش ورودِ کاربر را نمی‌شود قطع کرد.
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { serverLog } from '@/lib/server-logger';
import type { FintechActionResult } from '@/types/types';

// تنها providerهایی که کاربر می‌تواند از داشبورد وصل/قطع کند.
// (فایل 'use server' فقط می‌تواند تابع async اکسپورت کند — این ثابت internal است.)
const LINKABLE_PROVIDERS = ['google', 'github'] as const;
export type OAuthProvider = (typeof LINKABLE_PROVIDERS)[number];

export type LinkedAccountRow = {
  provider: OAuthProvider;
  providerAccountId: string;
  createdAt: string;
};

export type LinkedAccountsState = {
  email: string;
  hasPassword: boolean;
  accounts: LinkedAccountRow[];
};

export async function getLinkedAccounts(): Promise<FintechActionResult<LinkedAccountsState>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }

  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true, password: true },
    }),
    prisma.account.findMany({
      where: { userId: auth.user.id },
      select: { provider: true, providerAccountId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!user) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'حساب کاربری یافت نشد' } };
  }

  return {
    success: true,
    data: {
      email: user.email,
      hasPassword: !!user.password,
      accounts: accounts
        .filter((a) => (LINKABLE_PROVIDERS as readonly string[]).includes(a.provider))
        .map((a) => ({
          provider: a.provider as OAuthProvider,
          providerAccountId: a.providerAccountId,
          createdAt: a.createdAt.toISOString(),
        })),
    },
  };
}

export async function unlinkOAuthAccount(
  provider: string,
): Promise<FintechActionResult<{ remaining: number }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد شوید' } };
  }
  if (!(LINKABLE_PROVIDERS as readonly string[]).includes(provider)) {
    return {
      success: false,
      error: { code: 'INVALID_PROVIDER', message: 'ارائه‌دهندهٔ موردنظر قابل قطع اتصال نیست.' },
    };
  }

  const userId = auth.user.id;

  // مالکیت: فقط حسابِ متصل به همین کاربر قابل قطع است.
  const account = await prisma.account.findFirst({
    where: { userId, provider },
    select: { id: true },
  });
  if (!account) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'این حساب متصل نیست.' } };
  }

  // گارد امنیتی: کاربر باید حداقل یک روش ورود دیگر داشته باشد (رمز عبور یا
  // provider OAuth دیگری) — در غیر این صورت قطع اتصال یعنی قفل‌شدن دائمی.
  const [user, otherOAuthCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { password: true } }),
    prisma.account.count({ where: { userId, provider: { not: provider } } }),
  ]);
  const hasPassword = !!user?.password;
  if (!hasPassword && otherOAuthCount === 0) {
    return {
      success: false,
      error: {
        code: 'LAST_LOGIN_METHOD',
        message: 'این تنها روش ورود شماست. ابتدا یک رمز عبور تعیین کنید یا روش دیگری متصل کنید.',
      },
    };
  }

  await prisma.account.delete({ where: { id: account.id } });

  // Audit — بهترین‌تلاش؛ قطع نشدن لاگ نباید عملیات را متوقف کند.
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'قطع اتصال حساب',
        details: `حساب ${provider} از حساب کاربر جدا شد`,
      },
    });
  } catch (error) {
    serverLog.error('account-links', 'unlink-audit-failed', error);
  }

  return { success: true, data: { remaining: otherOAuthCount } };
}
