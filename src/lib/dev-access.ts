import { Role } from '@prisma/client';

/**
 * دسترسی‌های مخصوص توسعه‌دهنده (فقط dev) — «استثنای مالک در محیط توسعه».
 * -----------------------------------------------------------------------------
 * هدف: توسعه‌دهنده در محیط local بتواند همهٔ فیچرهای OWNER را ببیند و برایشان
 * کد بنویسد، بدون اینکه نیازی به دستکاری دستی نقش در DB باشد — و مهم‌تر از آن،
 * بدون اینکه هیچ روزنه‌ای در production باز شود.
 *
 * سه گارد مستقل که باید همزمان برقرار باشند (در prod هیچ‌وقت همه برقرار نیست):
 *   1. NODE_ENV === 'development'   ← prod همیشه 'production' است (Dockerfile
 *      و Heroku آن را ثابت می‌کنند). حتی اگر کسی سهواً این فلگ‌ها را در prod
 *      ست کند، بدون این شرط bypass کار نمی‌کند.
 *   2. DEV_OWNER_BYPASS === '1'     ← باید عمداً opt-in شود.
 *   3. DEV_OWNER_EMAIL با ایمیل session کاربر یکی باشد ← فقط حساب خود
 *      توسعه‌دهنده؛ هیچ کاربر دیگری بالا نمی‌آید.
 *
 * نتیجه: نقشِ session فقط در dev و فقط برای همان ایمیل به OWNER ارتقا می‌یابد؛
 * هویت واقعی کاربر (id) عوض نمی‌شود و در prod این تابع همیشه null برمی‌گرداند.
 */

/** آیا کل مسیر bypass فعال است؟ (هر سه گارد) */
export function isDevOwnerBypassActive(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_OWNER_BYPASS === '1' &&
    Boolean(process.env.DEV_OWNER_EMAIL)
  );
}

/**
 * اگر bypass فعال است و ایمیل داده‌شده با DEV_OWNER_EMAIL یکی است → OWNER
 * برمی‌گرداند؛ در غیر این صورت null (یعنی رفتار عادی).
 */
export function devOwnerRoleForEmail(email?: string | null): Role | null {
  if (!isDevOwnerBypassActive()) return null;
  const devEmail = process.env.DEV_OWNER_EMAIL;
  if (!email || !devEmail) return null;
  if (email.trim().toLowerCase() !== devEmail.trim().toLowerCase()) return null;
  return Role.OWNER;
}
