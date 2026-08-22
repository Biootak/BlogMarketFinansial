import type { Role, UserProfile } from '@/types/types';
import type { DefaultSession } from 'next-auth';

export type ExtendUser = DefaultSession['user'] & {
  role: Role;
  profile?: UserProfile;
  emailVerified?: Date | null;
  /** 2026-08-11: دسترسی‌های بخشی کاربر (dashboard-section keys = grants) — خالی = پیش‌فرض نقش */
  permissions?: string[];
  /** 2026-08-11: بخش‌های مسدودشده برای همین کاربر (denials) */
  deniedPermissions?: string[];
};

declare module 'next-auth' {
  interface Session {
    user: ExtendUser;
  }

  interface User {
    role?: Role;
    profile?: UserProfile;
    emailVerified?: Date | null;
    permissions?: string[];
    deniedPermissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    profile?: UserProfile;
    emailVerified?: Date | null;
    permissions?: string[];
    deniedPermissions?: string[];
    /** 2026-08-22: شناسهٔ یکتای توکن برای denylist خروج (session-denylist) */
    jti?: string;
  }
}
