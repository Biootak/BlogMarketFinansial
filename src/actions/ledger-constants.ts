/**
 * ledger-constants — ثابت‌های دفتر کل.
 *
 * جدا از ledger-actions.ts نگه داشته شده چون فایل‌های 'use server' فقط
 * اجازهٔ export تابع async دارند و کلاینت به لیست ارزها نیاز دارد.
 */

export const LEDGER_CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR', 'INR', 'PKR'];
