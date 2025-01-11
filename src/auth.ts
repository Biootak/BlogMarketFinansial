import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from '@/auth.config';
import prisma from '@/lib/db';
import { getUserById, getUserByEmail } from '@/data/user';
import type { Role, UserProfile } from '@/types/types';
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
      console.log('[AUTH] Sign In Event:', { user, account });
      if (account?.provider !== 'credentials') return;
      
      const existingUser = await getUserById(user.id as string);
      console.log('[AUTH] Existing User:', existingUser);
      
      if (!existingUser) {
        console.error('[AUTH] User not found in database');
        throw new Error('کاربر در دیتابیس یافت نشد.');
      }
      if (!existingUser.emailVerified) {
        console.error('[AUTH] Email not verified');
        throw new Error('ایمیل تأیید نشده است.');
      }
    },
    async linkAccount({ user }) {
      console.log('[AUTH] Link Account Event:', user);
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async jwt({ token, trigger, session, user }) {
      console.log('[AUTH] JWT Callback:', { token, trigger, session, user });

      if (user) {
        console.log('[AUTH] New user login, updating token');
        token.role = user.role || 'USER';
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }

      if (trigger === 'update' && session?.user) {
        console.log('[AUTH] Updating token with session data');
        token.role = session.user.role || 'USER';
      }

      return token;
    },
    async session({ token, session }) {
      console.log('[AUTH] Session Callback:', { token, session });
      
      if (token) {
        session.user = {
          ...session.user,
          id: token.sub || '',
          role: (token.role as Role) || 'USER',
          emailVerified: token.emailVerified ? (token.emailVerified instanceof Date ? token.emailVerified : new Date(token.emailVerified)) : null
        };
        console.log('[AUTH] Updated session:', session);
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
        console.log('[AUTH] Authorize attempt with credentials');
        const validatedFields = LoginSchema.safeParse(credentials);
        
        if (!validatedFields.success) {
          console.error('[AUTH] Invalid credentials format:', validatedFields.error);
          return null;
        }

        const { email, password } = validatedFields.data;
        const user = await getUserByEmail(email);
        console.log('[AUTH] User found by email:', user ? 'Yes' : 'No');
        
        if (!user || !user.password) {
          console.error('[AUTH] User not found or no password');
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        console.log('[AUTH] Password match:', passwordsMatch);

        if (!passwordsMatch) {
          console.error('[AUTH] Password does not match');
          return null;
        }

        console.log('[AUTH] Authorization successful');
        return user;
      }
    }),
    ...authConfig.providers,
  ],
});
