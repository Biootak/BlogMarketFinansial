import authConfig from '@/auth.config';
import { getUserByEmail } from '@/data/user';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { serverLog } from '@/lib/server-logger';
import { consumeLoginToken } from '@/lib/tokens';
import { LoginSchema } from '@/schemas';
import type { Role, UserProfile } from '@/types/types';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

// 2026-06-24: P1-3. Credentials provider accepts two *internal* fields
// (`kind` and `intent`) that are not in the public schema. Auth.js v5
// is permissive about unknown fields, but we still validate them here
// so the authorize function gets typed input and a malformed call from
// a tampered client is rejected at the boundary.
const InternalCredentialsKindSchema = z.enum(['password', 'after_otp']);
const InternalCredentialsIntentSchema = z.enum(['register', 'login', 'reverify', 'recover']);

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
      if (user) {
        token.role = user.role || 'USER';
        token.id = user.id;
        token.emailVerified = user.emailVerified;
        token.email = user.email;
        token.name = user.name;
      }

      if (trigger === 'update' && session?.user) {
        token.role = session.user.role || 'USER';
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

        const parsed = LoginSchema.safeParse({
          email,
          password: internal.data.password ?? '',
        });
        if (!parsed.success) return null;

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
        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;
        if (!user.emailVerified) return null;
        return user;
      },
    }),
    ...authConfig.providers,
  ],
});
