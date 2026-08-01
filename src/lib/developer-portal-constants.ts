/**
 * developer-portal-constants.ts
 *
 * Shared constants برای Developer Portal (API Keys & Webhooks).
 *
 * چرا اینجا؟ فایل‌های `'use server'` در Next.js 16 فقط می‌توانند async function
 * export کنند — const object مجاز نیست. این ماژول shared است تا هم server actions
 * و هم client component از یک منبع واحد استفاده کنند.
 */

/** لیست رسمی scopes — استفاده در UI و backend. */
export const API_SCOPES = [
  { value: 'read:accounts', label: 'خواندن حساب‌ها', category: 'read' },
  { value: 'read:transactions', label: 'خواندن تراکنش‌ها', category: 'read' },
  { value: 'read:profile', label: 'خواندن پروفایل', category: 'read' },
  { value: 'write:transfers', label: 'ایجاد انتقال', category: 'write' },
  { value: 'write:beneficiaries', label: 'مدیریت ذی‌نفعان', category: 'write' },
  { value: 'write:webhooks', label: 'مدیریت وب‌هوک‌ها', category: 'write' },
] as const;

export type ApiScope = (typeof API_SCOPES)[number]['value'];

/** رویدادهای قابل انتخاب برای وب‌هوک — استفاده در UI و backend. */
export const WEBHOOK_EVENTS = [
  { value: 'transaction.created', label: 'تراکنش ایجاد شد' },
  { value: 'transaction.completed', label: 'تراکنش تکمیل شد' },
  { value: 'transaction.failed', label: 'تراکنش ناموفق' },
  { value: 'kyc.approved', label: 'احراز هویت تأیید شد' },
  { value: 'kyc.rejected', label: 'احراز هویت رد شد' },
  { value: 'account.frozen', label: ' حساب مسدود شد' },
  { value: 'transfer.received', label: 'انتقال دریافت شد' },
  { value: 'transfer.sent', label: 'انتقال ارسال شد' },
] as const;
