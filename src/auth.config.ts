import type { NextAuthConfig } from 'next-auth';

import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';

export default {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Github({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],

  pages: {
    signIn: '/signin',
    newUser: '/signup',
    error: '/error',
    verifyRequest: '/verify-request',
  },
} satisfies NextAuthConfig;
