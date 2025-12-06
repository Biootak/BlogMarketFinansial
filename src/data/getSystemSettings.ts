import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';

export interface SiteSettings {
  siteName: string | null;
  siteDescription: string | null;
  telegram: string | null;
  instagram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  maintenanceMode: boolean;
  cacheEnabled: boolean;
}

// Fetch settings from database with caching (revalidate every 5 minutes)
export const getSystemSettingsData = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const settings = await prisma.systemSettings.findFirst();

      if (!settings) {
        return {
          siteName: null,
          siteDescription: null,
          telegram: null,
          instagram: null,
          twitter: null,
          whatsapp: null,
          maintenanceMode: false,
          cacheEnabled: true,
        };
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
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return {
        siteName: null,
        siteDescription: null,
        telegram: null,
        instagram: null,
        twitter: null,
        whatsapp: null,
        maintenanceMode: false,
        cacheEnabled: true,
      };
    }
  },
  ['system-settings'],
  {
    revalidate: 300, // 5 minutes
    tags: ['system-settings'],
  },
);
