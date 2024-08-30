import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from '@/auth.config';

import prisma from '@/lib/db';
import { getUserById, getUserByEmail } from '@/data/user';
import type { Role } from '@/types/types';
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
      // برای provider های غیر از credentials، اجازه ورود می‌دهیم
      if (account?.provider !== 'credentials') return;

      // برای provider credentials، بررسی می‌کنیم که آیا ایمیل تأیید شده است
      const existingUser = await getUserById(user.id as string);
      if (!existingUser?.emailVerified) {
        // اگر ایمیل تأیید نشده باشد، ورود را رد می‌کنیم
        throw new Error('ایمیل تأیید نشده تایید نشده است .');
      }

      // اگر به اینجا برسیم، یعنی ورود موفق بوده است
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
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as Role;
      }

      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name;
      }
      return session;
    },

    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);

      if (!existingUser) {
        return token;
      }
      token.id = existingUser.id;
      token.email = existingUser.email;
      token.name = existingUser.name;
      token.role = existingUser.role;

      return token;
    },
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
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
