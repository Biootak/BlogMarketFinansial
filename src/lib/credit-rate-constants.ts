/**
 * credit-rate-constants.ts
 *
 * Shared constants برای انواع نرخ‌های اعتباری — قابل import در client components.
 *
 * چرا اینجا؟ فایل‌های `'use server'` در Next.js 16 فقط می‌توانند async function
 * export کنند — const object مجاز نیست. این ماژول shared است تا هم server actions
 * و هم client components از یک منبع واحد استفاده کنند.
 */

import type { CreditRateType } from '@prisma/client';

/** برچسب فارسی هر نوع وام/سپرده — استفاده در UI. */
export const TYPE_FA: Record<CreditRateType, string> = {
  MORTGAGE: 'وام مسکن',
  PERSONAL: 'وام شخصی',
  AUTO: 'وام خودرو',
  BUSINESS: 'وام کسب‌وکار',
  QARD_AL_HASAN: 'قرض‌الحسنه',
  EDUCATION: 'وام تحصیلی',
  AGRICULTURE: 'وام کشاورزی',
  COMMERCIAL: 'وام تجاری',
  DEPOSIT: 'سپرده سرمایه‌گذاری',
  OTHER: 'سایر',
};

/** توضیح فارسی هر نوع — استفاده در UI. */
export const TYPE_DESC: Record<CreditRateType, string> = {
  MORTGAGE: 'وام بلندمدت برای خرید یا ساخت مسکن',
  PERSONAL: 'وام برای نیازهای شخصی بدون وثیقه',
  AUTO: 'وام برای خرید خودرو',
  BUSINESS: 'وام برای تأمین سرمایه در گردش کسب‌وکارها',
  QARD_AL_HASAN: 'وام قرض‌الحسنه بدون بهره',
  EDUCATION: 'وام کم‌بهره برای شهریه و هزینه تحصیل',
  AGRICULTURE: 'وام برای کشاورزان و دامداران',
  COMMERCIAL: 'وام تجاری برای بازرگانان',
  DEPOSIT: 'سپرده‌گذاری بلندمدت با سود تضمینی',
  OTHER: 'سایر محصولات اعتباری',
};
