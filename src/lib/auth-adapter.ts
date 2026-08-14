import 'server-only';

import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';

/**
 * auth-adapter.ts — آداپتور Prisma با اصلاحِ «یک ایمیل = یک حساب».
 *
 * چرا لازم شد (2026-08-14):
 * `@auth/prisma-adapter` برای `getUserByEmail` از `findUnique({ where: { email } })`
 * استفاده می‌کند که در PostgreSQL **حساس به بزرگی/کوچکی حرف** است. از طرف دیگر
 * `@auth/core` ایمیلِ profile را همیشه lowercase می‌کند
 * (lib/actions/callback/oauth/callback.js → `email: userFromProfile.email?.toLowerCase()`).
 *
 * نتیجه: کاربری که ردیفش با ایمیلِ مختلط ذخیره شده (`Admin@gmail.com` — مثل
 * ردیف‌های seed و ثبت‌نام‌های قبل از normalize شدنِ schema) با «ورود با گوگل»
 * پیدا نمی‌شد. `allowDangerousEmailAccountLinking` هم کاری نمی‌کرد چون اصلاً
 * کاربری برنمی‌گشت → Auth.js یک **کاربر دوم** با همان ایمیل (lowercase)
 * می‌ساخت. از آن لحظه هویتِ کاربر دو تکه بود: رمز عبور، KYC، حساب فین‌تک و
 * تراکنش‌ها روی ردیف اول؛ ورود گوگل روی ردیف دوم. و اگر بعداً همان provider
 * دوباره وصل می‌شد، `OAuthAccountNotLinked` به کاربر نشان داده می‌شد — یعنی
 * هزینهٔ یک باگ سمت ما روی دوش کاربر.
 *
 * اصلاح‌ها:
 *  - `getUserByEmail` → جست‌وجوی case-insensitive با انتخاب قطعی (قدیمی‌ترین
 *    ردیف = حسابِ اصلی) تا اگر تکراری از قبل وجود دارد، همیشه همان یکی برگردد.
 *  - `createUser` → ایمیل قبل از درج normalize می‌شود، پس ردیفِ مختلط تازه
 *    ساخته نمی‌شود.
 *  - `linkAccount` → `upsert` به‌جای `create`؛ اتصالِ دوبارهٔ همان
 *    (provider, providerAccountId) با خطای unique سقوط نمی‌کند بلکه توکن‌ها
 *    به‌روز می‌شوند و اتصال به کاربر درست repoint می‌شود.
 *
 * گارد امنیتی سرِ جایش می‌ماند: linking فقط وقتی به این‌جا می‌رسد که
 * `callbacks.signIn` در src/auth.ts مالکیتِ تأییدشدهٔ ایمیل توسط provider را
 * تأیید کرده باشد.
 */
export function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,

    async createUser(user) {
      // `AdapterUser` با augmentation پروژه (next-auth.d.ts) فیلدهای مشتق مثل
      // `profile` را هم دارد که ستون جدول User نیستند — فقط ستون‌های واقعی را
      // درج می‌کنیم. ایمیل قبل از درج normalize می‌شود تا ردیفِ مختلطِ تازه
      // ساخته نشود (ریشهٔ باگ حسابِ دوگانه).
      const created = await prisma.user.create({
        data: {
          email: user.email.trim().toLowerCase(),
          name: user.name ?? null,
          image: user.image ?? null,
          emailVerified: user.emailVerified ?? null,
        },
      });
      return created as unknown as AdapterUser;
    },

    async getUserByEmail(email) {
      const normalized = email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email: { equals: normalized, mode: 'insensitive' } },
        // انتخاب قطعی: اگر تکراریِ باقی‌مانده از باگ قبلی وجود دارد، همیشه
        // قدیمی‌ترین ردیف (حسابی که داده‌های واقعی روی آن است) برگردد.
        orderBy: { createdAt: 'asc' },
      });
      return (user as unknown as AdapterUser) ?? null;
    },

    async linkAccount(account) {
      const { provider, providerAccountId, userId, type, ...tokens } = account as AdapterAccount &
        Record<string, unknown>;
      const tokenData = {
        access_token: (tokens.access_token as string | undefined) ?? null,
        refresh_token: (tokens.refresh_token as string | undefined) ?? null,
        expires_at: (tokens.expires_at as number | undefined) ?? null,
        token_type: (tokens.token_type as string | undefined) ?? null,
        scope: (tokens.scope as string | undefined) ?? null,
        id_token: (tokens.id_token as string | undefined) ?? null,
        session_state: (tokens.session_state as string | undefined) ?? null,
      };

      await prisma.account.upsert({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        update: { userId, type, ...tokenData },
        create: { userId, type, provider, providerAccountId, ...tokenData },
      });

      serverLog.info('auth-adapter', 'account-linked', { provider, userId });
      return undefined;
    },
  };
}
