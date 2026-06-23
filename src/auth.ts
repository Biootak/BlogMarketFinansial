import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from '@/auth.config';
import prisma from '@/lib/db';
import { getUserById, getUserByEmail } from '@/data/user';
import type { Role, UserProfile } from '@/types/types';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/schemas';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials') return;

      const existingUser = await getUserById(user.id as string);

      if (!existingUser) {
        throw new Error('کاربر در دیتابیس یافت نشد.');
      }
      if (!existingUser.emailVerified) {
        throw new Error('ایمیل تأیید نشده است.');
      }

      // 2026-06-23: ثبت فعالیت ورود در اینجا انجام می‌شود چون loginUser
      // پس از signIn موفق بلافاصله NEXT_REDIRECT پرتاب می‌کند و کد بعد
      // از آن اجرا نمی‌شود. این رویداد تنها پس از authorize موفق اجرا می‌شود.
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
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
    // 2026-06-23: ثبت فعالیت خروج در این رویداد انجام می‌شود چون logout پس
    // از signOut موفق NEXT_REDIRECT پرتاب می‌کند و کد بعد از آن اجرا نمی‌شود.
    async signOut(message) {
      const token = (message as { token?: { sub?: string } | null } | undefined)?.token;
      const userId = token?.sub;
      if (!userId) return;
      try {
        const existingUser = await getUserById(userId);
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
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;
        const user = await getUserByEmail(email);

        if (!user || !user.password) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return user;
      },
    }),
    ...authConfig.providers,
  ],
});
