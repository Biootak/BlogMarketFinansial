import type { NextAuthConfig } from 'next-auth';

import Github from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

// 2026-08-10: ورود اجتماعی (گوگل/گیت‌هاب) فقط در production فعال است — در dev
// دکمه‌ها (SocialProviders) توسط سرور حذف می‌شوند و ورود فقط با Credentials
// (OTP/رمز) است؛ بنابراین نیازی به نگه‌داری دو OAuth app (dev+prod) نیست.
// عمداً فقط روی NODE_ENV گیت می‌شود (نه presence خود AUTH_*): در build-time
// (Docker) آن env ها موجود نیستند و نباید provider ها در باندل خالی شوند.
const isProd = process.env.NODE_ENV === 'production';

// 2026-08-10: NextAuth v5 uses AUTH_URL (not NEXTAUTH_URL) as the base URL
// for callback URIs. Heroku sets NEXTAUTH_URL; mirror it to AUTH_URL so OAuth
// callbacks point to financialmarket.page instead of the internal 0.0.0.0 port.
if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
}

// 2026-08-14: OAuth account linking by email (کاربر با هر روشی که ثبت کرده
// بتواند با همان ایمیل وارد شود — بدون خطای OAuthAccountNotLinked).
//
// امنیت: allowDangerousEmailAccountLinking به تنهایی یعنی «به ادعای ایمیلِ
// provider اعتماد کن». ما فقط وقتی این اجازه معنا دارد که provider واقعاً
// مالکیت ایمیل را تأیید کرده باشد:
//   - Google (OIDC): همیشه email_verified را در profile برمی‌گرداند و برای
//     ساخت حساب تأیید ایمیل لازم است.
//   - GitHub: ایمیل عمومی که /user برمی‌گرداند ذاتاً تأییدشده است؛ وقتی خالی
//     است از /user/emails (scope user:email) می‌خوانیم و فقط اگر verified=true
//     بود email_verified را true می‌گذاریم (profile سفارشی زیر).
// گارد دوم در callbacks.signIn (src/auth.ts) است: اگر email_verified !== true
// باشد، کل ورود OAuth مسدود می‌شود — پس linking هرگز روی ایمیلِ تأییدنشده
// انجام نمی‌شود.
export default {
  trustHost: true,
  providers: isProd
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
        Github({
          clientId: process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
          allowDangerousEmailAccountLinking: true,
          // پیش‌فرض Auth.js فقط email را می‌گذارد و معلوم نیست تأییدشده است یا
          // نه. اینجا هم ایمیلِ تأییدنشده را عبور نمی‌دهیم و هم email_verified
          // را در profile می‌گذاریم تا گارد signIn بتواند تصمیم بگیرد.
          userinfo: {
            url: 'https://api.github.com/user',
            async request({
              tokens,
              provider,
            }: {
              tokens: { access_token?: string };
              provider: { userinfo?: { url?: string } };
            }) {
              const profile = await fetch(provider.userinfo?.url ?? 'https://api.github.com/user', {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  'User-Agent': 'authjs',
                },
              }).then(async (res) => await res.json());
              if (!profile.email) {
                // See https://docs.github.com/en/rest/users/emails#list-public-email-addresses-for-the-authenticated-user
                const res = await fetch('https://api.github.com/user/emails', {
                  headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                    'User-Agent': 'authjs',
                  },
                });
                if (res.ok) {
                  const emails = await res.json();
                  const primary = (Array.isArray(emails) ? emails : []).find(
                    (e: { primary?: boolean; verified?: boolean; email?: string }) => e.primary,
                  );
                  if (primary?.email) {
                    profile.email = primary.email;
                    // فقط ایمیلِ تأییدشده می‌تواند مبنای linking باشد.
                    profile.email_verified = primary.verified === true;
                  }
                }
              } else {
                // ایمیل عمومی گیت‌هاب ذاتاً تأییدشده است (گیت‌هاب فقط ایمیل
                // تأییدشده را عمومی نمایش می‌دهد).
                profile.email_verified = true;
              }
              return profile;
            },
          },
          profile(profile) {
            return {
              id: profile.id.toString(),
              name: profile.name ?? profile.login,
              email: profile.email,
              image: profile.avatar_url,
              email_verified: profile.email_verified === true,
            };
          },
        }),
      ]
    : [],

  pages: {
    signIn: '/auth',
    newUser: '/auth?step=register',
    error: '/error',
    verifyRequest: '/auth?step=verify',
  },
} satisfies NextAuthConfig;
