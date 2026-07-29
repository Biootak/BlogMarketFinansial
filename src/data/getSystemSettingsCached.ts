import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';
import type { SiteSettings } from './getSystemSettings';

export type { SiteSettings } from './getSystemSettings';

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

/**
 * نسخه‌ی قابل prerender از تنظیمات سایت.
 *
 * 2026-06-29: Replaced 'use cache' with unstable_cache since cacheComponents
 * is disabled. unstable_cache provides the same caching behavior (60s revalidation)
 * and works with cacheComponents: false. This version is for metadata and places
 * that require prerender; the safeCache version is still available for runtime
 * fallback in layouts and actions.
 *
 * 2026-07-29: Contact fields (contactEmail/Phone/Address) added to schema.
 * Read with defensive pickString so the function still works before migration.
 */
export const getSystemSettingsCached = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const settings = await prisma.systemSettings.findFirst();

      if (!settings) {
        return SETTINGS_FALLBACK;
      }

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
    } catch {
      return SETTINGS_FALLBACK;
    }
  },
  ['system-settings'],
  {
    tags: ['system-settings'],
    revalidate: 60,
  },
);
