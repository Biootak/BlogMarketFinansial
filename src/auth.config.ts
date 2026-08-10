import type { NextAuthConfig } from 'next-auth';

import Github from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

// 2026-08-10: ورود اجتماعی (گوگل/گیت‌هاب) فقط در production فعال است — در dev
// دکمه‌ها (SocialProviders) توسط سرور حذف می‌شوند و ورود فقط با Credentials
// (OTP/رمز) است؛ بنابراین نیازی به نگه‌داری دو OAuth app (dev+prod) نیست.
// عمداً فقط روی NODE_ENV گیت می‌شود (نه presence خود AUTH_*): در build-time
// (Docker) آن env ها موجود نیستند و نباید provider ها در باندل خالی شوند.
const isProd = process.env.NODE_ENV === 'production';

export default {
  trustHost: true,
  providers: isProd
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        Github({
          clientId: process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
      ]
    : [],

  pages: {
    signIn: '/auth',
    newUser: '/auth?step=register',
    error: '/error',
    verifyRequest: '/verify-request',
  },
} satisfies NextAuthConfig;
