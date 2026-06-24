import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from '@/auth.config';
import prisma from '@/lib/db';
import { getUserByEmail } from '@/data/user';
import type { Role, UserProfile } from '@/types/types';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/schemas';

// 2026-06-24: P1-3. Credentials provider accepts two *internal* fields
// (`kind` and `intent`) that are not in the public schema. Auth.js v5
// is permissive about unknown fields, but we still validate them here
// so the authorize function gets typed input and a malformed call from
// a tampered client is rejected at the boundary.
const InternalCredentialsKindSchema = z.enum(['password', 'after_otp']);
const InternalCredentialsIntentSchema = z.enum([
  'register',
  'login',
  'reverify',
  'recover',
]);

const InternalCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().optional().default(''),
  kind: InternalCredentialsKindSchema.optional(),
  intent: InternalCredentialsIntentSchema.optional(),
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
        console.error('Error logging login activity:', error);
      }
    },
    async linkAccount({ user }) {
      // 2026-06-23: OAuth users get emailVerified auto-set so they
      // can complete a passwordless login via our OTP login flow.
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
    async signOut(message) {
      const token = (
        message as { token?: { sub?: string } | null } | undefined
      )?.token;
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
        console.error('Error logging logout activity:', error);
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
      async authorize(credentials) {
        const internal = InternalCredentialsSchema.safeParse(credentials);
        if (!internal.success) return null;

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
        // Trust that, just gate on emailVerified.
        if (kind === 'after_otp') {
          if (!user.emailVerified) return null;
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
