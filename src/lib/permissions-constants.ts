/**
 * permissions-constants — تعریف نقش‌های قابل ویرایش در ماتریس RBAC
 *
 * EDITABLE_ROLES: نقش‌هایی که در Permission Matrix قابل پیکربندی هستند.
 *   - CUSTOMER / MERCHANT / EXCHANGE: نقش‌های فین‌تک — مجوزهای API-level دارند
 *   - SUPPORT: پشتیبانی — مجوزهای read-only روی موجودیت‌های حساس
 *   - ADMIN: مدیر محتوا و کاربران
 *
 * نقش‌های خارج از این لیست:
 *   - OWNER / SUPERADMIN: همیشه همه دسترسی‌ها را دارند (read-only در UI، hardcoded در server)
 *   - USER / AUTHOR: مجوزهای ثابت و hardcoded دارند، نیازی به RBAC matrix ندارند
 *   - TEST_CUSTOMER: حساب آزمایشی — مجوزها از CUSTOMER وراثت می‌گیرد
 *
 * ⚠️  هشدار: تغییر این لیست باید با بررسی require-auth.ts / exchange-auth.ts هماهنگ باشد.
 *     SUPPORT در این لیست است ولی به /dashboard/permissions دسترسی ندارد (فقط ADMIN/OWNER/SUPERADMIN).
 */
export const EDITABLE_ROLES = ['CUSTOMER', 'MERCHANT', 'EXCHANGE', 'SUPPORT', 'ADMIN'] as const;

export type EditableRole = (typeof EDITABLE_ROLES)[number];
