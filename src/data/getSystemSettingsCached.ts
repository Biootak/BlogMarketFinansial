import { cacheTag, cacheLife } from 'next/cache';
import prisma from '@/lib/db';
import type { SiteSettings } from './getSystemSettings';

export { type SiteSettings } from './getSystemSettings';

const SETTINGS_FALLBACK: SiteSettings = {
  siteName: null,
  siteDescription: null,
  telegram: null,
  instagram: null,
  twitter: null,
  whatsapp: null,
  maintenanceMode: false,
  cacheEnabled: true,
};

/**
 * نسخه‌ی قابل prerender از تنظیمات سایت.
 *
 * 2026-06-25: در Next.js 16 با `cacheComponents: true`، دسترسی به داده‌ی
 * داینامیک خارج از <Suspense> خطای blocking-route می‌دهد. تابع metadata
 * نمی‌تواند <Suspense> داشته باشد، پس از `"use cache"` با cacheLife استفاده
 * می‌کنیم. این نسخه فقط برای metadata و جاهایی که prerender لازم است
 * به‌کار می‌رود؛ نسخه‌ی safeCache همچنان برای runtime fallback در layoutها
 * و actions قابل استفاده است.
 */
export async function getSystemSettingsCached(): Promise<SiteSettings> {
  'use cache';
  cacheTag('system-settings');
  cacheLife('minutes');

  try {
    const settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      return SETTINGS_FALLBACK;
    }

    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      telegram: settings.telegram,
      instagram: settings.instagram,
      twitter: settings.twitter,
      whatsapp: settings.whatsapp,
      maintenanceMode: settings.maintenanceMode,
      cacheEnabled: settings.cacheEnabled,
    };
  } catch {
    return SETTINGS_FALLBACK;
  }
}
