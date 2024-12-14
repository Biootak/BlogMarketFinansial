import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from '@/auth.config';

import prisma from '@/lib/db';
import { getUserById, getUserByEmail } from '@/data/user';
import type { Role, UserProfile } from '@/types/types';
import Resend from 'next-auth/providers/resend';
import Credentials from 'next-auth/providers/credentials';

import { LoginSchema } from '@/schemas';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
    },
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async jwt({ token, trigger, session, user }) {
      // اگر کاربر جدید وارد می‌شود، اطلاعات کامل را به توکن اضافه کنید
      if (user) {
        return {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any).role || 'USER',
          profile: (user as any).profile
        };
      }

      // به‌روزرسانی توکن با اطلاعات جدید
      if (trigger === 'update') {
        return {
          ...token,
          ...session.user
        };
      }
      
      // بررسی اعتبار توکن و به‌روزرسانی اطلاعات
      if (token.sub) {
        const existingUser = await getUserById(token.sub);
        if (!existingUser) {
          // اگر کاربر وجود ندارد، توکن را پاک کنید
          return null;
        }

        // به‌روزرسانی توکن با آخرین اطلاعات کاربر
        return {
          ...token,
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          profile: existingUser.profile,
          emailVerified: existingUser.emailVerified
        };
      }
      
      return token;
    },
    async session({ token, session }) {
      // اطمینان از وجود توکن و به‌روزرسانی کامل اطلاعات کاربر
      if (token.sub) {
        session.user = {
          id: token.sub,
          name: token.name || '',
          email: token.email || '',
          role: (token.role as Role) || 'USER',
          profile: token.profile as UserProfile | undefined,
          emailVerified: token.emailVerified ? new Date(token.emailVerified as string) : null
        };
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 3 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [
    Resend({
      from: 'onboarding@resend.dev',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'ایمیل', type: 'text' },
        password: { label: 'رمز عبور', type: 'password' },
      },

      async authorize(credentials) {
        const validatedFields = await LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;

          const user = await getUserByEmail(email);
          if (!user || !user.password) return null;

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) return user;
        }
        return null;
      },
    }),
    ...authConfig.providers,
  ],
});
