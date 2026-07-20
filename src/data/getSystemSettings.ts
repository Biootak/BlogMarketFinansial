import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export interface SiteSettings {
  siteName: string | null;
  siteDescription: string | null;
  logoUrl: string | null;
  telegram: string | null;
  instagram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  maintenanceMode: boolean;
  cacheEnabled: boolean;
}

const SETTINGS_FALLBACK: SiteSettings = {
  siteName: null,
  siteDescription: null,
  logoUrl: null,
  telegram: null,
  instagram: null,
  twitter: null,
  whatsapp: null,
  maintenanceMode: false,
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
    const settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      return SETTINGS_FALLBACK;
    }

    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      logoUrl: settings.logoUrl,
      telegram: settings.telegram,
      instagram: settings.instagram,
      twitter: settings.twitter,
      whatsapp: settings.whatsapp,
      maintenanceMode: settings.maintenanceMode,
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
