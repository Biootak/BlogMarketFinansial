// 2026-08-02: guard this module from ever being bundled into the client.
// Without `server-only`, Turbopack (via `transpilePackages: ['next-auth']`)
// treats `@auth/core` + bcrypt + prisma as universal code and ships them in
// the shared client chunk (~860KB) — every public page pays that weight.
// This marks the module server-only so the client bundle stays slim.
import 'server-only';

import { randomUUID } from 'node:crypto';
import authConfig from '@/auth.config';
import { getUserByEmail } from '@/data/user';
import { createAuthAdapter } from '@/lib/auth-adapter';
import { getAuthSecret } from '@/lib/auth-secret';
import prisma from '@/lib/db';
import { devOwnerRoleForEmail } from '@/lib/dev-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { serverLog } from '@/lib/server-logger';
import { isSessionRevoked } from '@/lib/session-denylist';
import { consumeLoginToken, createTwoFactorChallenge } from '@/lib/tokens';
import { LoginSchema } from '@/schemas';
import type { Role } from '@/types/types';
import { getToken } from '@auth/core/jwt';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';
import { z } from 'zod';

// 2026-08-09 fix: accept both AUTH_SECRET (canonical, used by middleware +
// totp-secrets) and NEXTAUTH_SECRET; fail-closed in production (the previous
// version only logged and let Auth.js continue with an undefined secret).
// The dev fallback (src/lib/auth-secret.ts) is PERSISTED to a gitignored
// file — not a random per-process string — so the auto-restarting dev server
// (dev-turbo restarts on Turbopack panics) and parallel dev servers on
// localhost keep signing sessions with the same secret. Without this, every
// restart invalidated all sessions and users had to re-login.
const hadEnvAuthSecret = !!(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
// Side effect: mirrors the resolved secret into process.env.AUTH_SECRET /
// NEXTAUTH_SECRET, which is what Auth.js, middleware, and totp-secrets read.
getAuthSecret();
if (!hadEnvAuthSecret && process.env.NODE_ENV !== 'production') {
  serverLog.warn(
    'auth',
    'dev-secret-generated',
    'No AUTH_SECRET in env; using persisted dev secret (.freebuff/dev-auth-secret). Sessions survive restarts.',
  );
}

// 2026-06-24: P1-3. Credentials provider accepts two *internal* fields
// (`kind` and `intent`) that are not in the public schema. Auth.js v5
// is permissive about unknown fields, but we still validate them here
// so the authorize function gets typed input and a malformed call from
// a tampered client is rejected at the boundary.
const InternalCredentialsKindSchema = z.enum(['password', 'after_otp']);
// 2026-08-09: '2fa' added — verifyTotpLogin (auth-actions) hands the
// single-use loginToken to signIn with intent='2fa' after a valid TOTP
// code; without it the intent enum rejected the value, authorize()
// returned null, and every 2FA login died with CredentialsSignin.
const InternalCredentialsIntentSchema = z.enum(['register', 'login', 'reverify', 'recover', '2fa']);

const InternalCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().optional().default(''),
  kind: InternalCredentialsKindSchema.optional(),
  intent: InternalCredentialsIntentSchema.optional(),
  // 2026-07-08: single-use token minted by verifyOtp after a real OTP is consumed.
  loginToken: z.string().optional(),
});

// 2026-06-23: One Credentials provider handles two flows:
//   kind='password'   → bcrypt verify against stored hash
//   kind='after_otp'  → trust pre-verified user (verifyOtp in auth-actions
//                       already consumed the code + set emailVerified)
//
// Auth.js is the *only* place that decides who is allowed to mint a
// session. The OTP pipeline in src/actions/auth-actions.ts is the gate
// that decides *when* signIn('credentials') gets reached.

