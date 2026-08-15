import authConfig from '@/auth.config';
import NextAuth from 'next-auth';

/**
 * نسخه سازگار با Edge Runtime برای استفاده در middleware
 *
 * چرا این فایل جدا شده؟
 * - فایل اصلی auth.ts از bcrypt و PrismaAdapter استفاده می‌کنه که فقط در Node.js کار می‌کنن
 * - Middleware در Next.js روی Edge Runtime اجرا میشه که این کتابخانه‌ها رو ساپورت نمی‌کنه
 * - این فایل فقط OAuth providers رو شامل میشه (بدون Credentials)
 */
export const { auth } = NextAuth(authConfig);
