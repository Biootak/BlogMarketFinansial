// 2026-08-02: guard this module from ever being bundled into the client.
// Without `server-only`, Turbopack (via `transpilePackages: ['next-auth']`)
// treats `@auth/core` + bcrypt + prisma as universal code and ships them in
// the shared client chunk (~860KB) — every public page pays that weight.
// This marks the module server-only so the client bundle stays slim.
import 'server-only';

import { randomBytes } from 'node:crypto';
import authConfig from '@/auth.config';
import { getUserByEmail } from '@/data/user';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { serverLog } from '@/lib/server-logger';
import { consumeLoginToken } from '@/lib/tokens';
import { LoginSchema } from '@/schemas';
import type { Role } from '@/types/types';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

// 2026-08-09 fix: accept both AUTH_SECRET (canonical, used by middleware +
// totp-secrets) and NEXTAUTH_SECRET; fail-closed in production (the previous
// version only logged and let Auth.js continue with an undefined secret);
// dev fallback is random per process, not a shared hardcoded string.
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!authSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET (or NEXTAUTH_SECRET) is required in production. ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const generated = randomBytes(32).toString('base64');
  // Keep both names in sync so middleware's getToken and Auth.js share
  // the same signing secret in dev.
  process.env.AUTH_SECRET = generated;
  process.env.NEXTAUTH_SECRET = generated;
  serverLog.warn(
    'auth',
    'dev-secret-generated',
    'No AUTH_SECRET/NEXTAUTH_SECRET set; generated a random dev secret. Sessions expire on restart.',
  );
} else {
  // If only one name is set, mirror it so middleware + Auth.js never drift apart.
  if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = authSecret;
  if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = authSecret;
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
const InternalCredentialsIntentSchema = z.enum([
  'register',
  'login',
  'reverify',
  'recover',
  '2fa',
]);

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

      const existingUser = await prisma.user.findUnique({
        where: { id: user.id as string },
      });
      if (!existingUser) {
        throw new Error('کاربر در دیتابیس یافت نشد.');
      }
      if (!existingUser.emailVerified) {
        throw new Error('ایمیل تأیید نشده است.');
      }

      try {
        await prisma.activityLog.create({
          data: {
            userId: existingUser.id,
            action: 'ورود به سیستم',
            details: `کاربر "${existingUser.name || existingUser.email}" وارد سیستم شد`,
          },
        });
      } catch (error) {
        serverLog.error('auth', 'log-login-activity', error);
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
    async jwt({ token, trigger, session, user }) {
      // ── First sign-in: populate all fields from the DB user object ──────────
      if (user) {
        token.role = user.role || 'USER';
        token.id = user.id;
        token.emailVerified = user.emailVerified;
        token.email = user.email;
        token.name = user.name;
        // Store tokenVersion at sign-in time so we can detect revocations later.
        // tokenVersion is incremented in the DB whenever a role change or forced
        // sign-out occurs. If the value in the token no longer matches the DB,
        // we refresh the role immediately — making role revocations effective
        // within the next request rather than waiting up to 24 h (updateAge).
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { tokenVersion: true },
        });
        token.tokenVersion = dbUser?.tokenVersion ?? 0;
      }

      // ── Explicit session.update() call (e.g. from useCurrentUser) ───────────
      if (trigger === 'update' && session?.user) {
        token.role = session.user.role || 'USER';
      }

      // ── Every subsequent request: verify tokenVersion matches DB ────────────
      // This is the 2026 Auth.js pattern for immediate role invalidation:
      //   Admin revokes a user's role → tokenVersion is incremented in DB
      //   → next request this check fires → token.role is refreshed from DB
      //   → user loses access within one request, not after 24 h.
      //
      // We only do this when the token already has a sub (i.e. not first sign-in)
      // and no explicit update trigger is in flight. The DB query is a single
      // indexed lookup on the primary key — negligible overhead.
      if (!user && !trigger && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, tokenVersion: true },
        });
        if (dbUser) {
          const storedVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 0;
          if (dbUser.tokenVersion !== storedVersion) {
            // Version mismatch → role was changed or session was force-invalidated.
            // Refresh role + version in the token so the session stays alive but
            // reflects the new permissions immediately.
            token.role = dbUser.role;
            token.tokenVersion = dbUser.tokenVersion;
          }
        }
      }

      return token;
    },
    async session({ token, session }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.sub || '',
          role: (token.role as Role) || 'USER',
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
  adapter: PrismaAdapter(prisma),
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
