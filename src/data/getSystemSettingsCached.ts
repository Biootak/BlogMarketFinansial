import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import type { SiteSettings } from './getSystemSettings';

export { type SiteSettings } from './getSystemSettings';

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

/**
 * نسخه‌ی قابل prerender از تنظیمات سایت.
 *
 * 2026-06-29: Replaced 'use cache' with unstable_cache since cacheComponents
 * is disabled. unstable_cache provides the same caching behavior (60s revalidation)
 * and works with cacheComponents: false. This version is for metadata and places
 * that require prerender; the safeCache version is still available for runtime
 * fallback in layouts and actions.
 */
export const getSystemSettingsCached = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
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
    } catch {
      return SETTINGS_FALLBACK;
    }
  },
  ['system-settings'],
  {
    tags: ['system-settings'],
    revalidate: 60,
  }
);
