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
    async session({ token, session }) {
      if (token.sub) {
        const user = await getUserById(token.sub);
        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            role: user.role as Role,
            profile: user.profile as UserProfile | undefined,
          };
        } else {
          // اگر کاربر در دیتابیس یافت نشد، یک سشن با حداقل اطلاعات برگردانید
          session.user = {
            ...session.user,
            id: token.sub,
            role: 'USER' as Role,
            profile: undefined,
          };
        }
      }
      return session;
    },

    async jwt({ token }) {
      if (token.sub) {
        const user = await getUserById(token.sub);
        if (user) {
          token.role = user.role as Role;
          token.profile = user.profile as UserProfile | undefined;
        } else {
          // اگر کاربر در دیتابیس یافت نشد، اطلاعات پیش‌فرض را در توکن قرار دهید
          token.role = 'USER' as Role;
          token.profile = undefined;
        }
      }
      return token;
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
