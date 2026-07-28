/**
 * subscription-plans.ts — تعریف پلن‌های اشتراک (pure data, no server action).
 * این فایل هم در client و هم در server قابل استفاده است.
 */

export type PlanId = 'free' | 'pro' | 'business';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: { ok: boolean; text: string }[];
  highlight: boolean;
  badge?: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'رایگان',
    tagline: 'برای شروع و آشنایی',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'AFN',
    badge: 'پیش‌فرض',
    highlight: false,
    features: [
      { ok: true, text: 'انتشار نامحدود پست' },
      { ok: true, text: 'آپلود تصویر و رسانه' },
      { ok: true, text: 'آمار پایه بازدید' },
      { ok: false, text: 'آمار پیشرفته و SEO' },
      { ok: false, text: 'Newsletter خودکار' },
      { ok: false, text: 'پشتیبانی اولویت‌دار' },
    ],
  },
  {
    id: 'pro',
    name: 'حرفه‌ای',
    tagline: 'برای نویسندگان و خبرنگاران فعال',
    monthlyPrice: 499_00,
    yearlyPrice: 4990_00,
    currency: 'AFN',
    badge: 'محبوب',
    highlight: true,
    features: [
      { ok: true, text: 'همه امکانات پلن رایگان' },
      { ok: true, text: 'آمار پیشرفته بازدید' },
      { ok: true, text: 'ابزارهای SEO' },
      { ok: true, text: 'Newsletter ماهانه خودکار' },
      { ok: true, text: 'بدون تبلیغات' },
      { ok: false, text: 'مدیریت چند نویسنده' },
    ],
  },
  {
    id: 'business',
    name: 'سازمانی',
    tagline: 'برای تیم‌ها و رسانه‌ها',
    monthlyPrice: 1499_00,
    yearlyPrice: 14990_00,
    currency: 'AFN',
    badge: 'حرفه‌ای‌ترین',
    highlight: false,
    features: [
      { ok: true, text: 'همه امکانات پلن حرفه‌ای' },
      { ok: true, text: 'مدیریت چند نویسنده' },
      { ok: true, text: 'API اختصاصی' },
      { ok: true, text: 'گزارش‌های تحلیلی ماهانه' },
      { ok: true, text: 'پشتیبانی ۲۴/۷' },
      { ok: true, text: 'SLA تضمینی ۹۹.۹٪' },
    ],
  },
];

export function getPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === id);
}