// 2026-08-14: تشخیص اینکه کاربرِ درخواست‌کننده از قبل session دارد (برای
// تشخیص مسیر «اتصال حساب‌ها» از ورود عادی در callbacks.signIn). JWT-cookie
// را مستقیم decode می‌کنیم — cookie در هر دو flavor (secure prod /
// غیرامن dev) بررسی می‌شود. هر خطا → null (fail-open: بدون session فرض
// می‌شود و گاردهای معمول ورود اعمال می‌شوند).
async function currentSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) return null;
    for (const secureCookie of [false, true]) {
      try {
        const token = await getToken({
          req: { headers: { cookie: header } },
          secret: getAuthSecret(),
          secureCookie,
        });
        if (token?.sub) return token.sub as string;
      } catch {
        // flavor نامعتبر — flavor بعدی را امتحان کن
      }
    }
  } catch (error) {
    serverLog.warn('auth', 'current-session-decode-failed', error);
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  logger: {
    // JWTSessionError fires whenever a visitor has a stale / corrupt cookie
    // (e.g. after a secret rotation or schema change). The (auth) layout already
    // catches and discards it — no need to spam the server log.
    error(err: Error) {
      if (err.name === 'JWTSessionError') return;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials') return;

      // G2-fix: در events.signIn، throw باعث می‌شود NextAuth session را نسازد
      // ولی signIn() در auth-actions خطا نمی‌دهد — کاربر redirect می‌شود ولی
      // session ندارد → loop. این چک‌ها در authorize() هم هستند (redundant
      // ولی best-effort) پس اینجا فقط best-effort activity log می‌نویسیم.
      // G3-fix (2026-08-14): کل بدنه باید fail-open باشد — هر خطای DB
      // (اتصال قطع، pool timeout و …) در این hook نباید ساخت session را
      // متوقف کند؛ authorize() گارد اصلی است و اینجا فقط logging است.
      try {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id as string },
        });
        if (!existingUser || !existingUser.emailVerified || existingUser.status !== 'Active') {
          // authorize() already blocked this — این branch نباید رخ دهد.
          // اگر رخ داد، فقط log کن؛ throw نکن (session block را authorize انجام داده)
          serverLog.warn('auth', 'signIn-event-guard', {
            userId: user.id,
            hasUser: !!existingUser,
            emailVerified: existingUser?.emailVerified,
            status: existingUser?.status,
          });
          return;
        }

        await prisma.activityLog.create({
          data: {
            userId: existingUser.id,
            action: 'ورود به سیستم',
            details: `کاربر "${existingUser.name || existingUser.email}" وارد سیستم شد`,
          },
        });
      } catch (error) {
        serverLog.error('auth', 'signIn-event-fail-open', error);
      }
    },
    async linkAccount({ user, account, profile }) {
      // 2026-06-30: only auto-verify if the OAuth provider confirms
      // ownership of the email. Google returns `email_verified: true`
      // for every Google account that has a verified address. GitHub
      // returns it only after the user verifies their email on GitHub.
      // Some legacy providers don't expose the claim at all — those
      // fall through to the OTP-verified path in auth-actions.ts.
      //
      // Why this matters: the previous code set `emailVerified: now`
      // unconditionally, which let an attacker register a fresh OAuth
      // account with a victim's email (via a provider that didn't
      // verify) and immediately complete the OTP-less login flow
      // gated only by `emailVerified IS NOT NULL`.
      if (!user.id) return;
      // NextAuth's Profile type is generic (per-provider shape); the
      // `email_verified` claim is OAuth-standard but not in the base
      // type. Cast through unknown so the check compiles without
      // disabling strictness.
      const oauthProfile = profile as unknown as { email_verified?: boolean } | undefined;
      const providerConfirmed = oauthProfile?.email_verified === true;
      if (!providerConfirmed) return;

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      // Audit trail for OAuth auto-verification. Failure is
      // non-fatal — logging is best-effort.
      try {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'تأیید خودکار از طریق OAuth',
            details: `ایمیل توسط ${account?.provider ?? 'OAuth'} تأیید شد`,
          },
        });
      } catch (error) {
        serverLog.error('auth', 'log-oauth-verification', error);
      }
    },
    async signOut(message) {
      const token = (message as { token?: { sub?: string } | null } | undefined)?.token;
      const userId = token?.sub;
      if (!userId) return;
      try {
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        const userName = existingUser?.name || existingUser?.email;
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'خروج از سیستم',
            details: `کاربر "${userName}" از سیستم خارج شد`,
          },
        });
      } catch (error) {
        serverLog.error('auth', 'log-logout-activity', error);
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // ── Credentials: authorize() کاملاً gate می‌کند — اینجا کاری نکن ──
      if (!account || account.provider === 'credentials') return true;

      // ── OAuth: گاردها قبل از ساخت session ──
      // (این callback قبل از handleLoginOrRegister اجرا می‌شود — redirect یا
      // false یعنی هیچ session و هیچ linking صورت نمی‌گیرد.)
      //
      // گارد ۱ — ایمیلِ تأییدشدهٔ provider: allowDangerousEmailAccountLinking
      // فقط وقتی امن است که provider مالکیت ایمیل را اثبات کرده باشد
      // (Google همیشه email_verified دارد؛ GitHub فقط ایمیل تأییدشده را در
      // profile می‌گذارد — ر.ک auth.config.ts). بدون این گارد، هر حساب OAuth
      // با ایمیلِ تأییدنشده می‌توانست به حسابِ قربانی link شود.
      const oauthProfile = profile as unknown as { email_verified?: boolean } | undefined;
      const providerVerifiedEmail = oauthProfile?.email_verified === true;
      const rawEmail = (profile as { email?: unknown } | undefined)?.email ?? user.email;
      const oauthEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

      // گارد ۰ — کاربرِ از‌قبل‌لاگین‌شده (مسیر «اتصال حساب‌ها» در داشبورد):
      // 2026-08-14: وقتی کاربرِ لاگین‌شده از صفحهٔ اتصال حساب‌ها یک provider
      // تازه وصل می‌کند، OAuth callback با session موجود اجرا می‌شود. تشخیص این
      // حالت حیاتی است چون بدون آن:
      //   a) حسابِ OAuth با ایمیلِ کاربرِ دیگری → Auth.js (با
      //      allowDangerousEmailAccountLinking) به آن کاربرِ دیگر link می‌کرد و
      //      session فعلی بی‌صدا عوض می‌شد (takeover).
      //   b) حسابِ OAuth با ایمیلِ جدید/ناشناخته → کاربر جدید ساخته می‌شد.
      // هر دو باید به‌جای خطای OAuthAccountNotLinked یا تغییر ناخواستهٔ هویت،
      // با پیام واضح برگردند. همین ایمیلِ حسابِ فعلی → linking مجاز است.
      const sessionUserId = await currentSessionUserId();
      const linkingIntent = sessionUserId !== null;

      if (!oauthEmail || !providerVerifiedEmail) {
        serverLog.warn('auth', 'signIn-oauth-unverified-email', {
          provider: account.provider,
          hasEmail: !!oauthEmail,
        });
        return linkingIntent
          ? '/dashboard/connected-accounts?error=oauth-email-unverified'
          : '/auth?error=oauth-email-unverified';
      }

      // Account در نسخهٔ نصب‌شده فیلدهای token را به‌صورت JsonValue تایپ
      // می‌کند؛ اینجا به شکل شناخته‌شده cast می‌کنیم تا در upsert بدون
      // any کار کند (خود مقادیر از پاسخ provider می‌آیند).
      const oauthAccount = account as unknown as {
        provider: string;
        providerAccountId: string;
        type: string;
        access_token?: string | null;
        refresh_token?: string | null;
        expires_at?: number | null;
        token_type?: string | null;
        scope?: string | null;
        id_token?: string | null;
        session_state?: string | null;
      };

      try {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: oauthEmail, mode: 'insensitive' } },
          select: {
            id: true,
            email: true,
            twoFactorEnabled: true,
            twoFactorSecretEnc: true,
            role: true,
            status: true,
          },
        });

        // مسدود/معلق → قبل از هر session/link ورود را برگردان.
        if (dbUser && dbUser.status !== 'Active') {
          return linkingIntent
            ? '/dashboard/connected-accounts?error=account-blocked'
            : '/auth?error=account-blocked';
        }

        // گارد ۲ — مسیر اتصال (کاربرِ لاگین‌شده): حسابِ OAuth نباید متعلق به
        // کاربرِ دیگری باشد.
        // 2026-08-14: قبلاً شرط سخت‌گیرانه‌تر بود — «ایمیلِ OAuth باید دقیقاً
        // با ایمیلِ حسابِ فعلی یکی باشد» — و همین باعث می‌شد کاربری که ایمیلِ
        // گیت‌هابش (مثلاً ایمیل کاری) با ایمیلِ ثبت‌نامش فرق دارد نتواند حسابش
        // را وصل کند و خطای «ایمیل یکی نیست» بگیرد؛ در حالی که این حالت هیچ
        // ریسکی ندارد: کاربر از قبل احراز هویت شده و آن ایمیل به هیچ کاربر
        // دیگری تعلق ندارد. حالا فقط تضاد واقعی رد می‌شود: ایمیلِ OAuth متعلق
        // به کاربرِ دیگری است (در آن صورت linking یعنی ادغام دو هویت).
        if (linkingIntent) {
          if (dbUser && dbUser.id !== sessionUserId) {
            serverLog.warn('auth', 'signIn-oauth-email-owned-by-other-user', {
              provider: account.provider,
              sessionUser: sessionUserId,
              oauthEmailUser: dbUser.id,
            });
            return '/dashboard/connected-accounts?error=oauth-email-mismatch';
          }
          // خودِ حسابِ OAuth (provider + providerAccountId) از قبل به کاربرِ
          // دیگری وصل است؟ Auth.js در این حالت OAuthAccountNotLinked پرتاب
          // می‌کند و کاربر به صفحهٔ خطای عمومی می‌رود. اینجا با پیام روشن
          // برمی‌گردانیم — این تنها حالتِ واقعاً مبهم است (یک حساب گوگل
          // نمی‌تواند همزمان به دو کاربر وصل باشد).
          const linkedElsewhere = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: oauthAccount.provider,
                providerAccountId: oauthAccount.providerAccountId,
              },
            },
            select: { userId: true },
          });
          if (linkedElsewhere && linkedElsewhere.userId !== sessionUserId) {
            serverLog.warn('auth', 'signIn-oauth-account-owned-by-other-user', {
              provider: account.provider,
              sessionUser: sessionUserId,
              accountOwner: linkedElsewhere.userId,
            });
            return '/dashboard/connected-accounts?error=oauth-account-taken';
          }
          // همان کاربر (یا ایمیلی که به کسی تعلق ندارد) → Auth.js حساب را به
          // کاربرِ لاگین‌شده link می‌کند. کاربر از قبل احراز هویت شده؛ چالش 2FA
          // لازم نیست.
          return true;
        }

        // گارد ۳ — 2FA: اگر حساب 2FA فعال دارد، OAuth نباید آن را دور بزند.
        // identity او را به حساب link می‌کنیم (tokens از خود provider آمده —
        // فقط دارندهٔ واقعی حساب OAuth می‌تواند به این‌جا برسد) و بعد challenge
        // TOTP می‌سازیم؛ بدون کد Authenticator هیچ session ساخته نمی‌شود.
        // بعد از TOTP، verifyOtp با single-use loginToken همان حساب را
        // sign-in می‌کند — همان مسیر امن بعد_otp.
        if (dbUser?.twoFactorEnabled && dbUser.twoFactorSecretEnc) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: oauthAccount.provider,
                providerAccountId: oauthAccount.providerAccountId,
              },
            },
            update: {
              access_token: oauthAccount.access_token ?? null,
              refresh_token: oauthAccount.refresh_token ?? null,
              expires_at: oauthAccount.expires_at ?? null,
              token_type: oauthAccount.token_type ?? null,
              scope: oauthAccount.scope ?? null,
              id_token: oauthAccount.id_token ?? null,
              session_state: oauthAccount.session_state ?? null,
            },
            create: {
              userId: dbUser.id,
              type: oauthAccount.type,
              provider: oauthAccount.provider,
              providerAccountId: oauthAccount.providerAccountId,
              access_token: oauthAccount.access_token ?? null,
              refresh_token: oauthAccount.refresh_token ?? null,
              expires_at: oauthAccount.expires_at ?? null,
              token_type: oauthAccount.token_type ?? null,
              scope: oauthAccount.scope ?? null,
              id_token: oauthAccount.id_token ?? null,
              session_state: oauthAccount.session_state ?? null,
            },
          });

          // challenge یکبارمصرف — همان شکل loginWithPassword.
          // 2026-08-14: از createTwoFactorChallenge استفاده می‌شود تا verifyOtp
          // بتواند با beginTwoFactorChallenge همان row را claim کند (گارد عامل
          // اول). قبلاً هر دو مسیر row را دستی می‌ساختند و verify هرگز وجودش
          // را چک نمی‌کرد.
          await createTwoFactorChallenge(oauthEmail);

          serverLog.info('auth', 'oauth-2fa-challenge', {
            provider: account.provider,
            email: oauthEmail,
          });
          return `/auth?step=verify&intent=2fa&email=${encodeURIComponent(dbUser.email)}`;
        }
      } catch (error) {
        // قطعی DB → fail-open: اختلال موقت نباید کاربر را قفل کند. گاردهای
        // jwt/events در درخواست بعدی هنوز status/role را اعمال می‌کنند.
        serverLog.error('auth', 'signIn-oauth-db-unavailable', error);
      }

      // کاربر عادی بدون 2FA (یا OWNER/SUPERADMIN هنوز 2FA فعال نکرده —
      // dashboard layout او را به /2fa-setup می‌فرستد) → اجازهٔ ورود.
      return true;
    },
    async jwt({ token, user }) {
      // ── First sign-in: populate all fields from the DB user object ──────────
      if (user) {
        token.role = user.role || 'USER';
        token.id = user.id;
        token.emailVerified = user.emailVerified;
        token.email = user.email;
        token.name = user.name;
        // SECURITY-fix (2026-08-22): شناسهٔ یکتای توکن برای denylist خروج —
        // logout() همین jti را در Redis با TTL ۳روز ثبت می‌کند و چکِ
        // هر-درخواستِ پایین، توکن ردیشده را null می‌کند (الگوی استاندارد
        // revocation برای JWT؛ WorkOS 2026-08 / jsonic 2026-05).
        token.jti = randomUUID();
        // Store tokenVersion at sign-in time so we can detect revocations later.
        // tokenVersion is incremented in the DB whenever a role change or forced
        // sign-out occurs. If the value in the token no longer matches the DB,
        // we refresh the role immediately — making role revocations effective
        // within the next request rather than waiting up to 24 h (updateAge).
        // 2026-08-11: best-effort — a DB pool timeout (dev uses a single
        // connection) must not fail the sign-in. The every-request check below
        // backfills permissions on the next request once the DB recovers.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id as string },
            select: {
              tokenVersion: true,
              passwordVersion: true,
              permissions: true,
              deniedPermissions: true,
            },
          });
          token.tokenVersion = dbUser?.tokenVersion ?? 0;
          token.passwordVersion = dbUser?.passwordVersion ?? 0;
          token.permissions = dbUser?.permissions ?? [];
          token.deniedPermissions = dbUser?.deniedPermissions ?? [];
        } catch (error) {
          serverLog.warn('auth', 'jwt-seed-db-unavailable', error);
          token.tokenVersion = 0;
          token.passwordVersion = 0;
          token.permissions = [];
          token.deniedPermissions = [];
        }
      }

      // ── SECURITY-fix (2026-08-22): بلوک قبلی «trigger === 'update'» حذف شد ──
      // POST /api/auth/session بدنهٔ درخواست را بدون اعتبارسنجی به عنوان
      // newSession به همین callback می‌رساند (داک Auth.js v5: «⚠ session data
      // را قبل از استفاده validate کنید»). کد قبلی role را مستقیم از آن کپی
      // می‌کرد → هر کاربر لاگین‌شده با یک fetch سادهٔ
      // update({ user: { role: 'OWNER' } }) می‌توانست JWT امضاشدهٔ OWNER بگیرد.
      // حالا هیچ داده‌ای از کلاینت خوانده نمی‌شود؛ فراخوانی update() فقط باعث
      // refresh ادعاها از DB می‌شود (شرط پایین دیگر trigger را مستثنا نمی‌کند).

      // ── Every subsequent request: verify tokenVersion matches DB ────────────
      // This is the 2026 Auth.js pattern for immediate role invalidation:
      //   Admin revokes a user's role → tokenVersion is incremented in DB
      //   → next request this check fires → token.role is refreshed from DB
      //   → user loses access within one request, not after 24 h.
      //
      // We only do this when the token already has a sub (i.e. not first
      // sign-in). Runs on normal requests AND explicit update() triggers —
      // claims (role/permissions) have exactly one source: the database.
      // The DB query is a single indexed lookup on the primary key —
      // negligible overhead.
      if (!user && token.sub) {
        // ── SECURITY-fix (2026-08-22): denylist خروج ─────────────────────────
        // توکنِ ثبت‌شده در denylist (بعد از logout) فوراً null می‌شود — حتی
        // کوکی کپی‌شده. Fail-open داخل خود isSessionRevoked است.
        const tokenJti = typeof token.jti === 'string' ? token.jti : null;
        if (tokenJti && (await isSessionRevoked(tokenJti))) return null;
        // 2026-08-11: fail-open. This DB query runs on EVERY authenticated
        // request; with the dev single-connection pool, a busy DB (pageview
        // writes, market tickers, parallel tabs) makes it time out. Letting
        // the error propagate 500s /api/auth/session and auth() — the client
        // then treats the user as logged out and shows the login form on
        // refresh. Keep the existing token instead; the check retries on the
        // next request and revocation just waits for the DB to recover.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              tokenVersion: true,
              passwordVersion: true,
              permissions: true,
              deniedPermissions: true,
              status: true,
            },
          });
          if (dbUser) {
            // 2026-08-12: banned/suspended → discard the token so the
            // session dies on the very next request (no forced sign-out
            // round-trip needed).
            if (dbUser.status !== 'Active') return null;
            // 2026-08-13: password changed (passwordVersion bumped) → the
            // session was minted against an old password — discard it so
            // stolen/old sessions die immediately.
            const storedPasswordVersion =
              typeof token.passwordVersion === 'number' ? token.passwordVersion : 0;
            if ((dbUser.passwordVersion ?? 0) !== storedPasswordVersion) return null;
            const storedVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 0;
            if (dbUser.tokenVersion !== storedVersion) {
              // Version mismatch → role/permissions changed or session was
              // force-invalidated. Refresh role + permissions + version in the
              // token so the session stays alive but reflects the new access
              // immediately (instant revocation without forced sign-out).
              token.role = dbUser.role;
              token.permissions = dbUser.permissions ?? [];
              token.deniedPermissions = dbUser.deniedPermissions ?? [];
              token.tokenVersion = dbUser.tokenVersion;
            }
          }
        } catch (error) {
          serverLog.warn('auth', 'jwt-refresh-db-unavailable', error);
        }
      }

      return token;
    },
    async session({ token, session }) {
      if (token) {
        // 2026-08-12: dev-only OWNER elevation — فقط توسعه‌دهنده در محیط
        // توسعه (سه گارد: NODE_ENV=development + DEV_OWNER_BYPASS=1 +
        // DEV_OWNER_EMAIL منطبق با ایمیل session). در prod همیشه null است
        // و نقش واقعی token استفاده می‌شود. هویت (id) هرگز عوض نمی‌شود.
        const devRole = devOwnerRoleForEmail(
          typeof token.email === 'string' ? token.email : undefined,
        );
        session.user = {
          ...session.user,
          id: token.sub || '',
          role: devRole ?? ((token.role as Role) || 'USER'),
          permissions: token.permissions ?? [],
          deniedPermissions: token.deniedPermissions ?? [],
          emailVerified: token.emailVerified
            ? token.emailVerified instanceof Date
              ? token.emailVerified
              : new Date(token.emailVerified)
            : null,
          email: token.email || '',
          name: token.name || '',
        };
      }
      return session;
    },
  },
  adapter: createAuthAdapter(),
  session: {
    strategy: 'jwt',
    maxAge: 3 * 24 * 60 * 60, // 3 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Credentials({
      // kind is internal — never shown to users, so we don't declare it
      // in the credentials dict (which is the public schema).
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const internal = InternalCredentialsSchema.safeParse(credentials);
        if (!internal.success) return null;

        // 2026-07-08: brute-force protection on the public credentials endpoint.
        // The leftmost X-Forwarded-For entry is fully client-controlled, so we
        // take the *rightmost* entry (appended by our own trusted proxy) and
        // only fall back to X-Real-IP when no XFF is present.
        const req = request as Request | undefined;
        const xff = req?.headers?.get('x-forwarded-for');
        const ip =
          (xff
            ? xff
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
                .pop()
            : undefined) ??
          req?.headers?.get('x-real-ip')?.trim() ??
          'unknown';
        const rl = await checkRateLimit(ip, 'auth');
        if (!rl.success) return null;

        const { email } = internal.data;
        const kind = internal.data.kind ?? 'password';

        // 2026-08-09 fix: password validation is only meaningful for the
        // kind='password' path. The after_otp path never carries a password
        // (verifyOtp gates it with the single-use loginToken), so running
        // LoginSchema here rejected the empty password and every OTP login
        // died with CredentialsSignin after the code was already consumed.
        let password = '';
        if (kind === 'password') {
          const parsed = LoginSchema.safeParse({
            email,
            password: internal.data.password ?? '',
          });
          if (!parsed.success) return null;
          password = parsed.data.password;
        }

        const user = await getUserByEmail(email);
        if (!user) return null;
        // 2026-08-12: banned/suspended users must not get a session under
        // any circumstance (password OR after_otp path).
        if (user.status !== 'Active') return null;

        // OAuth-only / after-otp path: we already verified the user out of
        // band in auth-actions.ts (OTP consumed, emailVerified set).
        // 2026-07-08: P0 fix — the session must be proven by a single-use
        // login token minted by verifyOtp, NOT merely by the persistent
        // emailVerified flag. Otherwise anyone could hit the public credentials
        // endpoint with kind=after_otp + a verified email to take over the
        // account without any OTP.
        if (kind === 'after_otp') {
          if (!user.emailVerified) return null;
          const loginToken = internal.data.loginToken;
          if (!loginToken) return null;
          const consumed = await consumeLoginToken({ email, token: loginToken });
          if (!consumed.ok) return null;
          return user;
        }

        // Password path.
        if (!user.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        if (!user.emailVerified) return null;
        return user;
      },
    }),
    ...authConfig.providers,
  ],
});
