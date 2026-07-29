import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export interface SiteSettings {
  siteName: string | null;
  siteDescription: string | null;
  logoUrl: string | null;
  /** دامنه اصلی سایت — منبع واحد برای robots.txt، sitemap، OG، لینک‌های اشتراک‌گذاری */
  siteUrl: string | null;
  // 2026-07-29: فیلدهای تماس (ادمین‌قابل‌ویرایش). null = استفاده از fallback.
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  telegram: string | null;
  instagram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  maintenanceMode: boolean;
  // 2026-07-29: پیام سفارشی صفحه تعمیرات — null یعنی استفاده از متن پیش‌فرض
  maintenanceMessage: string | null;
  cacheEnabled: boolean;
}

const SETTINGS_FALLBACK: SiteSettings = {
  siteName: null,
  siteDescription: null,
  logoUrl: null,
  siteUrl: null,
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  telegram: null,
  instagram: null,
  twitter: null,
  whatsapp: null,
  maintenanceMode: false,
  maintenanceMessage: null,
  cacheEnabled: true,
};

// 2026-06-21: قبلاً `unstable_cache` بود که در Next.js 16 خطای DB را
// در سطح cache-layer re-throw می‌کرد و try/catch داخل function بی‌اثر
// بود. حالا با `safeCache` خودمان:
//   - بین request ها share می‌شود (مثل unstable_cache)
//   - خطا → stale value (اگر قبلاً موفق بود) یا fallback
//   - حتی اگر DB کاملاً قطع باشد، layout/page کرش نمی‌کند
export const getSystemSettingsData = safeCache(
  async (): Promise<SiteSettings> => {
    let settings;
    try {
      settings = await prisma.systemSettings.findFirst();
    } catch {
      return SETTINGS_FALLBACK;
    }

    if (!settings) {
      return SETTINGS_FALLBACK;
    }

    // 2026-07-29: فیلدهای تماس اختیاری‌اند. اگر هنوز migration اجرا نشده
    // (فیلدها در DB موجود نیستند)، با Reflect.get از prototype می‌خوانیم تا
    // TypeError ندهد. null = استفاده از fallback در UI.
    const raw = settings as unknown as Record<string, unknown>;
    const pickString = (key: string): string | null => {
      const v = raw[key];
      return typeof v === 'string' && v.trim() ? v.trim() : null;
    };

    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      logoUrl: settings.logoUrl,
      siteUrl: pickString('siteUrl'),
      contactEmail: pickString('contactEmail'),
      contactPhone: pickString('contactPhone'),
      contactAddress: pickString('contactAddress'),
      telegram: settings.telegram,
      instagram: settings.instagram,
      twitter: settings.twitter,
      whatsapp: settings.whatsapp,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: pickString('maintenanceMessage'),
      cacheEnabled: settings.cacheEnabled,
    };
  },
  SETTINGS_FALLBACK,
  {
    key: 'system-settings',
    ttl: 300, // 5 minutes
    tags: ['system-settings'],
  },
);
