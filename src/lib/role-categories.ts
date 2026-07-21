/**
 * role-categories.ts — تفکیک رسمی نقش‌های پلتفرم از نقش‌های صرافی
 *
 * R4-fix / R17-fix (2026-07): این فایل منبع حقیقت (single source of truth) برای
 * درک سلسله‌مراتب نقش‌ها در پلتفرم است.
 *
 * ─── سطح ۱: نقش‌های کاربر (User.role — Prisma enum Role) ───────────────────
 *
 *   پلتفرم بلاگ/ادمین:
 *     OWNER       — مالک کامل پلتفرم (همه دسترسی‌ها)
 *     SUPERADMIN  — alias برای OWNER (برای سازگاری schema؛ در کد جدید استفاده نشود)
 *     ADMIN       — مدیر محتوا و کاربران
 *     AUTHOR      — نویسنده بلاگ
 *     SUPPORT     — پشتیبانی
 *     USER        — کاربر عادی (فقط my-requests + edit-profile در dashboard)
 *
 *   فین‌تک (کاربر سایت عمومی — نه داشبورد ادمین):
 *     CUSTOMER    — مشتری صرافی که در پلتفرم ثبت‌نام کرده
 *     MERCHANT    — فروشنده
 *     EXCHANGE    — (deprecated) نماینده صرافی — از ExchangeStaff استفاده شود
 *     TEST_CUSTOMER — حساب آزمایشی
 *
 * ─── سطح ۲: نقش‌های staff صرافی (ExchangeStaff.role — Prisma enum ExchangeStaffRole) ─
 *
 *   این نقش‌ها «درون یک صرافی» تعریف می‌شوند و جدا از User.role هستند:
 *     OWNER   — مالک صرافی (مدیریت کامل صرافی خودش)  ← این «صراف» است (R4)
 *     MANAGER — مدیر عملیاتی صرافی
 *     STAFF   — کارمند (ثبت معامله، بررسی مشتری)
 *     VIEWER  — فقط مشاهده
 *
 * ─── تفکیک کلیدی (R17) ─────────────────────────────────────────────────────
 *
 *   «ادمین پلتفرم» (User.role = ADMIN|OWNER):
 *     - به /dashboard دسترسی دارد
 *     - همه صرافی‌ها را می‌بیند و مدیریت می‌کند
 *     - quote ها را approve/reject می‌کند
 *     - در exchange-auth.ts: همه exchangeId ها را bypass می‌کند
 *
 *   «مدیر صرافی» (ExchangeStaff.role = OWNER|MANAGER):
 *     - به /exchange دسترسی دارد
 *     - فقط صرافی خودش را می‌بیند
 *     - deal ها را confirm/complete می‌کند
 *     - در exchange-auth.ts: با exchangeId + revokedAt=null چک می‌شود
 *
 * ─── Type helpers ──────────────────────────────────────────────────────────
 */

import type { Role } from '@prisma/client';

/** نقش‌هایی که به /dashboard دسترسی دارند */
export const PLATFORM_DASHBOARD_ROLES = [
  'OWNER',
  'SUPERADMIN',
  'ADMIN',
  'SUPPORT',
  'AUTHOR',
  'USER',
] as const satisfies Role[];

/** نقش‌های فین‌تک — به /dashboard دسترسی ندارند */
export const FINTECH_ONLY_ROLES = [
  'CUSTOMER',
  'MERCHANT',
  'EXCHANGE',
  'TEST_CUSTOMER',
] as const satisfies Role[];

/** نقش‌های ادمین پلتفرم — مدیریت کامل همه صرافی‌ها */
export const PLATFORM_ADMIN_ROLES = ['OWNER', 'SUPERADMIN', 'ADMIN'] as const satisfies Role[];

/** آیا یک نقش به صرافی تعلق دارد (نه داشبورد ادمین)؟ */
export function isFintechOnlyRole(role: string): boolean {
  return (FINTECH_ONLY_ROLES as readonly string[]).includes(role);
}

/** آیا یک نقش به داشبورد پلتفرم تعلق دارد؟ */
export function isPlatformRole(role: string): boolean {
  return (PLATFORM_DASHBOARD_ROLES as readonly string[]).includes(role);
}

/** آیا ادمین پلتفرم است (می‌تواند همه صرافی‌ها را مدیریت کند)؟ */
export function isPlatformAdmin(role: string): boolean {
  return (PLATFORM_ADMIN_ROLES as readonly string[]).includes(role);
}
