import type { Role, UserProfile } from '@/types/types';
import type { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

export type ExtendUser = DefaultSession['user'] & {
  role: Role;
  profile?: UserProfile;
  emailVerified?: Date | null;
};

declare module 'next-auth' {
  interface Session {
    user: ExtendUser;
  }

  interface User {
    role?: Role;
    profile?: UserProfile;
    emailVerified?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    profile?: UserProfile;
    emailVerified?: Date | null;
  }
}
